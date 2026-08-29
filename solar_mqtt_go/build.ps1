# PowerShell 建置腳本：產出 solar_mqtt_go Windows 發佈 binary
#
# 產物（dist/）：
#   solar_mqtt_go_windows_amd64_tray.exe    Windows 系統列版（GUI 子系統，無黑視窗）
#   solar_mqtt_go_windows_amd64_console.exe Windows 主控台版（CLI 除錯用）

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptDir

$OutDir = Join-Path $ScriptDir "dist"
if (Test-Path $OutDir) {
    Remove-Item -Recurse -Force $OutDir
}
New-Item -ItemType Directory -Path $OutDir | Out-Null

Write-Host "==> windows/amd64 tray（GUI 子系統，無主控台）..."
$env:CGO_ENABLED = "0"
$env:GOOS = "windows"
$env:GOARCH = "amd64"
go build -ldflags "-s -w -H windowsgui" -o "$OutDir\solar_mqtt_go_windows_amd64_tray.exe" .

Write-Host "==> windows/amd64 console（CLI）..."
go build -ldflags "-s -w" -o "$OutDir\solar_mqtt_go_windows_amd64_console.exe" .

$files = Get-ChildItem $OutDir
if ($files.Count -ne 2) {
    Write-Error "建置產物數量不符（預期 2 個檔案，實際產出 $($files.Count) 個）"
}

Write-Host "==> 建置完成！產物清單："
$files | Format-Table Name, Length, LastWriteTime
