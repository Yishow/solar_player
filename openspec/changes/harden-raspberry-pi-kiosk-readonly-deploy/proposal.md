## Why

樹莓派 kiosk 需要在強制斷電後仍能穩定開機進入展示系統，且操作者離開 Firefox kiosk 後必須能在桌面重新返回。現有部署已具備 systemd backend、GDM autologin 與 autostart launcher，但 runtime 寫入仍分散在安裝路徑假設內，且桌面可點擊返回捷徑沒有被安裝腳本明確保證。

## What Changes

- 將 Raspberry Pi kiosk 的推薦安裝目標收斂為 /data/solar-display，讓 app bundle、.env、SQLite data、uploads、logs 都位於新切出的 data 磁碟。
- 強化 deploy/install-kiosk.sh，使 systemd service、runtime directories、ReadWritePaths、autostart launcher、桌面 re-entry launcher 都以 INSTALL_DIR 與 KIOSK_USER 推導。
- 補齊桌面可點擊的 Solar Display Kiosk launcher，與 autostart 使用同一個固定 start helper，並設定 owner、可執行權限與 GNOME desktop trust metadata。
- 新增 root filesystem read-only hardening 的安裝/驗證流程，使 root 可降低常態寫入，runtime 寫入集中在 /data/solar-display。
- 在部署驗證中要求確認開機自動進 kiosk、Device Status 離開 kiosk、桌面 icon 返回 kiosk、/data runtime 寫入、health endpoint 與 service 狀態。

## Non-Goals

- 不保證斷電情境達到硬體級零風險；本 change 的目標是降低 root filesystem 與 SQLite runtime 損壞風險，並提供可驗證的 kiosk recovery path。
- 不把 SQLite 改成遠端 DB，也不改 MQTT/history 的資料模型。
- 不引入任意 host command execution；kiosk exit/re-entry 仍必須使用固定 helper 與既有管理信任邊界。

## Capabilities

### New Capabilities

- `raspberry-pi-kiosk-readonly-deploy`: 定義 Raspberry Pi kiosk 安裝到 /data/solar-display、桌面返回 launcher、read-only hardening 與斷電容錯驗證契約。

### Modified Capabilities

- `device-kiosk-exit-control`: 補充 kiosk exit 後的 re-entry 目標必須由安裝腳本建立為桌面可點擊 launcher，而不只是回傳提示文字。

## Impact

- Affected specs: raspberry-pi-kiosk-readonly-deploy, device-kiosk-exit-control
- Affected code:
  - Modified: deploy/install-kiosk.sh
  - Modified: deploy/firefox-kiosk.desktop
  - Modified: deploy/start-solar-kiosk.sh
  - Modified: deploy/solar-display.service
  - Modified: deploy.sh
  - Modified: scripts/deploy.test.mjs
  - New: deploy/enable-readonly-root.sh
  - New: deploy/verify-kiosk-install.sh
  - Modified: .env.example
  - Modified: docs/runbooks/device-diagnostics-safe-ops.md
