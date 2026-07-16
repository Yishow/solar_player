## Why

目前已安裝 Pi 的一般程式更新仍會重跑 apt、桌面、kiosk、boot profile、Wi-Fi 與完整 verifier，將日常測試更新誤當成重新部署，增加時間、網路依賴與不必要的系統變更。部署入口與 AI skill 需要明確區分「應用程式更新」與「完整部署」，且日常要求預設走最小更新路徑。

## What Changes

- 將既有 installed-card update 拆成 app update 與 full deploy 兩種明確 scope。
- app update 仍建立 verified runtime backup、替換應用、安裝 production dependencies、重新啟動既有 service，並驗證 release、service 與 health；不執行 apt、桌面、kiosk、boot、hotspot、readonly 或 reboot 流程。
- init、新機、系統設定、boot、kiosk、Wi-Fi、溫控或 readonly 變更使用 full deploy，保留完整 verifier 與 reboot witness。
- Pi 5 deployment skill 預設將「部署目前程式變更到測試機」判定為 app update，只有需求明確涉及主機層時才升級為 full deploy。
- app update 允許部署有意的目前工作樹內容，release manifest 必須以 `sourceDirty` 誠實標示，不把未提交測試版冒充乾淨 release。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `raspi-onekey-kiosk-deployment`: one-key entrypoint 新增 app/full scope，並為 app update 提供最小遠端流程。
- `pi5-deployment-skill`: AI deployment skill 依變更類型選擇 app update 或 full deploy，套用不同完成門檻。

## Impact

- Affected specs: `raspi-onekey-kiosk-deployment`, `pi5-deployment-skill`
- Affected code:
  - New: none
  - Modified: `scripts/raspi-onekey-deploy.sh`, `deploy/raspi-bootstrap.sh`, `scripts/deploy.test.mjs`, `.agents/skills/pi5-deployment/SKILL.md`, `deploy.md`
  - Removed: none
