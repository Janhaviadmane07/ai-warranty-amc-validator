@echo off
echo ========================================================
echo   Starting WarrantyIQ (Backend + Frontend)
echo ========================================================

set SCRIPT_DIR=%~dp0

start "WarrantyIQ Backend (FastAPI)" cmd /k "cd /d "%SCRIPT_DIR%backend" && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

start "WarrantyIQ Frontend (Vite)" cmd /k "cd /d "%SCRIPT_DIR%frontend" && npm run dev"

echo Backend starting on http://127.0.0.1:8000
echo Frontend starting on http://127.0.0.1:5173
echo You can close this launcher window.
