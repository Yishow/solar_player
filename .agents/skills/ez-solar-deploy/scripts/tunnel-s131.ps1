# 快速啟停 192.168.17.131 的本機轉發隧道
# 用法:
#   pwsh -File tunnel-s131.ps1 start    # 啟動轉發(2176/4000/18884)
#   pwsh -File tunnel-s131.ps1 stop     # 停止轉發
#   pwsh -File tunnel-s131.ps1 status   # 看狀態
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('start', 'stop', 'status')]
  [string]$Action
)

$ErrorActionPreference = 'Stop'
$TcapiCandidates = @(
  'C:\AIProject\tailcat\.claude\skills\tailcat-ui\scripts\tcapi.ps1',
  (Join-Path $PSScriptRoot '..\..\..\..\tailcat\.claude\skills\tailcat-ui\scripts\tcapi.ps1'),
  (Join-Path $PSScriptRoot '..\..\..\..\.claude\skills\tailcat-ui\scripts\tcapi.ps1')
)
$Tcapi = $TcapiCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $Tcapi) { throw 'tcapi.ps1 not found in candidate paths' }
$StateFile = Join-Path $env:TEMP 'tunnel-s131-runid.txt'
$Token = '觀音時刻'
$Mappings = "2176:192.168.81.56:18868`n18884:192.168.17.131:8884`n4000:192.168.17.131:4000"
$Base = 'http://127.0.0.1:18790'

& $Tcapi ensure | Out-Null

function Get-RunningForward {
  if (-not (Test-Path $StateFile)) { return }
  $runId = (Get-Content -Raw $StateFile).Trim()
  $runs = (Invoke-RestMethod "$Base/api/runs")
  @($runs) | Where-Object { $_.id -eq $runId -and $_.toolId -eq 'forward' -and $_.status -eq 'running' }
}

switch ($Action) {
  'start' {
    $existing = Get-RunningForward
    if ($existing) {
      Write-Output "已在運行: runId=$($existing.id)"
      return
    }
    $body = @{ tool = 'forward'; params = @{ token = $Token; mappings = $Mappings } } | ConvertTo-Json -Depth 5
    $resp = Invoke-RestMethod -Uri "$Base/api/run" -Method Post -Body $body -ContentType 'application/json'
    Set-Content $StateFile $resp.id
    Write-Output "runId=$($resp.id) 啟動中"
    Start-Sleep -Seconds 2
    Write-Output "  EZ-Solar   http://127.0.0.1:2176/   (broker port 設 18884)"
    Write-Output "  Solar Player http://127.0.0.1:4000/"
  }
  'stop' {
    $targets = @()
    foreach ($r in Get-RunningForward) { $targets += $r.id }
    $stopped = @()
    foreach ($id in ($targets | Select-Object -Unique)) {
      try {
        Invoke-RestMethod -Uri "$Base/api/stop" -Method Post -Body (@{ id = $id } | ConvertTo-Json) -ContentType 'application/json' | Out-Null
        $stopped += $id
      } catch { }
    }
    if (Test-Path $StateFile) { Remove-Item $StateFile -Force }
    if ($stopped) { Write-Output "已停止: $($stopped -join ', ')" } else { Write-Output '沒有運行中的轉發' }
  }
  'status' {
    $existing = Get-RunningForward
    if ($existing) { $existing | ForEach-Object { Write-Output "running: $($_.id)" } } else { Write-Output '沒有運行中的轉發' }
  }
}
