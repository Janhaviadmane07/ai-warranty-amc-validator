import os
import re
import uuid
import shutil
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query, Response, Body
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, desc

from app.core.database import get_db
from app.core.config import settings
from app.core.security import verify_password, create_access_token, decode_token, get_password_hash
from app.models.entities import (
    User, Vendor, Asset, Contract, Document, ExtractedField,
    ValidationRun, ValidationFinding, ValidationRuleConfig, Notification, AuditLog,
    TaskAssignment, ReviewCase, Suggestion, CaseMessage, StatusHistory
)
from app.schemas.all_schemas import (
    Token, LoginRequest, UserCreate, UserUpdate, PasswordResetRequest, UserResponse,
    TaskCreate, TaskUpdateStatus, TaskResponse,
    VendorCreate, VendorResponse, AssetCreate, AssetUpdate, AssetResponse,
    ContractCreate, ContractResponse, DocumentResponse, FieldCorrectionRequest,
    ValidationRunResponse, FindingResponse, FindingResolutionRequest, DashboardKPI,
    ReviewCaseCreate, ReviewCaseManagerAction, ReviewCaseUserResponse, ReviewCaseResponse,
    SuggestionCreate, SuggestionUserRespond, SuggestionManagerReply, SuggestionResponse,
    CaseMessageCreate, CaseMessageResponse, StatusHistoryResponse,
)
from app.validators.rules_engine import ValidationEngine
from app.services.document_parser import DocumentParserService
from app.services.report_service import ReportService

api_router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False)

# =============================================================================
# AUTH & RBAC DEPENDENCIES
# =============================================================================

def get_current_user(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    if not token:
        admin = db.query(User).filter(User.role == "Administrator").first()
        if not admin:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
        return admin
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated. Contact Administrator.")
    return user

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "Administrator":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator privileges required")
    return current_user

def require_manager_or_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ["Administrator", "Contract Manager"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manager or Administrator privileges required")
    return current_user

def require_user(current_user: User = Depends(get_current_user)) -> User:
    """Any authenticated active user."""
    return current_user

def log_audit(db: Session, actor: Optional[User], action: str, entity_type: str, entity_id: str, details: Dict[str, Any] = None):
    audit = AuditLog(
        actor_id=actor.id if actor else None,
        actor_email=actor.email if actor else "system",
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        details=details or {},
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()

def create_notification(db: Session, user_id: Optional[int], title: str, message: str,
                        notif_type: str = "System", severity: str = "Info", link_url: str = None):
    n = Notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notif_type,
        severity=severity,
        is_read=False,
        link_url=link_url
    )
    db.add(n)
    # No commit here – caller commits

def record_status_change(db: Session, case: ReviewCase, actor: User,
                          prev_status: str, new_status: str, notes: str = None):
    history = StatusHistory(
        case_id=case.id,
        actor_id=actor.id,
        actor_email=actor.email,
        previous_status=prev_status,
        new_status=new_status,
        notes=notes,
        changed_at=datetime.utcnow()
    )
    db.add(history)

def _serialize_user(u: User) -> dict:
    return {
        "id": u.id,
        "email": u.email,
        "full_name": u.full_name,
        "role": u.role,
        "department": u.department,
        "phone": u.phone,
        "is_active": u.is_active,
        "created_at": u.created_at,
        "last_login": u.last_login,
        "manager_id": u.manager_id,
        "manager_name": u.manager.full_name if u.manager else None,
    }

# =============================================================================
# AUTH ENDPOINTS
# =============================================================================

@api_router.post("/auth/login", response_model=Token)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Your account has been deactivated. Please contact your system administrator.")

    user.last_login = datetime.utcnow()
    db.commit()

    token = create_access_token(user.id, user.role)
    log_audit(db, user, "LOGIN_SUCCESS", "USER", str(user.id), {"email": user.email, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "department": user.department,
            "manager_id": user.manager_id,
        }
    }

@api_router.get("/auth/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "department": current_user.department,
        "phone": current_user.phone,
        "is_active": current_user.is_active,
        "last_login": current_user.last_login.strftime("%Y-%m-%d %H:%M:%S") if current_user.last_login else None,
        "manager_id": current_user.manager_id,
        "manager_name": current_user.manager.full_name if current_user.manager else None,
    }

# =============================================================================
# DASHBOARD KPIs  (role-scoped)
# =============================================================================

@api_router.get("/dashboard/kpis", response_model=DashboardKPI)
def get_dashboard_kpis(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = date.today()
    in_30_days = today + timedelta(days=30)

    # Scope for regular User
    if current_user.role == "User":
        owned_asset_ids = [a.id for a in db.query(Asset).filter(Asset.owner_id == current_user.id).all()]
        total_assets = len(owned_asset_ids)
        active_warranties = db.query(Asset).filter(Asset.owner_id == current_user.id, Asset.warranty_end_date >= today).count()
        active_amcs = db.query(Contract).filter(Contract.asset_id.in_(owned_asset_ids), Contract.contract_type == "AMC", Contract.status == "Active", Contract.end_date >= today).count()
        expired_contracts = db.query(Contract).filter(Contract.asset_id.in_(owned_asset_ids), Contract.end_date < today).count()
        w_exp_30 = db.query(Asset).filter(Asset.owner_id == current_user.id, Asset.warranty_end_date >= today, Asset.warranty_end_date <= in_30_days).count()
        c_exp_30 = db.query(Contract).filter(Contract.asset_id.in_(owned_asset_ids), Contract.end_date >= today, Contract.end_date <= in_30_days).count()
        expiring_soon_total = w_exp_30 + c_exp_30
        open_issues = db.query(ValidationFinding).filter(ValidationFinding.asset_id.in_(owned_asset_ids), ValidationFinding.status == "Open").count() if owned_asset_ids else 0
        renewal_sum = 0.0
        coverage_dist = {"Active Warranties": active_warranties, "Active AMCs": active_amcs, "Expired": expired_contracts, "Expiring Soon": expiring_soon_total}
        vendor_dist = []
        severity_dist = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
        recent_runs = []
        recent_docs_db = db.query(Document).filter(Document.uploaded_by_id == current_user.id).order_by(desc(Document.created_at)).limit(5).all()
        recent_uploads = [{"id": d.id, "file_name": d.file_name, "category": d.document_category, "status": d.status, "created_at": d.created_at.strftime("%Y-%m-%d %H:%M")} for d in recent_docs_db]
    else:
        total_assets = db.query(Asset).filter(Asset.status != "Archived").count()
        active_warranties = db.query(Asset).filter(Asset.warranty_end_date >= today).count()
        active_amcs = db.query(Contract).filter(Contract.contract_type == "AMC", Contract.status == "Active", Contract.end_date >= today).count()
        expired_contracts = db.query(Contract).filter(Contract.end_date < today).count()
        w_exp_30 = db.query(Asset).filter(Asset.warranty_end_date >= today, Asset.warranty_end_date <= in_30_days).count()
        c_exp_30 = db.query(Contract).filter(Contract.end_date >= today, Contract.end_date <= in_30_days).count()
        expiring_soon_total = w_exp_30 + c_exp_30
        open_issues = db.query(ValidationFinding).filter(ValidationFinding.status == "Open").count()
        in_90_days = today + timedelta(days=90)
        renewal_sum = float(db.query(func.sum(Contract.total_amount)).filter(Contract.end_date >= today, Contract.end_date <= in_90_days).scalar() or 0.0)
        coverage_dist = {"Active OEM Warranty": active_warranties, "Active AMC Coverage": active_amcs, "Expired Coverage": expired_contracts, "Expiring Soon": expiring_soon_total}
        vendors = db.query(Vendor).all()
        vendor_dist = []
        for v in vendors:
            c_count = db.query(Contract).filter(Contract.vendor_id == v.id).count()
            a_count = db.query(Asset).filter(Asset.vendor_id == v.id).count()
            val_sum = float(db.query(func.sum(Contract.total_amount)).filter(Contract.vendor_id == v.id).scalar() or 0.0)
            vendor_dist.append({"vendor_name": v.name, "contracts_count": c_count, "assets_count": a_count, "total_value": val_sum})
        crit = db.query(ValidationFinding).filter(ValidationFinding.status == "Open", ValidationFinding.severity == "Critical").count()
        high = db.query(ValidationFinding).filter(ValidationFinding.status == "Open", ValidationFinding.severity == "High").count()
        med = db.query(ValidationFinding).filter(ValidationFinding.status == "Open", ValidationFinding.severity == "Medium").count()
        low = db.query(ValidationFinding).filter(ValidationFinding.status == "Open", ValidationFinding.severity == "Low").count()
        severity_dist = {"Critical": crit, "High": high, "Medium": med, "Low": low}
        recent_runs_db = db.query(ValidationRun).order_by(desc(ValidationRun.created_at)).limit(5).all()
        recent_runs = [{"id": r.id, "run_identifier": r.run_identifier, "risk_score": r.risk_score, "risk_level": r.risk_level, "overall_status": r.overall_status, "total_issues": r.total_issues, "created_at": r.created_at.strftime("%Y-%m-%d %H:%M")} for r in recent_runs_db]
        recent_docs_db = db.query(Document).order_by(desc(Document.created_at)).limit(5).all()
        recent_uploads = [{"id": d.id, "file_name": d.file_name, "category": d.document_category, "status": d.status, "created_at": d.created_at.strftime("%Y-%m-%d %H:%M")} for d in recent_docs_db]

    return {
        "total_assets": total_assets,
        "active_warranties": active_warranties,
        "active_amcs": active_amcs,
        "expired_contracts": expired_contracts,
        "contracts_expiring_30_days": expiring_soon_total,
        "open_validation_issues": open_issues,
        "total_upcoming_renewal_expenditure": renewal_sum,
        "coverage_distribution": coverage_dist,
        "vendor_distribution": vendor_dist,
        "severity_distribution": severity_dist,
        "recent_runs": recent_runs,
        "recent_uploads": recent_uploads,
    }

@api_router.get("/dashboard/user-summary")
def get_user_dashboard_summary(db: Session = Depends(get_db), current_user: User = Depends(require_user)):
    """Extended User dashboard stats."""
    today = date.today()
    in_30_days = today + timedelta(days=30)

    my_assets = db.query(Asset).filter(Asset.owner_id == current_user.id).all()
    asset_ids = [a.id for a in my_assets]

    total_assets = len(my_assets)
    my_docs = db.query(Document).filter(Document.uploaded_by_id == current_user.id).all()
    total_docs = len(my_docs)

    cases = db.query(ReviewCase).filter(ReviewCase.user_id == current_user.id).all()
    awaiting_review = len([c for c in cases if c.status == "Submitted for Review"])
    under_review = len([c for c in cases if c.status == "Under Manager Review"])
    action_required = len([c for c in cases if c.status in ["Action Required", "Resubmission Required"]])
    approved = len([c for c in cases if c.status == "Approved"])
    completed = len([c for c in cases if c.status == "Completed"])

    suggestions = db.query(Suggestion).filter(Suggestion.user_id == current_user.id, Suggestion.status.in_(["Sent", "Acknowledged", "In Progress"])).count()

    expiring_warranties = db.query(Asset).filter(Asset.owner_id == current_user.id, Asset.warranty_end_date >= today, Asset.warranty_end_date <= in_30_days).count()
    expiring_amcs = db.query(Contract).filter(Contract.asset_id.in_(asset_ids), Contract.end_date >= today, Contract.end_date <= in_30_days).count() if asset_ids else 0

    unread_msgs = db.query(CaseMessage).join(ReviewCase).filter(
        ReviewCase.user_id == current_user.id,
        CaseMessage.sender_role == "Manager",
        CaseMessage.is_read == False
    ).count()

    return {
        "total_assets": total_assets,
        "total_documents": total_docs,
        "cases_awaiting_review": awaiting_review,
        "cases_under_review": under_review,
        "cases_action_required": action_required,
        "cases_approved": approved,
        "cases_completed": completed,
        "pending_suggestions": suggestions,
        "expiring_warranties_30d": expiring_warranties,
        "expiring_amcs_30d": expiring_amcs,
        "unread_manager_messages": unread_msgs,
    }

@api_router.get("/dashboard/manager-summary")
def get_manager_dashboard_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Manager dashboard stats scoped to their assigned users."""
    if current_user.role not in ["Contract Manager", "Administrator"]:
        raise HTTPException(status_code=403, detail="Manager or Admin required")

    if current_user.role == "Administrator":
        assigned_user_ids = [u.id for u in db.query(User).filter(User.role == "User").all()]
        my_cases = db.query(ReviewCase).all()
    else:
        assigned_user_ids = [u.id for u in db.query(User).filter(User.manager_id == current_user.id).all()]
        my_cases = db.query(ReviewCase).filter(ReviewCase.manager_id == current_user.id).all()

    total_assigned_users = len(assigned_user_ids)
    new_docs = db.query(Document).filter(Document.uploaded_by_id.in_(assigned_user_ids), Document.status.in_(["Uploaded", "Review Required"])).count() if assigned_user_ids else 0

    awaiting = len([c for c in my_cases if c.status == "Submitted for Review"])
    under_review = len([c for c in my_cases if c.status == "Under Manager Review"])
    returned = len([c for c in my_cases if c.status in ["Action Required", "Resubmission Required"]])
    awaiting_response = len([c for c in my_cases if c.status == "Action Required"])
    completed = len([c for c in my_cases if c.status in ["Completed", "Approved"]])

    overdue_count = 0  # Could implement deadline tracking later

    unread_msgs = db.query(CaseMessage).join(ReviewCase).filter(
        ReviewCase.manager_id == current_user.id,
        CaseMessage.sender_role == "User",
        CaseMessage.is_read == False
    ).count()

    return {
        "total_assigned_users": total_assigned_users,
        "new_uploaded_docs": new_docs,
        "cases_awaiting_review": awaiting,
        "cases_under_review": under_review,
        "cases_returned_to_user": returned,
        "cases_awaiting_user_response": awaiting_response,
        "cases_completed": completed,
        "overdue_cases": overdue_count,
        "unread_user_messages": unread_msgs,
    }

# =============================================================================
# ASSETS API  (role-scoped)
# =============================================================================

@api_router.get("/assets", response_model=List[AssetResponse])
def get_assets(query: Optional[str] = None, category: Optional[str] = None,
               status_filter: Optional[str] = None, db: Session = Depends(get_db),
               current_user: User = Depends(get_current_user)):
    q = db.query(Asset)

    # Regular Users only see their own assets
    if current_user.role == "User":
        q = q.filter(Asset.owner_id == current_user.id)
    # Contract Managers see assets belonging to their assigned users
    elif current_user.role == "Contract Manager":
        assigned_ids = [u.id for u in db.query(User).filter(User.manager_id == current_user.id).all()]
        if assigned_ids:
            q = q.filter(or_(Asset.owner_id.in_(assigned_ids), Asset.owner_id == None))
        # Admins see everything – no additional filter

    if query:
        s = f"%{query}%"
        q = q.filter(or_(Asset.name.ilike(s), Asset.asset_id.ilike(s), Asset.serial_number.ilike(s), Asset.manufacturer.ilike(s)))
    if category and category != "All":
        q = q.filter(Asset.category == category)
    if status_filter and status_filter != "All":
        q = q.filter(Asset.status == status_filter)

    assets = q.filter(Asset.status != "Archived").order_by(Asset.id).all()
    res = []
    for a in assets:
        amc_count = db.query(Contract).filter(Contract.asset_id == a.id, Contract.status == "Active").count()
        issues_count = db.query(ValidationFinding).filter(ValidationFinding.asset_id == a.id, ValidationFinding.status == "Open").count()
        res.append({
            "id": a.id, "asset_id": a.asset_id, "name": a.name, "category": a.category,
            "manufacturer": a.manufacturer, "model_number": a.model_number, "serial_number": a.serial_number,
            "purchase_date": a.purchase_date, "purchase_price": float(a.purchase_price) if a.purchase_price else None,
            "department": a.department, "location": a.location, "assigned_user": a.assigned_user,
            "status": a.status, "warranty_start_date": a.warranty_start_date, "warranty_end_date": a.warranty_end_date,
            "vendor_id": a.vendor_id, "vendor_name": a.vendor.name if a.vendor else None, "notes": a.notes,
            "is_demo": a.is_demo, "created_at": a.created_at, "updated_at": a.updated_at,
            "active_amc_count": amc_count, "open_issues_count": issues_count,
        })
    return res

@api_router.get("/assets/{asset_id}")
def get_asset_detail(asset_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Ownership check for Users
    if current_user.role == "User" and asset.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    contracts = db.query(Contract).filter(Contract.asset_id == asset.id).all()
    documents = db.query(Document).filter(Document.asset_id == asset.id).all()
    findings = db.query(ValidationFinding).filter(ValidationFinding.asset_id == asset.id).all()

    return {
        "asset": {
            "id": asset.id, "asset_id": asset.asset_id, "name": asset.name, "category": asset.category,
            "manufacturer": asset.manufacturer, "model_number": asset.model_number, "serial_number": asset.serial_number,
            "purchase_date": str(asset.purchase_date) if asset.purchase_date else None,
            "purchase_price": float(asset.purchase_price) if asset.purchase_price else None,
            "department": asset.department, "location": asset.location, "assigned_user": asset.assigned_user,
            "status": asset.status,
            "warranty_start_date": str(asset.warranty_start_date) if asset.warranty_start_date else None,
            "warranty_end_date": str(asset.warranty_end_date) if asset.warranty_end_date else None,
            "vendor_id": asset.vendor_id, "vendor_name": asset.vendor.name if asset.vendor else None, "notes": asset.notes,
        },
        "contracts": [{"id": c.id, "contract_number": c.contract_number, "title": c.title, "contract_type": c.contract_type,
                        "start_date": str(c.start_date), "end_date": str(c.end_date), "total_amount": float(c.total_amount or 0),
                        "status": c.status, "coverage_type": c.coverage_type} for c in contracts],
        "documents": [{"id": d.id, "file_name": d.file_name, "category": d.document_category, "status": d.status,
                        "review_status": d.review_status, "created_at": d.created_at.strftime("%Y-%m-%d")} for d in documents],
        "findings": [{"id": f.id, "rule_id": f.rule_id, "rule_title": f.rule_title, "severity": f.severity,
                       "status": f.status, "what_detected": f.what_detected, "why_matters": f.why_matters,
                       "action": f.recommended_action} for f in findings],
    }

@api_router.post("/assets", response_model=AssetResponse)
def create_asset(payload: AssetCreate, db: Session = Depends(get_db), current_user: User = Depends(require_user)):
    existing_id = db.query(Asset).filter(Asset.asset_id == payload.asset_id).first()
    if existing_id:
        raise HTTPException(status_code=400, detail=f"Asset ID '{payload.asset_id}' already exists")
    existing_sn = db.query(Asset).filter(Asset.serial_number == payload.serial_number).first()
    if existing_sn:
        raise HTTPException(status_code=400, detail=f"Serial Number '{payload.serial_number}' already registered")

    data = payload.model_dump()
    asset = Asset(**data, owner_id=current_user.id)
    db.add(asset)
    db.commit()
    db.refresh(asset)
    log_audit(db, current_user, "ASSET_CREATE", "ASSET", str(asset.id), {"asset_id": asset.asset_id, "name": asset.name})
    return {**{k: getattr(asset, k) for k in AssetCreate.model_fields}, "id": asset.id, "is_demo": asset.is_demo,
            "created_at": asset.created_at, "updated_at": asset.updated_at, "vendor_name": asset.vendor.name if asset.vendor else None,
            "active_amc_count": 0, "open_issues_count": 0}

@api_router.put("/assets/{asset_id}")
def update_asset(asset_id: int, payload: AssetUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_user)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    if current_user.role == "User" and asset.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(asset, k, v)
    asset.updated_at = datetime.utcnow()
    db.commit()
    log_audit(db, current_user, "ASSET_UPDATE", "ASSET", str(asset.id), update_data)
    return {"message": "Asset updated successfully", "id": asset.id}

@api_router.delete("/assets/{asset_id}")
def archive_asset(asset_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_manager_or_admin)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    asset.status = "Archived"
    db.commit()
    log_audit(db, current_user, "ASSET_ARCHIVE", "ASSET", str(asset.id), {"asset_id": asset.asset_id})
    return {"message": "Asset archived successfully"}

# =============================================================================
# DOCUMENTS & OCR EXTRACTION API (role-scoped)
# =============================================================================

@api_router.get("/documents", response_model=List[DocumentResponse])
def get_documents(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Document)
    if current_user.role == "User":
        q = q.filter(Document.uploaded_by_id == current_user.id)
    elif current_user.role == "Contract Manager":
        assigned_ids = [u.id for u in db.query(User).filter(User.manager_id == current_user.id).all()]
        if assigned_ids:
            q = q.filter(Document.uploaded_by_id.in_(assigned_ids))
    docs = q.order_by(desc(Document.created_at)).all()
    return docs

@api_router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    document_category: str = Form("Warranty Card"),
    asset_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    file_bytes = await file.read()
    if len(file_bytes) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File exceeds maximum allowed upload size (15 MB)")
    filename = file.filename or "uploaded_doc"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in [".pdf", ".png", ".jpg", ".jpeg"]:
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload PDF, PNG, or JPG")

    sha256_hash = DocumentParserService.compute_sha256(file_bytes)
    stored_name = f"{int(datetime.utcnow().timestamp())}_{sha256_hash[:10]}{ext}"
    stored_path = os.path.join(settings.STORAGE_DIR, stored_name)
    os.makedirs(settings.STORAGE_DIR, exist_ok=True)
    with open(stored_path, "wb") as f:
        f.write(file_bytes)

    doc = Document(
        file_name=filename, stored_path=stored_path, file_hash=sha256_hash,
        file_size_bytes=len(file_bytes), mime_type=file.content_type or "application/octet-stream",
        document_category=document_category, status="Processing", review_status="Pending Review",
        asset_id=asset_id, uploaded_by_id=current_user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    raw_text = DocumentParserService.extract_text_from_file(stored_path, doc.mime_type)
    doc.raw_text = raw_text
    extracted_fields = DocumentParserService.parse_contract_fields(raw_text, category=document_category)
    for ef in extracted_fields:
        db_field = ExtractedField(
            document_id=doc.id, field_name=ef["field_name"], extracted_value=ef["extracted_value"],
            confidence=ef["confidence"], field_category=ef["field_category"], is_ambiguous=ef["is_ambiguous"]
        )
        db.add(db_field)

    doc.status = "Review Required"
    db.commit()
    db.refresh(doc)

    # Auto-create a ReviewCase and assign to the user's manager
    case_count = db.query(ReviewCase).count() + 1
    case_number = f"RC-{datetime.utcnow().year}-{str(case_count).zfill(5)}"
    review_case = ReviewCase(
        case_number=case_number,
        user_id=current_user.id,
        manager_id=current_user.manager_id,
        document_id=doc.id,
        asset_id=asset_id,
        status="Submitted for Review",
    )
    db.add(review_case)
    db.commit()
    db.refresh(review_case)

    # Record initial status
    history = StatusHistory(case_id=review_case.id, actor_id=current_user.id, actor_email=current_user.email,
                             previous_status=None, new_status="Submitted for Review",
                             notes="Document uploaded and submitted automatically")
    db.add(history)

    # Notify manager
    if current_user.manager_id:
        create_notification(db, current_user.manager_id,
                            f"New Document Review: {filename}",
                            f"User {current_user.full_name} submitted a document for review. Case: {case_number}",
                            notif_type="Review", severity="Info", link_url=f"/manager/cases/{review_case.id}")

    # Notify user
    create_notification(db, current_user.id, "Document Submitted for Review",
                        f"Your document '{filename}' has been submitted. Case: {case_number}",
                        notif_type="Review", severity="Info", link_url=f"/my-cases/{review_case.id}")
    db.commit()

    log_audit(db, current_user, "DOCUMENT_UPLOAD", "DOCUMENT", str(doc.id), {
        "file_name": doc.file_name, "fields_extracted": len(extracted_fields), "hash": sha256_hash, "case_number": case_number
    })

    return {
        "message": "Document uploaded and submitted for review",
        "document_id": doc.id,
        "case_id": review_case.id,
        "case_number": case_number,
        "extracted_fields_count": len(extracted_fields),
        "status": doc.status,
    }

@api_router.get("/documents/{document_id}")
def get_document_detail(document_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    # Ownership check
    if current_user.role == "User" and doc.uploaded_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    fields = db.query(ExtractedField).filter(ExtractedField.document_id == doc.id).all()
    return {
        "id": doc.id, "file_name": doc.file_name, "file_size_bytes": doc.file_size_bytes,
        "document_category": doc.document_category, "status": doc.status, "review_status": doc.review_status,
        "asset_id": doc.asset_id, "raw_text": doc.raw_text, "created_at": doc.created_at.strftime("%Y-%m-%d %H:%M"),
        "extracted_fields": [{"id": f.id, "field_name": f.field_name, "extracted_value": f.extracted_value,
                               "corrected_value": f.corrected_value, "confidence": float(f.confidence),
                               "is_corrected": f.is_corrected, "is_ambiguous": f.is_ambiguous,
                               "field_category": f.field_category} for f in fields],
    }

@api_router.post("/documents/{document_id}/fields/{field_id}/correct")
def correct_extracted_field(document_id: int, field_id: int, payload: FieldCorrectionRequest,
                             db: Session = Depends(get_db), current_user: User = Depends(require_manager_or_admin)):
    field = db.query(ExtractedField).filter(ExtractedField.id == field_id, ExtractedField.document_id == document_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
    prev_val = field.corrected_value or field.extracted_value
    field.corrected_value = payload.corrected_value
    field.is_corrected = True
    field.is_ambiguous = False
    db.commit()
    log_audit(db, current_user, "FIELD_CORRECTION", "EXTRACTED_FIELD", str(field.id),
              {"field_name": field.field_name, "previous_value": prev_val, "new_value": payload.corrected_value})
    return {"message": "Field corrected successfully", "field_id": field.id, "value": payload.corrected_value}

@api_router.post("/documents/{document_id}/approve")
def approve_document_review(document_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_manager_or_admin)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    doc.review_status = "Approved"
    doc.status = "Processed"
    db.commit()
    log_audit(db, current_user, "DOCUMENT_APPROVE", "DOCUMENT", str(doc.id), {"file_name": doc.file_name})
    return {"message": "Document approved and marked as processed"}

# =============================================================================
# REVIEW CASES API
# =============================================================================

def _serialize_case(case: ReviewCase, db: Session) -> dict:
    unread = db.query(CaseMessage).filter(
        CaseMessage.case_id == case.id, CaseMessage.is_read == False
    ).count()
    return {
        "id": case.id, "case_number": case.case_number,
        "user_id": case.user_id, "user_name": case.user.full_name if case.user else None,
        "manager_id": case.manager_id, "manager_name": case.manager.full_name if case.manager else None,
        "document_id": case.document_id, "document_name": case.document.file_name if case.document else None,
        "asset_id": case.asset_id, "asset_name": case.asset.name if case.asset else None,
        "status": case.status, "priority": case.priority,
        "manager_notes": case.manager_notes, "rejection_reason": case.rejection_reason,
        "required_corrections": case.required_corrections, "user_response": case.user_response,
        "created_at": case.created_at, "updated_at": case.updated_at, "completed_at": case.completed_at,
        "unread_messages": unread,
    }

@api_router.get("/cases")
def get_cases(status_filter: Optional[str] = None, db: Session = Depends(get_db),
              current_user: User = Depends(get_current_user)):
    q = db.query(ReviewCase)
    if current_user.role == "User":
        q = q.filter(ReviewCase.user_id == current_user.id)
    elif current_user.role == "Contract Manager":
        q = q.filter(ReviewCase.manager_id == current_user.id)
    # Admin sees all

    if status_filter and status_filter != "All":
        q = q.filter(ReviewCase.status == status_filter)

    cases = q.order_by(desc(ReviewCase.created_at)).all()
    return [_serialize_case(c, db) for c in cases]

@api_router.get("/cases/{case_id}")
def get_case_detail(case_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    case = db.query(ReviewCase).filter(ReviewCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # Access check
    if current_user.role == "User" and case.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if current_user.role == "Contract Manager" and case.manager_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    history = [{"id": h.id, "actor_email": h.actor_email, "previous_status": h.previous_status,
                 "new_status": h.new_status, "notes": h.notes, "changed_at": h.changed_at}
               for h in case.status_history]

    messages = []
    for m in case.messages:
        # Mark messages as read for the viewer
        if current_user.role == "User" and m.sender_role == "Manager" and not m.is_read:
            m.is_read = True
        elif current_user.role == "Contract Manager" and m.sender_role == "User" and not m.is_read:
            m.is_read = True
        messages.append({"id": m.id, "sender_id": m.sender_id, "sender_name": m.sender.full_name if m.sender else None,
                          "sender_role": m.sender_role, "message": m.message, "is_read": m.is_read,
                          "created_at": m.created_at})
    db.commit()

    return {**_serialize_case(case, db), "status_history": history, "messages": messages}

@api_router.post("/cases/{case_id}/manager-action")
def manager_action_on_case(case_id: int, payload: ReviewCaseManagerAction,
                            db: Session = Depends(get_db), current_user: User = Depends(require_manager_or_admin)):
    case = db.query(ReviewCase).filter(ReviewCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    if current_user.role == "Contract Manager" and case.manager_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your assigned case")

    valid_transitions = {
        "approve": "Approved",
        "reject": "Rejected",
        "request_correction": "Resubmission Required",
        "request_info": "Action Required",
        "reopen": "Under Manager Review",
        "start_review": "Under Manager Review",
        "complete": "Completed",
    }

    if payload.action not in valid_transitions:
        raise HTTPException(status_code=400, detail=f"Invalid action. Valid: {list(valid_transitions.keys())}")

    prev_status = case.status
    new_status = valid_transitions[payload.action]

    case.status = new_status
    if payload.manager_notes:
        case.manager_notes = payload.manager_notes
    if payload.rejection_reason:
        case.rejection_reason = payload.rejection_reason
    if payload.required_corrections:
        case.required_corrections = payload.required_corrections

    if new_status in ["Approved", "Rejected", "Completed"]:
        case.completed_at = datetime.utcnow()

    record_status_change(db, case, current_user, prev_status, new_status, payload.manager_notes)

    # Update document status too
    if case.document_id and new_status == "Approved":
        doc = db.query(Document).filter(Document.id == case.document_id).first()
        if doc:
            doc.review_status = "Approved"
            doc.status = "Processed"

    db.commit()

    # Notify user
    notif_msgs = {
        "approve": ("Your Case Approved ✅", f"Case {case.case_number} has been approved by your manager."),
        "reject": ("Case Rejected ❌", f"Case {case.case_number} was rejected. Reason: {payload.rejection_reason or 'See case details.'}"),
        "request_correction": ("Correction Required 📝", f"Manager requests document correction for case {case.case_number}. {payload.required_corrections or ''}"),
        "request_info": ("Action Required ⚠️", f"Your manager needs additional information for case {case.case_number}."),
        "complete": ("Case Completed ✅", f"Case {case.case_number} has been completed."),
        "start_review": ("Review Started 🔍", f"Manager has started reviewing your case {case.case_number}."),
        "reopen": ("Case Reopened 🔄", f"Case {case.case_number} has been reopened by the manager."),
    }
    if payload.action in notif_msgs:
        title, msg = notif_msgs[payload.action]
        create_notification(db, case.user_id, title, msg, notif_type="Review",
                            severity="Warning" if payload.action in ["reject", "request_correction"] else "Info",
                            link_url=f"/my-cases/{case.id}")
    db.commit()

    log_audit(db, current_user, f"CASE_{payload.action.upper()}", "REVIEW_CASE", str(case.id),
              {"case_number": case.case_number, "new_status": new_status})
    return {"message": f"Case {payload.action} successfully", "case_id": case.id, "status": case.status}

@api_router.post("/cases/{case_id}/user-response")
def user_respond_to_case(case_id: int, payload: ReviewCaseUserResponse,
                          db: Session = Depends(get_db), current_user: User = Depends(require_user)):
    case = db.query(ReviewCase).filter(ReviewCase.id == case_id, ReviewCase.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    if case.status not in ["Action Required", "Resubmission Required", "Rejected"]:
        raise HTTPException(status_code=400, detail=f"Cannot respond to a case in status '{case.status}'")

    prev_status = case.status
    case.user_response = payload.user_response
    new_status = "Submitted for Review" if payload.resubmit else case.status
    case.status = new_status
    record_status_change(db, case, current_user, prev_status, new_status, payload.user_response)
    db.commit()

    # Notify manager
    if case.manager_id:
        create_notification(db, case.manager_id, f"User Responded: Case {case.case_number}",
                            f"User {current_user.full_name} responded to case {case.case_number}.",
                            notif_type="Review", severity="Info", link_url=f"/manager/cases/{case.id}")
    db.commit()

    log_audit(db, current_user, "CASE_USER_RESPONSE", "REVIEW_CASE", str(case.id), {"new_status": new_status})
    return {"message": "Response submitted", "case_id": case.id, "status": case.status}

@api_router.post("/cases/{case_id}/messages")
def send_case_message(case_id: int, payload: CaseMessageCreate,
                       db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    case = db.query(ReviewCase).filter(ReviewCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # Access check
    if current_user.role == "User" and case.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if current_user.role == "Contract Manager" and case.manager_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    sender_role = "Manager" if current_user.role in ["Contract Manager", "Administrator"] else "User"
    msg = CaseMessage(case_id=case.id, sender_id=current_user.id, sender_role=sender_role,
                       message=payload.message, is_read=False)
    db.add(msg)

    # Notify recipient
    if sender_role == "Manager":
        create_notification(db, case.user_id, f"New Message on Case {case.case_number}",
                            f"Manager {current_user.full_name} sent a message on your case.",
                            notif_type="Message", severity="Info", link_url=f"/my-cases/{case.id}")
    else:
        if case.manager_id:
            create_notification(db, case.manager_id, f"New Message on Case {case.case_number}",
                                f"User {current_user.full_name} replied on case {case.case_number}.",
                                notif_type="Message", severity="Info", link_url=f"/manager/cases/{case.id}")
    db.commit()

    return {"message": "Message sent", "message_id": msg.id}

# =============================================================================
# SUGGESTIONS API
# =============================================================================

def _serialize_suggestion(s: Suggestion) -> dict:
    return {
        "id": s.id, "manager_id": s.manager_id,
        "manager_name": s.manager.full_name if s.manager else None,
        "user_id": s.user_id, "user_name": s.user.full_name if s.user else None,
        "case_id": s.case_id, "document_id": s.document_id, "asset_id": s.asset_id,
        "title": s.title, "description": s.description, "priority": s.priority, "status": s.status,
        "user_response": s.user_response, "manager_reply": s.manager_reply,
        "created_at": s.created_at, "updated_at": s.updated_at, "resolved_at": s.resolved_at,
    }

@api_router.get("/suggestions")
def get_suggestions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Suggestion)
    if current_user.role == "User":
        q = q.filter(Suggestion.user_id == current_user.id)
    elif current_user.role == "Contract Manager":
        q = q.filter(Suggestion.manager_id == current_user.id)
    suggestions = q.order_by(desc(Suggestion.created_at)).all()
    return [_serialize_suggestion(s) for s in suggestions]

@api_router.post("/suggestions")
def create_suggestion(payload: SuggestionCreate, db: Session = Depends(get_db),
                      current_user: User = Depends(require_manager_or_admin)):
    # Validate the user belongs to the manager
    target_user = db.query(User).filter(User.id == payload.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")
    if current_user.role == "Contract Manager" and target_user.manager_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only send suggestions to your assigned users")

    suggestion = Suggestion(
        manager_id=current_user.id, user_id=payload.user_id, case_id=payload.case_id,
        document_id=payload.document_id, asset_id=payload.asset_id,
        title=payload.title, description=payload.description, priority=payload.priority, status="Sent",
    )
    db.add(suggestion)
    db.commit()
    db.refresh(suggestion)

    create_notification(db, payload.user_id, f"New Suggestion: {payload.title}",
                        f"Manager {current_user.full_name} sent you a suggestion. Priority: {payload.priority}",
                        notif_type="Suggestion", severity="Warning" if payload.priority == "Urgent" else "Info",
                        link_url=f"/suggestions/{suggestion.id}")
    db.commit()

    log_audit(db, current_user, "SUGGESTION_CREATE", "SUGGESTION", str(suggestion.id), {"title": payload.title, "user_id": payload.user_id})
    return _serialize_suggestion(suggestion)

@api_router.post("/suggestions/{suggestion_id}/user-respond")
def user_respond_suggestion(suggestion_id: int, payload: SuggestionUserRespond,
                              db: Session = Depends(get_db), current_user: User = Depends(require_user)):
    s = db.query(Suggestion).filter(Suggestion.id == suggestion_id, Suggestion.user_id == current_user.id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Suggestion not found")
    s.user_response = payload.user_response
    s.status = payload.status
    if payload.status == "Resolved":
        s.resolved_at = datetime.utcnow()
    db.commit()

    create_notification(db, s.manager_id, f"User Responded to Suggestion",
                        f"User {current_user.full_name} responded to '{s.title}'.",
                        notif_type="Suggestion", severity="Info", link_url=f"/suggestions/{s.id}")
    db.commit()
    return _serialize_suggestion(s)

@api_router.post("/suggestions/{suggestion_id}/manager-reply")
def manager_reply_suggestion(suggestion_id: int, payload: SuggestionManagerReply,
                               db: Session = Depends(get_db), current_user: User = Depends(require_manager_or_admin)):
    s = db.query(Suggestion).filter(Suggestion.id == suggestion_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Suggestion not found")
    if current_user.role == "Contract Manager" and s.manager_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    s.manager_reply = payload.manager_reply
    s.status = payload.status
    if payload.status in ["Resolved", "Closed"]:
        s.resolved_at = datetime.utcnow()
    db.commit()

    create_notification(db, s.user_id, f"Manager Replied to Suggestion",
                        f"Your manager replied to '{s.title}'.",
                        notif_type="Suggestion", severity="Info", link_url=f"/suggestions/{s.id}")
    db.commit()
    return _serialize_suggestion(s)

# =============================================================================
# MANAGER - USER MANAGEMENT (Manager's Assigned Users)
# =============================================================================

@api_router.get("/manager/my-users")
def get_manager_assigned_users(db: Session = Depends(get_db), current_user: User = Depends(require_manager_or_admin)):
    if current_user.role == "Administrator":
        users = db.query(User).filter(User.role == "User").all()
    else:
        users = db.query(User).filter(User.manager_id == current_user.id).all()
    return [_serialize_user(u) for u in users]

@api_router.get("/manager/users/{user_id}/profile")
def get_user_profile_for_manager(user_id: int, db: Session = Depends(get_db),
                                  current_user: User = Depends(require_manager_or_admin)):
    user = db.query(User).filter(User.id == user_id, User.role == "User").first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if current_user.role == "Contract Manager" and user.manager_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    assets = db.query(Asset).filter(Asset.owner_id == user.id).all()
    docs = db.query(Document).filter(Document.uploaded_by_id == user.id).order_by(desc(Document.created_at)).limit(10).all()
    cases = db.query(ReviewCase).filter(ReviewCase.user_id == user.id).order_by(desc(ReviewCase.created_at)).all()
    suggestions = db.query(Suggestion).filter(Suggestion.user_id == user.id).order_by(desc(Suggestion.created_at)).all()

    return {
        "user": _serialize_user(user),
        "assets": [{"id": a.id, "asset_id": a.asset_id, "name": a.name, "category": a.category,
                    "serial_number": a.serial_number, "warranty_end_date": str(a.warranty_end_date) if a.warranty_end_date else None,
                    "status": a.status} for a in assets],
        "documents": [{"id": d.id, "file_name": d.file_name, "category": d.document_category, "status": d.status,
                       "created_at": d.created_at.strftime("%Y-%m-%d %H:%M")} for d in docs],
        "cases": [_serialize_case(c, db) for c in cases],
        "suggestions": [_serialize_suggestion(s) for s in suggestions],
        "stats": {
            "total_assets": len(assets),
            "total_documents": len(docs),
            "open_cases": len([c for c in cases if c.status not in ["Completed", "Rejected"]]),
            "active_suggestions": len([s for s in suggestions if s.status in ["Sent", "Acknowledged", "In Progress"]]),
        }
    }

# =============================================================================
# VALIDATION ENGINE API
# =============================================================================

@api_router.post("/validation/run", response_model=ValidationRunResponse)
def trigger_validation_run(target_type: str = "Global", target_id: Optional[int] = None,
                            db: Session = Depends(get_db), current_user: User = Depends(require_manager_or_admin)):
    val_run = ValidationEngine.run_validation(db, target_type=target_type, target_id=target_id, user_id=current_user.id)
    log_audit(db, current_user, "VALIDATION_RUN", "VALIDATION_RUN", str(val_run.id),
              {"risk_score": val_run.risk_score, "total_issues": val_run.total_issues})
    return val_run

@api_router.get("/validation/runs", response_model=List[ValidationRunResponse])
def get_validation_runs(db: Session = Depends(get_db)):
    return db.query(ValidationRun).order_by(desc(ValidationRun.created_at)).limit(20).all()

@api_router.get("/validation/runs/{run_id}", response_model=ValidationRunResponse)
def get_validation_run_detail(run_id: int, db: Session = Depends(get_db)):
    run = db.query(ValidationRun).filter(ValidationRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Validation run not found")
    return run

@api_router.get("/validation/findings", response_model=List[FindingResponse])
def get_findings(severity: Optional[str] = None, category: Optional[str] = None,
                 status_filter: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(ValidationFinding)
    if severity and severity != "All":
        q = q.filter(ValidationFinding.severity == severity)
    if category and category != "All":
        q = q.filter(ValidationFinding.category == category)
    if status_filter and status_filter != "All":
        q = q.filter(ValidationFinding.status == status_filter)
    return q.order_by(desc(ValidationFinding.created_at)).all()

@api_router.post("/validation/findings/{finding_id}/resolve")
def resolve_finding(finding_id: int, payload: FindingResolutionRequest,
                    db: Session = Depends(get_db), current_user: User = Depends(require_manager_or_admin)):
    finding = db.query(ValidationFinding).filter(ValidationFinding.id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    finding.status = payload.status
    finding.resolution_notes = payload.resolution_notes
    finding.resolved_by_id = current_user.id
    finding.resolved_at = datetime.utcnow()
    db.commit()
    log_audit(db, current_user, "FINDING_RESOLVE", "VALIDATION_FINDING", str(finding.id),
              {"rule_id": finding.rule_id, "status": payload.status, "notes": payload.resolution_notes})
    return {"message": "Finding resolution recorded"}

# =============================================================================
# CONTRACTS & RENEWALS API
# =============================================================================

@api_router.get("/contracts", response_model=List[ContractResponse])
def get_contracts(contract_type: Optional[str] = None, status_filter: Optional[str] = None,
                  db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Contract)
    if current_user.role == "User":
        owned_asset_ids = [a.id for a in db.query(Asset).filter(Asset.owner_id == current_user.id).all()]
        if owned_asset_ids:
            q = q.filter(Contract.asset_id.in_(owned_asset_ids))
        else:
            return []

    if contract_type and contract_type != "All":
        q = q.filter(Contract.contract_type == contract_type)
    if status_filter and status_filter != "All":
        q = q.filter(Contract.status == status_filter)

    contracts = q.order_by(Contract.end_date).all()
    res = []
    for c in contracts:
        res.append({
            "id": c.id, "contract_number": c.contract_number, "contract_type": c.contract_type,
            "title": c.title, "asset_id": c.asset_id, "asset_name": c.asset.name if c.asset else None,
            "asset_serial": c.asset.serial_number if c.asset else None, "vendor_id": c.vendor_id,
            "vendor_name": c.vendor.name if c.vendor else None, "start_date": c.start_date, "end_date": c.end_date,
            "contract_amount": float(c.contract_amount or 0), "tax_amount": float(c.tax_amount or 0),
            "total_amount": float(c.total_amount or 0), "coverage_type": c.coverage_type,
            "coverage_description": c.coverage_description,
            "preventive_maintenance_frequency": c.preventive_maintenance_frequency,
            "response_time_hours": c.response_time_hours, "parts_replacement_terms": c.parts_replacement_terms,
            "labour_coverage": c.labour_coverage, "exclusions": c.exclusions, "renewal_terms": c.renewal_terms,
            "cancellation_terms": c.cancellation_terms, "status": c.status, "auto_renewal": c.auto_renewal,
            "renewal_owner": c.renewal_owner, "notes": c.notes, "is_demo": c.is_demo, "created_at": c.created_at,
        })
    return res

@api_router.post("/contracts", response_model=ContractResponse)
def create_contract(payload: ContractCreate, db: Session = Depends(get_db), current_user: User = Depends(require_manager_or_admin)):
    contract = Contract(**payload.model_dump())
    db.add(contract)
    db.commit()
    db.refresh(contract)
    log_audit(db, current_user, "CONTRACT_CREATE", "CONTRACT", str(contract.id), {"contract_number": contract.contract_number})
    return contract

@api_router.get("/renewals/upcoming")
def get_upcoming_renewals(window_days: int = 90, db: Session = Depends(get_db)):
    today = date.today()
    limit_date = today + timedelta(days=window_days)
    contracts = db.query(Contract).filter(Contract.end_date >= today, Contract.end_date <= limit_date).order_by(Contract.end_date).all()
    items = []
    total_val = 0.0
    for c in contracts:
        days_left = (c.end_date - today).days
        cost = float(c.total_amount or 0)
        total_val += cost
        items.append({
            "id": c.id, "contract_number": c.contract_number, "title": c.title,
            "asset_name": c.asset.name if c.asset else "Unassigned",
            "vendor_name": c.vendor.name if c.vendor else "Unknown Vendor",
            "end_date": str(c.end_date), "days_remaining": days_left, "total_amount": cost,
            "auto_renewal": c.auto_renewal, "renewal_owner": c.renewal_owner or "Unassigned",
            "status": "Due within 30 days" if days_left <= 30 else ("Due in 60 days" if days_left <= 60 else "Due in 90 days"),
        })
    return {"window_days": window_days, "total_renewals_count": len(items), "total_estimated_budget": total_val, "renewals": items}

# =============================================================================
# VENDORS API
# =============================================================================

@api_router.get("/vendors", response_model=List[VendorResponse])
def get_vendors(db: Session = Depends(get_db)):
    vendors = db.query(Vendor).all()
    res = []
    for v in vendors:
        c_count = db.query(Contract).filter(Contract.vendor_id == v.id, Contract.status == "Active").count()
        a_count = db.query(Asset).filter(Asset.vendor_id == v.id).count()
        issues = db.query(ValidationFinding).join(Asset, ValidationFinding.asset_id == Asset.id).filter(
            Asset.vendor_id == v.id, ValidationFinding.status == "Open").count()
        res.append({
            "id": v.id, "name": v.name, "contact_person": v.contact_person, "email": v.email, "phone": v.phone,
            "address": v.address, "support_email": v.support_email, "support_phone": v.support_phone,
            "sla_response_hours": v.sla_response_hours, "notes": v.notes, "created_at": v.created_at,
            "active_contracts_count": c_count, "supplied_assets_count": a_count, "open_issues_count": issues,
        })
    return res

@api_router.post("/vendors", response_model=VendorResponse)
def create_vendor(payload: VendorCreate, db: Session = Depends(get_db), current_user: User = Depends(require_manager_or_admin)):
    v = Vendor(**payload.model_dump())
    db.add(v)
    db.commit()
    db.refresh(v)
    log_audit(db, current_user, "VENDOR_CREATE", "VENDOR", str(v.id), {"name": v.name})
    return v

# =============================================================================
# REPORTS & EXPORTS API
# =============================================================================

@api_router.get("/reports/findings/csv")
def export_findings_csv(db: Session = Depends(get_db)):
    findings = db.query(ValidationFinding).all()
    data = [{"rule_id": f.rule_id, "rule_title": f.rule_title, "category": f.category, "severity": f.severity,
              "is_definite": f.is_definite, "affected_field": f.affected_field, "what_detected": f.what_detected,
              "why_matters": f.why_matters, "recommended_action": f.recommended_action, "status": f.status} for f in findings]
    csv_str = ReportService.generate_findings_csv(data)
    return Response(content=csv_str, media_type="text/csv",
                    headers={"Content-Disposition": f"attachment; filename=WarrantyIQ_Findings_{date.today()}.csv"})

@api_router.get("/reports/validation/{run_id}/pdf")
def export_validation_run_pdf(run_id: int, db: Session = Depends(get_db)):
    run = db.query(ValidationRun).filter(ValidationRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    findings = db.query(ValidationFinding).filter(ValidationFinding.validation_run_id == run.id).all()
    run_dict = {"run_identifier": run.run_identifier, "risk_score": run.risk_score, "risk_level": run.risk_level,
                 "overall_status": run.overall_status, "total_issues": run.total_issues, "critical_issues": run.critical_issues,
                 "high_issues": run.high_issues, "medium_issues": run.medium_issues, "execution_time_ms": run.execution_time_ms}
    findings_list = [{"rule_id": f.rule_id, "severity": f.severity, "what_detected": f.what_detected,
                       "why_matters": f.why_matters, "recommended_action": f.recommended_action} for f in findings]
    pdf_bytes = ReportService.generate_validation_pdf(run_dict, findings_list)
    return Response(content=pdf_bytes, media_type="application/pdf",
                    headers={"Content-Disposition": f"attachment; filename=WarrantyIQ_Report_{run.run_identifier}.pdf"})

# =============================================================================
# AUDIT LOGS & NOTIFICATIONS API
# =============================================================================

@api_router.get("/audit-logs")
def get_audit_logs(limit: int = 50, db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(desc(AuditLog.timestamp)).limit(limit).all()
    return [{"id": l.id, "actor_email": l.actor_email, "action": l.action, "entity_type": l.entity_type,
              "entity_id": l.entity_id, "details": l.details, "timestamp": l.timestamp.strftime("%Y-%m-%d %H:%M:%S UTC")} for l in logs]

@api_router.get("/notifications")
def get_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Return notifications for this user + global (user_id is None)
    notifs = db.query(Notification).filter(
        or_(Notification.user_id == current_user.id, Notification.user_id == None)
    ).order_by(desc(Notification.created_at)).limit(50).all()
    return notifs

@api_router.post("/notifications/{notif_id}/read")
def mark_notification_read(notif_id: int, db: Session = Depends(get_db)):
    n = db.query(Notification).filter(Notification.id == notif_id).first()
    if n:
        n.is_read = True
        db.commit()
    return {"message": "Notification marked as read"}

# =============================================================================
# SETTINGS API (Rule Configs — Admin only)
# =============================================================================

@api_router.get("/settings/rules")
def get_rule_configs(db: Session = Depends(get_db)):
    return db.query(ValidationRuleConfig).all()

@api_router.put("/settings/rules/{rule_id}")
def update_rule_config(rule_id: str, payload: Dict[str, Any] = Body(...),
                        db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    rule = db.query(ValidationRuleConfig).filter(ValidationRuleConfig.rule_id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    if "weight" in payload:
        rule.weight = int(payload["weight"])
    if "is_enabled" in payload:
        rule.is_enabled = bool(payload["is_enabled"])
    db.commit()
    log_audit(db, admin, "RULE_CONFIG_UPDATE", "RULE_CONFIG", rule_id, payload)
    return {"message": f"Rule {rule_id} updated"}

# =============================================================================
# ADMIN — USER MANAGEMENT
# =============================================================================

@api_router.get("/admin/users")
def get_all_users(query: Optional[str] = None, role: Optional[str] = None, status_filter: Optional[str] = None,
                  db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    q = db.query(User)
    if query:
        s = f"%{query.strip()}%"
        q = q.filter(or_(User.email.ilike(s), User.full_name.ilike(s), User.department.ilike(s)))
    if role and role != "All":
        q = q.filter(User.role == role)
    if status_filter == "Active":
        q = q.filter(User.is_active == True)
    elif status_filter == "Inactive":
        q = q.filter(User.is_active == False)
    users = q.order_by(User.id).all()
    return [_serialize_user(u) for u in users]

@api_router.post("/admin/users")
def create_user(payload: UserCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    email = payload.email.strip().lower()
    if not re.match(r"^[\w\.\-]+@[\w\.\-]+\.\w+$", email):
        raise HTTPException(status_code=400, detail="Invalid email format")
    if payload.role == "Administrator":
        raise HTTPException(status_code=400, detail="Cannot create another Administrator account")
    if db.query(User).filter(func.lower(User.email) == email).first():
        raise HTTPException(status_code=400, detail=f"Email '{email}' already registered")

    new_user = User(
        email=email, full_name=payload.full_name.strip(),
        hashed_password=get_password_hash(payload.password.strip()),
        role=payload.role, department=payload.department, phone=payload.phone,
        is_active=payload.is_active, manager_id=payload.manager_id, created_at=datetime.utcnow()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    log_audit(db, admin, "USER_CREATE", "USER", str(new_user.id),
              {"email": new_user.email, "role": new_user.role, "manager_id": new_user.manager_id})
    return _serialize_user(new_user)

@api_router.get("/admin/users/{user_id}")
def get_user_detail(user_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _serialize_user(user)

@api_router.put("/admin/users/{user_id}")
def update_user_details(user_id: int, payload: UserUpdate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id and payload.role and payload.role != "Administrator":
        raise HTTPException(status_code=400, detail="Cannot demote the active Administrator account")

    changes = {}
    if payload.full_name is not None:
        changes["full_name"] = payload.full_name.strip()
        user.full_name = payload.full_name.strip()
    if payload.department is not None:
        changes["department"] = payload.department
        user.department = payload.department
    if payload.phone is not None:
        changes["phone"] = payload.phone
        user.phone = payload.phone
    if payload.role is not None:
        if payload.role not in ["Contract Manager", "User", "Viewer", "Administrator"]:
            raise HTTPException(status_code=400, detail="Invalid role")
        if payload.role == "Administrator" and user.role != "Administrator":
            raise HTTPException(status_code=400, detail="Role elevation to Administrator is restricted")
        changes["role"] = payload.role
        user.role = payload.role
    if payload.is_active is not None:
        if user.id == admin.id and not payload.is_active:
            raise HTTPException(status_code=400, detail="Cannot deactivate the active Administrator account")
        changes["is_active"] = payload.is_active
        user.is_active = payload.is_active
    if payload.manager_id is not None:
        # Allow setting to 0 = remove manager
        mgr_id = payload.manager_id if payload.manager_id != 0 else None
        if mgr_id:
            mgr = db.query(User).filter(User.id == mgr_id, User.role == "Contract Manager").first()
            if not mgr:
                raise HTTPException(status_code=400, detail="Manager not found or not a Contract Manager role")
        changes["manager_id"] = mgr_id
        user.manager_id = mgr_id

    db.commit()
    db.refresh(user)
    log_audit(db, admin, "USER_UPDATE", "USER", str(user.id), changes)
    return _serialize_user(user)

@api_router.post("/admin/users/{user_id}/status")
def toggle_user_status(user_id: int, status_data: Dict[str, bool] = Body(...),
                        db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    is_active = status_data.get("is_active", True)
    user.is_active = is_active
    db.commit()
    action = "USER_ACTIVATE" if is_active else "USER_DEACTIVATE"
    log_audit(db, admin, action, "USER", str(user.id), {"is_active": is_active})
    return {"message": f"User {'activated' if is_active else 'deactivated'}", "is_active": user.is_active}

@api_router.post("/admin/users/{user_id}/reset-password")
def reset_user_password(user_id: int, payload: PasswordResetRequest,
                         db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if len(payload.new_password.strip()) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    user.hashed_password = get_password_hash(payload.new_password.strip())
    db.commit()
    log_audit(db, admin, "USER_PASSWORD_RESET", "USER", str(user.id), {"email": user.email})
    return {"message": "Password reset successfully"}

@api_router.post("/admin/users/{user_id}/assign-manager")
def assign_manager_to_user(user_id: int, data: Dict[str, Optional[int]] = Body(...),
                            db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    manager_id = data.get("manager_id")
    if manager_id:
        mgr = db.query(User).filter(User.id == manager_id, User.role == "Contract Manager").first()
        if not mgr:
            raise HTTPException(status_code=400, detail="Manager not found")
    user.manager_id = manager_id
    db.commit()
    log_audit(db, admin, "USER_MANAGER_ASSIGN", "USER", str(user.id), {"manager_id": manager_id})
    return {"message": "Manager assigned successfully", "manager_id": manager_id}

# =============================================================================
# ADMIN — MANAGER PERFORMANCE MONITORING
# =============================================================================

def get_date_bounds(days_filter=None, start_date=None, end_date=None):
    now = datetime.utcnow()
    since = None
    until = now
    if days_filter == "7d":
        since = now - timedelta(days=7)
    elif days_filter == "30d":
        since = now - timedelta(days=30)
    elif days_filter == "90d":
        since = now - timedelta(days=90)
    elif days_filter == "custom" and start_date:
        try:
            since = datetime.strptime(start_date, "%Y-%m-%d")
            if end_date:
                until = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
        except Exception:
            pass
    return since, until

@api_router.get("/admin/managers/performance")
def get_manager_performance(period: Optional[str] = Query("all"),
                             start_date: Optional[str] = None, end_date: Optional[str] = None,
                             db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    since, until = get_date_bounds(period, start_date, end_date)
    managers = db.query(User).filter(User.role == "Contract Manager").all()

    manager_rows = []
    for m in managers:
        doc_q = db.query(Document).filter(Document.uploaded_by_id == m.id)
        if since:
            doc_q = doc_q.filter(Document.created_at >= since, Document.created_at <= until)
        docs = doc_q.all()

        run_q = db.query(ValidationRun).filter(ValidationRun.triggered_by_id == m.id)
        if since:
            run_q = run_q.filter(ValidationRun.created_at >= since, ValidationRun.created_at <= until)
        m_runs = run_q.count()

        f_res_q = db.query(ValidationFinding).filter(ValidationFinding.resolved_by_id == m.id)
        if since:
            f_res_q = f_res_q.filter(ValidationFinding.resolved_at >= since, ValidationFinding.resolved_at <= until)
        m_findings_resolved = f_res_q.count()

        task_q = db.query(TaskAssignment).filter(TaskAssignment.assigned_to_id == m.id)
        if since:
            task_q = task_q.filter(TaskAssignment.created_at >= since, TaskAssignment.created_at <= until)
        tasks = task_q.all()

        cases_q = db.query(ReviewCase).filter(ReviewCase.manager_id == m.id)
        if since:
            cases_q = cases_q.filter(ReviewCase.created_at >= since, ReviewCase.created_at <= until)
        m_cases = cases_q.all()

        last_audit = db.query(AuditLog).filter(AuditLog.actor_id == m.id).order_by(desc(AuditLog.timestamp)).first()
        assigned_user_count = db.query(User).filter(User.manager_id == m.id).count()

        manager_rows.append({
            "id": m.id, "full_name": m.full_name, "email": m.email, "department": m.department,
            "is_active": m.is_active, "created_at": m.created_at.strftime("%Y-%m-%d"),
            "last_login": m.last_login.strftime("%Y-%m-%d %H:%M:%S") if m.last_login else None,
            "assigned_users": assigned_user_count,
            "documents_uploaded": len(docs),
            "documents_processed": len([d for d in docs if d.status == "Processed"]),
            "documents_pending_review": len([d for d in docs if d.status in ["Review Required", "Processing", "Uploaded"]]),
            "validation_runs": m_runs, "findings_resolved": m_findings_resolved,
            "tasks_completed": len([t for t in tasks if t.status == "Completed"]),
            "tasks_outstanding": len([t for t in tasks if t.status in ["Open", "In Progress"]]),
            "cases_pending": len([c for c in m_cases if c.status == "Submitted for Review"]),
            "cases_in_review": len([c for c in m_cases if c.status == "Under Manager Review"]),
            "cases_completed": len([c for c in m_cases if c.status in ["Completed", "Approved"]]),
            "last_activity": last_audit.timestamp.strftime("%Y-%m-%d %H:%M:%S") if last_audit else None,
            "last_action": last_audit.action if last_audit else None,
        })

    total_managers = len(managers)
    active_managers = len([m for m in managers if m.is_active])
    return {
        "kpis": {
            "total_managers": total_managers, "active_managers": active_managers,
            "total_cases_pending": db.query(ReviewCase).filter(ReviewCase.status == "Submitted for Review").count(),
            "total_cases_in_review": db.query(ReviewCase).filter(ReviewCase.status == "Under Manager Review").count(),
            "total_cases_completed": db.query(ReviewCase).filter(ReviewCase.status.in_(["Completed", "Approved"])).count(),
            "findings_awaiting_resolution": db.query(ValidationFinding).filter(ValidationFinding.status == "Open").count(),
        },
        "managers": manager_rows,
    }

@api_router.get("/admin/managers/{manager_id}/activity")
def get_individual_manager_activity(manager_id: int, period: Optional[str] = Query("all"),
                                     start_date: Optional[str] = None, end_date: Optional[str] = None,
                                     status_filter: Optional[str] = None,
                                     db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "Administrator" and current_user.id != manager_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    manager = db.query(User).filter(User.id == manager_id).first()
    if not manager:
        raise HTTPException(status_code=404, detail="User not found")

    since, until = get_date_bounds(period, start_date, end_date)
    doc_q = db.query(Document).filter(Document.uploaded_by_id == manager.id)
    if since:
        doc_q = doc_q.filter(Document.created_at >= since, Document.created_at <= until)
    docs = doc_q.order_by(desc(Document.created_at)).all()

    run_q = db.query(ValidationRun).filter(ValidationRun.triggered_by_id == manager.id)
    if since:
        run_q = run_q.filter(ValidationRun.created_at >= since, ValidationRun.created_at <= until)
    runs = run_q.order_by(desc(ValidationRun.created_at)).all()

    task_q = db.query(TaskAssignment).filter(TaskAssignment.assigned_to_id == manager.id)
    if since:
        task_q = task_q.filter(TaskAssignment.created_at >= since, TaskAssignment.created_at <= until)
    if status_filter and status_filter != "All":
        task_q = task_q.filter(TaskAssignment.status == status_filter)
    tasks = task_q.order_by(desc(TaskAssignment.created_at)).all()

    cases_q = db.query(ReviewCase).filter(ReviewCase.manager_id == manager.id)
    if since:
        cases_q = cases_q.filter(ReviewCase.created_at >= since, ReviewCase.created_at <= until)
    cases = cases_q.order_by(desc(ReviewCase.created_at)).all()

    audit_q = db.query(AuditLog).filter(AuditLog.actor_id == manager.id)
    if since:
        audit_q = audit_q.filter(AuditLog.timestamp >= since, AuditLog.timestamp <= until)
    audit_events = audit_q.order_by(desc(AuditLog.timestamp)).limit(50).all()

    assigned_users = db.query(User).filter(User.manager_id == manager.id).all()

    return {
        "profile": {
            "id": manager.id, "full_name": manager.full_name, "email": manager.email,
            "role": manager.role, "department": manager.department, "is_active": manager.is_active,
            "created_at": manager.created_at.strftime("%Y-%m-%d"),
            "last_login": manager.last_login.strftime("%Y-%m-%d %H:%M:%S") if manager.last_login else None,
        },
        "assigned_users": [_serialize_user(u) for u in assigned_users],
        "stats": {
            "documents_uploaded": len(docs), "documents_processed": len([d for d in docs if d.status == "Processed"]),
            "validation_runs": len(runs), "tasks_assigned": len(tasks),
            "tasks_pending": len([t for t in tasks if t.status in ["Open", "In Progress"]]),
            "tasks_completed": len([t for t in tasks if t.status == "Completed"]),
            "cases_pending": len([c for c in cases if c.status == "Submitted for Review"]),
            "cases_in_review": len([c for c in cases if c.status == "Under Manager Review"]),
            "cases_completed": len([c for c in cases if c.status in ["Completed", "Approved"]]),
        },
        "documents": [{"id": d.id, "file_name": d.file_name, "category": d.document_category,
                        "status": d.status, "review_status": d.review_status,
                        "created_at": d.created_at.strftime("%Y-%m-%d %H:%M")} for d in docs],
        "cases": [_serialize_case(c, db) for c in cases],
        "tasks": [{"id": t.id, "task_identifier": t.task_identifier, "title": t.title, "task_type": t.task_type,
                    "priority": t.priority, "status": t.status, "due_date": str(t.due_date) if t.due_date else None,
                    "created_at": t.created_at.strftime("%Y-%m-%d %H:%M")} for t in tasks],
        "timeline": [{"id": a.id, "timestamp": a.timestamp.strftime("%Y-%m-%d %H:%M:%S UTC"),
                       "action": a.action, "entity_type": a.entity_type, "entity_id": a.entity_id,
                       "details": a.details} for a in audit_events],
    }

# =============================================================================
# TASK ASSIGNMENTS API
# =============================================================================

@api_router.get("/tasks")
def get_tasks(status_filter: Optional[str] = None, priority: Optional[str] = None,
              assigned_to_id: Optional[int] = None, db: Session = Depends(get_db),
              current_user: User = Depends(get_current_user)):
    q = db.query(TaskAssignment)
    if current_user.role == "Contract Manager" and not assigned_to_id:
        q = q.filter(TaskAssignment.assigned_to_id == current_user.id)
    elif assigned_to_id:
        q = q.filter(TaskAssignment.assigned_to_id == assigned_to_id)
    if status_filter and status_filter != "All":
        q = q.filter(TaskAssignment.status == status_filter)
    if priority and priority != "All":
        q = q.filter(TaskAssignment.priority == priority)

    tasks = q.order_by(desc(TaskAssignment.created_at)).all()
    res = []
    for t in tasks:
        res.append({
            "id": t.id, "task_identifier": t.task_identifier, "task_type": t.task_type, "title": t.title,
            "priority": t.priority, "status": t.status, "asset_id": t.asset_id,
            "asset_name": t.asset.name if t.asset else None, "contract_id": t.contract_id,
            "contract_number": t.contract.contract_number if t.contract else None,
            "document_id": t.document_id, "finding_id": t.finding_id,
            "assigned_to_id": t.assigned_to_id, "assigned_to_name": t.assigned_to.full_name if t.assigned_to else None,
            "assigned_to_email": t.assigned_to.email if t.assigned_to else None, "created_by_id": t.created_by_id,
            "created_by_name": t.created_by.full_name if t.created_by else None,
            "due_date": t.due_date, "notes": t.notes, "resolution_notes": t.resolution_notes,
            "completed_at": t.completed_at, "created_at": t.created_at, "updated_at": t.updated_at,
        })
    return res

@api_router.post("/tasks")
def create_task(payload: TaskCreate, db: Session = Depends(get_db), current_user: User = Depends(require_manager_or_admin)):
    assigned_user = db.query(User).filter(User.id == payload.assigned_to_id).first()
    if not assigned_user:
        raise HTTPException(status_code=404, detail="Assigned user not found")
    task_ident = f"TSK-{datetime.utcnow().strftime('%Y%m')}-{uuid.uuid4().hex[:5].upper()}"
    task = TaskAssignment(
        task_identifier=task_ident, task_type=payload.task_type, title=payload.title.strip(),
        priority=payload.priority, status="Open", asset_id=payload.asset_id,
        contract_id=payload.contract_id, document_id=payload.document_id, finding_id=payload.finding_id,
        assigned_to_id=payload.assigned_to_id, created_by_id=current_user.id,
        due_date=payload.due_date, notes=payload.notes, created_at=datetime.utcnow()
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    create_notification(db, payload.assigned_to_id, f"New Task Assigned: {task.title}",
                        f"Task {task.task_identifier} (Priority: {task.priority}) assigned by {current_user.full_name}.",
                        severity="Warning" if task.priority in ["Critical", "High"] else "Info", link_url="/my-work")
    db.commit()

    log_audit(db, current_user, "TASK_CREATE", "TASK", str(task.id),
              {"task_identifier": task.task_identifier, "assigned_to": assigned_user.email})
    return {"id": task.id, "task_identifier": task.task_identifier, "title": task.title,
            "status": task.status, "priority": task.priority, "assigned_to_name": assigned_user.full_name}

@api_router.patch("/tasks/{task_id}/status")
def update_task_status(task_id: int, payload: TaskUpdateStatus, db: Session = Depends(get_db),
                        current_user: User = Depends(get_current_user)):
    task = db.query(TaskAssignment).filter(TaskAssignment.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if current_user.role != "Administrator" and current_user.id not in [task.assigned_to_id, task.created_by_id]:
        raise HTTPException(status_code=403, detail="Not authorized to update this task")
    if payload.status not in ["Open", "In Progress", "Completed", "Cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    prev_status = task.status
    task.status = payload.status
    if payload.resolution_notes:
        task.resolution_notes = payload.resolution_notes.strip()
    if payload.status == "Completed" and not task.completed_at:
        task.completed_at = datetime.utcnow()
    elif payload.status != "Completed":
        task.completed_at = None
    task.updated_at = datetime.utcnow()
    db.commit()

    log_audit(db, current_user, "TASK_STATUS_UPDATE", "TASK", str(task.id),
              {"task_identifier": task.task_identifier, "previous_status": prev_status, "new_status": task.status})
    return {"message": "Task status updated", "task_id": task.id, "status": task.status}

@api_router.get("/admin/tasks/monitoring")
def get_tasks_monitoring(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    today = date.today()
    all_tasks = db.query(TaskAssignment).all()
    overdue = [t for t in all_tasks if t.due_date and t.due_date < today and t.status in ["Open", "In Progress"]]
    pending = [t for t in all_tasks if t.status in ["Open", "In Progress"]]
    completed = [t for t in all_tasks if t.status == "Completed"]
    managers = db.query(User).filter(User.role == "Contract Manager").all()
    by_manager = []
    for m in managers:
        m_tasks = [t for t in all_tasks if t.assigned_to_id == m.id]
        by_manager.append({
            "manager_id": m.id, "manager_name": m.full_name, "manager_email": m.email,
            "total_assigned": len(m_tasks),
            "pending": len([t for t in m_tasks if t.status in ["Open", "In Progress"]]),
            "completed": len([t for t in m_tasks if t.status == "Completed"]),
            "overdue": len([t for t in m_tasks if t.due_date and t.due_date < today and t.status in ["Open", "In Progress"]]),
        })
    return {"summary": {"total_tasks": len(all_tasks), "overdue_tasks": len(overdue),
                         "pending_reviews": len(pending), "completed_tasks": len(completed)},
            "by_manager": by_manager}
