## Why

`/factory-circuit` 現在雖然已有 explicit slot 與 alert semantics 的 shared story backend，但播放頁仍混合 `circuits` REST data、page-local runtime 與本地 fallback。這讓 Factory Circuit 的 slot binding、alert reason 與 diagnostics contract 沒有真正在播放端落地，MVP 的資料鏈仍不完整。

## What Changes

- 讓 `Factory Circuit` 播放頁以 `/api/display-story` 的 factory payload 作為 slot row、live power、binding state 與 alert reason 的主要來源。
- 將 `/api/circuits` 保留為設定/治理側資料來源，不再作為播放頁組裝 display story 的主契約。
- 保留既有 FHD layout、KPI 區塊與 empty/error fallback，避免 runtime story 接線時把版型與管理設定混成一包。
- 補齊 route adapter 與測試，讓 slot binding 與 alert reason 的 playback contract 可驗證。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `factory-circuit-slot-binding-and-alerts`: 將 Factory Circuit 播放頁的 slot binding 與 alert 呈現正式改為共享 `display-story` contract。

## Impact

- Affected specs: `factory-circuit-slot-binding-and-alerts`
- Affected code:
  - Modified: `apps/web/src/services/api.ts`
  - Modified: `apps/web/src/pages/FactoryCircuit/index.tsx`
  - Modified: `apps/web/src/pages/FactoryCircuit/viewModel.ts`
  - Modified: `apps/web/src/pages/FactoryCircuit/viewModel.test.ts`
  - Modified: `apps/web/src/pages/FactoryCircuit/configRender.test.ts`
