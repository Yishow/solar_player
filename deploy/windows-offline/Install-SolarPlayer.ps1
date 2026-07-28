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
$NssmPath = Join-Path $BundleRoot "runtime\nssm\nssm.exe"

if (-not (Test-Path $PayloadRoot)) { throw "Offline payload is missing: $PayloadRoot" }
if (-not (Test-Path $NssmPath)) { throw "Bundled nssm.exe is missing: $NssmPath" }
if (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue) {
  throw "TCP $Port is already in use. Stop or reconfigure that listener before installing Solar Player."
}
if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
  throw "Service $ServiceName already exists. This offline installer will not replace an existing service."
}
if (Test-Path $InstallRoot) {
  throw "Install directory already exists: $InstallRoot. This offline installer will not overwrite existing runtime data."
}

New-Item -ItemType Directory -Force -Path $InstallRoot, "$InstallRoot\data", "$InstallRoot\logs", "$InstallRoot\uploads\images", "$InstallRoot\uploads\brand" | Out-Null
Copy-Item -Recurse -Force (Join-Path $PayloadRoot "*") $InstallRoot

$EnvPath = Join-Path $InstallRoot ".env"
$EnvText = Get-Content -Raw (Join-Path $InstallRoot ".env.example")
$EnvText = $EnvText -replace "(?m)^PORT=.*$", "PORT=$Port"
$EnvText = $EnvText -replace "(?m)^HOST=.*$", "HOST=0.0.0.0"
Set-Content -NoNewline -Encoding utf8 $EnvPath $EnvText

$NodePath = Join-Path $BundleRoot "runtime\node\node.exe"
if (-not (Test-Path $NodePath)) { throw "Bundled node.exe is missing: $NodePath" }
& $NssmPath install $ServiceName $NodePath "apps\server\dist\server.js"
& $NssmPath set $ServiceName AppDirectory $InstallRoot
& $NssmPath set $ServiceName AppStdout "$InstallRoot\logs\solar-player-stdout.log"
& $NssmPath set $ServiceName AppStderr "$InstallRoot\logs\solar-player-stderr.log"
& $NssmPath set $ServiceName AppRotateFiles 1
& $NssmPath set $ServiceName AppExit Default Restart
& $NssmPath set $ServiceName AppRestartDelay 5000
New-NetFirewallRule -DisplayName "Solar Player TCP $Port" -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow | Out-Null
& $NssmPath start $ServiceName
Write-Host "Solar Player service started on TCP $Port. Verify: http://127.0.0.1:$Port/health"
