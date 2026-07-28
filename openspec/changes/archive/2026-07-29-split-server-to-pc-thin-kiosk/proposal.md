## Why

目前 Pi 5 同時擔任伺服器主機與 kiosk 顯示器：Node/Fastify/SQLite/MQTT 與 Firefox 共用同一台資源，壓縮了顯示端可用的 RAM/CPU/磁碟 I/O。為釋放 Pi 效能、並為後續「多台 Pi + 多伺服器」架構鋪路，需把 server 移到 Windows PC，讓 Pi 退化為只跑瀏覽器的 thin kiosk。本 change 是該搬移 program 的**第 1 階段**（單機即成立、不依賴 MariaDB 或第二台 server）。

## What Changes

- 新增 **Windows PC server 部署模式**：以 nssm 安裝為 Windows 服務、執行 `pnpm build` 產物、建立 PC 專屬 `.env`、放行 Windows 防火牆 inbound TCP 3000。server 預設綁 `0.0.0.0:3000`，架構上不需改動即可對外。
- 新增 **Pi thin-kiosk 安裝路徑**（`deploy/install-thin-kiosk.sh`）：只裝 Firefox kiosk（指向 `http://<PC_IP>:3000/overview`）＋ autologin / no-sleep / fan / readonly，**不**裝 Node/pnpm/`solar-display.service`/SQLite。沿用既有 `deploy/start-solar-kiosk.sh` 既有的 `KIOSK_URL`/`KIOSK_HEALTH_URL` 環境變數覆寫。
- 新增 **Pi device-agent**（輕量 systemd 服務，Python3 stdlib `http.server`）：唯讀暴露 `/proc` 統計與 journald 摘錄，供 server 取得 Pi 真實狀態，避免「server 不在 Pi 上 → Device Status 退化」。
- 修改 **server `/api/device/*`**：設定 `DEVICE_AGENT_URL` 時**僅 host-stats（disk/mem/cpu/uptime）** 向 Pi agent 取；**logs 不走 agent**（app log 屬 server 進程，永遠從 server 主機取；Windows 無 journald → unavailable 503）。未設則退回讀本機 `/proc`，舊 co-located 模式行為不變。此為 **opt-in 加法**（`DEVICE_AGENT_URL` 未設時既有部署執期行為零影響）。
- 新增 **`split-deployment` skill**（`.agents/skills/split-deployment/SKILL.md`）：以階段引導整套 split 拓樸——先部署 PC server、再部署新 Pi thin-kiosk、最後**遷移既有 co-located Pi** 成 thin-kiosk。
- 新增 **既有 Pi 遷移程序**：兩台已上線的舊部署 Pi5 透過新 skill 從 co-located 轉為 thin-kiosk（停用舊 `solar-display.service` → 裝 thin-kiosk 指向 PC），逐一進行、保留 rollback。
- 新增 **Windows x64 離線部署 ZIP**：在有網路的開發機建出可攜式 Windows Node、pnpm、nssm、Windows 原生依賴與已建置應用程式；目標 Win11 不需網路，只以系統管理員 PowerShell 執行封包內腳本。預設 TCP port 為 `4000`，避免覆蓋既有 `3000` 服務。
- 新增 **Windows x64 免安裝 ZIP**：同一份離線 runtime 另提供非管理員的可攜啟動器；解壓後由目前登入使用者在封包內直接執行 server，資料留在該資料夾。它不建立 Windows service、不改防火牆、不承諾開機自啟。
- 新增 **跨平台 ZIP 建置入口**：`scripts/build-windows-offline-bundle.sh` 與 `.cmd` 都先執行 `pnpm build`，再委派既有 builder 產出 offline 與 portable ZIP，讓 operator 不必手動串接兩個命令。
- 新增 **portable 管理選單**：`Manage-SolarPlayer.ps1` 以非管理員 PowerShell 選單背景啟動、停止自身 bundled Node、檢查 health 與查看 log；不會停止未知的 TCP 4000 程序。
- **完全不動既有部署機制**：`deploy/` 既有腳本、`solar-display.service`、`install-kiosk.sh`、onekey 腳本、`pi5-deployment` skill 與其 spec `pi5-deployment-skill` 一律保持原樣，新部署走全新檔案，純加法；舊部署留作 rollback／legacy。

## Non-Goals (optional)

詳見 design.md 的 Goals/Non-Goals 與 Open Questions（含 Windows app-log file-log、單一 `DEVICE_AGENT_URL` 僅單 Pi 等已知限制）。

## Capabilities

### New Capabilities

- `pc-server-deployment`: 在 Windows PC 上以 Windows 服務（nssm）常駐執行 Solar Player server 的部署能力，涵蓋 build 依賴、`.env`、防火牆放行、服務重啟策略。
- `pi-thin-kiosk-mode`: Pi 5 作為純瀏覽器 kiosk、指向遠端 server URL 的部署模式，不含本機 server/SQLite，保留 autologin/no-sleep/fan/readonly。
- `pi-device-agent`: Pi 上的輕量唯讀 device-status agent，暴露 `/proc` 統計與 journald 摘錄供 server 遠端取值。
- `split-deployment-skill`: 以階段引導 split 拓樸部署（PC server → 新 Pi thin-kiosk → 遷移既有 co-located Pi）的 repo-local skill 契約，與既有 `pi5-deployment` skill 並存、互不改動。

### Modified Capabilities

- `device-status-log-access`: Device Status 的 **host-stats（disk/mem/cpu/uptime）** 改為可從遠端 device-agent 取值（`DEVICE_AGENT_URL` 設定時），未設定時維持讀本機 `/proc`；**logs 不走 agent**（永遠 server 端；Windows 無 journald → unavailable 503）。回應形狀不變。

## Impact

- Affected specs: `device-status-log-access`（modified）；`pc-server-deployment`、`pi-thin-kiosk-mode`、`pi-device-agent`、`split-deployment-skill`（new）
- Affected code:
  - New:
    - `deploy/install-thin-kiosk.sh`（Pi thin-kiosk 精簡安裝器）
    - `deploy/verify-thin-kiosk.sh`（thin kiosk 專屬驗證器，不複用 verify-kiosk-install.sh）
    - `deploy/solar-device-agent.py`（Pi device-agent，Python3 stdlib）
    - `deploy/solar-device-agent.service`（agent systemd unit）
    - `docs/runbooks/pc-server-deploy.md`（Windows server 部署 runbook）
    - `docs/runbooks/pi-thin-kiosk-deploy.md`（Pi thin-kiosk 部署 runbook）
    - `.agents/skills/split-deployment/SKILL.md`（split 拓樸部署 skill，含遷移指引）
    - `scripts/build-windows-offline-bundle.mjs`（Windows x64 離線 ZIP builder）
    - `scripts/build-windows-offline-bundle.sh`、`scripts/build-windows-offline-bundle.cmd`（macOS/Linux 與 Windows 開發機的 ZIP 建置入口）
    - `deploy/windows-offline/Install-SolarPlayer.ps1`（Win11 管理員一鍵安裝器）
    - `deploy/windows-offline/Start-SolarPlayer.cmd`（Win11 非管理員 portable 啟動器）
    - `deploy/windows-offline/Manage-SolarPlayer.ps1`（portable 背景啟停與 health/log 選單）
  - Modified:
    - `apps/server/src/routes/device.ts`（device route 新增遠端 agent 取值模式）
    - `apps/server/src/config.ts`（新增 `DEVICE_AGENT_URL` 設定）
    - `.env.example`（記錄 `DEVICE_AGENT_URL`）
  - Removed: 無（既有 co-located 部署資產全部保留）
- 相依系統：Windows PC（server 主機）、Pi 5（kiosk 顯示端）、外部 MQTT broker（`192.168.31.62`，非本次範圍）
