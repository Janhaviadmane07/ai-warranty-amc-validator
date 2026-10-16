import os
import sys

# Directory containing this script (e.g. <project_root>/api)
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, '..'))
backend_dir = os.path.join(project_root, 'AI_Warranty_AMC_Validator', 'backend')

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Serverless environment needs writable directory for SQLite & uploads
os.environ.setdefault("DATABASE_URL", "sqlite:////tmp/warrantyiq.db")
os.environ.setdefault("STORAGE_DIR", "/tmp/warrantyiq_storage")

from app.main import app as fastapi_app
from app.api.endpoints import api_router

# In Vercel, requests to /api/index.py or /api/v1/... may arrive with or without /api/v1 prefix.
# Mount api_router at both '' and '/api/v1' so all paths resolve regardless of rewrite stripping.
fastapi_app.include_router(api_router, prefix="")

app = fastapi_app
