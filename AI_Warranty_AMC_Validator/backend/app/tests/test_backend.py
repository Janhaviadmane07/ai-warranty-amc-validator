import sys
import pytest
from datetime import date, timedelta
from app.core.database import SessionLocal, Base, engine
from app.models.entities import Asset, Contract, Document, ExtractedField, User
from app.core.security import get_password_hash, verify_password
from app.validators.rules_engine import ValidationEngine
from app.services.document_parser import DocumentParserService
from app.services.report_service import ReportService

@pytest.fixture(scope="module")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    yield db
    db.close()

def test_password_hashing():
    raw = "SecureSecret123"
    hashed = get_password_hash(raw)
    assert hashed != raw
    assert verify_password(raw, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

def test_document_parser_normalization():
    assert DocumentParserService._normalize_date("15/08/2025") == "2025-08-15"
    assert DocumentParserService._normalize_date("2025-12-31") == "2025-12-31"

def test_document_deterministic_extraction():
    sample_text = """
    TAX INVOICE - DELL TECHNOLOGIES
    Serial No: DL-SRV-99412
    Contract #: AMC-2026-99
    Effective from: 2026-01-10
    Valid upto: 2027-01-09
    Total Amount: 145,000.00
    Coverage: Comprehensive maintenance with Quarterly visits
    """
    fields = DocumentParserService.parse_contract_fields(sample_text, "AMC Agreement")
    field_dict = {f["field_name"]: f["extracted_value"] for f in fields}
    
    assert field_dict.get("serial_number") == "DL-SRV-99412"
    assert field_dict.get("contract_number") == "AMC-2026-99"
    assert field_dict.get("start_date") == "2026-01-10"
    assert field_dict.get("end_date") == "2027-01-09"
    assert field_dict.get("total_amount") == "145000.00"
    assert "Comprehensive" in field_dict.get("coverage_description", "")
    assert field_dict.get("preventive_maintenance_frequency") == "Quarterly"

def test_validation_rule_w02_inverted_dates(db_session):
    today = date.today()
    import uuid
    uid = uuid.uuid4().hex[:6]
    test_asset = Asset(
        asset_id=f"TEST-INV-{uid}",
        name="Test Inverted Asset",
        category="Server",
        manufacturer="Dell",
        serial_number=f"SN-INV-{uid}",
        warranty_start_date=today,
        warranty_end_date=today - timedelta(days=30), # Inverted!
        status="Active"
    )
    db_session.add(test_asset)
    db_session.commit()

    run = ValidationEngine.run_validation(db_session, target_type="Asset", target_id=test_asset.id)
    rule_ids = [f.rule_id for f in run.findings]
    assert "W02" in rule_ids

    # Cleanup
    db_session.delete(test_asset)
    db_session.commit()

def test_validation_rule_w10_missing_serial(db_session):
    today = date.today()
    import uuid
    uid = uuid.uuid4().hex[:6]
    test_asset = Asset(
        asset_id=f"TEST-NOSN-{uid}",
        name="Test No SN Asset",
        category="Network",
        manufacturer="Cisco",
        serial_number="UNKNOWN",
        status="Active"
    )
    db_session.add(test_asset)
    db_session.commit()

    run = ValidationEngine.run_validation(db_session, target_type="Asset", target_id=test_asset.id)
    rule_ids = [f.rule_id for f in run.findings]
    assert "W10" in rule_ids

    # Cleanup
    db_session.delete(test_asset)
    db_session.commit()

def test_report_service_csv_generation():
    findings = [{
        "rule_id": "W02",
        "rule_title": "Warranty end date occurs before start date",
        "category": "Warranty",
        "severity": "Critical",
        "affected_field": "warranty_end_date",
        "what_detected": "End date before start date",
        "why_matters": "Logical contradiction",
        "recommended_action": "Invert dates",
        "status": "Open",
        "is_definite": True
    }]
    csv_out = ReportService.generate_findings_csv(findings)
    assert "Rule ID" in csv_out
    assert "W02" in csv_out
    assert "Critical" in csv_out

def test_report_service_pdf_generation():
    run_dict = {
        "run_identifier": "VRUN-TEST-001",
        "risk_score": 30,
        "risk_level": "Moderate Risk",
        "overall_status": "Warning",
        "total_issues": 1,
        "critical_issues": 0,
        "high_issues": 1,
        "medium_issues": 0,
        "execution_time_ms": 12
    }
    findings = [{
        "rule_id": "W04",
        "severity": "High",
        "what_detected": "Warranty start precedes purchase",
        "why_matters": "Inconsistent procurement date",
        "recommended_action": "Check invoice"
    }]
    pdf_bytes = ReportService.generate_validation_pdf(run_dict, findings)
    assert len(pdf_bytes) > 500
    assert pdf_bytes.startswith(b"%PDF")

# -------------------------------------------------------------
# SPECIFICATION VERIFICATION TESTS (FEATURES 1 TO 8)
# -------------------------------------------------------------
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token

@pytest.fixture(scope="module")
def client():
    return TestClient(app)

def test_admin_creates_manager(client, db_session):
    admin = db_session.query(User).filter(User.role == "Administrator").first()
    token = create_access_token(admin.id, admin.role)
    
    import uuid
    rand_email = f"manager_test_{uuid.uuid4().hex[:6]}@warrantyiq.com"
    resp = client.post(
        "/api/v1/admin/users",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "email": rand_email,
            "full_name": "Test Manager Ops",
            "password": "ManagerPassword123!",
            "role": "Contract Manager",
            "department": "Engineering"
        }
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["email"] == rand_email
    assert data["role"] == "Contract Manager"
    assert data["is_active"] is True
    # Confirm password is never exposed
    assert "password" not in data
    assert "hashed_password" not in data

def test_admin_creates_viewer(client, db_session):
    admin = db_session.query(User).filter(User.role == "Administrator").first()
    token = create_access_token(admin.id, admin.role)
    
    import uuid
    rand_email = f"viewer_test_{uuid.uuid4().hex[:6]}@warrantyiq.com"
    resp = client.post(
        "/api/v1/admin/users",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "email": rand_email,
            "full_name": "Test Viewer Auditor",
            "password": "ViewerPassword123!",
            "role": "Viewer",
            "department": "External Audit"
        }
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["email"] == rand_email
    assert data["role"] == "Viewer"

def test_duplicate_email_rejected(client, db_session):
    admin = db_session.query(User).filter(User.role == "Administrator").first()
    token = create_access_token(admin.id, admin.role)

    resp = client.post(
        "/api/v1/admin/users",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "email": "admin@warrantyiq.com", # already exists
            "full_name": "Duplicate Admin",
            "password": "Password123!",
            "role": "Contract Manager"
        }
    )
    assert resp.status_code == 400
    assert "already registered" in resp.json()["detail"]

def test_manager_cannot_create_users(client, db_session):
    manager = db_session.query(User).filter(User.role == "Contract Manager").first()
    token = create_access_token(manager.id, manager.role)

    resp = client.post(
        "/api/v1/admin/users",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "email": "hack_attempt@warrantyiq.com",
            "full_name": "Unauthorized User",
            "password": "Password123!",
            "role": "Viewer"
        }
    )
    # Manager must receive 403 Forbidden
    assert resp.status_code == 403
    assert "Administrator privileges required" in resp.json()["detail"]

def test_viewer_cannot_modify_restricted_records(client, db_session):
    viewer = db_session.query(User).filter(User.role == "Viewer").first()
    token = create_access_token(viewer.id, viewer.role)

    # Attempt to create asset as Viewer
    resp = client.post(
        "/api/v1/assets",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "asset_id": "AST-HACK-001",
            "name": "Unauthorized Server",
            "category": "Server",
            "manufacturer": "Dell",
            "serial_number": "SN-UNAUTH-01"
        }
    )
    assert resp.status_code == 403
    assert "Manager or Administrator privileges" in resp.json()["detail"]

def test_manager_metrics_reflect_real_database_activity(client, db_session):
    admin = db_session.query(User).filter(User.role == "Administrator").first()
    token = create_access_token(admin.id, admin.role)

    resp = client.get(
        "/api/v1/admin/managers/performance?period=all",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "kpis" in data
    assert "managers" in data
    assert data["kpis"]["total_managers"] >= 1
    assert data["kpis"]["active_managers"] >= 1
    # Metrics must be integer counts from real DB
    assert isinstance(data["kpis"]["documents_uploaded"], int)
    assert isinstance(data["kpis"]["tasks_completed"], int)

def test_manager_detail_activity(client, db_session):
    admin = db_session.query(User).filter(User.role == "Administrator").first()
    manager = db_session.query(User).filter(User.role == "Contract Manager").first()
    token = create_access_token(admin.id, admin.role)

    resp = client.get(
        f"/api/v1/admin/managers/{manager.id}/activity",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["profile"]["email"] == manager.email
    assert "stats" in data
    assert "tasks" in data
    assert "timeline" in data

def test_task_assignment_and_status_update(client, db_session):
    admin = db_session.query(User).filter(User.role == "Administrator").first()
    manager = db_session.query(User).filter(User.role == "Contract Manager").first()
    admin_token = create_access_token(admin.id, admin.role)
    manager_token = create_access_token(manager.id, manager.role)

    # Admin assigns a task to manager
    create_resp = client.post(
        "/api/v1/tasks",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "title": "Verify Switch Firmware SLA",
            "task_type": "Warranty Verification",
            "priority": "High",
            "assigned_to_id": manager.id,
            "due_date": str(date.today() + timedelta(days=5)),
            "notes": "Confirm core switch warranty status with Cisco portal."
        }
    )
    assert create_resp.status_code == 200, create_resp.text
    task_data = create_resp.json()
    task_id = task_data["id"]
    assert task_data["status"] == "Open"
    assert task_data["assigned_to_email"] == manager.email

    # Manager updates status to Completed with resolution notes
    update_resp = client.patch(
        f"/api/v1/tasks/{task_id}/status",
        headers={"Authorization": f"Bearer {manager_token}"},
        json={
            "status": "Completed",
            "resolution_notes": "Firmware SLA validated and active through 2028."
        }
    )
    assert update_resp.status_code == 200
    updated = update_resp.json()
    assert updated["status"] == "Completed"
    assert updated["resolution_notes"] == "Firmware SLA validated and active through 2028."
    assert updated["completed_at"] is not None

def test_important_operations_create_audit_entries(client, db_session):
    admin = db_session.query(User).filter(User.role == "Administrator").first()
    token = create_access_token(admin.id, admin.role)

    # Fetch audit logs
    resp = client.get("/api/v1/audit-logs", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    logs = resp.json()
    actions = [l["action"] for l in logs]
    assert "LOGIN_SUCCESS" in actions or "USER_CREATE" in actions or "TASK_CREATE" in actions

def test_deactivated_accounts_cannot_authenticate(client, db_session):
    admin = db_session.query(User).filter(User.role == "Administrator").first()
    admin_token = create_access_token(admin.id, admin.role)

    import uuid
    test_email = f"deactivated_{uuid.uuid4().hex[:6]}@warrantyiq.com"
    pwd = "TempPassword123!"

    # Create account
    client.post(
        "/api/v1/admin/users",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "email": test_email,
            "full_name": "Deactivate Candidate",
            "password": pwd,
            "role": "Viewer",
            "is_active": False
        }
    )

    # Attempt login
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": test_email, "password": pwd}
    )
    assert login_resp.status_code == 403
    assert "deactivated" in login_resp.json()["detail"].lower()

def test_unauthorized_api_requests_rejected(client):
    # No token provided to sensitive admin endpoint
    resp = client.post(
        "/api/v1/admin/users",
        headers={"Authorization": "Bearer invalid_bad_token_123"},
        json={"email": "bad@test.com", "full_name": "Bad", "password": "123"}
    )
    assert resp.status_code in [401, 403]
