import re
import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.entities import (
    Asset, Contract, Document, ExtractedField, ValidationRun, ValidationFinding, ValidationRuleConfig
)

# Standard Rule Definitions and Initial Weights
DEFAULT_RULES = {
    # Warranty Rules
    "W01": {"title": "Missing warranty start or end date", "category": "Warranty", "severity": "High", "weight": 20, "desc": "Warranty record is missing critical coverage boundary dates."},
    "W02": {"title": "Warranty end date occurs before start date", "category": "Warranty", "severity": "Critical", "weight": 30, "desc": "Logical inversion: warranty expiration date precedes initiation date."},
    "W03": {"title": "Warranty duration conflicts with recorded dates", "category": "Warranty", "severity": "Medium", "weight": 10, "desc": "Stated coverage duration (e.g. 12 months) does not match the calendar difference."},
    "W04": {"title": "Warranty date conflicts with purchase/installation date", "category": "Warranty", "severity": "High", "weight": 20, "desc": "Warranty start date precedes the verified asset purchase or installation date."},
    "W05": {"title": "Asset serial number conflicts across supporting records", "category": "Warranty", "severity": "Critical", "weight": 30, "desc": "Serial number in invoice/warranty does not match physical asset register."},
    "W06": {"title": "Vendor or manufacturer details conflict", "category": "Warranty", "severity": "Medium", "weight": 10, "desc": "Manufacturer specified on card diverges from registered asset manufacturer."},
    "W07": {"title": "Warranty coverage has expired", "category": "Warranty", "severity": "Medium", "weight": 10, "desc": "Asset is currently outside its OEM warranty period without recorded replacement coverage."},
    "W08": {"title": "Warranty is approaching expiration (within 30 days)", "category": "Warranty", "severity": "Low", "weight": 5, "desc": "OEM warranty expires within 30 days; review maintenance transition."},
    "W09": {"title": "Multiple warranty records refer to same asset & period", "category": "Warranty", "severity": "High", "weight": 20, "desc": "Duplicate or overlapping primary warranty records found."},
    "W10": {"title": "Required asset identifiers are missing", "category": "Warranty", "severity": "High", "weight": 20, "desc": "Critical tracking identifiers such as serial number or asset tag are empty."},

    # AMC Rules
    "A01": {"title": "Missing AMC start or end date", "category": "AMC", "severity": "High", "weight": 20, "desc": "AMC agreement is missing effective start or expiration dates."},
    "A02": {"title": "AMC end date occurs before start date", "category": "AMC", "severity": "Critical", "weight": 30, "desc": "Logical contradiction: AMC termination date precedes the start date."},
    "A03": {"title": "AMC contract has expired", "category": "AMC", "severity": "Medium", "weight": 10, "desc": "Annual maintenance contract has passed its scheduled end date without renewal."},
    "A04": {"title": "AMC renewal is approaching (within 30 days)", "category": "AMC", "severity": "Low", "weight": 5, "desc": "Maintenance agreement will expire within 30 days; renewal action required."},
    "A05": {"title": "AMC coverage period misaligned with requirements", "category": "AMC", "severity": "Medium", "weight": 10, "desc": "Contract duration fails to meet minimum SLA or annual operational period."},
    "A06": {"title": "AMC and warranty coverage overlap redundantly", "category": "AMC", "severity": "Medium", "weight": 10, "desc": "Active comprehensive AMC runs concurrently with valid OEM warranty."},
    "A07": {"title": "AMC amount or commercial terms missing", "category": "AMC", "severity": "Medium", "weight": 10, "desc": "Contract value or payment schedules are omitted or set to zero."},
    "A08": {"title": "AMC coverage description or service scope is missing", "category": "AMC", "severity": "Medium", "weight": 10, "desc": "Service scope (Comprehensive/Non-comprehensive) is not specified."},
    "A09": {"title": "Preventive maintenance frequency commitment missing", "category": "AMC", "severity": "Low", "weight": 5, "desc": "Agreement lacks stipulated routine PM visit schedule (e.g. Quarterly)."},
    "A10": {"title": "Duplicate or overlapping AMC agreements for same asset", "category": "AMC", "severity": "Critical", "weight": 30, "desc": "Multiple concurrent maintenance contracts detected for the same machine."},
    "A11": {"title": "Active high-value asset lacking maintenance coverage", "category": "AMC", "severity": "High", "weight": 20, "desc": "Mission-critical equipment has expired warranty and no active AMC contract."},
    "A12": {"title": "Auto-renewal terms require legal/manager review", "category": "AMC", "severity": "Low", "weight": 5, "desc": "Contract contains automated rollover clause with cost escalation."},

    # Cross-Document Rules
    "C01": {"title": "Cross-document asset identifier mismatch", "category": "Cross-Document", "severity": "Critical", "weight": 30, "desc": "Invoice, warranty card, and contract cite incompatible asset numbers."},
    "C02": {"title": "Contract references unknown or archived asset", "category": "Cross-Document", "severity": "High", "weight": 20, "desc": "Maintenance agreement binds to an asset that is archived or unlisted."},
    "C03": {"title": "Contract dates contain unresolved contradictions", "category": "Cross-Document", "severity": "High", "weight": 20, "desc": "Invoice billing dates post-date contract effective execution dates."},
    "C04": {"title": "Potential duplicate document detected via cryptographic hash", "category": "Cross-Document", "severity": "Medium", "weight": 10, "desc": "Uploaded file SHA-256 matches an existing document already in repository."},
    "C05": {"title": "Supporting document pending mandatory review", "category": "Cross-Document", "severity": "Low", "weight": 5, "desc": "Contract is linked to an unverified or recently extracted document."},
    "C06": {"title": "Mandatory field missing from uploaded document", "category": "Cross-Document", "severity": "Medium", "weight": 10, "desc": "Key contractual field (e.g. Vendor, Invoice Date) could not be extracted."},
}

class ValidationEngine:
    @staticmethod
    def ensure_default_rule_configs(db: Session):
        """Seed or sync rule configurations in DB."""
        for rule_id, data in DEFAULT_RULES.items():
            existing = db.query(ValidationRuleConfig).filter(ValidationRuleConfig.rule_id == rule_id).first()
            if not existing:
                cfg = ValidationRuleConfig(
                    rule_id=rule_id,
                    name=data["title"],
                    category=data["category"],
                    severity=data["severity"],
                    weight=data["weight"],
                    is_enabled=True,
                    description=data["desc"]
                )
                db.add(cfg)
        db.commit()

    @staticmethod
    def run_validation(db: Session, target_type: str = "Global", target_id: Optional[int] = None, user_id: Optional[int] = None) -> ValidationRun:
        start_time = datetime.datetime.utcnow()
        ValidationEngine.ensure_default_rule_configs(db)
        
        # Load rule weights and enabled flags
        configs = {cfg.rule_id: cfg for cfg in db.query(ValidationRuleConfig).all()}
        
        findings: List[Dict[str, Any]] = []
        today = datetime.date.today()

        # Query targets
        if target_type == "Asset" and target_id:
            assets = db.query(Asset).filter(Asset.id == target_id).all()
        else:
            assets = db.query(Asset).filter(Asset.status != "Archived").all()

        contracts = db.query(Contract).all()
        documents = db.query(Document).all()

        # Build Lookups
        asset_map = {a.id: a for a in assets}
        contracts_by_asset = {}
        for c in contracts:
            if c.asset_id:
                contracts_by_asset.setdefault(c.asset_id, []).append(c)

        # -------------------------------------------------------------
        # 1. EVALUATE ASSETS & WARRANTIES (W01 - W10)
        # -------------------------------------------------------------
        for asset in assets:
            # W10: Required identifiers missing
            if not asset.serial_number or asset.serial_number.strip().upper() in ["UNKNOWN", "N/A", "NONE", ""]:
                findings.append(ValidationEngine._create_finding_dict(
                    "W10", asset_id=asset.id, affected_field="serial_number",
                    what=f"Asset {asset.asset_id} is missing a physical serial number.",
                    why="Unique identification is required to maintain verifiable warranty and compliance records.",
                    evidence={"asset_id": asset.asset_id, "serial_number": asset.serial_number},
                    action="Update the asset record with the manufacturer serial number stamped on the chassis."
                ))

            # Check Warranty Dates on Asset
            w_start = asset.warranty_start_date
            w_end = asset.warranty_end_date

            # W01: Missing dates
            if (w_start and not w_end) or (w_end and not w_start):
                findings.append(ValidationEngine._create_finding_dict(
                    "W01", asset_id=asset.id, affected_field="warranty_end_date" if not w_end else "warranty_start_date",
                    what=f"Asset {asset.asset_id} has incomplete warranty date boundaries.",
                    why="Incomplete date boundaries prevent precise coverage tracking and timely renewal notices.",
                    evidence={"start": str(w_start), "end": str(w_end)},
                    action="Inspect purchase invoice or OEM certificate to populate both start and expiration dates."
                ))

            if w_start and w_end:
                # W02: End date before start date
                if w_end < w_start:
                    findings.append(ValidationEngine._create_finding_dict(
                        "W02", asset_id=asset.id, affected_field="warranty_end_date",
                        what=f"Asset {asset.asset_id} warranty end date ({w_end}) precedes start date ({w_start}).",
                        why="Logical contradiction in warranty date configuration invalidates coverage calculations.",
                        evidence={"start": str(w_start), "end": str(w_end)},
                        action="Correct the inverted calendar dates in the asset profile or contract."
                    ))

                # W04: Warranty date before purchase date
                if asset.purchase_date and w_start < asset.purchase_date:
                    findings.append(ValidationEngine._create_finding_dict(
                        "W04", asset_id=asset.id, affected_field="warranty_start_date",
                        what=f"Asset {asset.asset_id} warranty starts on {w_start}, preceding purchase date {asset.purchase_date}.",
                        why="OEM warranty typically cannot begin before asset procurement or invoicing date.",
                        evidence={"purchase_date": str(asset.purchase_date), "warranty_start": str(w_start)},
                        action="Confirm installation vs purchase date terms with the supplying vendor."
                    ))

                # W07: Warranty expired
                if w_end < today:
                    # Check if covered by an active AMC
                    asset_contracts = contracts_by_asset.get(asset.id, [])
                    has_active_amc = any(c.status == "Active" and c.end_date and c.end_date >= today for c in asset_contracts)
                    if not has_active_amc:
                        findings.append(ValidationEngine._create_finding_dict(
                            "W07", asset_id=asset.id, affected_field="warranty_end_date",
                            what=f"Asset {asset.asset_id} OEM warranty expired on {w_end} without active AMC.",
                            why="Equipment failure risks out-of-pocket repair costs and unplanned downtime.",
                            evidence={"warranty_end": str(w_end), "active_amc": has_active_amc},
                            action="Initiate AMC procurement or enroll asset in preventive maintenance program."
                        ))
                
                # W08: Warranty approaching expiration
                elif 0 <= (w_end - today).days <= 30:
                    findings.append(ValidationEngine._create_finding_dict(
                        "W08", asset_id=asset.id, affected_field="warranty_end_date",
                        what=f"Asset {asset.asset_id} OEM warranty expires in {(w_end - today).days} days ({w_end}).",
                        why="Timely renewal or transition to AMC avoids coverage lapse.",
                        evidence={"warranty_end": str(w_end), "days_remaining": (w_end - today).days},
                        action="Issue RFP or negotiate post-warranty maintenance contract before expiry date."
                    ))

        # -------------------------------------------------------------
        # 2. EVALUATE CONTRACTS & AMCs (A01 - A12)
        # -------------------------------------------------------------
        amc_by_asset: Dict[int, List[Contract]] = {}

        for contract in contracts:
            c_start = contract.start_date
            c_end = contract.end_date

            # A01: Missing dates
            if not c_start or not c_end:
                findings.append(ValidationEngine._create_finding_dict(
                    "A01", contract_id=contract.id, asset_id=contract.asset_id, affected_field="dates",
                    what=f"Contract '{contract.contract_number}' is missing start or termination dates.",
                    why="Contractual period cannot be governed or audited without formal effective dates.",
                    evidence={"contract_number": contract.contract_number, "start": str(c_start), "end": str(c_end)},
                    action="Extract and enter dates from signed agreement page."
                ))
            elif c_end < c_start:
                # A02: Inverted dates
                findings.append(ValidationEngine._create_finding_dict(
                    "A02", contract_id=contract.id, asset_id=contract.asset_id, affected_field="end_date",
                    what=f"Contract '{contract.contract_number}' termination date ({c_end}) precedes start date ({c_start}).",
                    why="Contract execution timeframe contains an impossible negative span.",
                    evidence={"start": str(c_start), "end": str(c_end)},
                    action="Rectify expiration date according to service term duration."
                ))
            else:
                # Expiration checks
                if c_end < today and contract.status == "Active":
                    findings.append(ValidationEngine._create_finding_dict(
                        "A03", contract_id=contract.id, asset_id=contract.asset_id, affected_field="status",
                        what=f"Contract '{contract.contract_number}' lapsed on {c_end} but is marked Active.",
                        why="Misclassified status distorts compliance metrics and renewal expenditure projections.",
                        evidence={"end_date": str(c_end), "current_status": contract.status},
                        action="Update contract status to Expired or execute pending renewal agreement."
                    ))
                elif 0 <= (c_end - today).days <= 30 and contract.status == "Active":
                    findings.append(ValidationEngine._create_finding_dict(
                        "A04", contract_id=contract.id, asset_id=contract.asset_id, affected_field="end_date",
                        what=f"Contract '{contract.contract_number}' will expire in {(c_end - today).days} days ({c_end}).",
                        why="Failure to renew before expiration may incur reinstatement penalties or service interruption.",
                        evidence={"end_date": str(c_end), "days_remaining": (c_end - today).days, "value": float(contract.total_amount or 0)},
                        action="Send renewal notice to vendor and secure departmental budget approval."
                    ))

            # A07: Commercial terms missing
            if not contract.total_amount or float(contract.total_amount) <= 0:
                findings.append(ValidationEngine._create_finding_dict(
                    "A07", contract_id=contract.id, asset_id=contract.asset_id, affected_field="total_amount",
                    what=f"Contract '{contract.contract_number}' specifies zero or unrecorded financial value.",
                    why="Accurate financial budgeting requires recorded commercial contract amounts.",
                    evidence={"contract_number": contract.contract_number, "amount": float(contract.total_amount or 0)},
                    action="Update total commercial contract sum including statutory GST/taxes."
                ))

            # A08: Coverage description missing
            if not contract.coverage_description or len(contract.coverage_description.strip()) < 5:
                findings.append(ValidationEngine._create_finding_dict(
                    "A08", contract_id=contract.id, asset_id=contract.asset_id, affected_field="coverage_description",
                    what=f"Contract '{contract.contract_number}' lacks service scope or SLA deliverables.",
                    why="Ambiguous coverage terms lead to disputed repair liability during equipment breakdowns.",
                    evidence={"contract_number": contract.contract_number},
                    action="Document detailed scope: Comprehensive, Non-Comprehensive, or Parts-Only."
                ))

            # A09: PM frequency missing
            if contract.contract_type == "AMC" and not contract.preventive_maintenance_frequency:
                findings.append(ValidationEngine._create_finding_dict(
                    "A09", contract_id=contract.id, asset_id=contract.asset_id, affected_field="preventive_maintenance_frequency",
                    what=f"AMC agreement '{contract.contract_number}' does not state preventive maintenance schedule.",
                    why="Industrial and laboratory reliability standards require scheduled periodic checkups.",
                    evidence={"contract_number": contract.contract_number},
                    action="Specify PM periodicity (e.g. Monthly, Quarterly, Bi-Annual) from vendor SLA."
                ))

            # A06: Overlapping OEM Warranty & AMC
            if contract.contract_type == "AMC" and contract.asset_id:
                asset_obj = asset_map.get(contract.asset_id)
                if asset_obj and asset_obj.warranty_start_date and asset_obj.warranty_end_date and c_start and c_end:
                    # Check overlap interval
                    overlap_start = max(c_start, asset_obj.warranty_start_date)
                    overlap_end = min(c_end, asset_obj.warranty_end_date)
                    if overlap_start <= overlap_end:
                        overlap_days = (overlap_end - overlap_start).days
                        if overlap_days > 30 and contract.coverage_type == "Comprehensive":
                            findings.append(ValidationEngine._create_finding_dict(
                                "A06", contract_id=contract.id, asset_id=asset_obj.id, affected_field="start_date",
                                what=f"AMC '{contract.contract_number}' overlaps OEM warranty on {asset_obj.asset_id} by {overlap_days} days.",
                                why="Redundant comprehensive maintenance payments duplicate standard manufacturer warranty coverage.",
                                evidence={
                                    "warranty_span": f"{asset_obj.warranty_start_date} to {asset_obj.warranty_end_date}",
                                    "amc_span": f"{c_start} to {c_end}",
                                    "overlap_days": overlap_days
                                },
                                action="Verify whether AMC covers specialized exclusions not covered by OEM, or seek fee rebate.",
                                is_definite=False
                            ))

            # A12: Auto-renewal clause review
            if contract.auto_renewal:
                findings.append(ValidationEngine._create_finding_dict(
                    "A12", contract_id=contract.id, asset_id=contract.asset_id, affected_field="auto_renewal",
                    what=f"Contract '{contract.contract_number}' has active evergreen auto-renewal enabled.",
                    why="Automatic rollover without price negotiation or quality review can lead to lock-in.",
                    evidence={"contract_number": contract.contract_number, "renewal_owner": contract.renewal_owner},
                    action="Perform SLA audit 60 days prior to term expiration to confirm renewal approval.",
                    is_definite=False
                ))

            # Track for duplicate AMC detection (A10)
            if contract.contract_type == "AMC" and contract.asset_id and contract.status == "Active":
                amc_by_asset.setdefault(contract.asset_id, []).append(contract)

        # A10: Multiple active AMCs on same asset
        for a_id, amc_list in amc_by_asset.items():
            if len(amc_list) > 1:
                # Check for overlapping active periods
                for i in range(len(amc_list)):
                    for j in range(i + 1, len(amc_list)):
                        c1 = amc_list[i]
                        c2 = amc_list[j]
                        if c1.start_date and c1.end_date and c2.start_date and c2.end_date:
                            if max(c1.start_date, c2.start_date) <= min(c1.end_date, c2.end_date):
                                findings.append(ValidationEngine._create_finding_dict(
                                    "A10", contract_id=c1.id, asset_id=a_id, affected_field="contract_number",
                                    what=f"Asset {asset_map[a_id].asset_id} is bound to concurrent active AMCs: '{c1.contract_number}' and '{c2.contract_number}'.",
                                    why="Duplicate service contracts incur double billing and contradictory vendor accountability.",
                                    evidence={"contract_1": c1.contract_number, "contract_2": c2.contract_number},
                                    action="Audit vendor invoices and terminate redundant contract immediately."
                                ))

        # -------------------------------------------------------------
        # 3. EVALUATE DOCUMENTS & CROSS-DOCUMENT INTEGRITY (C01 - C06, W05)
        # -------------------------------------------------------------
        doc_hashes = {}
        for doc in documents:
            # C04: Duplicate document hash
            if doc.file_hash in doc_hashes:
                original_doc = doc_hashes[doc.file_hash]
                findings.append(ValidationEngine._create_finding_dict(
                    "C04", document_id=doc.id, asset_id=doc.asset_id, affected_field="file_hash",
                    what=f"Document '{doc.file_name}' is byte-for-byte identical to existing document ID #{original_doc.id} ('{original_doc.file_name}').",
                    why="Duplicate document ingestion causes redundant records and potential double counting.",
                    evidence={"current_doc_id": doc.id, "matched_doc_id": original_doc.id, "hash": doc.file_hash},
                    action="Remove duplicate file or confirm if distinct asset version."
                ))
            else:
                doc_hashes[doc.file_hash] = doc

            # C05: Document not yet reviewed
            if doc.review_status == "Pending Review":
                findings.append(ValidationEngine._create_finding_dict(
                    "C05", document_id=doc.id, asset_id=doc.asset_id, affected_field="review_status",
                    what=f"Uploaded document '{doc.file_name}' contains unverified OCR extracted data.",
                    why="Unverified automated extractions must be approved by an authorized technician before legal audit.",
                    evidence={"doc_id": doc.id, "file_name": doc.file_name, "status": doc.status},
                    action="Open Document Review screen to verify and confirm highlighted fields.",
                    is_definite=False
                ))

            # Cross-document serial check (W05 / C01)
            if doc.asset_id:
                asset_obj = asset_map.get(doc.asset_id)
                if asset_obj:
                    # Check extracted serial number field
                    for field in doc.extracted_fields:
                        val = (field.corrected_value or field.extracted_value or "").strip().upper()
                        if field.field_name == "serial_number" and val:
                            clean_asset_sn = re.sub(r'[^A-Za-z0-9]', '', asset_obj.serial_number.upper())
                            clean_doc_sn = re.sub(r'[^A-Za-z0-9]', '', val)
                            if clean_asset_sn and clean_doc_sn and clean_asset_sn != clean_doc_sn:
                                findings.append(ValidationEngine._create_finding_dict(
                                    "W05", document_id=doc.id, asset_id=asset_obj.id, affected_field="serial_number",
                                    what=f"Serial mismatch: Document '{doc.file_name}' cites '{val}', but Asset {asset_obj.asset_id} has '{asset_obj.serial_number}'.",
                                    why="Serial discrepancies void warranty claims and prevent warranty entitlement authorization.",
                                    evidence={"asset_serial": asset_obj.serial_number, "document_serial": val, "document": doc.file_name},
                                    action="Inspect asset physical nameplate and upload corrected invoice or update asset record."
                                ))

        # -------------------------------------------------------------
        # 4. EXPLAINABLE RISK SCORE CALCULATION
        # -------------------------------------------------------------
        # Deduplicate findings by (rule_id, asset_id, contract_id, document_id)
        unique_findings = []
        seen_keys = set()
        for f in findings:
            key = (f["rule_id"], f.get("asset_id"), f.get("contract_id"), f.get("document_id"))
            if key not in seen_keys:
                seen_keys.add(key)
                unique_findings.append(f)

        total_weight = 0
        crit_count = 0
        high_count = 0
        med_count = 0
        low_count = 0

        score_breakdown = {
            "by_severity": {"Critical": 0, "High": 0, "Medium": 0, "Low": 0},
            "by_category": {"Warranty": 0, "AMC": 0, "Cross-Document": 0},
            "rule_contributions": []
        }

        for f in unique_findings:
            r_id = f["rule_id"]
            cfg = configs.get(r_id)
            weight = cfg.weight if cfg else DEFAULT_RULES.get(r_id, {}).get("weight", 10)
            sev = cfg.severity if cfg else DEFAULT_RULES.get(r_id, {}).get("severity", "Medium")
            cat = cfg.category if cfg else DEFAULT_RULES.get(r_id, {}).get("category", "General")

            total_weight += weight
            score_breakdown["by_severity"][sev] = score_breakdown["by_severity"].get(sev, 0) + weight
            score_breakdown["by_category"][cat] = score_breakdown["by_category"].get(cat, 0) + weight

            score_breakdown["rule_contributions"].append({
                "rule_id": r_id,
                "title": f["rule_title"],
                "severity": sev,
                "weight": weight
            })

            if sev == "Critical":
                crit_count += 1
            elif sev == "High":
                high_count += 1
            elif sev == "Medium":
                med_count += 1
            elif sev == "Low":
                low_count += 1

        risk_score = min(100, total_weight)

        if risk_score >= 75 or crit_count > 0:
            risk_level = "Critical Risk"
            overall_status = "Fail"
        elif risk_score >= 50 or high_count > 0:
            risk_level = "High Risk"
            overall_status = "Fail"
        elif risk_score >= 20 or med_count > 0:
            risk_level = "Moderate Risk"
            overall_status = "Warning"
        else:
            risk_level = "Low Risk"
            overall_status = "Pass"

        # If any pending review findings exist
        has_pending_review = any(not f["is_definite"] for f in unique_findings)
        if has_pending_review and overall_status == "Pass":
            overall_status = "Needs Review"

        end_time = datetime.datetime.utcnow()
        elapsed_ms = int((end_time - start_time).total_seconds() * 1000)

        import uuid
        run_id_str = f"VRUN-{int(start_time.timestamp())}-{uuid.uuid4().hex[:6].upper()}"
        val_run = ValidationRun(
            run_identifier=run_id_str,
            triggered_by_id=user_id,
            target_type=target_type,
            target_id=target_id,
            risk_score=risk_score,
            risk_level=risk_level,
            overall_status=overall_status,
            total_issues=len(unique_findings),
            critical_issues=crit_count,
            high_issues=high_count,
            medium_issues=med_count,
            low_issues=low_count,
            score_breakdown=score_breakdown,
            execution_time_ms=elapsed_ms,
            created_at=start_time
        )
        db.add(val_run)
        db.flush()

        for f in unique_findings:
            db_finding = ValidationFinding(
                validation_run_id=val_run.id,
                rule_id=f["rule_id"],
                rule_title=f["rule_title"],
                category=f["category"],
                severity=f["severity"],
                asset_id=f.get("asset_id"),
                contract_id=f.get("contract_id"),
                document_id=f.get("document_id"),
                affected_field=f.get("affected_field"),
                what_detected=f["what_detected"],
                why_matters=f["why_matters"],
                evidence=f.get("evidence"),
                recommended_action=f["recommended_action"],
                is_definite=f.get("is_definite", True),
                status="Open"
            )
            db.add(db_finding)

        db.commit()
        db.refresh(val_run)
        return val_run

    @staticmethod
    def _create_finding_dict(
        rule_id: str,
        asset_id: Optional[int] = None,
        contract_id: Optional[int] = None,
        document_id: Optional[int] = None,
        affected_field: Optional[str] = None,
        what: str = "",
        why: str = "",
        evidence: Optional[Dict[str, Any]] = None,
        action: str = "",
        is_definite: bool = True
    ) -> Dict[str, Any]:
        info = DEFAULT_RULES.get(rule_id, {
            "title": f"Rule {rule_id}",
            "category": "General",
            "severity": "Medium"
        })
        return {
            "rule_id": rule_id,
            "rule_title": info["title"],
            "category": info["category"],
            "severity": info["severity"],
            "asset_id": asset_id,
            "contract_id": contract_id,
            "document_id": document_id,
            "affected_field": affected_field,
            "what_detected": what,
            "why_matters": why,
            "evidence": evidence or {},
            "recommended_action": action,
            "is_definite": is_definite
        }
