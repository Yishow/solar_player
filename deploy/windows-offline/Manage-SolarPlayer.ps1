$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$launcher = Join-Path $root "Start-SolarPlayer.cmd"
$node = Join-Path $root "runtime\node\node.exe"
$stdoutLog = Join-Path $root "portable-startup.stdout.log"
$stderrLog = Join-Path $root "portable-startup.stderr.log"

function Get-SolarPlayerListener {
  Get-NetTCPConnection -LocalPort 4000 -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1
}

function Get-SolarPlayerProcess {
  $listener = Get-SolarPlayerListener
  if (-not $listener) { return $null }
  $process = Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue
  if (-not $process -or -not $process.Path) { return $null }
  $expectedPath = (Get-Item -LiteralPath $node).FullName
  $actualPath = (Get-Item -LiteralPath $process.Path).FullName
  if (-not [string]::Equals($actualPath, $expectedPath, [StringComparison]::OrdinalIgnoreCase)) { return $null }
  return $process
}

function Show-Status {
  $listener = Get-SolarPlayerListener
  $process = Get-SolarPlayerProcess
  if (-not $listener) {
    Write-Host "Solar Player 未在 TCP 4000 執行。"
    return
  }

  if (-not $process) {
    $owner = Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue
    $actualPath = if ($owner -and $owner.Path) { $owner.Path } else { "無法讀取（可能由其他 Windows 使用者啟動）" }
    Write-Warning "TCP 4000 由其他程序使用（PID $($listener.OwningProcess)）。目前：$actualPath；預期：$node。此工具不會停止它。"
    return
  }

  Write-Host "Solar Player 正在背景執行，PID: $($process.Id)"
  try {
    $health = Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 "http://127.0.0.1:4000/health"
    Write-Host "Health: HTTP $($health.StatusCode) $($health.Content)"
  } catch {
    Write-Warning "TCP 4000 已監聽，但 health 失敗：$($_.Exception.Message)"
  }
}

function Start-SolarPlayer {
  if ((-not (Test-Path $launcher)) -or (-not (Test-Path $node))) {
    Write-Error "portable 檔案不完整。請在解壓後的 Solar Player 資料夾內執行本工具。"
    return
  }
  if (Get-SolarPlayerListener) {
    Show-Status
    return
  }

  $process = Start-Process -FilePath $env:ComSpec -ArgumentList @("/c", "`"$launcher`"") -WorkingDirectory $root -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog -WindowStyle Hidden -PassThru
  Write-Host "已在背景啟動（launcher PID: $($process.Id)），正在等待 health..."
  for ($attempt = 1; $attempt -le 15; $attempt++) {
    Start-Sleep -Seconds 2
    if (Get-SolarPlayerProcess) {
      Show-Status
      return
    }
  }
  Write-Warning "30 秒內未取得 health。請查看：$stderrLog"
}

function Stop-SolarPlayer {
  $process = Get-SolarPlayerProcess
  if (-not $process) {
    Show-Status
    return
  }
  if ((Read-Host "確定停止 Solar Player PID $($process.Id)？輸入 Y 確認") -notmatch "^[Yy]$") { return }
  Stop-Process -Id $process.Id
  Write-Host "Solar Player 已停止。"
}

function Show-Logs {
  foreach ($log in @($stdoutLog, $stderrLog)) {
    Write-Host "`n--- $log ---"
    if (Test-Path $log) { Get-Content -Tail 80 $log } else { Write-Host "尚無 log。" }
  }
}

while ($true) {
  Write-Host "`nSolar Player portable 管理選單"
  Write-Host "1. 背景啟動"
  Write-Host "2. 停止"
  Write-Host "3. 狀態與 health"
  Write-Host "4. 顯示最近 log"
  Write-Host "0. 離開"
  switch (Read-Host "選擇") {
    "1" { Start-SolarPlayer }
    "2" { Stop-SolarPlayer }
    "3" { Show-Status }
    "4" { Show-Logs }
    "0" { exit 0 }
    default { Write-Warning "請輸入 0 到 4。" }
  }
}
