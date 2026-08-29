# Solar Player & solar_mqtt_go 便捷啟動腳本 (Windows PowerShell)
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptDir

$TargetScript = Join-Path $ScriptDir "solar_mqtt_go\start.ps1"
if (Test-Path $TargetScript) {
    & $TargetScript @args
} else {
    Write-Error "錯誤: 找不到 solar_mqtt_go\start.ps1"
}
