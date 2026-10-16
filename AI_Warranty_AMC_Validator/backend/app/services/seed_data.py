from datetime import date, datetime, timedelta
from app.core.database import SessionLocal, Base, engine
from app.core.security import get_password_hash
from app.models.entities import (
    User, Vendor, Asset, Contract, Document, ExtractedField,
    ValidationRuleConfig, Notification, AuditLog, TaskAssignment
)
from app.validators.rules_engine import ValidationEngine

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if users already seeded
        admin = db.query(User).filter(User.email == "admin@warrantyiq.com").first()
        if not admin:
            admin = User(
                email="admin@warrantyiq.com",
                full_name="Dr. Arvind Sharma",
                hashed_password=get_password_hash("Admin@123"),
                role="Administrator",
                department="Central IT & Infrastructure"
            )
            manager = User(
                email="manager@warrantyiq.com",
                full_name="Pooja Verma",
                hashed_password=get_password_hash("Manager@123"),
                role="Contract Manager",
                department="Procurement & Contracts"
            )
            viewer = User(
                email="auditor@warrantyiq.com",
                full_name="Rajesh Iyer",
                hashed_password=get_password_hash("User@123"),
                role="User",
                department="Internal Compliance & Review"
            )
            db.add_all([admin, manager, viewer])
            db.commit()

        # Seed additional managers and dedicated User role accounts if not already present
        manager_primary = db.query(User).filter(User.email == "manager@warrantyiq.com").first()
        manager_primary_id = manager_primary.id if manager_primary else None

        demo_user = db.query(User).filter(User.email == "user@warrantyiq.com").first()
        if not demo_user:
            demo_user = User(
                email="user@warrantyiq.com",
                full_name="Vikram Anand",
                hashed_password=get_password_hash("User@123"),
                role="User",
                department="Operations & IT End-User Services",
                phone="+91-9876543210",
                manager_id=manager_primary_id,
                is_active=True
            )
            db.add(demo_user)
            db.commit()

        extra_users = [
            {"email": "manager2@warrantyiq.com", "full_name": "Ankit Mehta",    "password": "Manager@123", "role": "Contract Manager", "department": "IT Asset Management"},
            {"email": "manager3@warrantyiq.com", "full_name": "Priya Nair",     "password": "Manager@123", "role": "Contract Manager", "department": "Facilities & Infrastructure"},
            {"email": "manager4@warrantyiq.com", "full_name": "Ravi Shankar",   "password": "Manager@123", "role": "Contract Manager", "department": "Network Operations"},
            {"email": "manager5@warrantyiq.com", "full_name": "Deepika Rao",    "password": "Manager@123", "role": "Contract Manager", "department": "Lab & Scientific Equipment"},
            {"email": "viewer2@warrantyiq.com",  "full_name": "Suresh Babu",    "password": "User@123",    "role": "User",             "department": "Finance & Accounts"},
            {"email": "viewer3@warrantyiq.com",  "full_name": "Meena Krishnan", "password": "User@123",    "role": "User",             "department": "Quality Assurance"},
            {"email": "viewer4@warrantyiq.com",  "full_name": "Harish Patel",   "password": "User@123",    "role": "User",             "department": "Compliance & Risk"},
            {"email": "viewer5@warrantyiq.com",  "full_name": "Nandini Shah",   "password": "User@123",    "role": "User",             "department": "Operations Management"},
            # Department Users (can be assigned to managers)
            {"email": "user2@warrantyiq.com",    "full_name": "Sanya Kapoor",   "password": "User@123",    "role": "User",             "department": "IT End-User Services"},
            {"email": "user3@warrantyiq.com",    "full_name": "Arjun Tiwari",   "password": "User@123",    "role": "User",             "department": "Operations & Logistics"},
            {"email": "user4@warrantyiq.com",    "full_name": "Divya Menon",    "password": "User@123",    "role": "User",             "department": "Analytical Chemistry Lab"},
            {"email": "user5@warrantyiq.com",    "full_name": "Rahul Desai",    "password": "User@123",    "role": "User",             "department": "Plant Engineering"},
            {"email": "user6@warrantyiq.com",    "full_name": "Neha Joshi",     "password": "User@123",    "role": "User",             "department": "Finance & Administration"},
        ]
        for u in extra_users:
            if not db.query(User).filter(User.email == u["email"]).first():
                db.add(User(
                    email=u["email"],
                    full_name=u["full_name"],
                    hashed_password=get_password_hash(u["password"]),
                    role=u["role"],
                    department=u["department"],
                    is_active=True
                ))
        db.commit()

        # Assign the new User accounts to the primary manager if not already assigned
        primary_mgr = db.query(User).filter(User.email == "manager@warrantyiq.com").first()
        secondary_mgr = db.query(User).filter(User.email == "manager2@warrantyiq.com").first()
        for user_email, mgr in [
            ("user2@warrantyiq.com", primary_mgr),
            ("user3@warrantyiq.com", primary_mgr),
            ("user4@warrantyiq.com", secondary_mgr),
            ("user5@warrantyiq.com", secondary_mgr),
        ]:
            u_obj = db.query(User).filter(User.email == user_email).first()
            if u_obj and u_obj.manager_id is None and mgr:
                u_obj.manager_id = mgr.id
        db.commit()

        # Seed Vendors (5 realistic enterprise vendors)
        if db.query(Vendor).count() == 0:
            v1 = Vendor(
                name="Dell Technologies India Pvt Ltd",
                contact_person="Rohan Gupta",
                email="support@dell-enterprise.in",
                phone="+91-80-67890123",
                address="Dell India R&D, Domlur, Bengaluru, Karnataka",
                support_email="prosupport@dell.com",
                support_phone="1800-425-4026",
                sla_response_hours=4,
                notes="Primary server and workstation hardware vendor with 4-hour on-site SLA."
            )
            v2 = Vendor(
                name="Siemens Industrial Solutions",
                contact_person="Kavita Rao",
                email="automation@siemens-solutions.in",
                phone="+91-22-24987000",
                address="Siemens Center, Worli, Mumbai, Maharashtra",
                support_email="service.in@siemens.com",
                support_phone="1800-209-1800",
                sla_response_hours=12,
                notes="Supplies PLC automation, heavy conveyor instrumentation, and power modules."
            )
            v3 = Vendor(
                name="Agilent Technologies Laboratory",
                contact_person="Dr. Sunita Deshmukh",
                email="lifesciences@agilent-lab.in",
                phone="+91-124-4729000",
                address="Cyber City, Phase II, Gurugram, Haryana",
                support_email="labcare@agilent.com",
                support_phone="1800-180-1517",
                sla_response_hours=8,
                notes="Spectrophotometers, Chromatography, and precision lab equipment."
            )
            v4 = Vendor(
                name="Cisco Systems Capital",
                contact_person="Aditya Nair",
                email="smartnet@cisco-networks.in",
                phone="+91-80-44260000",
                address="Cisco Campus, Outer Ring Road, Bengaluru",
                support_email="tac@cisco.com",
                support_phone="1800-553-2447",
                sla_response_hours=2,
                notes="Campus core switches, edge routers, and firewall gateways."
            )
            v5 = Vendor(
                name="Canon Business Imaging Systems",
                contact_person="Meera Kulkarni",
                email="corporate@canon-sales.in",
                phone="+91-124-4160000",
                address="DLF Phase 3, Gurugram, Haryana",
                support_email="service@canon.co.in",
                support_phone="1860-180-3366",
                sla_response_hours=24,
                notes="High-capacity multifunction departmental production printers."
            )
            db.add_all([v1, v2, v3, v4, v5])
            db.commit()

        # Seed Assets (14 realistic assets across servers, lab, industrial, network)
        today = date.today()
        if db.query(Asset).count() == 0:
            v_dell = db.query(Vendor).filter(Vendor.name.like("%Dell%")).first()
            v_siemens = db.query(Vendor).filter(Vendor.name.like("%Siemens%")).first()
            v_agilent = db.query(Vendor).filter(Vendor.name.like("%Agilent%")).first()
            v_cisco = db.query(Vendor).filter(Vendor.name.like("%Cisco%")).first()
            v_canon = db.query(Vendor).filter(Vendor.name.like("%Canon%")).first()

            assets_data = [
                # 1. Clean Active Server
                Asset(
                    asset_id="AST-SRV-001",
                    name="PowerEdge R750 Rack Server",
                    category="Server",
                    manufacturer="Dell Technologies",
                    model_number="R750-2U",
                    serial_number="DL-SRV-987214",
                    purchase_date=today - timedelta(days=360),
                    purchase_price=485000.00,
                    department="Datacenter Operations",
                    location="Rack 04 - DC Bengaluru",
                    assigned_user="Karthik N.",
                    status="Active",
                    warranty_start_date=today - timedelta(days=360),
                    warranty_end_date=today + timedelta(days=735), # 3-year warranty active
                    vendor_id=v_dell.id if v_dell else None,
                    notes="Core virtualization host running ESXi cluster.",
                    is_demo=True
                ),
                # 2. Warranty Expiring in 18 days
                Asset(
                    asset_id="AST-SRV-002",
                    name="PowerEdge R650 Database Host",
                    category="Server",
                    manufacturer="Dell Technologies",
                    model_number="R650-1U",
                    serial_number="DL-SRV-442190",
                    purchase_date=today - timedelta(days=710),
                    purchase_price=520000.00,
                    department="Enterprise Applications",
                    location="Rack 02 - DC Bengaluru",
                    assigned_user="Pooja V.",
                    status="Active",
                    warranty_start_date=today - timedelta(days=710),
                    warranty_end_date=today + timedelta(days=18), # Expiring in 18 days!
                    vendor_id=v_dell.id if v_dell else None,
                    notes="Production Oracle ERP replica. Needs immediate warranty extension or AMC.",
                    is_demo=True
                ),
                # 3. Expired OEM Warranty - Covered by AMC
                Asset(
                    asset_id="AST-NET-001",
                    name="Catalyst 9300 48-Port Core Switch",
                    category="Networking",
                    manufacturer="Cisco Systems",
                    model_number="C9300-48P-A",
                    serial_number="FCW2348A09B",
                    purchase_date=today - timedelta(days=1200),
                    purchase_price=310000.00,
                    department="Network Infrastructure",
                    location="Server Room Floor 2",
                    assigned_user="Sandeep K.",
                    status="Active",
                    warranty_start_date=today - timedelta(days=1200),
                    warranty_end_date=today - timedelta(days=835), # Expired OEM
                    vendor_id=v_cisco.id if v_cisco else None,
                    notes="Protected under annual Cisco Smart Net Total Care AMC.",
                    is_demo=True
                ),
                # 4. Critical Asset with Serial Inconsistency Scenario
                Asset(
                    asset_id="AST-LAB-001",
                    name="Cary 60 UV-Vis Spectrophotometer",
                    category="Laboratory Equipment",
                    manufacturer="Agilent Technologies",
                    model_number="G6860A",
                    serial_number="MY21045982", # Asset DB has MY21045982, document invoice has MY21045983
                    purchase_date=today - timedelta(days=500),
                    purchase_price=890000.00,
                    department="Analytical Chemistry Lab",
                    location="Lab 103 Cleanroom",
                    assigned_user="Dr. Sunita D.",
                    status="Active",
                    warranty_start_date=today - timedelta(days=500),
                    warranty_end_date=today + timedelta(days=230),
                    vendor_id=v_agilent.id if v_agilent else None,
                    notes="High-precision sample validator. Serial discrepancy flagged in review.",
                    is_demo=True
                ),
                # 5. Industrial PLC with Overlapping Redundant AMC
                Asset(
                    asset_id="AST-IND-001",
                    name="SIMATIC S7-1500 Modular PLC",
                    category="Industrial Automation",
                    manufacturer="Siemens",
                    model_number="S7-1516-3PN",
                    serial_number="SM-PLC-77312",
                    purchase_date=today - timedelta(days=200),
                    purchase_price=640000.00,
                    department="Plant Line 1",
                    location="Shop Floor Control Cabinet 01",
                    assigned_user="Ramesh P.",
                    status="Active",
                    warranty_start_date=today - timedelta(days=200),
                    warranty_end_date=today + timedelta(days=530), # Valid OEM until +530
                    vendor_id=v_siemens.id if v_siemens else None,
                    notes="Contains an active comprehensive AMC executed prematurely during OEM warranty.",
                    is_demo=True
                ),
                # 6. Asset with Expired Warranty and No AMC (Uncovered Risk)
                Asset(
                    asset_id="AST-IND-002",
                    name="Siemens Industrial Drive SINAMICS S120",
                    category="Industrial Automation",
                    manufacturer="Siemens",
                    model_number="6SL3120-1TE21",
                    serial_number="SI-DRV-00941",
                    purchase_date=today - timedelta(days=900),
                    purchase_price=410000.00,
                    department="Plant Line 2",
                    location="Extrusion Bay",
                    assigned_user="Harish M.",
                    status="Active",
                    warranty_start_date=today - timedelta(days=900),
                    warranty_end_date=today - timedelta(days=535), # Expired!
                    vendor_id=v_siemens.id if v_siemens else None,
                    notes="Critical single point of failure currently running without any contract coverage.",
                    is_demo=True
                ),
                # 7. Production Multi-Function Printer with Expiring AMC in 12 days
                Asset(
                    asset_id="AST-PRN-001",
                    name="Canon imageRUNNER ADVANCE DX C5850i",
                    category="Office Equipment",
                    manufacturer="Canon",
                    model_number="iR-ADV-C5850i",
                    serial_number="CN-PRN-55102",
                    purchase_date=today - timedelta(days=700),
                    purchase_price=275000.00,
                    department="Finance & Administration",
                    location="Floor 3 Central Copy Hub",
                    assigned_user="Meera K.",
                    status="Active",
                    warranty_start_date=today - timedelta(days=700),
                    warranty_end_date=today - timedelta(days=335),
                    vendor_id=v_canon.id if v_canon else None,
                    notes="Heavy daily volume. AMC contract expires in 12 days.",
                    is_demo=True
                ),
                # 8. Laboratory HPLC Chromatography
                Asset(
                    asset_id="AST-LAB-002",
                    name="1260 Infinity II LC HPLC System",
                    category="Laboratory Equipment",
                    manufacturer="Agilent Technologies",
                    model_number="G7111B",
                    serial_number="DE-LC-884102",
                    purchase_date=today - timedelta(days=400),
                    purchase_price=1250000.00,
                    department="Biotechnology Research",
                    location="Lab 205 Analytical Suite",
                    assigned_user="Dr. Arvind S.",
                    status="Active",
                    warranty_start_date=today - timedelta(days=400),
                    warranty_end_date=today + timedelta(days=330),
                    vendor_id=v_agilent.id if v_agilent else None,
                    notes="High-capital asset with quarterly scheduled preventive maintenance visits.",
                    is_demo=True
                ),
                # 9. Inverted Date Anomaly Scenario (for testing W02)
                Asset(
                    asset_id="AST-LPT-001",
                    name="Dell Precision 5570 Mobile Workstation",
                    category="Computers",
                    manufacturer="Dell Technologies",
                    model_number="P5570-I9",
                    serial_number="DL-LPT-103984",
                    purchase_date=today - timedelta(days=150),
                    purchase_price=185000.00,
                    department="Engineering CAD",
                    location="R&D Workstation 12",
                    assigned_user="Vikas T.",
                    status="Active",
                    warranty_start_date=today - timedelta(days=150),
                    warranty_end_date=today - timedelta(days=200), # INVERTED! End before start
                    vendor_id=v_dell.id if v_dell else None,
                    notes="Recorded end date precedes start date due to data entry typo.",
                    is_demo=True
                ),
                # 10. Missing Serial Number (for testing W10)
                Asset(
                    asset_id="AST-NET-002",
                    name="Cisco Catalyst 9200 Edge Switch",
                    category="Networking",
                    manufacturer="Cisco Systems",
                    model_number="C9200L-24P",
                    serial_number="UNKNOWN", # Missing identifier
                    purchase_date=today - timedelta(days=80),
                    purchase_price=120000.00,
                    department="Warehouse Logistics",
                    location="Distribution Depot Hub",
                    assigned_user="Rajesh I.",
                    status="Active",
                    warranty_start_date=today - timedelta(days=80),
                    warranty_end_date=today + timedelta(days=285),
                    vendor_id=v_cisco.id if v_cisco else None,
                    notes="Missing physical serial number on registration card.",
                    is_demo=True
                ),
                # 11. Clean Active Enterprise Router
                Asset(
                    asset_id="AST-NET-003",
                    name="Cisco ASR 1001-X WAN Aggregation Router",
                    category="Networking",
                    manufacturer="Cisco Systems",
                    model_number="ASR1001-X",
                    serial_number="JAE213904KL",
                    purchase_date=today - timedelta(days=600),
                    purchase_price=750000.00,
                    department="Network Infrastructure",
                    location="Datacenter Gateway Rack",
                    assigned_user="Sandeep K.",
                    status="Active",
                    warranty_start_date=today - timedelta(days=600),
                    warranty_end_date=today - timedelta(days=235),
                    vendor_id=v_cisco.id if v_cisco else None,
                    notes="Core leased-line gateway router.",
                    is_demo=True
                ),
                # 12. Industrial CNC Milling Machine
                Asset(
                    asset_id="AST-IND-003",
                    name="5-Axis CNC Precision Milling System",
                    category="Industrial Automation",
                    manufacturer="Siemens",
                    model_number="SINUMERIK-ONE",
                    serial_number="SM-CNC-55209",
                    purchase_date=today - timedelta(days=450),
                    purchase_price=2400000.00,
                    department="Tooling & Fabrication",
                    location="Heavy Machining Bay 03",
                    assigned_user="Anand R.",
                    status="Active",
                    warranty_start_date=today - timedelta(days=450),
                    warranty_end_date=today + timedelta(days=280),
                    vendor_id=v_siemens.id if v_siemens else None,
                    notes="Critical tooling fixture with semi-annual comprehensive maintenance.",
                    is_demo=True
                ),
                # 13. Departmental Plotter
                Asset(
                    asset_id="AST-PRN-002",
                    name="Canon imagePROGRAF TX-4100 Large Format",
                    category="Office Equipment",
                    manufacturer="Canon",
                    model_number="TX-4100",
                    serial_number="CN-PLT-33918",
                    purchase_date=today - timedelta(days=320),
                    purchase_price=390000.00,
                    department="Civil & Architecture",
                    location="Design Studio Floor 4",
                    assigned_user="Ananya M.",
                    status="Active",
                    warranty_start_date=today - timedelta(days=320),
                    warranty_end_date=today + timedelta(days=45),
                    vendor_id=v_canon.id if v_canon else None,
                    notes="Architectural blueprints plotter. Warranty expires in 45 days.",
                    is_demo=True
                ),
                # 14. High-Throughput Centrifuge
                Asset(
                    asset_id="AST-LAB-003",
                    name="Optima XPN-100 Ultracentrifuge",
                    category="Laboratory Equipment",
                    manufacturer="Agilent Technologies",
                    model_number="XPN-100",
                    serial_number="AG-CEN-77192",
                    purchase_date=today - timedelta(days=250),
                    purchase_price=1600000.00,
                    department="Biotechnology Research",
                    location="Centrifugation Vault",
                    assigned_user="Dr. Arvind S.",
                    status="Active",
                    warranty_start_date=today - timedelta(days=250),
                    warranty_end_date=today + timedelta(days=480),
                    vendor_id=v_agilent.id if v_agilent else None,
                    notes="Refrigerated ultracentrifuge with strict vacuum seal warranty conditions.",
                    is_demo=True
                ),
            ]
            db.add_all(assets_data)
            db.commit()

        # Seed Contracts (AMCs and Warranties)
        if db.query(Contract).count() == 0:
            a_dell1 = db.query(Asset).filter(Asset.asset_id == "AST-SRV-001").first()
            a_cisco1 = db.query(Asset).filter(Asset.asset_id == "AST-NET-001").first()
            a_siemens1 = db.query(Asset).filter(Asset.asset_id == "AST-IND-001").first()
            a_canon1 = db.query(Asset).filter(Asset.asset_id == "AST-PRN-001").first()
            a_lab2 = db.query(Asset).filter(Asset.asset_id == "AST-LAB-002").first()
            a_cisco3 = db.query(Asset).filter(Asset.asset_id == "AST-NET-003").first()
            a_siemens3 = db.query(Asset).filter(Asset.asset_id == "AST-IND-003").first()

            v_dell = db.query(Vendor).filter(Vendor.name.like("%Dell%")).first()
            v_siemens = db.query(Vendor).filter(Vendor.name.like("%Siemens%")).first()
            v_agilent = db.query(Vendor).filter(Vendor.name.like("%Agilent%")).first()
            v_cisco = db.query(Vendor).filter(Vendor.name.like("%Cisco%")).first()
            v_canon = db.query(Vendor).filter(Vendor.name.like("%Canon%")).first()

            contracts_data = [
                # Contract 1: Active Cisco SmartNet AMC
                Contract(
                    contract_number="AMC-CSCO-2026-04",
                    contract_type="AMC",
                    title="Cisco Smart Net Total Care - Core Campus Switches",
                    asset_id=a_cisco1.id if a_cisco1 else None,
                    vendor_id=v_cisco.id if v_cisco else None,
                    start_date=today - timedelta(days=180),
                    end_date=today + timedelta(days=185), # Active
                    contract_amount=65000.00,
                    tax_amount=11700.00,
                    total_amount=76700.00,
                    coverage_type="Comprehensive",
                    coverage_description="24x7x4hr TAC phone support, advance hardware replacement, and IOS-XE software updates.",
                    preventive_maintenance_frequency="Quarterly",
                    response_time_hours=4,
                    parts_replacement_terms="100% parts replacement included including fan trays and power supplies.",
                    labour_coverage="All on-site engineering labor included.",
                    renewal_terms="Annual renewal with 30-day notice prior to anniversary date.",
                    status="Active",
                    auto_renewal=False,
                    renewal_owner="Sandeep K.",
                    notes="Contract renewed annually under master campus network agreement.",
                    is_demo=True
                ),
                # Contract 2: Overlapping AMC on Siemens PLC (Triggers A06)
                Contract(
                    contract_number="AMC-SIEM-2026-99",
                    contract_type="AMC",
                    title="Siemens FactoryCare Comprehensive Automation AMC",
                    asset_id=a_siemens1.id if a_siemens1 else None,
                    vendor_id=v_siemens.id if v_siemens else None,
                    start_date=today - timedelta(days=100),
                    end_date=today + timedelta(days=265),
                    contract_amount=95000.00,
                    tax_amount=17100.00,
                    total_amount=112100.00,
                    coverage_type="Comprehensive",
                    coverage_description="Comprehensive parts replacement and diagnostic maintenance for S7 PLC cabinets.",
                    preventive_maintenance_frequency="Monthly",
                    response_time_hours=8,
                    parts_replacement_terms="All CPU and I/O cards covered.",
                    labour_coverage="Full technician coverage.",
                    renewal_terms="Standard 12 month renewal term.",
                    status="Active",
                    auto_renewal=False,
                    renewal_owner="Ramesh P.",
                    notes="Redundant overlap with OEM warranty running till next year.",
                    is_demo=True
                ),
                # Contract 3: Expiring AMC in 12 days on Canon Printer (Triggers A04)
                Contract(
                    contract_number="AMC-CANON-2025-11",
                    contract_type="AMC",
                    title="Canon Corporate Print Care - C5850i Fleet AMC",
                    asset_id=a_canon1.id if a_canon1 else None,
                    vendor_id=v_canon.id if v_canon else None,
                    start_date=today - timedelta(days=353),
                    end_date=today + timedelta(days=12), # EXPIRES IN 12 DAYS
                    contract_amount=42000.00,
                    tax_amount=7560.00,
                    total_amount=49560.00,
                    coverage_type="Comprehensive",
                    coverage_description="Includes toner drum replacement, roller kits, and on-call breakdown visits.",
                    preventive_maintenance_frequency="Bi-Annual",
                    response_time_hours=24,
                    parts_replacement_terms="Wear-and-tear components covered. Paper excluded.",
                    labour_coverage="Service engineer visits included.",
                    renewal_terms="Automatic 1-year extension unless 30-day non-renewal letter served.",
                    status="Active",
                    auto_renewal=True,
                    renewal_owner="Meera K.",
                    notes="Notice deadline is active now. Action required.",
                    is_demo=True
                ),
                # Contract 4: High Value Lab HPLC Maintenance
                Contract(
                    contract_number="AMC-AGLT-2026-08",
                    contract_type="AMC",
                    title="Agilent CrossLab Gold Service Agreement",
                    asset_id=a_lab2.id if a_lab2 else None,
                    vendor_id=v_agilent.id if v_agilent else None,
                    start_date=today - timedelta(days=90),
                    end_date=today + timedelta(days=275),
                    contract_amount=180000.00,
                    tax_amount=32400.00,
                    total_amount=212400.00,
                    coverage_type="Comprehensive",
                    coverage_description="Preventive maintenance, operational qualification (OQ/PV), and genuine optical components.",
                    preventive_maintenance_frequency="Quarterly",
                    response_time_hours=8,
                    parts_replacement_terms="All optical flow cells and pump seals included.",
                    labour_coverage="Certified factory engineer visits.",
                    renewal_terms="Annual review with price protection index.",
                    status="Active",
                    auto_renewal=False,
                    renewal_owner="Dr. Sunita D.",
                    notes="Regulated laboratory asset requiring strict audit logs.",
                    is_demo=True
                ),
                # Contract 5: Expired AMC on WAN Router (Triggers A03)
                Contract(
                    contract_number="AMC-CSCO-2025-01",
                    contract_type="AMC",
                    title="Cisco Smart Net Maintenance - ASR 1001-X",
                    asset_id=a_cisco3.id if a_cisco3 else None,
                    vendor_id=v_cisco.id if v_cisco else None,
                    start_date=today - timedelta(days=400),
                    end_date=today - timedelta(days=35), # Expired 35 days ago!
                    contract_amount=88000.00,
                    tax_amount=15840.00,
                    total_amount=103840.00,
                    coverage_type="Comprehensive",
                    coverage_description="Hardware RMA and 24x7 TAC support.",
                    preventive_maintenance_frequency="Annual",
                    response_time_hours=4,
                    status="Active", # Erroneously marked Active -> triggers A03
                    auto_renewal=False,
                    renewal_owner="Sandeep K.",
                    notes="Contract lapsed last month without renewal quotation approval.",
                    is_demo=True
                ),
                # Contract 6: Industrial CNC Semi-Annual Service
                Contract(
                    contract_number="AMC-SIEM-2026-14",
                    contract_type="AMC",
                    title="Siemens SINUMERIK Spindle & Drive AMC",
                    asset_id=a_siemens3.id if a_siemens3 else None,
                    vendor_id=v_siemens.id if v_siemens else None,
                    start_date=today - timedelta(days=50),
                    end_date=today + timedelta(days=315),
                    contract_amount=210000.00,
                    tax_amount=37800.00,
                    total_amount=247800.00,
                    coverage_type="Non-Comprehensive",
                    coverage_description="Bi-annual laser calibration and spindle runout vibration analysis. Replacement bearings billed separately.",
                    preventive_maintenance_frequency="Bi-Annual",
                    response_time_hours=12,
                    parts_replacement_terms="Lubricants and seals included; motors and bearings chargeable.",
                    labour_coverage="All calibration labor covered.",
                    status="Active",
                    auto_renewal=False,
                    renewal_owner="Anand R.",
                    notes="Semi-annual calibration contract.",
                    is_demo=True
                ),
                # Contract 7: Incomplete Commercials AMC (Triggers A07 & A08)
                Contract(
                    contract_number="AMC-DELL-2026-INC",
                    contract_type="AMC",
                    title="Dell ProSupport Plus Draft Agreement",
                    asset_id=a_dell1.id if a_dell1 else None,
                    vendor_id=v_dell.id if v_dell else None,
                    start_date=today,
                    end_date=today + timedelta(days=365),
                    contract_amount=0.00, # Missing!
                    tax_amount=0.00,
                    total_amount=0.00,
                    coverage_type="Comprehensive",
                    coverage_description="", # Missing!
                    preventive_maintenance_frequency=None,
                    status="Active",
                    auto_renewal=False,
                    renewal_owner="Pooja V.",
                    notes="Draft quote uploaded without confirmed commercial total.",
                    is_demo=True
                )
            ]
            db.add_all(contracts_data)
            db.commit()

        # Seed Documents with Extracted Fields
        if db.query(Document).count() == 0:
            a_lab1 = db.query(Asset).filter(Asset.asset_id == "AST-LAB-001").first()
            a_dell1 = db.query(Asset).filter(Asset.asset_id == "AST-SRV-001").first()

            # Document 1: Warranty card with serial discrepancy
            doc1 = Document(
                file_name="Agilent_Cary60_Warranty_Certificate.pdf",
                stored_path="storage/sample_files/Agilent_Cary60_Warranty_Certificate.pdf",
                file_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                file_size_bytes=425120,
                mime_type="application/pdf",
                document_category="Warranty Card",
                status="Processed",
                review_status="Approved",
                asset_id=a_lab1.id if a_lab1 else None,
                raw_text="AGILENT TECHNOLOGIES WARRANTY CARD\nProduct: Cary 60 UV-Vis\nSerial Number: MY21045983\nStart Date: 2025-05-10\nEnd Date: 2027-05-09\nVendor: Agilent Technologies Laboratory\nCoverage: Comprehensive Optical System Warranty"
            )
            db.add(doc1)
            db.flush()

            # Extracted fields for Doc 1
            ef1 = [
                ExtractedField(document_id=doc1.id, field_name="serial_number", extracted_value="MY21045983", confidence=0.96, field_category="Identifier", is_corrected=False),
                ExtractedField(document_id=doc1.id, field_name="warranty_start_date", extracted_value="2025-05-10", confidence=0.91, field_category="Date", is_corrected=False),
                ExtractedField(document_id=doc1.id, field_name="warranty_end_date", extracted_value="2027-05-09", confidence=0.91, field_category="Date", is_corrected=False),
                ExtractedField(document_id=doc1.id, field_name="vendor_name", extracted_value="Agilent Technologies Laboratory", confidence=0.88, field_category="General", is_corrected=False),
            ]
            db.add_all(ef1)

            # Document 2: Ingestion Pending Human Review
            doc2 = Document(
                file_name="Dell_PowerEdge_R750_Tax_Invoice_2025.pdf",
                stored_path="storage/sample_files/Dell_PowerEdge_R750_Tax_Invoice_2025.pdf",
                file_hash="9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
                file_size_bytes=612800,
                mime_type="application/pdf",
                document_category="Purchase Invoice",
                status="Review Required",
                review_status="Pending Review", # Triggers C05
                asset_id=a_dell1.id if a_dell1 else None,
                raw_text="TAX INVOICE - DELL TECHNOLOGIES INDIA\nInvoice No: DL-INV-99201\nAsset ID: AST-SRV-001\nSerial Number: DL-SRV-987214\nTotal Amount: INR 485,000.00\nDate of Delivery: 2025-10-20\n3-Year On-Site Mission Critical Support Included"
            )
            db.add(doc2)
            db.flush()

            ef2 = [
                ExtractedField(document_id=doc2.id, field_name="invoice_number", extracted_value="DL-INV-99201", confidence=0.94, field_category="Identifier"),
                ExtractedField(document_id=doc2.id, field_name="serial_number", extracted_value="DL-SRV-987214", confidence=0.95, field_category="Identifier"),
                ExtractedField(document_id=doc2.id, field_name="total_amount", extracted_value="485000.00", confidence=0.89, field_category="Financial"),
                ExtractedField(document_id=doc2.id, field_name="purchase_date", extracted_value="2025-10-20", confidence=0.82, field_category="Date", is_ambiguous=True),
            ]
            db.add_all(ef2)
            db.commit()

        # Seed Notifications
        if db.query(Notification).count() == 0:
            notifs = [
                Notification(
                    title="Warranty Expiration Alert: AST-SRV-002",
                    message="Dell PowerEdge R650 Database Host warranty will lapse in 18 days. Review renewal status.",
                    notification_type="Expiration",
                    severity="Warning",
                    is_read=False,
                    link_url="/assets/2"
                ),
                Notification(
                    title="AMC Expiration Notice: AMC-CANON-2025-11",
                    message="Canon imageRUNNER print care contract expires in 12 days. Budget renewal required.",
                    notification_type="Renewal",
                    severity="Critical",
                    is_read=False,
                    link_url="/contracts"
                ),
                Notification(
                    title="Cross-Document Discrepancy Flagged",
                    message="Serial number discrepancy detected on Agilent Cary 60 Spectrophotometer (AST-LAB-001).",
                    notification_type="Validation",
                    severity="Critical",
                    is_read=False,
                    link_url="/validation"
                )
            ]
            db.add_all(notifs)
            db.commit()

        # Seed Audit Logs
        if db.query(AuditLog).count() == 0:
            al1 = AuditLog(
                actor_id=admin.id,
                actor_email=admin.email,
                action="SYSTEM_INIT",
                entity_type="SYSTEM",
                entity_id="ROOT",
                details={"message": "WarrantyIQ engine initialized with enterprise asset catalog and demo seed data."},
                ip_address="127.0.0.1",
                timestamp=datetime.utcnow() - timedelta(hours=2)
            )
            al2 = AuditLog(
                actor_id=admin.id,
                actor_email=admin.email,
                action="DOCUMENT_UPLOAD",
                entity_type="DOCUMENT",
                entity_id="1",
                details={"file_name": "Agilent_Cary60_Warranty_Certificate.pdf", "file_size": 425120},
                ip_address="127.0.0.1",
                timestamp=datetime.utcnow() - timedelta(hours=1)
            )
            db.add_all([al1, al2])
            db.commit()

        # Seed Task Assignments
        if db.query(TaskAssignment).count() == 0:
            manager_user = db.query(User).filter(User.role == "Contract Manager").first()
            if manager_user:
                t1 = TaskAssignment(
                    task_identifier="TSK-2026-001",
                    task_type="Finding Review",
                    title="Investigate Agilent Cary 60 serial number discrepancy",
                    priority="Critical",
                    status="Open",
                    assigned_to_id=manager_user.id,
                    created_by_id=admin.id,
                    due_date=date.today() + timedelta(days=3),
                    notes="Cross-reference physical asset tag on unit with invoice INV-AGL-2024-09.",
                    created_at=datetime.utcnow() - timedelta(days=1)
                )
                t2 = TaskAssignment(
                    task_identifier="TSK-2026-002",
                    task_type="Contract Audit",
                    title="Audit Canon imageRUNNER 30-day AMC expiration",
                    priority="High",
                    status="In Progress",
                    assigned_to_id=manager_user.id,
                    created_by_id=admin.id,
                    due_date=date.today() + timedelta(days=7),
                    notes="Verify if finance has approved renewal budget for AMC-CANON-2025-11.",
                    created_at=datetime.utcnow() - timedelta(days=2)
                )
                t3 = TaskAssignment(
                    task_identifier="TSK-2026-003",
                    task_type="Document Extraction Review",
                    title="Verify Dell PowerEdge R750 warranty certificate OCR",
                    priority="Medium",
                    status="Completed",
                    assigned_to_id=manager_user.id,
                    created_by_id=admin.id,
                    due_date=date.today() - timedelta(days=1),
                    notes="Ensure extracted start and end dates match scanned PDF.",
                    resolution_notes="Dates confirmed and approved in Document Library.",
                    completed_at=datetime.utcnow() - timedelta(hours=5),
                    created_at=datetime.utcnow() - timedelta(days=3)
                )
                db.add_all([t1, t2, t3])
                db.commit()

        # Trigger Initial Global Validation Run to populate findings and metrics
        print("Running initial global validation pass...")
        ValidationEngine.run_validation(db, target_type="Global", user_id=admin.id)
        print("Database seeded and validated successfully.")

    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
