# Solar Player repo 便捷啟動腳本 (Windows PowerShell)
#
# 用法：
#   .\start.ps1    # 等同 pnpm dev
#
# solar_mqtt_go 收集器請改用 solar_mqtt_go\start.ps1
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptDir

$Pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
if (-not $Pnpm) {
    Write-Error "錯誤: 找不到 pnpm，請先安裝 pnpm（https://pnpm.io/installation）"
}

if (-not (Test-Path (Join-Path $ScriptDir "node_modules"))) {
    Write-Host "==> 尚未安裝依賴，先執行 pnpm install..."
    & pnpm install
}

& pnpm dev
