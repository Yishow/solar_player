## Why

Pi 5 現有部署只把 hotspot trigger 放進 bundle，沒有在標準 update 流程中安裝、設定或啟用；NetworkManager 的所有已記憶 Wi-Fi priority 也同為 0，導致開機先連到其他網路。部署知識目前主要散落在 `deploy.md`，AI 執行時容易漏掉主機前置、備份、重開機 witness 與 Wi-Fi 驗證。

## What Changes

- 在 Pi 既有安裝更新流程加入明確的 hotspot connection、SSID 與 autoconnect priority 輸入，持久設定 `Yishow` 為優先 Wi-Fi。
- 標準化安裝 hotspot trigger script、systemd service/timer 與 `/etc/solar-display/tailscale-hotspot-trigger.env`，但不在應用替換中途主動切斷目前連線。
- 擴充 kiosk verification，驗證 hotspot profile、priority、trigger 設定與 systemd enablement。
- 開機 witness 區分兩種可驗證結果：初次選網時可見則由 priority 優先連線；稍晚才可見則由 delayed trigger 自動切換。
- 新增 repo-local Pi 5 deployment skill，將部署前檢查、update、備份、重開機、thermal/Wi-Fi/application witness 與回滾界線整理成可重用 AI 執行流程。
- 保留 `deploy.md` 作為人類 handoff 與詳細背景，不複製整份文件到 skill。

## Capabilities

### New Capabilities

- `pi5-hotspot-priority-deployment`: 管理既有 Pi 5 的優先 hotspot profile、trigger 安裝與開機驗證。
- `pi5-deployment-skill`: 提供可觸發、可驗證、具有安全與回滾界線的 repo-local Pi 5 部署工作流程。

### Modified Capabilities

- `raspi-onekey-kiosk-deployment`: update 部署接受並傳遞 hotspot 設定，且部署驗證能證明設定已持久化。

## Impact

- Affected specs: `pi5-hotspot-priority-deployment`, `pi5-deployment-skill`, `raspi-onekey-kiosk-deployment`
- Affected code:
  - New: `deploy/configure-hotspot-priority.sh`, `.agents/skills/pi5-deployment/SKILL.md`, `.agents/skills/pi5-deployment/agents/openai.yaml`
  - Modified: `scripts/raspi-onekey-deploy.sh`, `deploy/raspi-bootstrap.sh`, `deploy/verify-kiosk-install.sh`, `deploy.sh`, `scripts/deploy.test.mjs`, `deploy.md`
  - Removed: none
