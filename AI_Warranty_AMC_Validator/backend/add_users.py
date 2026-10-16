"""
Script to add additional Manager and Viewer users to the WarrantyIQ database.
Run from the backend directory: python add_users.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime
from app.core.database import SessionLocal, Base, engine
from app.core.security import get_password_hash
from app.models.entities import User

def add_users():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    additional_users = [
        # --- Contract Managers ---
        {
            "email": "manager2@warrantyiq.com",
            "full_name": "Ankit Mehta",
            "password": "Manager@123",
            "role": "Contract Manager",
            "department": "IT Asset Management"
        },
        {
            "email": "manager3@warrantyiq.com",
            "full_name": "Priya Nair",
            "password": "Manager@123",
            "role": "Contract Manager",
            "department": "Facilities & Infrastructure"
        },
        {
            "email": "manager4@warrantyiq.com",
            "full_name": "Ravi Shankar",
            "password": "Manager@123",
            "role": "Contract Manager",
            "department": "Network Operations"
        },
        {
            "email": "manager5@warrantyiq.com",
            "full_name": "Deepika Rao",
            "password": "Manager@123",
            "role": "Contract Manager",
            "department": "Lab & Scientific Equipment"
        },
        # --- Viewers ---
        {
            "email": "viewer2@warrantyiq.com",
            "full_name": "Suresh Babu",
            "password": "Viewer@123",
            "role": "Viewer",
            "department": "Finance & Accounts"
        },
        {
            "email": "viewer3@warrantyiq.com",
            "full_name": "Meena Krishnan",
            "password": "Viewer@123",
            "role": "Viewer",
            "department": "Quality Assurance"
        },
        {
            "email": "viewer4@warrantyiq.com",
            "full_name": "Harish Patel",
            "password": "Viewer@123",
            "role": "Viewer",
            "department": "Compliance & Risk"
        },
        {
            "email": "viewer5@warrantyiq.com",
            "full_name": "Nandini Shah",
            "password": "Viewer@123",
            "role": "Viewer",
            "department": "Operations Management"
        },
    ]

    added = 0
    skipped = 0

    try:
        for u in additional_users:
            existing = db.query(User).filter(User.email == u["email"]).first()
            if existing:
                print(f"  [SKIP] {u['email']} already exists.")
                skipped += 1
                continue

            new_user = User(
                email=u["email"],
                full_name=u["full_name"],
                hashed_password=get_password_hash(u["password"]),
                role=u["role"],
                department=u["department"],
                is_active=True,
                created_at=datetime.utcnow()
            )
            db.add(new_user)
            added += 1
            print(f"  [ADD]  {u['full_name']} ({u['role']}) -> {u['email']}")

        db.commit()
        print(f"\n Done. Added: {added}, Skipped: {skipped}")
        print("\n--- Login Credentials Summary ---")
        print("Managers:  password = Manager@123")
        print("Viewers:   password = Viewer@123")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("Adding additional managers and viewers to WarrantyIQ...\n")
    add_users()
