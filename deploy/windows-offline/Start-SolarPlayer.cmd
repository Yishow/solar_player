@echo off
setlocal EnableExtensions
set "ROOT=%~dp0"
set "PORT=4000"

for /f "delims=" %%A in ('netstat -ano ^| findstr /R /C:":4000 .*LISTENING"') do (
  echo TCP %PORT% is already in use. Stop or reconfigure that listener before starting Solar Player.
  exit /b 1
)

if not exist "%ROOT%runtime\node\node.exe" (
  echo Bundled node.exe is missing.
  exit /b 1
)

if not exist "%ROOT%apps\server\dist\server.js" (
  echo Bundled server is missing.
  exit /b 1
)

mkdir "%ROOT%data" "%ROOT%logs" "%ROOT%uploads\images" "%ROOT%uploads\brand" 2>nul
if not exist "%ROOT%.env" (
  set "SOLAR_ENV_PATH=%ROOT%.env"
  powershell -NoProfile -Command "$content = Get-Content -Raw '%ROOT%.env.example'; $content = $content -replace '(?m)^PORT=.*$', 'PORT=4000'; $content = $content -replace '(?m)^HOST=.*$', 'HOST=0.0.0.0'; [System.IO.File]::WriteAllText($env:SOLAR_ENV_PATH, $content)"
)

cd /d "%ROOT%"
echo Starting Solar Player on http://127.0.0.1:%PORT%/health
echo Keep this window open while the portable server is needed.
"%ROOT%runtime\node\node.exe" "apps\server\dist\server.js"
