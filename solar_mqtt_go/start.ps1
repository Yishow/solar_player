# 啟動 solar_mqtt_go 發電量擷取服務 (PowerShell)
#
# 用法：
#   .\start.ps1              # 預設執行（桌面環境啟動系統列圖示 + 自動開啟網頁儀表板）
#   .\start.ps1 tray         # 系統列常駐模式
#   .\start.ps1 run          # 主控台循環模式（終端日誌 + 網頁儀表板）
#   .\start.ps1 once         # 每廠各抓一輪後退出

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptDir

# 若當前目錄無 solar_config.json，自動從 solar_mqtt 複製
if (-not (Test-Path "solar_config.json") -and (Test-Path "..\solar_mqtt\solar_config.json")) {
    Copy-Item "..\solar_mqtt\solar_config.json" "solar_config.json"
    Write-Host "==> 已載入預設兩廠 solar_config.json"
}

# 檢查本機 1883 埠號是否已有 MQTT Broker 運作；若無則自動嘗試啟動本機 mosquitto
$portListening = $false
try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $iar = $tcpClient.BeginConnect("127.0.0.1", 1883, $null, $null)
    $portListening = $iar.AsyncWaitHandle.WaitOne(300, $false)
    if ($portListening) {
        $tcpClient.EndConnect($iar)
    }
    $tcpClient.Close()
} catch {
    $portListening = $false
}

if (-not $portListening) {
    $mosqCandidates = @(
        "C:\Program Files\mosquitto\mosquitto.exe",
        "C:\Program Files (x86)\mosquitto\mosquitto.exe"
    )
    $cmdMosq = Get-Command mosquitto -ErrorAction SilentlyContinue
    if ($cmdMosq) {
        $mosqCandidates += $cmdMosq.Source
    }

    foreach ($candidate in $mosqCandidates) {
        if ($candidate -and (Test-Path $candidate)) {
            Write-Host "==> 偵測到本機 MQTT Broker 尚未啟動，自動背景啟動: $candidate"
            Start-Process -FilePath $candidate -ArgumentList "-d" -WindowStyle Hidden -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 1
            break
        }
    }
}

Write-Host "==> 啟動 solar_mqtt_go..."
Write-Host "==> 儀表板網址: http://127.0.0.1:18868/"

# 背景延遲 1.2 秒自動開啟瀏覽器
Start-Job -ScriptBlock {
    Start-Sleep -Milliseconds 1200
    Start-Process "http://127.0.0.1:18868/"
} | Out-Null

if ($args.Count -eq 0) {
    go run .
} else {
    go run . @args
}
