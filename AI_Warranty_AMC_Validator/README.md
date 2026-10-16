# WarrantyIQ — AI-Powered Warranty and AMC Validator
## Comprehensive Engineering Documentation & Technical Operating Manual

**WarrantyIQ** is an enterprise-grade decision-support system designed to validate hardware warranties, purchase tax invoices, and Annual Maintenance Contracts (AMCs). It replaces ambiguous manual contract verifications with deterministic business rules, OCR document parsing, human-in-the-loop review, and explainable risk calculations.

---

## Table of Contents
1. [Core Problem & Objective](#1-core-problem--objective)
2. [End-to-End System Architecture](#2-end-to-end-system-architecture)
3. [Database Design & Entity Relationships](#3-database-design--entity-relationships)
4. [Document Processing & OCR Pipeline](#4-document-processing--ocr-pipeline)
5. [Deterministic Validation Engine (The 28 Rules)](#5-deterministic-validation-engine-the-28-rules)
6. [Explainable Risk Scoring Algorithm](#6-explainable-risk-scoring-algorithm)
7. [Frontend Architecture & Workflow Breakdown](#7-frontend-architecture--workflow-breakdown)
8. [API Reference & REST Endpoints](#8-api-reference--rest-endpoints)
9. [Security, Authorization & Audit Trails](#9-security-authorization--audit-trails)
10. [Local Installation & Demonstration Guide](#10-local-installation--demonstration-guide)
11. [Testing Suite & Verification Report](#11-testing-suite--verification-report)

---

## 1. Core Problem & Objective

Modern organizations procure mission-critical assets—such as datacenter servers, core switches, laboratory chromatography systems, factory PLCs, and production multi-function printers—from various manufacturers and third-party vendors.

Contracts and invoices across these equipment types often suffer from:
- **Serial Number Conflicts:** Discrepancies between physical chassis tags, purchase invoices, and vendor support certificates.
- **Date Inversions & Contradictions:** Warranty expiration dates preceding start dates or preceding initial equipment purchase dates.
- **Redundant Overlapping Maintenance:** Unnecessary payments for comprehensive AMCs during active OEM warranty periods.
- **Contract Gaps & Lapses:** High-capital assets operating without active warranty or maintenance agreements.
- **Auto-Renewal Cost Risks:** Evergreen renewal clauses without prior SLA review.

WarrantyIQ provides a structured, automated audit framework to detect and resolve these discrepancies before financial or operational consequences occur.

---

## 2. End-to-End System Architecture

```
[ Web Browser Client ]
  │
  │  Vite + React 19 + Tailwind CSS v4 + Lucide Icons + Recharts
  │  (Enterprise UI Shell, Responsive Tables, Modals, Forms)
  │
  ▼  HTTP Proxy (/api/v1)
[ FastAPI Backend Engine ] ── Port 8000
  │
  ├── [ Core Security ] ────── PBKDF2 Password Hashing, JWT Bearer Auth, RBAC
  │
  ├── [ Document Engine ] ──── PyMuPDF Text Extraction, Pytesseract OCR,
  │                            Regex Parsing, Field Confidence Scoring
  │
  ├── [ Validation Engine ] ── 28 Business Rules (W01-W10, A01-A12, C01-C06),
  │                            0-100 Weighted Risk Scoring, Findings Tracker
  │
  ├── [ Reporting Service ] ── ReportLab PDF Generation, Formula-Safe CSV Export
  │
  ▼
[ SQLAlchemy 2.0 ORM ]
  │
  ▼
[ Relational Database ] ────── SQLite (Local Dev) / PostgreSQL (Production)
```

### Key Architectural Characteristics
- **Service-Oriented Design:** Decoupled business logic located in `app/services/` and `app/validators/`.
- **Deterministic Evaluation:** Business rules use precise logic without dependency on paid third-party AI APIs.
- **Decision-Support Boundary:** Automated outputs are presented as audit findings and risk indicators; they do not assert legal standing independently.

---

## 3. Database Design & Entity Relationships

The schema is normalized into 12 relational models in [`backend/app/models/entities.py`](file:///c:/Users/janha/Downloads/AI_Warranty_AMC_Validator/AI_Warranty_AMC_Validator/backend/app/models/entities.py):

| Table Name | Primary Purpose | Key Fields |
|---|---|---|
| `users` | Role-based identity & access | `email`, `hashed_password`, `role`, `department` |
| `vendors` | Vendor directory & SLA commitments | `name`, `contact_person`, `sla_response_hours`, `support_email` |
| `assets` | Physical hardware register | `asset_id`, `name`, `category`, `serial_number`, `warranty_start_date`, `warranty_end_date` |
| `contracts` | Warranty & AMC agreements | `contract_number`, `contract_type`, `start_date`, `end_date`, `total_amount`, `coverage_type` |
| `documents` | Ingested files & SHA-256 hashes | `file_name`, `stored_path`, `file_hash`, `mime_type`, `review_status` |
| `extracted_fields` | Extracted & human-verified data | `document_id`, `field_name`, `extracted_value`, `corrected_value`, `confidence` |
| `validation_runs` | Validation executions & risk metrics | `run_identifier`, `risk_score`, `risk_level`, `overall_status`, `score_breakdown` |
| `validation_findings` | Granular rule violations & remediations | `rule_id`, `severity`, `what_detected`, `why_matters`, `evidence`, `status` |
| `validation_rule_configs` | Dynamic rule weights & toggles | `rule_id`, `name`, `severity`, `weight`, `is_enabled` |
| `notifications` | In-app alerts for expirations & risks | `title`, `message`, `notification_type`, `severity`, `is_read` |
| `audit_logs` | Immutable audit trail | `actor_email`, `action`, `entity_type`, `entity_id`, `details`, `timestamp` |

---

## 4. Document Processing & OCR Pipeline

The document pipeline processes uploaded files through four primary stages in [`backend/app/services/document_parser.py`](file:///c:/Users/janha/Downloads/AI_Warranty_AMC_Validator/AI_Warranty_AMC_Validator/backend/app/services/document_parser.py):

```
[ Uploaded File ] 
  │
  ├── 1. SHA-256 Hash Computation (Detects duplicate files - Rule C04)
  │
  ├── 2. Extraction Tier:
  │      ├── Digital PDFs: Extracted via PyMuPDF (fitz)
  │      └── Scanned Images/PDFs: Processed via Pytesseract OCR
  │
  ├── 3. Deterministic Field Extraction:
  │      ├── Serial Number (Pattern: `SN-XXXXXX`, alphanumeric serial formats)
  │      ├── Contract / Invoice Numbers
  │      ├── Date Normalization (Converts `DD/MM/YYYY` or `DD-MM-YYYY` to `YYYY-MM-DD`)
  │      ├── Financial Totals (Excludes formatting commas, captures GST components)
  │      ├── Coverage Scope (Categorizes Comprehensive vs. Non-Comprehensive)
  │      └── Maintenance Frequency (Quarterly, Monthly, Bi-Annual)
  │
  └── 4. Human-In-The-Loop Verification:
         - Displays extraction confidence (0.0 to 1.0)
         - Allows field-by-field manual correction
         - Distinguishes extracted values from user-corrected values
```

---

## 5. Deterministic Validation Engine (The 28 Rules)

The validation engine in [`backend/app/validators/rules_engine.py`](file:///c:/Users/janha/Downloads/AI_Warranty_AMC_Validator/AI_Warranty_AMC_Validator/backend/app/validators/rules_engine.py) checks contract integrity against 28 rules:

### Warranty Rules (W01–W10)
- **W01:** *Missing warranty start or end date* — Flags records missing start or expiration dates.
- **W02:** *Warranty end date occurs before start date* — Flags inverted calendar date boundaries.
- **W03:** *Warranty duration conflicts with recorded dates* — Checks that stated durations align with date differences.
- **W04:** *Warranty date conflicts with purchase date* — Verifies that warranty coverage does not precede asset procurement.
- **W05:** *Asset serial number conflicts across records* — Flags mismatches between physical chassis serial numbers and documents.
- **W06:** *Vendor or manufacturer details conflict* — Identifies discrepancies between registered asset manufacturer and contract issuer.
- **W07:** *Warranty coverage has expired* — Flags assets with lapsed OEM warranties lacking active AMC coverage.
- **W08:** *Warranty approaching expiration* — Identifies warranties expiring within 30 days.
- **W09:** *Multiple duplicate warranty records* — Detects concurrent warranty entries for the same equipment.
- **W10:** *Required asset identifiers missing* — Flags missing or unrecorded physical serial numbers.

### AMC Rules (A01–A12)
- **A01:** *Missing AMC start or end date* — Validates the presence of effective agreement terms.
- **A02:** *AMC end date occurs before start date* — Catches inverted start and termination dates in service agreements.
- **A03:** *AMC contract has expired* — Identifies expired agreements still marked as Active.
- **A04:** *AMC renewal approaching* — Flags agreements expiring within 30 days to facilitate renewal.
- **A05:** *AMC coverage period misaligned* — Identifies contract durations that deviate from required annual terms.
- **A06:** *AMC and warranty coverage overlap redundantly* — Flags comprehensive AMCs paying for coverage already provided under OEM warranty.
- **A07:** *AMC amount or commercial terms missing* — Detects contracts with zero or unrecorded values.
- **A08:** *Coverage description or service scope missing* — Flags missing service deliverables and terms.
- **A09:** *Preventive maintenance frequency missing* — Checks for scheduled preventive maintenance visit clauses.
- **A10:** *Duplicate or overlapping AMCs for same asset* — Detects concurrent maintenance contracts for a single piece of equipment.
- **A11:** *High-value asset lacking coverage* — Identifies mission-critical equipment operating without warranty or AMC.
- **A12:** *Auto-renewal terms require review* — Highlights evergreen renewal clauses that may cause unintended lock-in.

### Cross-Document & Integrity Rules (C01–C06)
- **C01:** *Cross-document asset identifier mismatch* — Reconciles identifiers across invoices, warranty certificates, and contracts.
- **C02:** *Contract references unknown or archived asset* — Catches agreements bound to decommissioned equipment.
- **C03:** *Contract dates contain unresolved contradictions* — Reconciles invoice billing dates against contract execution spans.
- **C04:** *Potential duplicate document detected via hash* — Identifies identical file re-uploads using SHA-256 hashes.
- **C05:** *Supporting document pending mandatory review* — Ensures uploaded documents pass human review before formal audit commit.
- **C06:** *Mandatory field missing from uploaded document* — Flags unextracted required fields.

---

## 6. Explainable Risk Scoring Algorithm

Risk scores are computed on a normalized **0–100** scale using configurable point deductions:

$$\text{Risk Score} = \min\left(100, \sum \text{Weight of Applicable Active Findings}\right)$$

### Default Severity Weights
- **Critical Issues:** 30 points (e.g., Inverted dates, cross-document serial mismatches, duplicate active AMCs)
- **High Severity:** 20 points (e.g., Uncovered mission-critical assets, missing serial numbers, procurement date conflicts)
- **Medium Severity:** 10 points (e.g., Expired warranties, missing commercial values, redundant AMC overlaps)
- **Low Severity:** 5 points (e.g., Contracts expiring in 30 days, auto-renewal clauses, unverified OCR text)

### Risk Level Classifications
- **0–19: Low Risk (Pass)** — Full compliance with all standard rules.
- **20–49: Moderate Risk (Warning)** — Minor scope ambiguities or upcoming expirations requiring attention.
- **50–74: High Risk (Fail)** — Significant data conflicts or coverage lapses.
- **75–100: Critical Risk (Fail)** — Serious contractual contradictions, date inversions, or duplicate billing.

Weights and enabled states can be adjusted at runtime via the **Settings & Rules** interface (`/settings`).

---

## 7. Frontend Architecture & Workflow Breakdown

The UI uses a dashboard layout adhering to enterprise design standards without emojis, decorative gradients, or artificial cards.

```
                    [ /login ]
                         │  (Authenticate with JWT)
                         ▼
┌────────────────── [ Main Application Shell ] ──────────────────┐
│                                                                │
│  [Sidebar]          [Top Header]                               │
│  ├── Dashboard      ├── Global Asset Search                     │
│  ├── Assets         ├── System Notifications Dropdown          │
│  ├── Documents      └── User Profile & Sign Out                │
│  ├── Validation                                                │
│  ├── Contracts      [Main Content Area]                        │
│  ├── Renewals       ├── /dashboard   (Real-time KPIs & charts) │
│  ├── Vendors        ├── /assets      (Asset register & modal)  │
│  ├── Reports        ├── /documents   (OCR & human review)      │
│  ├── Audit Logs     ├── /validation  (Workspace & audit PDF)   │
│  └── Settings       └── ...                                    │
└────────────────────────────────────────────────────────────────┘
```

### Route Index
1. `/login` — User authentication with quick-fill demo role selectors.
2. `/dashboard` — Executive dashboard displaying real database KPIs, coverage breakdowns, and recent activity.
3. `/assets` — Asset register with search, status filters, and creation modal.
4. `/assets/:id` — Equipment profile detailing hardware specs, linked AMCs, and active findings.
5. `/documents` — Document library with file ingestion and parsing review modals.
6. `/documents/upload` — Ingestion endpoint for invoices, warranty certificates, and contracts.
7. `/validation` — Validation workspace displaying risk scores, rule breakdowns, and resolution controls.
8. `/validation/:id` — Detail view for specific historical validation runs.
9. `/contracts` — Contract manager tracking terms, SLA response commitments, and commercial totals.
10. `/renewals` — Renewal pipeline providing 30, 60, and 90-day expiration horizons and cost forecasts.
11. `/vendors` — Vendor directory tracking SLA performance and supplied asset counts.
12. `/reports` — Compliance center providing downloadable PDF audit reports and formula-safe CSVs.
13. `/audit-logs` — Immutable audit log showing operational actions and JSON state changes.
14. `/settings` — Rule configuration interface for toggling rules and modifying risk weights.

---

## 8. API Reference & REST Endpoints

All endpoints are versioned under `/api/v1` and document input/output structures using Pydantic models:

### Authentication
- `POST /api/v1/auth/login` — Authenticates credentials and returns a JWT bearer token.
- `GET /api/v1/auth/me` — Returns the current authenticated user's profile and permissions.

### Dashboard Analytics
- `GET /api/v1/dashboard/kpis` — Returns aggregated metrics calculated from database records.

### Asset Register
- `GET /api/v1/assets` — Returns registered assets with query, category, and status filters.
- `POST /api/v1/assets` — Registers a new asset with duplicate ID and serial number validation.
- `GET /api/v1/assets/{id}` — Returns asset profile data including linked contracts and findings.
- `PUT /api/v1/assets/{id}` — Updates asset attributes.
- `DELETE /api/v1/assets/{id}` — Archives an asset record.

### Document Processing
- `GET /api/v1/documents` — Lists ingested documents and extraction statuses.
- `POST /api/v1/documents/upload` — Accepts file uploads, computes SHA-256 hashes, and runs OCR parsing.
- `GET /api/v1/documents/{id}` — Retrieves document metadata and extracted field items.
- `POST /api/v1/documents/{doc_id}/fields/{field_id}/correct` — Updates extracted candidate values.
- `POST /api/v1/documents/{doc_id}/approve` — Approves document verification status.

### Validation Engine
- `POST /api/v1/validation/run` — Triggers an evaluation run (Global, Asset, or Contract scope).
- `GET /api/v1/validation/runs` — Lists past validation runs with risk scores.
- `GET /api/v1/validation/findings` — Returns individual rule violations with filtering options.
- `POST /api/v1/validation/findings/{id}/resolve` — Resolves, dismisses, or flags findings with audit notes.

### Contracts & Renewals
- `GET /api/v1/contracts` — Returns maintenance contracts and warranties.
- `POST /api/v1/contracts` — Records a new agreement with coverage terms.
- `GET /api/v1/renewals/upcoming` — Calculates contracts expiring in 30, 60, or 90 days.

### Vendors, Reports & Audit
- `GET /api/v1/vendors` — Lists vendor partners and active contract metrics.
- `POST /api/v1/vendors` — Registers a vendor profile.
- `GET /api/v1/reports/findings/csv` — Exports findings as a formula-sanitized CSV.
- `GET /api/v1/reports/validation/{run_id}/pdf` — Generates a downloadable ReportLab PDF audit report.
- `GET /api/v1/audit-logs` — Returns system event logs.
- `GET /api/v1/settings/rules` — Retrieves rule weights and configurations.
- `PUT /api/v1/settings/rules/{rule_id}` — Updates rule configurations.

---

## 9. Security, Authorization & Audit Trails

- **Password Storage:** Uses salted PBKDF2-HMAC-SHA256 with 100,000 iterations.
- **JWT Authorization:** Tokens are signed using HS256 with configurable expiration windows.
- **Role-Based Access Control (RBAC):**
  - **Administrator:** Full operational privileges and rule engine configuration.
  - **Contract Manager:** Manages assets, uploads documents, and resolves findings.
  - **Viewer / Auditor:** Read-only access to records, findings, and report downloads.
- **CSV Formula Injection Defense:** Prefixes cells starting with `=`, `+`, `-`, or `@` with a single quote (`'`) to protect spreadsheet applications.
- **Cryptographic Document Deduping:** Computes SHA-256 hashes on upload to identify byte-for-byte duplicate files.
- **Audit Logging:** Logs significant operations (logins, uploads, corrections, findings resolution) with actor email, timestamp, and before/after state details.

---

## 10. Local Installation & Demonstration Guide

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Backend Startup
```bash
cd backend

# Install dependencies
pip install fastapi uvicorn sqlalchemy alembic python-jose reportlab pymupdf pillow pytesseract

# Seed database with sample enterprise data
python -m app.services.seed_data

# Start the API server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Interactive API documentation will be available at: `http://127.0.0.1:8000/docs`

### 2. Frontend Startup
```bash
cd frontend

# Install UI dependencies
npm install

# Start the Vite development server
npm run dev -- --host 127.0.0.1 --port 5173
```
Access the application interface at: `http://127.0.0.1:5173`

### 3. Demonstration Profiles

| Role | Email | Password | Primary Workflow |
|---|---|---|---|
| **Administrator** | `admin@warrantyiq.com` | `Admin@123` | Global validation, rule weights, system settings |
| **Contract Manager** | `manager@warrantyiq.com` | `Manager@123` | Asset registration, document upload, field review |
| **Viewer / Auditor** | `auditor@warrantyiq.com` | `Auditor@123` | Read-only audit trail and report export |

---

## 11. Testing Suite & Verification Report

The test suite in [`backend/app/tests/test_backend.py`](file:///c:/Users/janha/Downloads/AI_Warranty_AMC_Validator/AI_Warranty_AMC_Validator/backend/app/tests/test_backend.py) verifies core system logic using pytest:

```bash
cd backend
python -m pytest app/tests/test_backend.py -v
```

### Verified Test Cases
1. `test_password_hashing` — Validates salted PBKDF2 hashing and verification.
2. `test_document_parser_normalization` — Verifies date normalization across format variations.
3. `test_document_deterministic_extraction` — Tests regex extraction of serials, contract IDs, dates, and amounts.
4. `test_validation_rule_w02_inverted_dates` — Confirms detection of inverted warranty date boundaries.
5. `test_validation_rule_w10_missing_serial` — Verifies detection of assets with missing serial numbers.
6. `test_report_service_csv_generation` — Validates CSV generation and formula injection defenses.
7. `test_report_service_pdf_generation` — Verifies binary PDF structure generation using ReportLab.

```
======================= 7 passed, 25 warnings in 3.24s ========================
```
