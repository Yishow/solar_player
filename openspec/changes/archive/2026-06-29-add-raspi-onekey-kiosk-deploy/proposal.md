## Why

Raspberry Pi 5 kiosk 之後會頻繁重裝與部署，但目前流程分散在 cloud-init、SSH/sudo 修復、/data 分割、bundle 部署、kiosk 安裝與 readonly root 啟用之間，容易靠人工記憶或 AI 現場判斷。需要一個可重複使用的部署入口，把日常更新做到一鍵，並把新卡初始化的高風險磁碟步驟變成可審核的互動 gate。

## What Changes

- 新增 Raspberry Pi 5 Ubuntu 24.04 Server kiosk 部署入口，支援從開發機透過 SSH 對目標 Pi 執行 preflight、bundle 上傳、runtime 安裝、service restart 與 health verification。
- 新增 macOS/Linux 與 Windows PowerShell 的互動式 `system-boot/user-data` 準備腳本；一般 Raspberry Pi 新卡預設使用 `pi`，專案測試卡才使用 `kz`。
- 新增目標端 bootstrap/helper 腳本，負責檢查 Ubuntu 24.04 arm64、sudo、磁碟 layout、/data 掛載、Node/pnpm、kiosk packages、systemd service、desktop re-entry launcher 與 readonly root 前置條件。
- 新增輕量桌面與 RDP 設定，預設採 XFCE + xrdp，並安裝 Firefox 作為 kiosk 主瀏覽器；讓現場從 RDP 進入桌面不需要輸入密碼，但 SSH 與 sudo 仍維持密碼驗證。
- 新增桌面維護捷徑：一鍵啟用 readonly system，以及暫時解除 readonly system；兩者執行時仍需要 sudo 密碼並提示重開機。
- 新增互動式磁碟初始化流程：顯示磁碟大小、目前分割區、可用 layout 選項，只有在安全條件成立且操作者確認後才建立 /data；若 root 已吃滿整張卡，腳本不得自動 shrink root。
- 新增日常部署模式：跳過磁碟初始化，保留 .env、data、logs、uploads，更新應用程式後 restart service 並驗證 health。
- 新增測試與文件，鎖定 deploy bundle 內容、部署腳本 dry-run/preflight 行為、危險磁碟操作的拒絕條件與實際操作提示。

## Capabilities

### New Capabilities

- `raspi-onekey-kiosk-deployment`: Raspberry Pi 5 Ubuntu Server kiosk 的新卡初始化、日常 SSH 部署、/data layout 防呆、kiosk install、verification 與 readonly root gating。

### Modified Capabilities

(none)

## Impact

- Affected specs: raspi-onekey-kiosk-deployment
- Affected code:
  - New: scripts/raspi-onekey-deploy.sh
  - New: scripts/prepare-raspi-user-data.sh
  - New: scripts/prepare-raspi-user-data.ps1
  - New: deploy/raspi-bootstrap.sh
  - New: deploy/configure-lightweight-desktop.sh
  - New: deploy/enable-readonly-system.desktop
  - New: deploy/disable-readonly-system.desktop
  - New: deploy.md
  - New: docs/runbooks/raspi-onekey-kiosk-deploy.md
  - Modified: deploy.sh
  - Modified: deploy/install-kiosk.sh
  - Modified: deploy/enable-readonly-root.sh
  - Modified: deploy/verify-kiosk-install.sh
  - Modified: scripts/deploy.test.mjs
  - Removed: none
