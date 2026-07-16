## Why

目前 Raspberry Pi one-key 部署只在已安裝 Tailscale 時檢查 daemon，無法保證新機完成部署後具備穩定的遠端維護通道。Tailscale 應成為標準部署前置軟體，同時將 tailnet enrollment 與 IP 指派保留為明確的外部授權步驟。

## What Changes

- one-key target bootstrap 在應用安裝與最終驗證前，透過 Tailscale 官方 Ubuntu 套件來源安裝 `tailscale`，並 enable/start `tailscaled`。
- 重複部署在 Tailscale 已安裝且 daemon 可用時保持冪等，不重做 enrollment，也不清除既有節點狀態。
- kiosk verification 將 Tailscale 從「若已安裝才檢查」提升為必要條件，缺少 CLI、daemon 未啟用或未運行時部署失敗。
- 部署文件明確區分「安裝並啟動 daemon」與「加入 tailnet」；repo 不保存 auth key，也不承諾或寫死控制平面配置的 Tailscale IP。
- dry-run 顯示 Tailscale 安裝／啟用是計畫階段，但不執行套件、服務或 enrollment 變更。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `raspi-onekey-kiosk-deployment`: one-key 部署新增必要的 Tailscale 安裝、daemon 啟用、驗證與明確 enrollment handoff。

## Impact

- Affected specs: `raspi-onekey-kiosk-deployment`
- Affected code:
  - New: `deploy/install-tailscale.sh`
  - Modified: `deploy.sh`
  - Modified: `deploy/raspi-bootstrap.sh`
  - Modified: `deploy/verify-kiosk-install.sh`
  - Modified: `scripts/raspi-onekey-deploy.sh`
  - Modified: `scripts/deploy.test.mjs`
  - Modified: `deploy.md`
  - Modified: `docs/runbooks/raspi-onekey-kiosk-deploy.md`
- External dependency: Tailscale official Ubuntu stable package repository and `tailscaled.service`.
- Security boundary: no Tailscale auth key, reusable login token, tailnet credential, or fixed tailnet IP is stored in repository files or deployment logs.
