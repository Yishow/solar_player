## Why

目前 Pi 5 的四檔風扇由平台預設值驅動，repo 部署流程未明確寫入或驗證這組 boot-time thermal contract；換卡、換映像或韌體預設漂移時，部署仍可能顯示成功但散熱行為不同。同時部署文件保存多個歷史固定 IP，容易讓操作者連錯主機，應改成每次以使用者當下指定的 SSH target 為唯一依據。

## What Changes

- 新增 Pi 5 四檔風扇設定 helper，以可重跑的 managed block 寫入 boot config：50°C/60°C/67.5°C/75°C、每檔 5°C hysteresis、PWM 75/125/175/250。
- 將風扇設定接入既有 kiosk installer，並在 kiosk verification 中檢查 boot config 與執行中 thermal/pwm-fan contract；需要 reboot 才宣告 boot persistence 完成。
- 將 Raspberry Pi SSH、部署、RDP 與驗證範例改成操作者提供的 `<pi-host>` / `<ssh-target>`，移除專案 Pi 的歷史固定位址；實際執行仍使用當次使用者指定的 target。
- 補上 deploy fixture tests，涵蓋 helper bundle、idempotent managed block、四檔值、installer wiring、verification 與 IP-neutral 文件。

## Capabilities

### New Capabilities

- `pi5-fan-thermal-control`: 定義 Raspberry Pi 5 四檔 pwm-fan 的持久 boot 設定、可重跑部署與 reboot 後驗證契約。

### Modified Capabilities

- `raspi-onekey-kiosk-deployment`: 將 SSH/部署操作目標明確改為每次由操作者提供，不在部署文件或命令範例內保存專案機器固定 IP，並將風扇設定納入 kiosk install/verify 流程。

## Impact

- Affected specs: `pi5-fan-thermal-control`, `raspi-onekey-kiosk-deployment`
- Affected code:
  - New: `deploy/configure-pi5-fan-control.sh`
  - Modified: `deploy.sh`, `deploy/install-kiosk.sh`, `deploy/verify-kiosk-install.sh`, `scripts/deploy.test.mjs`, `deploy.md`, `docs/runbooks/raspi-onekey-kiosk-deploy.md`
  - Removed: none
