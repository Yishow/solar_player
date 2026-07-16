## Why

`/factory-circuit` 同時有 flow diagram、circuit threshold、empty state、status mapping 與 persisted editor config 相容性風險，明顯不同於一般 KPI 頁。2026-07-16 的 Pi5 FHD witness 證實：程式內六列預設幾何已置中，但 2026-06-29 發布的 legacy live config 仍以 `production/hvac/lighting/office/ev/infrastructure` 儲存；其中舊 `office.top=431` 覆蓋新 `office` 列，造成第 4、6 列重疊，舊 topic 顯示名稱也讓事務系誤顯示為裝配工程。這個 change 必須同時處理播放頁、持久化資料 migration 與實機驗證。

## What Changes

- 只處理 `/factory-circuit` 對齊 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/03-factory-circuit.html`。
- 集中定義 circuit API 到 UI load/status mapping。
- 將中壢六工程列固定為高 84px、間距 95px、群組中心 Y=440，connector 以同一組 active-row 中心計算。
- 新增 SQLite migration：把既有 `factory-circuit` draft/live/base config 的 legacy load-row keys 正規化為 `stamping/body/painting/assembly/utility/office`，停用 legacy circuit rows，並修正 office topic 顯示名稱。
- 驗證空 circuits、離線 fallback、播放頁 route contract，以及 Pi5 1920x1080 畫面沒有列重疊、錯標或 connector 偏心。

## Capabilities

### New Capabilities

- `playback-factory-circuit-alignment`: 定義 `/factory-circuit` 的 flow composition、六工程幾何、threshold/status mapping、legacy persisted-config migration 與 FHD fallback 驗證。

### Modified Capabilities

(none)

## Impact

- Affected specs: `playback-factory-circuit-alignment`
- Affected code:
  - Modified:
    - `apps/web/src/pages/FactoryCircuit/layout.ts`
    - `apps/web/src/pages/FactoryCircuit/layout.test.ts`
  - New:
    - `apps/server/src/db/migrations/023_normalize_factory_circuit_jungli_rows.sql`
    - `apps/server/src/db/migrations/factoryCircuitJungliRows.test.ts`
  - Removed:
    - (none)
