## 1. server device-route 遠端取值（opt-in env）

- [x] 1.1 在 `apps/server/src/config.ts` 新增 `deviceAgentUrl` getter，讀 `DEVICE_AGENT_URL`，未設回 null。驗收：`apps/server/src/config.test.ts` 新增案例涵蓋「已設／未設／空白」，直跑 `pnpm --filter @solar-display/server test src/config.test.ts` 通過。
- [x] 1.2 實作 host-stats 遠端取值（Provide Device Status host statistics with remote-agent sourcing）：`apps/server/src/routes/device.ts` 在 `deviceAgentUrl` 已設時，disk/mem/cpu/uptime 改向 agent 取；未設讀本機 `/proc`；回應形狀不變（設計決策：device route host-stats 採 opt-in env 遠端取值；logs 留 server 端）。驗收：`apps/server/src/routes/device.test.ts` 直跑通過，涵蓋「遠端反映 Pi／未設退回本機」兩情境。
- [x] 1.3 釐清 logs 永遠 server 端、不受 `DEVICE_AGENT_URL` 影響（Provide ESM-safe Device Status log access）：logs 從 server 主機取（Linux 讀 solar-display journald unit；Windows 無 journald → unavailable 503 with reason），**不**向 Pi agent 取；`DEVICE_AGENT_URL` 只影響 host-stats。驗收：`device.test.ts` 直跑涵蓋「Linux 本機 unit／Windows host unavailable／`DEVICE_AGENT_URL` 設了但 logs 仍 server 端」情境通過。
- [x] 1.4 [P] 在 `.env.example` 補上 `DEVICE_AGENT_URL`（含註解說明：設了向 Pi agent 取、不設讀本機）。驗收：內容審查，且 `apps/server/src/config.test.ts` 仍綠。

## 2. Pi device-agent（Python3 stdlib，不引進 Node）

- [x] 2.1 新增 `deploy/solar-device-agent.py`（Provide a read-only Pi device-status agent）：stdlib `http.server`，`GET /stats` 回 disk/mem/cpu/uptime（讀 `/proc` 與 statvfs），`GET /logs?limit=N` 透過既有 least-privilege `read-solar-display-journal.sh` 摘 journal，limit clamp 1..500（設計決策：Pi device-agent 採 Python3 stdlib，不引進 Node）。驗收：見 2.4 測試。
- [x] 2.2 實作來源 IP 白名單（The agent SHALL restrict callers by source IP）：允許清單經環境變數／設定檔配置，非允許來源回 403 且不回任何內容；**未設清單時 fail-closed（全部 403）**，避免未設定即曝露 Pi 統計。驗收：見 2.4。
- [x] 2.3 [P] 新增 `deploy/solar-device-agent.service`（The agent SHALL run as a managed systemd service）：boot 啟用、`Restart=on-failure`、執行 `solar-device-agent.py`。驗收：`bash -n` 通過；單元檔含 `WantedBy`/`Restart`。
- [x] 2.4 在 `scripts/deploy.test.mjs` 新增覆蓋：以子程序啟動 agent，斷言 `/stats` 回 JSON、`/logs?limit=20` 回 Pi 本機紀錄、非白名單來源回 403、**未設白名單時全部 403（fail-closed）**。驗收：`node --test scripts/deploy.test.mjs` 通過。

## 3. Pi thin-kiosk 安裝器

- [x] 3.1 新增 `deploy/install-thin-kiosk.sh`，接受 `--kiosk-url` 與 `--kiosk-user`，把 URL 渲染進 autostart `.desktop` 與環境（Provide a Pi thin-kiosk installer that produces a browser-only kiosk）；沿用既有 `deploy/start-solar-kiosk.sh` 不改其原始碼（設計決策：KIOSK_URL 由 thin-kiosk 安裝器渲染，不修改 start-solar-kiosk.sh）；安裝器將 `KIOSK_WAIT_SECONDS` 拉長（如 600）以應付 server 慢開（The thin kiosk SHALL wait for the remote server with an extended timeout／設計決策：PC 慢於 Pi 開機時以拉長 health wait 應對）。驗收：見 3.4。
- [x] 3.2 安裝器**不**安裝 `solar-display.service`、不依賴 node/pnpm；偵測到既有 `solar-display.service` 時須警示並要求 operator 明確決定，不自動移除（The thin kiosk SHALL NOT run the local Solar Player server）。驗收：見 3.4。
- [x] 3.3 安裝器透過既有 helper 保留 autologin / no-sleep / fan / readonly（The thin kiosk SHALL retain kiosk hardening）；**全新 Pi 須先跑既有 `deploy/configure-lightweight-desktop.sh` 補齊圖形桌面棧**（XFCE/lightdm/Firefox/字體），遷移機已有則免；**安裝/遷移前後須停 readonly／重啟 readonly**（沿用既有 `readonly-system-disable.sh`／`enable`，設計決策：Thin-kiosk 安裝與遷移須先停 readonly）。驗收：見 3.6。
- [x] 3.4 為 `deploy/install-thin-kiosk.sh` 加驗證：`bash -n` 與 `scripts/deploy.test.mjs` 覆蓋「URL 渲染正確」「未安裝 service」「偵測既有 service 行為」「readonly 停用排程」。驗收：`node --test scripts/deploy.test.mjs` 通過。
- [x] 3.5 [P] 安裝器一併安裝 least-privilege journal helper：拷貝既有 `deploy/read-solar-display-journal.sh` → `/usr/local/sbin/` + 渲染 sudoers drop-in（visudo -cf 檢查），**不改原檔**，供 device-agent `/logs` 讀 journal。驗收：見 2.4（agent /logs 在 helper 已裝時回紀錄）。
- [x] 3.6 新增 `deploy/verify-thin-kiosk.sh`（Provide a thin-kiosk verifier／設計決策：Thin kiosk 用專屬 verifier，不複用 verify-kiosk-install.sh）：驗 kiosk URL、桌面棧、autologin/no-sleep/fan、device-agent、readonly launcher，**不**檢查 `solar-display.service` 與 `/data`。驗收：`bash -n` 通過；`scripts/deploy.test.mjs` 覆蓋「缺 service 不失敗」「kiosk URL 正確」；既有 `verify-kiosk-install.sh` 未被修改。

## 4. 部署 runbook

- [x] 4.1 [P] 新增 `docs/runbooks/pc-server-deploy.md`（Run the Solar Player server as a Windows service on a PC／Allow inbound LAN traffic to the server port／Provide a PC-specific environment file／Document Windows server logging and verification constraints）：涵蓋 nssm 安裝、repo-root 工作目錄、`Restart=on-failure` 等價、`pnpm build` 產物、PC 專屬 `.env`、Windows 防火牆 inbound TCP 3000、`better-sqlite3` native module（prebuilt／VS Build Tools、`pnpm dev:fix` 不適用 Windows）、nssm stdout/stderr 重導 log 檔（Windows app-log 本 phase unavailable）、PC 驗證僅 build/server/web 階段（full verify 需 Git Bash+sqlite3）（設計決策：Windows server 以 nssm 安裝為服務）。驗收：派 fresh agent read-back「只根據此檔能否在 Windows 裝起 server 並讓 Pi 連到」。
- [x] 4.2 [P] 新增 `docs/runbooks/pi-thin-kiosk-deploy.md`：涵蓋 `install-thin-kiosk.sh` 用法、`--kiosk-url` 指向 PC、PC 須先於 Pi 開機、reboot witness 步驟、既有 `solar-display.service` 處置。驗收：派 fresh agent read-back 確認步驟可單獨操作。

## 5. 端到端 live witness

- [x] 5.1 PC server 上線：在 Windows 跑 `build`/`server`/`web` 驗證階段通過（完整 `pnpm verify` 的 `deploy`/`server-runner` 階段需 Git Bash + `sqlite3` CLI，非 Windows 預設，列為選用）；nssm 服務 Running；從 Pi `curl http://<PC_IP>:3000/health` 與 `-H 'Accept: text/html' /overview` 皆 200。驗收：輸出引用。
- [ ] 5.2 Pi thin-kiosk 上線：執行安裝器後 reboot witness，Firefox 自動開 `http://<PC_IP>:3000/overview`；**`deploy/verify-thin-kiosk.sh`** 過 kiosk URL／autologin/no-sleep/fan/桌面棧/device-agent（不用 `verify-kiosk-install.sh`）；`uptime -s` 證實重開。驗收：journal／screenshot 證據。
- [ ] 5.3 device-agent + Device Status 上線：從 PC `curl /stats` 回 Pi JSON、`/logs?limit=20` 回 Pi 本機紀錄、非 PC 來源 403；management 面板 host-stats 顯示 Pi 的 disk/mem/cpu/uptime；agent 斷線時 host-stats 顯示 unavailable 非 500；**management 面板 logs 在 Windows server 顯示 unavailable（app-log 不走 agent、Windows 無 journald）**。驗收：截圖＋curl 輸出。
- [ ] 5.4 Pi 實機 1920×1080 FHD witness：`pnpm run fhd:witness -- --base-url http://<PC_IP>:3000`，對照 `docs/reference/FHD/` 並產 evidence bundle。驗收：五頁 witness + gap notes + bundle。

## 6. split-deployment skill 與既有 Pi 遷移

- [x] 6.1 [P] 新增 `.agents/skills/split-deployment/SKILL.md`（Provide a repo-local split-topology deployment skill／The split-deployment skill SHALL NOT modify the existing deployment）：三階段——PC server、新 Pi thin-kiosk、既有 co-located Pi 遷移；明載各階段完成門檻、rollback 指向舊 `pi5-deployment` skill、且不指示修改既有 `deploy/` 與 service（設計決策：新增 split-deployment skill 處理整套 split 拓樸與既有 Pi 遷移）。驗收：派 fresh agent read-back「只根據此 skill 能否分階段完成三種部署、且知道不可動既有部署」。
- [x] 6.2 在 `deploy/install-thin-kiosk.sh` 實作遷移調用（Support migrating an existing co-located Pi to thin-kiosk mode）：`--migrate` 須經 operator 明確確認後**停用**（stop + disable，非刪除）既有 `solar-display.service`，再裝 thin-kiosk 指向 PC，舊安裝留存於磁碟供 rollback。驗收：見 6.3。
- [x] 6.3 為遷移調用加驗證：`bash -n` 與 `scripts/deploy.test.mjs` 覆蓋「未確認即中止」「確認後停用舊 service 但保留檔案」「舊 service 可重新 enable 作 rollback」。驗收：`node --test scripts/deploy.test.mjs` 通過。
- [ ] 6.4 遷移一台既有舊 Pi5（canary）live witness：經 skill 遷移後，舊 `solar-display.service` 為 disabled、Firefox 開 PC URL、`deploy/verify-thin-kiosk.sh` 過、device-agent 回 Pi 狀態、Device Status host-stats 顯示 Pi；**演練完整 rollback**（重啟舊 service **且** 用既有 `install-kiosk.sh` 把 kiosk 指回 `127.0.0.1:3000`、確認 `/data/solar-display` runtime 完整，設計決策：遷移 rollback 需重指 kiosk URL，非僅重啟 service）。驗收：journal／screenshot／`systemctl is-enabled`／rollback 後 `verify-kiosk-install.sh` 過。

## 7. Windows x64 離線一鍵部署 ZIP（預設 4000）

- [x] 7.1 實作 `Provide a network-free Windows x64 deployment bundle`（Windows x64 離線 ZIP 預設使用 TCP 4000）：新增 `scripts/build-windows-offline-bundle.mjs`，在開發機收集已建置應用程式、portable Windows x64 Node、pnpm、nssm 與 Windows 原生 runtime dependency，輸出單一 ZIP；不得把 macOS `node_modules` 當作 Windows runtime。驗收：builder 的自動測試檢查 ZIP 內容含 installer、Node、nssm、`apps/server/dist/server.js`、`apps/web/dist`、Windows `better-sqlite3/prebuilds/win32-x64.node`，且不含開發 repo 或 macOS 原生模組。
- [x] 7.2 [P] 新增 `deploy/windows-offline/Install-SolarPlayer.ps1`：僅允許管理員、不得下載或跑 package-manager install；預設渲染 `HOST=0.0.0.0`／`PORT=4000`，建立 runtime 目錄、TCP 4000 firewall rule 與指定 bundle 路徑的 nssm `SolarPlayerServer` service。偵測 TCP 4000 或不屬於 bundle 的同名 service 時 fail closed，不停止或覆寫未知服務。驗收：PowerShell parser check 與 source-level automated assertions（source-level 斷言見 `scripts/deploy.test.mjs`：`#Requires -RunAsAdministrator`／`$Port=4000`／`Get-NetTCPConnection`／`New-NetFirewallRule`／`nssm.exe`／不得含 `pnpm install|Invoke-WebRequest|Start-BitsTransfer|curl.exe`；repo 無 pwsh 工具鏈，故未跑獨立 PowerShell parser check，以 source-level 斷言為準）。
- [x] 7.3 擴充 `scripts/deploy.test.mjs`：先寫 red tests，涵蓋離線 bundle 的 Windows-only 內容、無 `pnpm install`／下載行為、4000 health/firewall/service 設定與 port-conflict fail-closed guard；完成後 tests 綠。驗收：`node --test scripts/deploy.test.mjs` 通過。
- [x] 7.4 產出 `dist/deploy-bundles/solar-player-windows-x64-offline.zip`，列出 SHA-256 與 ZIP inventory；確認 ZIP 可解壓且未含 `.env`、SQLite、uploads、`.git` 或 macOS `node_modules`。驗收：builder verify command 通過並引用輸出。

## 8. Windows x64 免安裝 portable ZIP（預設 4000）

- [x] 8.1 實作 `Provide a network-free Windows x64 portable launch bundle`（Windows x64 免安裝 ZIP 以使用者程序運行）：新增 `deploy/windows-offline/Start-SolarPlayer.cmd`，非管理員可由解壓資料夾啟動 bundled Node server，先檢查 TCP 4000 衝突、只建立同目錄 runtime data/logs/uploads 與 `.env`；不得使用 nssm、`sc.exe`、防火牆命令、下載或 package-manager install。驗收：source-level automated assertions 覆蓋 admin-free 與 fail-closed port guard。
- [x] 8.2 修改 `scripts/build-windows-offline-bundle.mjs`，額外輸出 `dist/deploy-bundles/solar-player-windows-x64-portable.zip`，內容含 portable launcher、Windows Node、web/server 產物與 Windows `better-sqlite3/prebuilds/win32-x64.node`，且不含 `.env`、SQLite、uploads、macOS 原生模組。驗收：builder 實跑、ZIP integrity 與 SHA-256 輸出通過。
- [x] 8.3 擴充 `scripts/deploy.test.mjs`：先寫 red tests，涵蓋 portable launcher 的 4000、無管理員-only 指令、無下載／install 與 portable ZIP inventory；完成後 tests 綠。驗收：`node --test scripts/deploy.test.mjs` 通過。
- [x] 8.4 修正 Windows portable ZIP 的 pnpm runtime symlink：builder 在封包前實體化 `apps/server/node_modules`，並 fail closed 拒絕仍含 symlink 的 runtime。驗收：`dotenv` 等 production dependency 在解壓的 ZIP 內不是指向開發機絕對路徑的連結，`node --test scripts/deploy.test.mjs` 通過。

## 9. 跨平台 ZIP 建置入口

- [x] 9.1 實作 `Provide repeatable cross-platform bundle build entrypoints`（跨平台建置入口固定先 build 再封包）：新增 `scripts/build-windows-offline-bundle.sh` 與 `.cmd`，使 macOS/Linux 與 Windows 開發機各以一條平台原生命令先執行 `pnpm build`、成功後才委派既有 builder 產出 offline/portable ZIP；任一 build 失敗不得執行 builder。驗收：`node --test scripts/deploy.test.mjs` source-level assertions 覆蓋兩檔的命令順序與 fail-fast guard，並實跑 `.sh` 入口。

## 10. Portable server 管理選單

- [x] 10.1 實作 `Provide a portable server management menu`（portable 管理選單只控制自身 bundled Node）：新增 `Manage-SolarPlayer.ps1` 並封入 portable ZIP，提供背景啟動、status/health、最近 stdout/stderr log 與停止選單；停止前必須比對 TCP 4000 listener 的 executable path 與同目錄 bundled Node，未知 port owner 僅警告不得停止。驗收：`node --test scripts/deploy.test.mjs` source-level assertions 覆蓋選單、path guard、health 與無管理員-only 指令；builder 實跑後 ZIP inventory 含 `Manage-SolarPlayer.ps1`。
