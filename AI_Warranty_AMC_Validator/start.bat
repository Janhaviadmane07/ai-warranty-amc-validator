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

:: Kill any existing process on ports 8000 and 5173 to prevent conflicts
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do taskkill /f /pid %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do taskkill /f /pid %%a 2>nul

start "WarrantyIQ Backend (FastAPI :8000)" cmd /k "title WarrantyIQ Backend (FastAPI :8000) && cd /d "%BASE_DIR%\backend" && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
start "WarrantyIQ Frontend (Vite :5173)" cmd /k "title WarrantyIQ Frontend (Vite :5173) && cd /d "%BASE_DIR%\frontend" && npm.cmd run dev"

echo Backend starting on  http://127.0.0.1:8000
echo API Docs at          http://127.0.0.1:8000/docs
echo Frontend starting on http://localhost:5173
echo.
echo Demo Credentials:
echo   Admin:   admin@warrantyiq.com   / Admin@123
echo   Manager: manager@warrantyiq.com / Manager@123
echo   User:    user@warrantyiq.com    / User@123
echo.
timeout /t 3 /nobreak >nul
start http://localhost:5173
