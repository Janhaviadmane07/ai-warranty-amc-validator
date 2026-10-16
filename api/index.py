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

from app.main import app
