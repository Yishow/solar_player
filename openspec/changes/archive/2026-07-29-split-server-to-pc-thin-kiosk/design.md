## Context

目前 Pi 5 同時是 server 主機（Fastify + SQLite + MQTT + web assets）與 kiosk 顯示器（Firefox）。`solar-display.service` 在 Pi 上跑 `node apps/server/dist/server.js`（`deploy/solar-display.service`），server 同時 serve web 前端（`apps/server/src/app.ts` 的 fastifyStatic `web/dist`）。Firefox kiosk 透過 `deploy/start-solar-kiosk.sh` 開 `http://127.0.0.1:3000/overview`，該腳本**已支援** `KIOSK_URL`/`KIOSK_HEALTH_URL` 環境變數覆寫。Device Status API（`apps/server/src/routes/device.ts`）讀 **server 主機** 的 `/proc`、journald、磁碟。

目標：把 server 移到 Windows PC，Pi 退化為純瀏覽器 kiosk，但 **Device Status 不可退化**（仍須反映 Pi 真實狀態）。本 change 是搬移 program 第 1 階段，單 PC + 單 Pi 即成立。

## Goals / Non-Goals

**Goals:**
- Windows PC 以 Windows 服務常駐執行 server，Pi 可經 LAN 連到。
- Pi 成為純瀏覽器 kiosk（不含 Node/SQLite/`solar-display.service`），效能（RAM/CPU/磁碟 I/O）顯著釋放。
- Pi 保留 autologin / no-sleep / fan / readonly 與**完整 Device Status**（disk/mem/cpu/uptime/logs 仍反映 Pi）。
- 新舊部署模式並存：既有 co-located Pi 模式不動。
- 以**單一 `split-deployment` skill**（階段化）引導整套部署，並支援既有 co-located Pi 遷移成 thin-kiosk。
- **完全不修改既有部署機制**：`deploy/` 既有腳本、`solar-display.service`、`install-kiosk.sh`、onekey 腳本、`pi5-deployment` skill 與其 spec 一律原樣；唯一碰的既有檔是 `apps/server/src/routes/device.ts` 與 `config.ts` 的 **opt-in 加法**（未設 `DEVICE_AGENT_URL` 時行為不變）。

**Non-Goals（屬後續 phase，本 change 不做）:**
- SQLite → MariaDB 遷移（phase 2）。
- 第二台 server、Primary-Replica 複寫、active-active、連線計數與依負載分流（phase 3）。
- MQTT broker 備援、server 間 MQTT 協調（phase 4）。
- uploads 共用儲存（多 server 才需要，phase 3）。
- 跨平台（Pi→Windows）runtime-state 還原工具：遷移時擇一舊 Pi 為資料來源、匯出後載入 PC server，但 Pi→Windows 的還原適配列為 Open Question，不在本 change 蓋新匯出工具。

## Decisions

### Windows server 以 nssm 安裝為服務

以 nssm（Non-Sucking Service Manager）把 `node apps/server/dist/server.js` 裝成 Windows 服務：開機即起、不需登入、當機重啟。這是 systemd `Restart=on-failure` 最接近的等價物。

**Alternatives**：pm2 + pm2-windows-startup（多一層 Node runtime 依賴）；Windows Task Scheduler「at startup」（restart 語義較弱）。nssm 勝出因依賴最少、真正的服務語義。

### Pi device-agent 採 Python3 stdlib，不引進 Node

thin-kiosk 的精神是 Pi 不再裝 Node runtime。Ubuntu 24.04 Pi 預裝 python3，故 agent 用 stdlib `http.server` 實作，零額外依賴。`/stats` 讀 `/proc`（meminfo/loadavg/uptime）與磁碟 statvfs 回 JSON。`/logs` 是 **Pi 本機顯示端診斷**用（kiosk launcher log + journal），**不是** server app-log API 的來源（見 device route 決策）。journal 透過既有 least-privilege `read-solar-display-journal.sh` 讀取；該 helper 原本只由 `install-kiosk.sh` 安裝，thin 路徑不跑它，故 **thin-kiosk 安裝器須另行安裝此 helper**（以既有 `deploy/read-solar-display-journal.sh` 為源拷貝、不改原檔）連同其 sudoers drop-in。來源 IP 白名單未設定時 **fail-closed（全部 403）**，避免未設定即曝露 Pi 統計；安裝器/skill 須要求 operator 提供 PC 位址。

**Alternatives**：tiny Node script（違反「Pi 不裝 Node」）；bash + nc（HTTP 解析脆弱）；編譯靜態 binary（過度工程）；allowlist 預設 allow-all（不安全）。

### device route host-stats 採 opt-in env 遠端取值；logs 留 server 端

新增 `DEVICE_AGENT_URL`（例 `http://<Pi_IP>:3001`）。**僅 host-stats（disk/mem/cpu/uptime）** 在設定時向 Pi agent 取；**未設時**維持讀本機 `/proc`（co-located 模式行為不變）。**logs 不走 agent**——app log 屬於 server 進程，split 模式下 server 在 PC 上；Pi agent 讀 Pi 的 solar-display journal 只會得到凍結/空內容，並非 app log。因此 logs 永遠從 server 主機取（Linux 讀 journald、Windows 無 journald → unavailable 503）。host-stats 回應 JSON 形狀不變 → 管理面板 UI 不需改。

**Alternatives**：logs 也 route 到 Pi agent（概念錯誤，見上）；新增獨立 endpoint（形狀變、UI 要改）；always-remote host-stats（破壞 co-located 模式）。

### Thin kiosk 用專屬 verifier，不複用 verify-kiosk-install.sh

既有 `deploy/verify-kiosk-install.sh:295` 硬性 `systemctl is-active solar-display`，且 `:333-341` 檢查 `/data/solar-display` runtime，thin kiosk 兩者皆無 → 必 FAIL。又因硬邊界不能改這支既有腳本，故新增 `deploy/verify-thin-kiosk.sh`，只驗 thin kiosk 的特徵（kiosk URL、桌面棧、autologin/no-sleep/fan、device-agent），不檢查 service 與 /data。既有 verifier 保留供 co-located 模式。

### 遷移 rollback 需重指 kiosk URL，非僅重啟 service

遷移已把 kiosk autostart 的 URL 改指向 PC。rollback 不能只 `systemctl enable --now solar-display`——kiosk 仍會開 PC URL。完整 rollback = 重啟舊 service **且** 用既有（不改）`install-kiosk.sh` 把 kiosk 指回 `127.0.0.1:3000`，並確認 `/data/solar-display` runtime 完整。

### Thin-kiosk 安裝與遷移須先停 readonly

既有 Pi 部署在 readonly overlay root 下，寫入 systemd unit／.desktop 前須先停 readonly（`deploy/readonly-system-disable.sh` + reboot）再施工、完工後再重啟 readonly。thin-kiosk 安裝器與遷移程序沿用同一節奏；readonly 啟停用既有腳本，不新增。

### KIOSK_URL 由 thin-kiosk 安裝器渲染，不修改 start-solar-kiosk.sh

`start-solar-kiosk.sh` 已支援 env 覆寫。`install-thin-kiosk.sh` 接受 `--kiosk-url`，把該值渲染進 autostart `.desktop` 與環境，腳本本體不動 → 最小改動、不影響舊模式。

### PC 慢於 Pi 開機時以拉長 health wait 應對

`start-solar-kiosk.sh` 等 health 最多 `KIOSK_WAIT_SECONDS`（預設 120s）後 exit。thin-kiosk 安裝器將此值拉長（如 600s），runbook 載明「PC 須先於 Pi 開機」。持續重試的自動重連留待後續。

### Windows x64 離線 ZIP 預設使用 TCP 4000

目標 Win11 沒有網路，故封包須包含 portable Windows x64 Node、pnpm、nssm、已建置 web/server/shared 產物與 Windows x64 的 `better-sqlite3` 原生模組；目標機器不執行 `pnpm install`、不下載任何軟體。封包內 `Install-SolarPlayer.ps1` 僅接受系統管理員執行：建立 `.env`（預設 `HOST=0.0.0.0`、`PORT=4000`）、必要 runtime 目錄、TCP 4000 firewall rule 與 nssm `SolarPlayerServer` service。它必須在偵測到 TCP 4000 已被其他程序使用、既有同名 service 不是此封包安裝路徑，或執行者非管理員時中止並印出可處理原因；不得停止或覆蓋未知服務。Pi URL 由 operator 使用 `http://<PC_IP>:4000/overview`。

**Alternatives**：在目標機器 `pnpm install`（無網路不可行）；帶入 macOS node_modules（`better-sqlite3` 原生二進位不相容）；沿用 3000（已知可與既有服務衝突）。

### Windows x64 免安裝 ZIP 以使用者程序運行

同一 builder 額外產出 portable ZIP，將 app、portable Windows Node、pnpm 與 Windows x64 `better-sqlite3` 放在 ZIP 根目錄。`Start-SolarPlayer.cmd` 從自己的資料夾起動 `runtime\\node\\node.exe apps\\server\\dist\\server.js`，先檢查 `4000` listener 並在衝突時 fail closed，然後建立同目錄 `data`、`logs`、`uploads` 與 `.env`（`HOST=0.0.0.0`、`PORT=4000`）。它不能要求管理員權限，也不得呼叫 nssm、`sc.exe`、`New-NetFirewallRule`、下載或 package-manager install。封包關閉或使用者登出即停止服務；Windows 防火牆若封鎖 Pi LAN 連線，需由有管理權限的人另行處理。

### 跨平台建置入口固定先 build 再封包

`scripts/build-windows-offline-bundle.sh`（macOS/Linux）與 `.cmd`（Windows）只負責切換至 repo root、依序呼叫 `pnpm build` 與既有 `node scripts/build-windows-offline-bundle.mjs`。任何 build 失敗都必須停止而不得輸出新的 ZIP；它們不下載依賴、不中止既有服務，也不改變 builder 的 runtime 選擇。

**Alternatives**：只在文件列出兩條命令（容易漏跑 build）；重複實作 bundle 邏輯（會讓兩條路徑漂移）。薄包裝器勝出，因為封包行為仍只有一個 source of truth。

### Portable 管理選單只控制自身 bundled Node

`Manage-SolarPlayer.ps1` 以其所在資料夾識別 `runtime\\node\\node.exe` 與 `Start-SolarPlayer.cmd`。背景啟動時以隱藏 `cmd.exe` 執行 launcher、重導 stdout/stderr，並輪詢 `127.0.0.1:4000/health`。停止時必須先確認 TCP 4000 的 listener process path 等於該資料夾的 bundled Node；不同程序只顯示 PID 警告，不執行 `Stop-Process`。

**Alternatives**：直接依 port 停止（可能誤殺既有服務）；要求系統管理員註冊 service（違反免安裝範圍）。以 executable path 限定操作目標，保留 portable 的使用者權限邊界。

### 新增 split-deployment skill 處理整套 split 拓樸與既有 Pi 遷移

以**單一**新 skill（`.agents/skills/split-deployment/SKILL.md`，spec `split-deployment-skill`）以階段引導整套部署，對應使用者「先部署 server、再處理 Pi」的節奏：階段 1 PC server、階段 2 新 Pi thin-kiosk、階段 3 遷移既有 co-located Pi。遷移程序：逐一進行（可先單台 canary）→ 經 operator 明確確認後停用舊 `solar-display.service` → 裝 thin-kiosk 指向 PC → 驗證。舊 `pi5-deployment` skill 與其部署機制完全不動，留作 rollback／legacy。

**Alternatives**：拆成 PC skill 與 Pi skill 兩個（使用者確認單一 skill 可行，且階段化已涵蓋分開部署需求）；沿用並擴充 `pi5-deployment` skill（違反「不動既有部署」）。

## Implementation Contract

#### PC server 行為
- `node apps/server/dist/server.js` 以 nssm 服務執行，綁 `0.0.0.0:3000`（既有預設），工作目錄 = repo root。
- Windows 防火牆新增 inbound 規則放行 TCP 3000。
- **驗收**：從 Pi `curl http://<PC_IP>:3000/health` → 200；`curl -H 'Accept: text/html' http://<PC_IP>:3000/overview` → 200 HTML。

#### Pi thin-kiosk 行為
- `install-thin-kiosk.sh --kiosk-url http://<PC_IP>:3000/overview --kiosk-user <u>` 安裝後，reboot 自動 autologin → Firefox kiosk 開該 URL。
- **不**安裝 `solar-display.service`、不依賴 node/pnpm（安裝器若偵測到舊 service 須提示而非自動移除，由 operator 決定）。
- 仍需完整圖形桌面棧（XFCE/lightdm/Firefox/字體/xrandr）：全新 Pi 須先跑既有 `configure-lightweight-desktop.sh`，遷移機已有。
- 安裝/遷移前須先停 readonly、完工後重啟（沿用既有 readonly 腳本）。
- **驗收**：reboot witness 後 Firefox 開 PC URL；**`deploy/verify-thin-kiosk.sh`** 驗過 kiosk URL／桌面棧／no-sleep／fan／autologin／device-agent（**不**用 `verify-kiosk-install.sh`，它會因缺 service 失敗）；`uptime -s` 證實重開。

#### Pi device-agent 行為
- systemd 服務 `solar-device-agent.service` 跑 `solar-device-agent.py`，listen `<Pi_IP>:3001`。
- `GET /stats` 回 disk/mem/cpu/uptime（Pi 本機），供 server `DEVICE_AGENT_URL` 取。
- `GET /logs?limit=N`（N 限 1..500）為 **Pi 本機診斷**（kiosk launcher log + journal），**非** server app-log 來源；helper 缺時回 bounded unavailable，`/stats` 不受影響。
- 來源 IP 白名單未設 → fail-closed 全 403；設了才放行 PC。
- thin-kiosk 安裝器一併安裝 least-privilege `read-solar-display-journal.sh` + sudoers（拷貝既有檔為源、不改原檔）。
- **驗收**：從 PC `curl /stats` 回 JSON、`/logs?limit=20` 回 Pi 本機紀錄；非 PC 來源 403；未設白名單時全部 403。

#### server device route 行為
- `DEVICE_AGENT_URL` 設定 → `/api/device/*` 的 **host-stats**（disk/mem/cpu/uptime）向 agent 取，**回應形狀與既有一致**；agent 不可達 → host-stats 回 bounded unavailable（非 500），server 不崩、`/health` 不受影響。
- **logs 不受 `DEVICE_AGENT_URL` 影響**：永遠從 server 主機取（Linux 讀 solar-display journald unit；Windows 無 journald → unavailable 503 with reason）。nssm 須將 stdout/stderr 重導至 log 檔供未來 file-log 讀取，但本 phase 不實作 file-log 讀取。
- **驗收**：設 `DEVICE_AGENT_URL` 後 management 面板 host-stats 顯示 Pi；logs 在 Windows 顯示 unavailable（非 500）；刻意關 agent 後 host-stats 顯示 unavailable。

#### Scope boundaries
- **In**：PC server 部署（nssm/.env/防火牆）、Windows x64 離線 ZIP、Windows x64 免安裝 ZIP、Pi thin-kiosk 安裝器、Pi device-agent、device route opt-in 遠端取值、兩份 runbook、`split-deployment` skill、既有 co-located Pi 遷移程序。
- **In**：macOS/Linux `.sh` 與 Windows `.cmd` 的 ZIP 建置薄包裝器；兩者固定 build 後才封包。
- **In**：portable ZIP 的非管理員 PowerShell 選單，管理同資料夾 bundled Node 的背景啟停、health 與 stdout/stderr log。
- **Out**：MariaDB、第二台 server、複寫、連線計數/分流、MQTT broker 備援、uploads 共用儲存、跨平台 runtime-state 還原工具。
- **不修改清單（硬邊界）**：`deploy/` 既有腳本、`deploy/solar-display.service`、`deploy/install-kiosk.sh`、`scripts/raspi-onekey-deploy.sh`、`pi5-deployment` skill、`pi5-deployment-skill` spec 一律原樣；唯一修改的既有檔為 `apps/server/src/routes/device.ts`、`apps/server/src/config.ts`、`.env.example`（皆 opt-in 加法）。

## Open Questions

- **遷移資料來源與跨平台還原**：PC server 只有一份 SQLite，兩台舊 Pi 各有設定/資料。需擇一舊 Pi 為來源、匯出後載入 PC server。既有 `deploy/export-runtime-state.sh` 是 Pi→Pi 同平台設計，Pi（Linux）→ PC（Windows）的還原適配（路徑、better-sqlite3 跨平台檔案相容性）尚未驗證，由 operator 在遷移階段決定：直接拷貝 `.sqlite` 檔、或只手動重填關鍵設定。此點待 apply 階段實測確認，不阻塞 phase 1 機制交付。
- **Windows app-log（#3）**：本 phase 不讓 Device Status app-log 在 Windows 可用（無 journald）；nssm 先重導 stdout 至 log 檔。是否要 deviceLogService 支援 file-based log 讀取，列為後續 decision，不阻塞 phase 1。
- **單一 `DEVICE_AGENT_URL` 只能指一台 Pi（#9）**：host-stats 遠端取值僅反映單一 display host。多 Pi 要在 management 各自顯示，需 device-agent registry（phase 3 與連線計數一併處理）；phase 1 單 Pi 可接受。

## Scope size note

本 change 含 5 capability、約 24 任務，規模偏大。device-route+device-agent 的「不退化機制」與 thin-kiosk+PC-deploy+skill 的「部署搬移」在概念上可拆兩個 change；目前合併為單一 phase 1，因兩者在「server 不在 Pi 上仍不退化」這個目標上緊耦合。若 apply 階段發現過大，優先把「device-route 遠端取值 + device-agent」獨立成前置 change 先做、先驗證。

## Risks / Trade-offs

- **[Windows native module]** `better-sqlite3` 在 Windows build 可能失敗 → 綁定有 prebuilt binary 的版本，或於 runbook 載明需 VS Build Tools；`pnpm dev:fix` 是 Linux 專用、不適用 Windows。
- **[PC 未開時 Pi 無畫面]** → 拉 long `KIOSK_WAIT_SECONDS` + runbook「PC 先開」；持續重連留待後續。
- **[agent 新攻擊面]** → 唯讀、來源 IP 白名單、不回 secrets；與既有 journald least-privilege reader 同一安全模型。
- **[Windows 防火牆預設擋 inbound]** → runbook 列為必檢查項；以「PC 本機 127.0.0.1 通、Pi 連不到」作為診斷訊號。
- **[device route 遠端取值延遲]** → LAN 內毫秒級，可接受；必要時加短 TTL 快取（本階段先不加）。
