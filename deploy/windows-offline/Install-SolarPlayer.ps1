#Requires -RunAsAdministrator
[CmdletBinding()]
param(
  [int]$Port = 4000,
  [switch]$Update
)

$ErrorActionPreference = "Stop"
$BundleRoot = Split-Path -Parent $PSCommandPath
$PayloadRoot = Join-Path $BundleRoot "payload"
$InstallRoot = Join-Path $env:ProgramData "SolarPlayer"
$ServiceName = "SolarPlayerServer"
$RuntimeSource = Join-Path $BundleRoot "runtime"
$ManifestPath = Join-Path $BundleRoot "bundle-manifest.json"

if (-not (Test-Path $PayloadRoot)) { throw "Offline payload is missing: $PayloadRoot" }
if (-not (Test-Path (Join-Path $RuntimeSource "node\node.exe"))) { throw "Bundled node.exe is missing: $RuntimeSource\node\node.exe" }

function Get-FileSha256([string]$filePath) {
  $stream = [System.IO.File]::OpenRead($filePath)
  try {
    $hasher = [System.Security.Cryptography.SHA256]::Create()
    $hashBytes = $hasher.ComputeHash($stream)
    return [System.BitConverter]::ToString($hashBytes).Replace("-", "").ToLowerInvariant()
  } finally {
    $stream.Dispose()
  }
}

function Get-LargeAssetCopyPlan {
  if (-not (Test-Path $ManifestPath)) { return }
  $manifest = Get-Content -Raw $ManifestPath | ConvertFrom-Json
  if (-not $manifest.largeAssets) { return }

  $separateAssetsDir = Join-Path $BundleRoot "assets"

  foreach ($asset in $manifest.largeAssets) {
    $targetFile = Join-Path $InstallRoot $asset.relPath
    $payloadFile = Join-Path $BundleRoot "payload\$($asset.relPath)"
    $separateFile = Join-Path $separateAssetsDir $asset.name
    $nestedSeparateFile = Join-Path (Join-Path $BundleRoot "solar-player-assets\assets") $asset.name
    if (-not (Test-Path $separateFile) -and (Test-Path $nestedSeparateFile)) {
      $separateFile = $nestedSeparateFile
    }
    $siblingSeparateFile = Join-Path (Join-Path (Split-Path -Parent $BundleRoot) "solar-player-assets\assets") $asset.name
    if (-not (Test-Path $separateFile) -and (Test-Path $siblingSeparateFile)) {
      $separateFile = $siblingSeparateFile
    }
    $needsCopy = $true

    if (Test-Path $targetFile) {
      $currentHash = Get-FileSha256 $targetFile
      if ($currentHash -eq $asset.sha256) {
        Write-Host "Asset $($asset.name) is up to date ($currentHash), skipping."
        $needsCopy = $false
      } else {
        Write-Host "Asset $($asset.name) hash changed, update required."
      }
    } else {
      Write-Host "Asset $($asset.name) not found on target, copy required."
    }

    if ($needsCopy) {
      if (Test-Path $payloadFile) {
        [pscustomobject]@{ Source = $payloadFile; Target = $targetFile }
      } elseif (Test-Path $separateFile) {
        [pscustomobject]@{ Source = $separateFile; Target = $targetFile }
      } else {
        throw "Asset $($asset.name) requires an update but is missing from the bundle. Include the matching solar-player-assets archive."
      }
    }
  }
}

function Sync-LargeAssets($CopyPlan) {
  foreach ($copy in $CopyPlan) {
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $copy.Target) | Out-Null
    Copy-Item -Force $copy.Source $copy.Target
  }
}

if ($Update) {
  if (-not (Test-Path $InstallRoot)) {
    throw "Install directory does not exist: $InstallRoot. Run without -Update for a fresh install."
  }
  $largeAssetCopyPlan = @(Get-LargeAssetCopyPlan)
  if (Get-ScheduledTask -TaskName $ServiceName -ErrorAction SilentlyContinue) {
    Stop-ScheduledTask -TaskName $ServiceName -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
  }
  Copy-Item -Recurse -Force (Join-Path $PayloadRoot "*") $InstallRoot
  Copy-Item -Recurse -Force $RuntimeSource $InstallRoot
  Sync-LargeAssets $largeAssetCopyPlan
  Start-ScheduledTask -TaskName $ServiceName
  Write-Host "Solar Player scheduled task updated and restarted on TCP $Port. Verify: http://127.0.0.1:$Port/health"
  return
}

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
  throw "Install directory already exists: $InstallRoot. This offline installer will not overwrite existing runtime data. Use -Update to refresh an existing installation."
}

$largeAssetCopyPlan = @(Get-LargeAssetCopyPlan)
New-Item -ItemType Directory -Force -Path $InstallRoot, "$InstallRoot\data", "$InstallRoot\logs", "$InstallRoot\uploads\images", "$InstallRoot\uploads\brand" | Out-Null
Copy-Item -Recurse -Force (Join-Path $PayloadRoot "*") $InstallRoot
Copy-Item -Recurse -Force $RuntimeSource $InstallRoot
Sync-LargeAssets $largeAssetCopyPlan

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
