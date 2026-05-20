param([switch]$NoBrowser)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "=== Starting Imagine Hub ===" -ForegroundColor Cyan
Write-Host ""

# Kill any leftover processes on our ports
Get-Process -Name "python" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*run.py*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*vite*" } | Stop-Process -Force -ErrorAction SilentlyContinue

# Detect LAN IP
$lanIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -match "^(192\.168\.|10\.|172\.)" } | Select-Object -First 1).IPAddress
if (-not $lanIp) { $lanIp = "localhost" }

# Start backend
Write-Host "[Backend] http://localhost:8000" -ForegroundColor Green
$pBack = Start-Process -FilePath "$root\backend\.venv\Scripts\python.exe" `
    -ArgumentList "run.py" `
    -WorkingDirectory "$root\backend" `
    -NoNewWindow -PassThru

# Start frontend
Write-Host "[Frontend] http://localhost:5173" -ForegroundColor Green
$pFront = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c npm run dev" `
    -WorkingDirectory "$root\frontend" `
    -NoNewWindow -PassThru

Start-Sleep -Seconds 5

Write-Host ""
Write-Host "Network Access:" -ForegroundColor Cyan
Write-Host "  Local:   http://localhost:5173" -ForegroundColor Green
Write-Host "  LAN:     http://${lanIp}:5173" -ForegroundColor Yellow
Write-Host "  API:     http://localhost:8000/api/health" -ForegroundColor Green
Write-Host ""

if (-not $NoBrowser) {
    Start-Process "http://localhost:5173"
}

Write-Host "Press Ctrl+C to stop both servers." -ForegroundColor Yellow

# Wait for either process to exit
$pBack.WaitForExit()
$pFront.WaitForExit()
