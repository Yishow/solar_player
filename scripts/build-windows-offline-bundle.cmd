@echo off
setlocal EnableExtensions

cd /d "%~dp0.."
call pnpm build
if errorlevel 1 exit /b %errorlevel%
node scripts\build-windows-offline-bundle.mjs
