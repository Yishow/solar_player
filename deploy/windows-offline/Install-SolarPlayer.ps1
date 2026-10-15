#Requires -RunAsAdministrator
[CmdletBinding()]
param(
  [int]$Port = 4000
)

$ErrorActionPreference = "Stop"
$BundleRoot = Split-Path -Parent $PSCommandPath
$PayloadRoot = Join-Path $BundleRoot "payload"
$InstallRoot = Join-Path $env:ProgramData "SolarPlayer"
$ServiceName = "SolarPlayerServer"
$RuntimeSource = Join-Path $BundleRoot "runtime"

if (-not (Test-Path $PayloadRoot)) { throw "Offline payload is missing: $PayloadRoot" }
if (-not (Test-Path (Join-Path $RuntimeSource "node\node.exe"))) { throw "Bundled node.exe is missing: $RuntimeSource\node\node.exe" }
if (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue) {
  throw "TCP $Port is already in use. Stop or reconfigure that listener before installing Solar Player."
}
if (Get-ScheduledTask -TaskName $ServiceName -ErrorAction SilentlyContinue) {
  throw "Scheduled task $ServiceName already exists. This offline installer will not replace an existing task."
}
if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
  throw "Service $ServiceName already exists. This offline installer will not replace an existing service."
}
if (Test-Path $InstallRoot) {
  throw "Install directory already exists: $InstallRoot. This offline installer will not overwrite existing runtime data."
}

New-Item -ItemType Directory -Force -Path $InstallRoot, "$InstallRoot\data", "$InstallRoot\logs", "$InstallRoot\uploads\images", "$InstallRoot\uploads\brand" | Out-Null
Copy-Item -Recurse -Force (Join-Path $PayloadRoot "*") $InstallRoot
Copy-Item -Recurse -Force $RuntimeSource $InstallRoot

$EnvPath = Join-Path $InstallRoot ".env"
$EnvText = Get-Content -Raw (Join-Path $InstallRoot ".env.example")
$EnvText = $EnvText -replace "(?m)^PORT=.*$", "PORT=$Port"
$EnvText = $EnvText -replace "(?m)^HOST=.*$", "HOST=0.0.0.0"
Set-Content -NoNewline -Encoding utf8 $EnvPath $EnvText

$RunnerPath = Join-Path $InstallRoot "Start-Service.cmd"
$RunnerContent = "@echo off`r`ncd /d `"%~dp0`"`r`n`"%~dp0runtime\node\node.exe`" apps\server\dist\server.js >> `"%~dp0logs\solar-player-stdout.log`" 2>> `"%~dp0logs\solar-player-stderr.log`"`r`n"
Set-Content -NoNewline -Encoding ascii $RunnerPath $RunnerContent

$action = New-ScheduledTaskAction -Execute $RunnerPath -WorkingDirectory $InstallRoot
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)
Register-ScheduledTask -TaskName $ServiceName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null

New-NetFirewallRule -DisplayName "Solar Player TCP $Port" -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow | Out-Null
Start-ScheduledTask -TaskName $ServiceName
Write-Host "Solar Player scheduled task started on TCP $Port. Verify: http://127.0.0.1:$Port/health"
