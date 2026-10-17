Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       Starting WarrantyIQ (Backend + Frontend)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (Test-Path "$scriptDir\backend") {
    $baseDir = $scriptDir
} elseif (Test-Path "$scriptDir\AI_Warranty_AMC_Validator\backend") {
    $baseDir = "$scriptDir\AI_Warranty_AMC_Validator"
} else {
    $baseDir = $scriptDir
}

$backendDir = "$baseDir\backend"
$frontendDir = "$baseDir\frontend"

Write-Host "-> Backend Directory:  $backendDir" -ForegroundColor Gray
Write-Host "-> Frontend Directory: $frontendDir" -ForegroundColor Gray

# Clean up any existing processes on ports 8000 and 5173 to prevent [Errno 10048] address in use conflicts
Write-Host "Ensuring ports 8000 and 5173 are free..." -ForegroundColor Gray
$occupiedPids = Get-NetTCPConnection -LocalPort 8000, 5173 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($p in $occupiedPids) {
    if ($p -and $p -ne 0 -and $p -ne $PID) {
        Write-Host "Stopping previous process ($p) on port 8000/5173..." -ForegroundColor Yellow
        Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
    }
}
Start-Sleep -Milliseconds 600

# Start backend in dedicated window with execution policy bypass
Start-Process powershell -WorkingDirectory $backendDir -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle = 'WarrantyIQ Backend (FastAPI :8000)'; Write-Host '==================================================' -ForegroundColor Cyan; Write-Host '  WarrantyIQ FastAPI Backend Running on :8000' -ForegroundColor Cyan; Write-Host '  API Docs: http://127.0.0.1:8000/docs' -ForegroundColor Gray; Write-Host '==================================================' -ForegroundColor Cyan; python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

# Start frontend in dedicated window using npm.cmd to avoid execution policy errors
Start-Process powershell -WorkingDirectory $frontendDir -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle = 'WarrantyIQ Frontend (Vite :5173)'; Write-Host '==================================================' -ForegroundColor Cyan; Write-Host '  WarrantyIQ Vite Frontend Running on :5173' -ForegroundColor Cyan; Write-Host '==================================================' -ForegroundColor Cyan; if (Get-Command npm.cmd -ErrorAction SilentlyContinue) { npm.cmd run dev } else { npm run dev }"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  Backend running on:  http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "  API Docs:            http://127.0.0.1:8000/docs" -ForegroundColor Green
Write-Host "  Frontend running on: http://localhost:5173" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Demo Credentials:" -ForegroundColor Yellow
Write-Host "  Admin:   admin@warrantyiq.com   / Admin@123"
Write-Host "  Manager: manager@warrantyiq.com / Manager@123"
Write-Host "  User:    user@warrantyiq.com    / User@123"
Write-Host ""
Write-Host "Opening browser in 3 seconds..." -ForegroundColor Gray
Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"
