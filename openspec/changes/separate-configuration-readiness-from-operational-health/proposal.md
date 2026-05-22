## Summary

將 `device-display-ops` / `Device Status` 裡目前混在一起的 configuration readiness 與 operational health 拆開，避免 readiness blocking、skip、asset fault 被重複計數或用同一個 degraded 訊號表示。

## Motivation

現在 `apps/server/src/services/deviceDisplayOpsService.ts` 會把 `readDisplayReadinessReport()` 的 blocking findings 與 `displayOps.blockingIssues` 混成單一 `alerts`、`readinessSummary` 與 `degraded`。這讓 `Device Status` 無法分辨「設定尚未完成」和「live runtime/asset/playback 現在有故障」兩類問題，也會讓 blocking count 被重複累加，導致 triage 與 operator 溝通失真。

## Proposed Solution

- 保持 `/api/display-readiness` 專注在 configuration prerequisites，不把 operational skip/runtime fault 混回 readiness report。
- 調整 `DeviceDisplayOpsSummary` contract，為 alerts 加上來源 domain，並把 configuration readiness summary 與 operational health summary 分開輸出。
- 更新 `Device Status` view model 與 diagnostics feedback，讓 readiness、skip/runtime/asset 健康度各自有清楚的 label 與 helper 文案，而不是只有一個模糊的 blocking / degraded 指標。
- 補上 server 與 web regression tests，確認 counts 不再雙算，且 triage 仍能從分域 alerts 中挑出主因。

## Non-Goals

- 不重寫 `readDisplayReadinessReport()` 本身的 requirement coverage，也不改 playback skip policy。
- 不變更 `Offline Error` 或 `Playback Settings` 的 triage destination 規則，除非需要最小幅度相容新的 alert domain。
- 不重新設計 `Device Status` 整體版面，只調整其 display diagnostics summary contract 與對應文案。

## Impact

- Affected specs:
  - `device-status-display-ops-summary`
  - `device-status-display-readiness-alerts`
- Affected code:
  - Modified:
    - `packages/shared/src/deviceDisplayOps.ts`
    - `apps/server/src/services/deviceDisplayOpsService.ts`
    - `apps/server/src/routes/device-display-ops.test.ts`
    - `apps/web/src/pages/DeviceStatus/index.tsx`
    - `apps/web/src/pages/DeviceStatus/viewModel.ts`
    - `apps/web/src/pages/DeviceStatus/viewModel.test.ts`
    - `apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx`
    - `apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx`
  - New:
    - `openspec/changes/separate-configuration-readiness-from-operational-health/specs/device-status-display-ops-summary/spec.md`
    - `openspec/changes/separate-configuration-readiness-from-operational-health/specs/device-status-display-readiness-alerts/spec.md`
  - Removed:
    - (none)
