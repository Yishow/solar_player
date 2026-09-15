@echo off
setlocal

set GOARCH=386
set GOOS=windows

echo Building console verification binary...
go build -o opc_mqtt_console.exe .
if errorlevel 1 goto :fail

echo Building release background binary...
go build -ldflags="-H windowsgui" -o opc_mqtt.exe .
if errorlevel 1 goto :fail

echo Build complete:
echo   - opc_mqtt_console.exe
echo   - opc_mqtt.exe
exit /b 0

:fail
echo Build failed.
exit /b 1
