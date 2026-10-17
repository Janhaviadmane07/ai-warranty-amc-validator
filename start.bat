@echo off
setlocal
echo ========================================================
echo        Starting WarrantyIQ (Backend + Frontend)
echo ========================================================

set SCRIPT_DIR=%~dp0
if exist "%SCRIPT_DIR%backend" (
    set BASE_DIR=%SCRIPT_DIR%
) else if exist "%SCRIPT_DIR%AI_Warranty_AMC_Validator\backend" (
    set BASE_DIR=%SCRIPT_DIR%AI_Warranty_AMC_Validator
) else (
    set BASE_DIR=%SCRIPT_DIR%
)

start "WarrantyIQ Backend (FastAPI)" cmd /k "cd /d "%BASE_DIR%\backend" && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
start "WarrantyIQ Frontend (Vite)" cmd /k "cd /d "%BASE_DIR%\frontend" && npm.cmd run dev"

echo Backend starting on  http://127.0.0.1:8000
echo Frontend starting on http://localhost:5173
echo.
echo Demo Credentials:
echo   Admin:   admin@warrantyiq.com   / Admin@123
echo   Manager: manager@warrantyiq.com / Manager@123
echo   User:    user@warrantyiq.com    / User@123
echo.
timeout /t 3 /nobreak >nul
start http://localhost:5173
