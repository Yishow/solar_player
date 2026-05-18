## Why

`DeviceStatus` 目前只看得到主機資源與少數維護操作結果，看不到 display pages 真正的營運狀態，例如目前 live config 版本、最近一次發布是否成功、哪些頁面因資料或素材問題被跳過。若裝置狀態頁不能承接這些觀測資訊，現場排錯仍然需要跨多個頁面人工比對。

## What Changes

- 在 `DeviceStatus` 補上 display operations summary，至少涵蓋目前 live config 版本、最近發布時間、最近回滾、draft 待發布數量與 asset health 摘要。
- 補上播放端 skip reason、資料 readiness 與素材健康警示，讓裝置狀態頁能直接指出現在有哪些展示頁未達正式可播條件。
- 提供與 display operations 相關的維護動作與診斷入口，例如重新同步 display readiness、導出近期發布與跳頁事件摘要，而不是只看主機資源。
- 將裝置狀態資料模型擴充為可承接 MQTT、rotation、asset、publish、readiness 與 log export 的統一觀測視圖。

## Capabilities

### New Capabilities

- `device-status-display-ops-summary`: 提供裝置狀態頁查看 display live version、draft backlog、最近發布與回滾摘要的能力。
- `device-status-display-readiness-alerts`: 提供裝置狀態頁查看播放 skip reason、資料 readiness 與素材健康警示的能力。
- `device-status-display-diagnostics`: 提供裝置狀態頁發起 display diagnostics、重新同步 readiness 與導出 display operations 摘要的能力。

### Modified Capabilities

(none)

## Impact

- Affected specs: `device-status-display-ops-summary`, `device-status-display-readiness-alerts`, `device-status-display-diagnostics`
- Affected code:
  - Modified: `apps/web/src/pages/DeviceStatus/index.tsx`, `apps/web/src/pages/DeviceStatus/viewModel.ts`, `apps/web/src/services/api.ts`, `apps/server/src/routes/device.ts`, `packages/shared/src/types.ts`
  - New: `apps/server/src/services/deviceDisplayOpsService.ts`, `apps/server/src/routes/device-display-ops.ts`, `packages/shared/src/deviceDisplayOps.ts`
  - Removed: none
