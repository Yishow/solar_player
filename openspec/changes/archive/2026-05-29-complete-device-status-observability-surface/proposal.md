## Why

`/device-status` 已經聚合 runtime telemetry、display operations summary、readiness alerts、client liveness、safe diagnostics 與 log metadata，但目前 UI 同時混用了 page-local dashboard blocks 與 generic management status pills，並把 runbook / escalation guidance 埋在較深層內容中。這讓它更像把多個後端能力塞進同一頁，而不是一個完成的 observability surface。

## What Changes

- 建立 `Device Status` 專用的 observability surface language，與 settings family 共用基礎 tokens，但保留 dashboard 等級的資訊優先序與視覺節奏。
- 重新整理 display operations、client liveness、recent logs、safe diagnostics、runbook guidance 的版位與 summary hierarchy，讓 operators 能先看決策資訊，再看詳細資料。
- 補齊 diagnostics action result、safe scope、host-level escalation guidance 與 runbook entry surface，讓頁面不只會顯示資料，也能指引下一步。
- 保留 truthful telemetry、bounded device controls、management read boundaries，不把 status page變成危險的 device-control panel。

## Capabilities

### New Capabilities

- `device-status-observability-surface`: 定義 device status 作為 telemetry、display observability、safe diagnostics、runbook escalation surface 的完整資訊與互動契約。

### Modified Capabilities

(none)

## Impact

- Affected specs: device-status-observability-surface
- Affected code:
  - New:
    - apps/web/src/components/management/deviceRunbookPanel.tsx
    - apps/web/src/components/management/deviceRunbookPanel.test.tsx
  - Modified:
    - apps/web/src/pages/DeviceStatus/index.tsx
    - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
    - apps/web/src/pages/DeviceStatus/viewModel.ts
    - apps/web/src/pages/DeviceStatus/device.css
    - docs/runbooks/device-diagnostics-safe-ops.md
    - apps/server/src/routes/device.ts
  - Removed:
    - (none)
