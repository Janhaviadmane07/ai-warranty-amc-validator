from datetime import date, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

# ─── Auth ────────────────────────────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]

class LoginRequest(BaseModel):
    email: str
    password: str

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "User"          # Administrator, Contract Manager, User, Viewer
    department: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool = True
    manager_id: Optional[int] = None   # assign to a manager at creation time

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None
    manager_id: Optional[int] = None

class PasswordResetRequest(BaseModel):
    new_password: str

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    department: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    manager_id: Optional[int] = None
    manager_name: Optional[str] = None

    class Config:
        from_attributes = True

# ─── Review Cases ─────────────────────────────────────────────────────────────

class ReviewCaseCreate(BaseModel):
    document_id: Optional[int] = None
    asset_id: Optional[int] = None
    priority: str = "Normal"

class ReviewCaseManagerAction(BaseModel):
    """Payload Manager sends when acting on a case."""
    action: str                         # approve, reject, request_correction, request_info, reopen
    manager_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    required_corrections: Optional[str] = None

class ReviewCaseUserResponse(BaseModel):
    user_response: str
    resubmit: bool = False              # if True, status goes back to "Submitted for Review"

class ReviewCaseResponse(BaseModel):
    id: int
    case_number: str
    user_id: int
    user_name: Optional[str] = None
    manager_id: Optional[int] = None
    manager_name: Optional[str] = None
    document_id: Optional[int] = None
    document_name: Optional[str] = None
    asset_id: Optional[int] = None
    asset_name: Optional[str] = None
    status: str
    priority: str
    manager_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    required_corrections: Optional[str] = None
    user_response: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    unread_messages: int = 0

    class Config:
        from_attributes = True

# ─── Suggestions ─────────────────────────────────────────────────────────────

class SuggestionCreate(BaseModel):
    user_id: int
    title: str
    description: str
    priority: str = "Normal"
    case_id: Optional[int] = None
    document_id: Optional[int] = None
    asset_id: Optional[int] = None

class SuggestionUserRespond(BaseModel):
    user_response: str
    status: str = "Acknowledged"        # Acknowledged, In Progress, Resolved

class SuggestionManagerReply(BaseModel):
    manager_reply: str
    status: str                         # In Progress, Resolved, Closed

class SuggestionResponse(BaseModel):
    id: int
    manager_id: int
    manager_name: Optional[str] = None
    user_id: int
    user_name: Optional[str] = None
    case_id: Optional[int] = None
    document_id: Optional[int] = None
    asset_id: Optional[int] = None
    title: str
    description: str
    priority: str
    status: str
    user_response: Optional[str] = None
    manager_reply: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# ─── Case Messages ────────────────────────────────────────────────────────────

class CaseMessageCreate(BaseModel):
    message: str

class CaseMessageResponse(BaseModel):
    id: int
    case_id: int
    sender_id: int
    sender_name: Optional[str] = None
    sender_role: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

# ─── Status History ──────────────────────────────────────────────────────────

class StatusHistoryResponse(BaseModel):
    id: int
    actor_email: Optional[str] = None
    previous_status: Optional[str] = None
    new_status: str
    notes: Optional[str] = None
    changed_at: datetime

    class Config:
        from_attributes = True

# ─── Task Assignments ────────────────────────────────────────────────────────

class TaskCreate(BaseModel):
    title: str
    task_type: str = "Finding Review"
    priority: str = "Medium"
    assigned_to_id: int
    due_date: Optional[date] = None
    asset_id: Optional[int] = None
    contract_id: Optional[int] = None
    document_id: Optional[int] = None
    finding_id: Optional[int] = None
    notes: Optional[str] = None

class TaskUpdateStatus(BaseModel):
    status: str
    resolution_notes: Optional[str] = None

class TaskResponse(BaseModel):
    id: int
    task_identifier: str
    task_type: str
    title: str
    priority: str
    status: str
    asset_id: Optional[int] = None
    asset_name: Optional[str] = None
    contract_id: Optional[int] = None
    contract_number: Optional[str] = None
    document_id: Optional[int] = None
    finding_id: Optional[int] = None
    assigned_to_id: int
    assigned_to_name: Optional[str] = None
    assigned_to_email: Optional[str] = None
    created_by_id: int
    created_by_name: Optional[str] = None
    due_date: Optional[date] = None
    notes: Optional[str] = None
    resolution_notes: Optional[str] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ─── Vendor ──────────────────────────────────────────────────────────────────

class VendorBase(BaseModel):
    name: str
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    support_email: Optional[str] = None
    support_phone: Optional[str] = None
    sla_response_hours: int = 24
    notes: Optional[str] = None

class VendorCreate(VendorBase):
    pass

class VendorResponse(VendorBase):
    id: int
    created_at: datetime
    active_contracts_count: Optional[int] = 0
    supplied_assets_count: Optional[int] = 0
    open_issues_count: Optional[int] = 0

    class Config:
        from_attributes = True

# ─── Assets ──────────────────────────────────────────────────────────────────

class AssetBase(BaseModel):
    asset_id: str
    name: str
    category: str
    manufacturer: str
    model_number: Optional[str] = None
    serial_number: str
    purchase_date: Optional[date] = None
    purchase_price: Optional[float] = None
    department: Optional[str] = None
    location: Optional[str] = None
    assigned_user: Optional[str] = None
    status: str = "Active"
    warranty_start_date: Optional[date] = None
    warranty_end_date: Optional[date] = None
    vendor_id: Optional[int] = None
    notes: Optional[str] = None

class AssetCreate(AssetBase):
    pass

class AssetUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    manufacturer: Optional[str] = None
    model_number: Optional[str] = None
    serial_number: Optional[str] = None
    purchase_date: Optional[date] = None
    purchase_price: Optional[float] = None
    department: Optional[str] = None
    location: Optional[str] = None
    assigned_user: Optional[str] = None
    status: Optional[str] = None
    warranty_start_date: Optional[date] = None
    warranty_end_date: Optional[date] = None
    vendor_id: Optional[int] = None
    notes: Optional[str] = None

class AssetResponse(AssetBase):
    id: int
    is_demo: bool
    created_at: datetime
    updated_at: datetime
    vendor_name: Optional[str] = None
    active_amc_count: Optional[int] = 0
    open_issues_count: Optional[int] = 0

    class Config:
        from_attributes = True

# ─── Contracts ───────────────────────────────────────────────────────────────

class ContractBase(BaseModel):
    contract_number: str
    contract_type: str
    title: str
    asset_id: Optional[int] = None
    vendor_id: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    contract_amount: float = 0.0
    tax_amount: float = 0.0
    total_amount: float = 0.0
    coverage_type: str = "Comprehensive"
    coverage_description: Optional[str] = None
    preventive_maintenance_frequency: Optional[str] = None
    response_time_hours: Optional[int] = None
    parts_replacement_terms: Optional[str] = None
    labour_coverage: Optional[str] = None
    exclusions: Optional[str] = None
    renewal_terms: Optional[str] = None
    cancellation_terms: Optional[str] = None
    status: str = "Active"
    auto_renewal: bool = False
    renewal_owner: Optional[str] = None
    notes: Optional[str] = None

class ContractCreate(ContractBase):
    pass

class ContractResponse(ContractBase):
    id: int
    is_demo: bool
    created_at: datetime
    asset_name: Optional[str] = None
    asset_serial: Optional[str] = None
    vendor_name: Optional[str] = None

    class Config:
        from_attributes = True

# ─── Documents & Extraction ──────────────────────────────────────────────────

class ExtractedFieldItem(BaseModel):
    id: int
    field_name: str
    extracted_value: Optional[str] = None
    corrected_value: Optional[str] = None
    confidence: float
    is_corrected: bool
    is_ambiguous: bool
    field_category: str

    class Config:
        from_attributes = True

class FieldCorrectionRequest(BaseModel):
    corrected_value: str

class DocumentResponse(BaseModel):
    id: int
    file_name: str
    file_size_bytes: int
    mime_type: str
    document_category: str
    status: str
    review_status: str
    asset_id: Optional[int] = None
    created_at: datetime
    extracted_fields: List[ExtractedFieldItem] = []

    class Config:
        from_attributes = True

# ─── Validation ──────────────────────────────────────────────────────────────

class FindingResolutionRequest(BaseModel):
    status: str
    resolution_notes: str

class FindingResponse(BaseModel):
    id: int
    rule_id: str
    rule_title: str
    category: str
    severity: str
    asset_id: Optional[int] = None
    contract_id: Optional[int] = None
    document_id: Optional[int] = None
    affected_field: Optional[str] = None
    what_detected: str
    why_matters: str
    evidence: Optional[Dict[str, Any]] = None
    recommended_action: str
    is_definite: bool
    status: str
    resolution_notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ValidationRunResponse(BaseModel):
    id: int
    run_identifier: str
    target_type: str
    target_id: Optional[int] = None
    risk_score: int
    risk_level: str
    overall_status: str
    total_issues: int
    critical_issues: int
    high_issues: int
    medium_issues: int
    low_issues: int
    score_breakdown: Optional[Dict[str, Any]] = None
    execution_time_ms: int
    created_at: datetime
    findings: List[FindingResponse] = []

    class Config:
        from_attributes = True

# ─── Dashboard KPIs ──────────────────────────────────────────────────────────

class DashboardKPI(BaseModel):
    total_assets: int
    active_warranties: int
    active_amcs: int
    expired_contracts: int
    contracts_expiring_30_days: int
    open_validation_issues: int
    total_upcoming_renewal_expenditure: float
    coverage_distribution: Dict[str, int]
    vendor_distribution: List[Dict[str, Any]]
    severity_distribution: Dict[str, int]
    recent_runs: List[Dict[str, Any]]
    recent_uploads: List[Dict[str, Any]]
