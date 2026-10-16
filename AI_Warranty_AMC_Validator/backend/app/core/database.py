import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
# pyrefly: ignore [missing-import]
from app.core.config import settings

# Ensure storage directory exists
os.makedirs(settings.STORAGE_DIR, exist_ok=True)
db_dir = os.path.dirname(settings.DATABASE_URL.replace("sqlite:///", ""))
if db_dir and not db_dir.startswith("postgresql"):
    os.makedirs(db_dir, exist_ok=True)

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
