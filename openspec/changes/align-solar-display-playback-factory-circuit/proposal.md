## Why

`/factory-circuit` 同時有 prototype 流程圖、circuit threshold、empty state 與 status mapping 風險，明顯不同於一般 KPI 頁。把它獨立成 change，才能避免和其他 playback 頁混做時漏掉 flow-specific 行為。

## What Changes

- 只處理 `/factory-circuit` 對齊 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/03-factory-circuit.html`。
- 集中定義 circuit API 到 UI load/status mapping。
- 驗證空 circuits、離線 fallback、播放頁 route contract 沒有回歸。

## Capabilities

### New Capabilities

- `playback-factory-circuit-alignment`: 定義 `/factory-circuit` 的 flow composition 對位、threshold/status mapping 與 fallback 驗證。

### Modified Capabilities

(none)

## Impact

- Affected specs: `playback-factory-circuit-alignment`
- Affected code:
  - Modified:
    - `apps/web/src/pages/FactoryCircuit/index.tsx`
    - `apps/web/src/components/FlowNode.tsx`
    - `apps/web/src/components/FlowConnector.tsx`
    - `apps/web/src/layouts/offlineRouting.ts`
  - New:
    - `apps/web/src/pages/FactoryCircuit/` 下的 page-local adapter / threshold mapping 檔案
    - `openspec/changes/align-solar-display-playback-factory-circuit/specs/`
  - Removed:
    - (none)
