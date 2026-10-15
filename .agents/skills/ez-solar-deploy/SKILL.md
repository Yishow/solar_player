---
name: ez-solar-deploy
description: Operate the solar dashboards stack — EZ-Solar collector (solar_mqtt_go) on 192.168.81.56, MQTT brokers on .131/81.56, Solar Player server on .131:4000 — including password-SSH via tailcat forwards, schtasks deployments, MQTT bridge, retained-data verification, dashboard tunneling to the local machine, and known failure modes (hung sshd boxes, system proxy trap, webui config swap). Use when the user asks about 太陽能看板/EZ-Solar/solar_mqtt_go/solar_player deployment or data flow, checking 兩廠 KN/CL data, dashboards not showing data, or opc_mqtt power-meter feed.
---

# 太陽能看板維運手冊（EZ-Solar + Solar Player 全廠控制）

本手冊為國瑞兩廠（觀音廠 KN、中壢廠 CL）太陽能發電看板、收集端與播放系統之維運單一事實來源。
原始碼倉庫：`C:\AIProject\solar_player`（monorepo）
- **收集端**：`solar_player\solar_mqtt_go`（Go，exe 旁需無 BOM 之 `solar_config.json`）
- **顯示端**：`solar_player\apps\server`（Fastify，離線 bundle 部署於 `.131:4000`）
- **電力監控**：`opc_mqtt`（DDE/OPC → MQTT，位於 192.168.1.10）

> [!CAUTION]
> ### 現場零彈窗鐵則（Zero-Window Policy & 核心防禦）
> **81.56 為現場作業人員使用中之工作站螢幕，作業時「絕對不能出現任何視窗」，尤其是 Terminal / PowerShell / CMD！**
> - **踩坑實證**：在 Windows 11 下，若使用 `Start-Process powershell -WindowStyle Hidden` 或 `-Verb RunAs`，由於系統預設將終端應用委派給 **Windows Terminal (`WindowsTerminal.exe`)**，Windows Terminal **會忽略 Hidden 參數，仍然在使用者桌面上強制開啟可見視窗或閃爍**！
> - **唯一能保證 100% 絕無任何視窗的解法**：
>   1. **Session 0 隔離**：所有背景維運或指令執行，強制在 Windows 服務的 **Session 0** 執行。透過 OpenSSH Server（`sshd` 服務，Port 22）連入，或觸發 `SYSTEM` 身分之 Scheduled Task。Session 0 物理上無桌面視窗，現場螢幕 100% 絕不彈窗！
>   2. **Tailcat 直連禁忌**：若從 Tailcat 直連（Tailcat 由 FAQ703 於 Session 1 桌面跑），**絕對嚴禁執行 `Start-Process ... -Verb RunAs` 或任何會呼叫 WindowsTerminal 的指令**。如需提權改用排程（SYSTEM）代理執行。

---

## 1. 網路拓撲與主機一覽（2026-10 實測更新）

- **lan1**：中壢區網（`192.168.1.x`）
- **lan2**：觀音區網（`192.168.1.x`）
- **lan3**：國瑞社內網路（無對外網際網路，含 `192.168.80.x/20`、`192.168.17.x`、`172.30.x.x`、`172.31.x.x`）
- **Tailcat Token 設定檔**：`C:\AIProject\tailcat\bin\config.json`

| 區域 | 角色 | IP 與網卡 | 登入資訊 / Token | 備註 |
|---|---|---|---|---|
| **中壢** | 播放機 (pi5) | `172.31.11.9` (lan3) | `kz / kz` | hostname `raspberry5`，訂閱 .131:1884 |
| **中壢** | 太陽能來源 (KN) | `192.168.80.5` (lan3) | web `toyota / toyota` | **觀音廠發電數據**（一期 751.2 kWp + 二期 2500.46 kWp，共 2 zones） |
| **中壢** | 太陽能中繼 | `192.168.17.93` (lan3) | `ssh / ssh` | lan3 內部中繼設備 |
| **中壢** | **MQTT主機 / Solar Server** | 網卡1: `192.168.1.102` (lan1)<br>網卡2: `192.168.17.131` (lan3) | `ssh / ssh`<br>Tailcat: `中壢監控` | hostname `ISKR0012`；跑 Mosquitto (1884) 與 Solar Player (4000) |
| **中壢** | 電力監控 | `192.168.1.10` (lan1) | `ssh / ssh` | 跑 `opc_mqtt`，送至 .131 |
| **觀音** | 播放機 (pi5) | `172.30.11.35` (lan3) | `kz / kz` | 觀音廠看板，訂閱 .131:1884 |
| **觀音** | 太陽能來源 (CL) | `192.168.17.182` (lan3) | web `toyota / toyota` | **中壢廠發電數據**（共 5 zones） |
| **觀音** | 監控電腦 | 網卡1: `192.168.1.5` (lan2 + Wifi) | `ssh / ssh`<br>Tailcat: `觀音監控` | 本機 Hermes 所在，未來亦會發送 MQTT 到 81.56 |
| **觀音** | **監控中繼 / 收集主機** | 網卡1: `192.168.1.6` (lan2)<br>網卡2: `192.168.81.56` (lan3)<br>網卡3: `192.168.8.156` (Wifi) | `ssh / ssh` (亦有現場登入 `FAQ703`)<br>Tailcat: `觀音時刻` | hostname `FA-Q703`；跑 `solar_mqtt_go`、Mosquitto (1884) 與 Tailcat PM2 |

> [!IMPORTANT]
> **廠區與資料對應**：
> - `192.168.80.5` = **KN 觀音廠**（2 個 zones：一期 751.2 kWp + 二期 2500.46 kWp）。
> - `192.168.17.182` = **CL 中壢廠**（5 個 zones）。

---

## 2. 現行架構與資料流

```
[觀音廠 KN (192.168.80.5)] ──HTTP──┐
                                   ▼
[中壢廠 CL (192.168.17.182)] ──HTTP──→ solar_mqtt_go (81.56:18868 儀表板)
                                   │
                                   ▼ publish (127.0.0.1:1884)
[192.168.1.5 (觀音監控)] ────MQTT───→ 本地 Mosquitto (81.56)
                                   │
                                   ▼ Bridge (solar/#, opc/#)
                             Broker (192.168.17.131:1884)
                                   │
                                   ├─→ Solar Player Server (.131:4000)
                                   └─→ 中壢/觀音 Pi5 播放機
```

- **81.56（觀音中繼收集核心）**：
  - 跑 `solar_mqtt_go`（排程 `EZSolarKN`，SYSTEM 權限），每 60 秒擷取 KN 與 CL 兩廠數據，寫入本地 SQLite `C:\Users\ssh\solar.db`。
  - 本地 Mosquitto 監聽 1883、1884、8883、8884、9001，並建立 Bridge `guanyin-to-chungli`，將 `solar/#` 與 `opc/#` 自動同步至 `.131:1884`。
  - 本地 Portproxy（`192.168.81.56:18868` → `127.0.0.1:18868`）提供 EZ-Solar 儀表板檢視。
- **.131（中壢主控核心）**：
  - Mosquitto 服務（1884）接收來自 81.56 的太陽能數據，並接收 1.10 的電力監控數據。
  - Solar Player Server（nssm 服務 `SolarPlayerServer`，埠 4000）讀取 MQTT 即時數據並計算顯示指標。
  - 兩廠 Pi5 播放機訂閱 `.131:1884` 顯示看板畫面。

---

## 3. 遠端連線與全廠跳板操作指南（AI 必讀）

### 模式一：透過 Tailcat 直連 81.56（免密碼，僅限無彈窗輕量查詢）
81.56 背景由 PM2 常駐 `tailcat serve no-auth-ssh,exit-node`（運行於桌面 Session 1）：
```powershell
rtk C:\AIProject\tailcat\bin\tailcat.exe ssh "tcpGFwWCAyQLZJQeOfLJEhPPPQmD5VrSV3lS0Lik6P4okw3_GvUWFrWCAJIuo5ALv60JgeRdal2DaPSJzelVvDnTSX4WBQ1MrBB2FxWCD1TdZDDQepG2NW1Gwgaomu3zbtaX-MNLwXQE8PvYAdFmFpGQEw" "<PowerShell查詢指令>"
```
> [!WARNING]
> **直連禁令**：因 Tailcat 跑在桌面 Session 1，**嚴禁執行 `Start-Process -Verb RunAs` 或長時間占用之互動命令（如未加 `-W` 逾時之 `mosquitto_sub`）**，否則 Windows 11 會直接跳出 Windows Terminal 視窗！

### 模式一（B）：透過 OpenSSH Server 進入 Session 0（100% 保證零彈窗，管理維運首選）
81.56 已啟用本機 OpenSSH 服務（帳密 `ssh / ssh`），服務運行於 **Session 0（無頭系統空間）**。透過 Tailcat 建立埠轉發後連入：
```powershell
# 1) 轉發 SSH 到本地隨機埠 (例如 2256)
& C:\AIProject\tailcat\.claude\skills\tailcat-ui\scripts\tcapi.ps1 run -Tool forward -Params @{ token = '觀音時刻'; mappings = '2256:127.0.0.1:22' }

# 2) 透過 askpass 連線（完全在 Session 0 執行，物理上無法彈出任何視窗）
$env:SSH_ASKPASS='C:\Users\FAQ703\Documents\solar-deploy-backup\askpass.cmd'
$env:SSH_ASKPASS_REQUIRE='force'; $env:DISPLAY='localhost:0'
ssh -p 2256 -o StrictHostKeyChecking=no ssh@127.0.0.1 "<任何指令/排程操作>"
```

### 模式二：從 81.56 橫向跳板至全廠設備
81.56 已建立永久 LAN3 靜態路由，可在 81.56 上直接 SSH 或呼叫社內其他機器：
```powershell
# 從 81.56 SSH 到 .131 (ISKR0012)
ssh -o StrictHostKeyChecking=no ssh@192.168.17.131 "<cmd>"

# 從 81.56 SSH 到中壢播放機 (pi5)
ssh -o StrictHostKeyChecking=no kz@172.31.11.9 "uptime"

# 從 81.56 SSH 到觀音播放機 (pi5)
ssh -o StrictHostKeyChecking=no kz@172.30.11.35 "uptime"
```

### 模式三：本地轉發隧道（tunnel-s131.ps1）
快速將遠端服務映射至開發者本地：
```powershell
pwsh -File .agents/skills/ez-solar-deploy/scripts/tunnel-s131.ps1 start   # 映射 2176, 4000, 18884
pwsh -File .agents/skills/ez-solar-deploy/scripts/tunnel-s131.ps1 status
pwsh -File .agents/skills/ez-solar-deploy/scripts/tunnel-s131.ps1 stop
```
- `http://127.0.0.1:2176/`：81.56 EZ-Solar 儀表板（首次載入需將頁面 broker port 改為 18884 並按連線）
- `http://127.0.0.1:4000/`：.131 Solar Player 管理後台
- `ws://127.0.0.1:18884/`：.131 Mosquitto WebSocket

---

## 4. 關鍵踩坑與致命陷阱（重要！）

### 陷阱 1：81.56 多網卡 Wi-Fi 預設閘道陷阱（極致命！）
- **現象**：81.56 重灌後配有 Wi-Fi 網卡（`192.168.8.156`）用於對外上網讓 Tailcat 運作。Windows 預設賦予 Wi-Fi 預設閘道極低之 Metric（35），低於 LAN3 網卡之 Metric（281）。這導致 Windows 將所有社內跨網段連線（包含 `192.168.17.x` 的 .131 Broker 與 17.182 CL）全部誤丟往 Wi-Fi 閘道，引發全面超時斷線！
- **解法**：在 81.56 上必須配置**永久靜態路由**，將 LAN3 網段明確導向網卡 2（閘道 `192.168.80.254`）：
  ```cmd
  route -p add 192.168.17.0 mask 255.255.255.0 192.168.80.254
  route -p add 172.30.0.0 mask 255.255.0.0 192.168.80.254
  route -p add 172.31.0.0 mask 255.255.0.0 192.168.80.254
  ```

### 陷阱 2：PowerShell `Set-Content -Encoding UTF8` BOM 陷阱
- **現象**：在 Windows PowerShell 下以 `Set-Content -Encoding UTF8` 寫入 `solar_config.json` 時，會自動夾帶 UTF-8 BOM（位元組 `\xEF\xBB\xBF`）。Go 語言的 `json.Unmarshal` 會噴錯：
  `invalid character '\ufeff' looking for beginning of value` 並觸發安全防護停止資料擷取。
- **解法**：寫入設定檔時必須使用無 BOM UTF-8 編碼（例如 `[System.IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))`）或直接使用二進位寫入。

### 陷阱 3：現場螢幕嚴禁跳出終端機視窗（無彈窗規範與 Windows 11 WindowsTerminal 陷阱）
- **現象與重大踩坑實證**：
  81.56 為現場操作人員日常使用之桌面螢幕（Session 1）。在 Windows 11 下，即使在 PowerShell 中下達 `Start-Process powershell -WindowStyle Hidden` 或 `-Verb RunAs`，**現場螢幕依然會跳出 Terminal 視窗**！
  - **根本原因**：Windows 11 預設終端機應用程式為 **Windows Terminal (`WindowsTerminal.exe`)**。當在桌面會話（Session 1）啟動任何主控台命令列程序時，Windows 11 會自動強制委派給 Windows Terminal 接管渲染，**Windows Terminal 根本不遵守傳統的 `-WindowStyle Hidden` 參數**，必然在桌面開啟視窗或瞬間閃爍，嚴重干擾現場人員！
- **唯一保證 100% 絕對無任何彈窗的解決方案**：
  1. **首選：走 OpenSSH (`sshd` 服務，Port 22)**
     81.56 的 OpenSSH Server 已經註冊為 Windows 服務，並在 **Session 0（無頭系統會話）** 中運作。經由 SSH 連入執行的所有指令（如 `ssh ssh@192.168.81.56` 或透過 Tailcat 轉發到本地端口連入），完全運行於 Session 0，**物理上不存在桌面視窗與圖形介面，現場絕對 0 視窗、0 彈窗、0 閃爍**！
  2. **Tailcat 直連（Session 1）絕對禁忌**：
     目前 81.56 的 Tailcat 是由桌面使用者 `FAQ703` 在 Session 1 啟動。因此從 Tailcat 直連時，**絕對禁止使用 `Start-Process -Verb RunAs`**！如需執行提權或常駐任務，必須透過已經由 SYSTEM 註冊的排程（`Start-ScheduledTask`），因為 SYSTEM 排程會在 Session 0 執行，絕不會在桌面彈窗。
  3. **排程執行身分必須為 SYSTEM**：
     `EZSolarKN` 排程必須設定 `Principal.UserId = 'SYSTEM'`，確保開機或手動觸發時完全在 Session 0 運作。

### 陷阱 4：81.56 系統代理陷阱（`http_proxy=192.168.1.5:3128`）
- **現象**：若環境被注入系統 proxy，所有社內 HTTP 請求（80.5 / 17.182）會被導向 proxy 噴 502 Bad Gateway。
- **解法**：`start-solar-run.ps1` 開頭已加入清空 proxy 環境變數之邏輯，手動執行診斷前亦需先清空 `$env:http_proxy`、`$env:HTTP_PROXY` 等變數。

### 陷阱 5：17.182（CL 來源端）`s_json.ashx` 查詢逾時
- **現象**：中壢廠太陽能來源主機（17.182）之 Web 服務若資源耗盡，登入成功但抓取 `/api/s_json.ashx` 會超過 10 秒逾時，導致 CL 資料凍結。
- **處置**：`solar_mqtt_go` 每 60 秒會自動重試，Broker 上的 retained 訊息會保持最後正常狀態；若長時間未恢復，需請現場人員重開該台 17.182 主機。

### 陷阱 6：檔案存放與備份目錄規範
- **核心執行目錄**：`C:\Users\ssh\`（存放 `solar_mqtt_go_windows_amd64_tray.exe`、`solar_config.json`、`solar.db`、`start-solar-run.ps1`）。
- **安裝與維護備份目錄**：`C:\Users\FAQ703\Documents\solar-deploy-backup\`（存放 Mosquitto 安裝包、排程建立腳本、設定備份等）。切勿在 `C:\Users\FAQ703\` 根目錄散落檔案。

---

## 5. 81.56 完整全新安裝與重建步驟

若日後 81.56 再次重灌，依照以下順序即可 100% 自動化復原：

### 步驟 1：配置永久靜態路由
```cmd
route -p add 192.168.17.0 mask 255.255.255.0 192.168.80.254
route -p add 172.30.0.0 mask 255.255.0.0 192.168.80.254
route -p add 172.31.0.0 mask 255.255.0.0 192.168.80.254
```

### 步驟 2：建立 ssh 帳號與啟用 OpenSSH Server
```powershell
net user ssh ssh /add /active:yes
net localgroup Administrators ssh /add
Set-LocalUser -Name "ssh" -PasswordNeverExpires $true
Set-Service sshd -StartupType Automatic
Start-Service sshd
netsh advfirewall firewall add rule name="OpenSSH-Server-In-TCP" dir=in action=allow protocol=TCP localport=22
```

### 步驟 3：安裝 Mosquitto 2.0 與配置 Bridge
1. 下載 `https://mosquitto.org/files/binary/win64/mosquitto-2.0.22-install-windows-x64.exe` 並以 `/S` 靜默安裝。
2. 寫入 `C:\Program Files\mosquitto\mosquitto.conf`：
   ```conf
   max_packet_size 10485760
   persistence true
   persistence_location C:\Program Files\mosquitto\data\
   allow_anonymous true

   listener 1883
   protocol mqtt
   listener 1884
   protocol mqtt
   listener 8883
   protocol mqtt
   listener 8884
   protocol websockets
   listener 9001
   protocol websockets

   # Bridge 到 .131
   connection guanyin-to-chungli
   address 192.168.17.131:1884
   topic solar/# out
   topic opc/# out
   try_private false
   notifications true
   start_type automatic
   ```
3. 重啟 Mosquitto 服務並放行防火牆：
   ```powershell
   Restart-Service mosquitto
   netsh advfirewall firewall add rule name="Mosquitto-MQTT" dir=in action=allow protocol=TCP localport=1883,1884,8883,8884,9001
   ```

### 步驟 4：佈署 solar_mqtt_go 與啟動排程
1. 將 `solar_mqtt_go_windows_amd64_tray.exe` 複製到 `C:\Users\ssh\`。
2. 寫入無 BOM 之 `C:\Users\ssh\solar_config.json`（設定 KN: 192.168.80.5, CL: 192.168.17.182, broker: 127.0.0.1:1884, db: `C:\Users\ssh\solar.db`）。
3. 寫入 `C:\Users\ssh\start-solar-run.ps1`：
   ```powershell
   $ErrorActionPreference = 'Stop'
   $ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
   Set-Location $ScriptDir
   $env:http_proxy = ''; $env:https_proxy = ''; $env:HTTP_PROXY = ''; $env:HTTPS_PROXY = ''; $env:all_proxy = ''; $env:ALL_PROXY = ''; $env:no_proxy = ''
   & (Join-Path $ScriptDir 'solar_mqtt_go_windows_amd64_tray.exe') run
   ```
4. 註冊 SYSTEM 開機排程並啟動（嚴格隱藏視窗）：
   ```powershell
   $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File C:\Users\ssh\start-solar-run.ps1' -WorkingDirectory 'C:\Users\ssh'
   $trigger = New-ScheduledTaskTrigger -AtStartup
   $principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
   Register-ScheduledTask -TaskName 'EZSolarKN' -Action $action -Trigger $trigger -Principal $principal -Force
   Start-ScheduledTask -TaskName 'EZSolarKN'
   ```
5. 設定 Portproxy 與防火牆：
   ```cmd
   netsh interface portproxy add v4tov4 listenaddress=192.168.81.56 listenport=18868 connectaddress=127.0.0.1 connectport=18868
   netsh advfirewall firewall add rule name="EZSolar-Dashboard" dir=in action=allow protocol=TCP localport=18868
   ```

---

## 6. 全廠健康度驗證指令

在 81.56 上執行以下指令，可快速確認全廠連線與資料流狀態：

```powershell
# 1. 驗證 Mosquitto Bridge 是否連上 .131
Get-NetTCPConnection -RemoteAddress "192.168.17.131" -RemotePort 1884 | Format-Table

# 2. 訂閱 .131 即時轉發之太陽能數據
& "C:\Program Files\mosquitto\mosquitto_sub.exe" -h 192.168.17.131 -p 1884 -t "solar/#" -v -C 5

# 3. 測試 KN 與 CL 兩廠 HTTP 登入回應
Set-Location C:\Users\ssh
& .\solar_mqtt_go_windows_amd64_tray.exe test-login KN
& .\solar_mqtt_go_windows_amd64_tray.exe test-login CL

# 4. 檢查 Solar Player Server (4000) 健康狀態
(Invoke-WebRequest -Uri "http://192.168.17.131:4000/health" -UseBasicParsing -TimeoutSec 5).Content

# 5. 檢查 EZ-Solar 儀表板回應
(Invoke-WebRequest -Uri "http://192.168.81.56:18868" -UseBasicParsing -TimeoutSec 5).StatusCode
```
