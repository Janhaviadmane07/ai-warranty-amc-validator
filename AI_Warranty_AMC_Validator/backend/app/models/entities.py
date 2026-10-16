from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Numeric, Date, DateTime, Boolean, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    # Valid roles: Administrator, Contract Manager, User, Viewer
    role = Column(String(50), default="User", nullable=False)
    department = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    # Manager-User assignment: a User can be assigned to exactly one Manager
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    manager = relationship("User", foreign_keys="User.manager_id", remote_side="User.id", backref="assigned_users")

    # Relationships
    submitted_cases = relationship("ReviewCase", foreign_keys="ReviewCase.user_id", back_populates="user")
    managed_cases = relationship("ReviewCase", foreign_keys="ReviewCase.manager_id", back_populates="manager")
    sent_suggestions = relationship("Suggestion", foreign_keys="Suggestion.manager_id", back_populates="manager")
    received_suggestions = relationship("Suggestion", foreign_keys="Suggestion.user_id", back_populates="user")


class ReviewCase(Base):
    """Tracks the document review workflow between User -> Manager -> Admin."""
    __tablename__ = "review_cases"

    id = Column(Integer, primary_key=True, index=True)
    case_number = Column(String(50), unique=True, index=True, nullable=False)  # RC-2026-00001

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=True)

    # Status workflow:
    # Submitted for Review -> Under Manager Review -> Action Required
    # -> Resubmission Required -> Approved -> Rejected -> Completed
    status = Column(String(50), default="Submitted for Review", nullable=False)
    priority = Column(String(20), default="Normal", nullable=False)  # Low, Normal, High, Urgent

    manager_notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    required_corrections = Column(Text, nullable=True)
    user_response = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", foreign_keys=[user_id], back_populates="submitted_cases")
    manager = relationship("User", foreign_keys=[manager_id], back_populates="managed_cases")
    document = relationship("Document", foreign_keys=[document_id])
    asset = relationship("Asset", foreign_keys=[asset_id])
    messages = relationship("CaseMessage", back_populates="case", cascade="all, delete-orphan", order_by="CaseMessage.created_at")
    status_history = relationship("StatusHistory", back_populates="case", cascade="all, delete-orphan", order_by="StatusHistory.changed_at")


class Suggestion(Base):
    """Manager recommendations / action requests sent to Users."""
    __tablename__ = "suggestions"

    id = Column(Integer, primary_key=True, index=True)

    manager_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    case_id = Column(Integer, ForeignKey("review_cases.id"), nullable=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=True)

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(String(20), default="Normal", nullable=False)

    # Draft, Sent, Acknowledged, In Progress, Resolved, Closed
    status = Column(String(30), default="Sent", nullable=False)

    user_response = Column(Text, nullable=True)
    manager_reply = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    manager = relationship("User", foreign_keys=[manager_id], back_populates="sent_suggestions")
    user = relationship("User", foreign_keys=[user_id], back_populates="received_suggestions")
    case = relationship("ReviewCase", foreign_keys=[case_id])


class CaseMessage(Base):
    """Threaded messages within a review case between Manager and User."""
    __tablename__ = "case_messages"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("review_cases.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sender_role = Column(String(30), nullable=False)  # Manager, User
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("ReviewCase", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id])


class StatusHistory(Base):
    """Records every status transition on a ReviewCase."""
    __tablename__ = "status_history"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("review_cases.id"), nullable=False)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    actor_email = Column(String(255), nullable=True)
    previous_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=False)
    notes = Column(Text, nullable=True)
    changed_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("ReviewCase", back_populates="status_history")


class TaskAssignment(Base):
    __tablename__ = "task_assignments"

    id = Column(Integer, primary_key=True, index=True)
    task_identifier = Column(String(100), unique=True, index=True, nullable=False)
    task_type = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    priority = Column(String(50), default="Medium", nullable=False)
    status = Column(String(50), default="Open", nullable=False)

    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    finding_id = Column(Integer, ForeignKey("validation_findings.id"), nullable=True)

    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    due_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    resolution_notes = Column(Text, nullable=True)

    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
    asset = relationship("Asset", foreign_keys=[asset_id])
    contract = relationship("Contract", foreign_keys=[contract_id])
    document = relationship("Document", foreign_keys=[document_id])
    finding = relationship("ValidationFinding", foreign_keys=[finding_id])


class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True, nullable=False)
    contact_person = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    support_email = Column(String(255), nullable=True)
    support_phone = Column(String(50), nullable=True)
    sla_response_hours = Column(Integer, default=24)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    assets = relationship("Asset", back_populates="vendor")
    contracts = relationship("Contract", back_populates="vendor")


class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    manufacturer = Column(String(100), nullable=False)
    model_number = Column(String(100), nullable=True)
    serial_number = Column(String(100), index=True, nullable=False)
    purchase_date = Column(Date, nullable=True)
    purchase_price = Column(Numeric(12, 2), nullable=True)
    department = Column(String(100), nullable=True)
    location = Column(String(100), nullable=True)
    assigned_user = Column(String(100), nullable=True)
    # FK to the User who owns/registered this asset
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(50), default="Active")

    warranty_start_date = Column(Date, nullable=True)
    warranty_end_date = Column(Date, nullable=True)

    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)
    notes = Column(Text, nullable=True)
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    vendor = relationship("Vendor", back_populates="assets")
    documents = relationship("Document", back_populates="asset")
    contracts = relationship("Contract", back_populates="asset")
    validation_findings = relationship("ValidationFinding", back_populates="asset")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    file_name = Column(String(255), nullable=False)
    stored_path = Column(String(500), nullable=False)
    file_hash = Column(String(64), index=True, nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    document_category = Column(String(50), nullable=False)

    status = Column(String(50), default="Uploaded")
    review_status = Column(String(50), default="Pending Review")

    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=True)
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    raw_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    asset = relationship("Asset", back_populates="documents")
    extracted_fields = relationship("ExtractedField", back_populates="document", cascade="all, delete-orphan")


class ExtractedField(Base):
    __tablename__ = "extracted_fields"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)

    field_name = Column(String(100), nullable=False)
    extracted_value = Column(Text, nullable=True)
    corrected_value = Column(Text, nullable=True)
    confidence = Column(Numeric(5, 2), default=0.0)
    is_corrected = Column(Boolean, default=False)
    is_ambiguous = Column(Boolean, default=False)
    field_category = Column(String(50), default="General")

    document = relationship("Document", back_populates="extracted_fields")


class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)
    contract_number = Column(String(100), index=True, nullable=False)
    contract_type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)

    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)

    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)

    contract_amount = Column(Numeric(12, 2), default=0.00)
    tax_amount = Column(Numeric(12, 2), default=0.00)
    total_amount = Column(Numeric(12, 2), default=0.00)

    coverage_type = Column(String(100), default="Comprehensive")
    coverage_description = Column(Text, nullable=True)
    preventive_maintenance_frequency = Column(String(50), nullable=True)
    response_time_hours = Column(Integer, nullable=True)
    parts_replacement_terms = Column(Text, nullable=True)
    labour_coverage = Column(Text, nullable=True)
    exclusions = Column(Text, nullable=True)
    renewal_terms = Column(Text, nullable=True)
    cancellation_terms = Column(Text, nullable=True)

    status = Column(String(50), default="Active")
    auto_renewal = Column(Boolean, default=False)
    renewal_owner = Column(String(100), nullable=True)
    renewal_budget_approved = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)

    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    asset = relationship("Asset", back_populates="contracts")
    vendor = relationship("Vendor", back_populates="contracts")


class ValidationRun(Base):
    __tablename__ = "validation_runs"

    id = Column(Integer, primary_key=True, index=True)
    run_identifier = Column(String(100), unique=True, index=True, nullable=False)
    triggered_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    target_type = Column(String(50), nullable=False)
    target_id = Column(Integer, nullable=True)

    risk_score = Column(Integer, default=0)
    risk_level = Column(String(50), default="Low Risk")
    overall_status = Column(String(50), default="Pass")

    total_issues = Column(Integer, default=0)
    critical_issues = Column(Integer, default=0)
    high_issues = Column(Integer, default=0)
    medium_issues = Column(Integer, default=0)
    low_issues = Column(Integer, default=0)

    score_breakdown = Column(JSON, nullable=True)
    execution_time_ms = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    findings = relationship("ValidationFinding", back_populates="validation_run", cascade="all, delete-orphan")


class ValidationFinding(Base):
    __tablename__ = "validation_findings"

    id = Column(Integer, primary_key=True, index=True)
    validation_run_id = Column(Integer, ForeignKey("validation_runs.id"), nullable=False)

    rule_id = Column(String(50), index=True, nullable=False)
    rule_title = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False)
    severity = Column(String(50), nullable=False)

    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)

    affected_field = Column(String(100), nullable=True)
    what_detected = Column(Text, nullable=False)
    why_matters = Column(Text, nullable=False)
    evidence = Column(JSON, nullable=True)
    recommended_action = Column(Text, nullable=False)
    is_definite = Column(Boolean, default=True)

    status = Column(String(50), default="Open")
    resolution_notes = Column(Text, nullable=True)
    resolved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    validation_run = relationship("ValidationRun", back_populates="findings")
    asset = relationship("Asset", back_populates="validation_findings")


class ValidationRuleConfig(Base):
    __tablename__ = "validation_rule_configs"

    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False)
    severity = Column(String(50), nullable=False)
    weight = Column(Integer, default=10)
    is_enabled = Column(Boolean, default=True)
    description = Column(Text, nullable=True)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # None = global/system-wide
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), default="System")
    severity = Column(String(50), default="Info")
    is_read = Column(Boolean, default=False)
    link_url = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_id = Column(Integer, nullable=True)
    actor_email = Column(String(255), nullable=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(100), nullable=False)
    entity_id = Column(String(100), nullable=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(100), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
