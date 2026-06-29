## Why

減碳量等換算指標目前係數寫死且跨頁來源不一致：Overview／Solar 的今日／累積減碳量讀 MQTT `todayCo2Reduction`／`totalCo2Reduction`，Sustainability 另讀 `co2` 累積 counter，同一個減碳數字在三頁可能不一致；植樹等效係數（`treeEquivalentFactor = 2.6`）與四口之家換算 profile（每日 4 kWh／每月 120 kWh／電價 5 元）都硬寫在程式（`apps/server/src/services/sustainabilityStoryService.ts`、`packages/shared/src/householdEquivalence.ts`），無法由營運維護。台灣電力排碳係數逐年公告（2022 為 0.495），需要可調。

## What Changes

- 新增一張獨立的換算係數 settings 表（singleton row，比照 weather_settings 模式）與讀寫 API，承載五個係數並帶建議預設：排碳係數 0.495 kgCO₂e/kWh、植樹等效係數 2.6 棵/噸、四口之家每日用電 4 kWh、每月用電 120 kWh、估算電價 5 元/kWh。
- 提供一個管理設定面（比照 DataSourceSettings／MqttSettings 既有 settings 頁模式）讓營運檢視與修改五個係數；缺資料時回落建議預設。
- 減碳量改為三頁統一自算：今日減碳量(t) = 今日發電量(kWh) × 排碳係數 ÷ 1000、累積減碳量(t) = 累積發電量(kWh) × 排碳係數 ÷ 1000；Overview／Solar／Sustainability 三頁吃同一個係數，不再各自讀 MQTT co2／`co2` counter。
- 植樹等效改吃自算後的減碳量 × 設定的植樹係數；四口之家換算改吃設定的每日／每月用電與電價。
- **BREAKING**：減碳量數值語意由「MQTT 直餵」改為「發電量 × 係數推導」；既有 MQTT `co2`／`todayCo2Reduction`／`totalCo2Reduction` 不再驅動減碳卡顯示。

## Non-Goals

- 不調整純單位／數學換算（累積發電量 kWh→GWh 的 1,000,000 除數、自發自用比例與年節電 % 的 ×100），它們無可調係數。
- 不改卡片版面、字級、樣式或 FHD 視覺。
- 不納入 Change 1 的卡片「設置中」／顯示狀態（另一 change 處理）。
- 不重寫 route shell、SQLite 既有表或 MQTT 架構；僅新增一張 settings 表與其 API／UI。
- 不新增係數的歷史版本控管或排程更新；僅單一目前值。

## Capabilities

### New Capabilities

- `sustainability-calculation-settings`: 集中管理永續換算係數（排碳、植樹、四口之家每日／每月用電、估算電價）的 settings 表、讀寫 API 與管理設定面，帶建議預設與缺值回落；並定義三頁統一的減碳自算（發電量 × 排碳係數）、植樹等效（減碳量 × 植樹係數）、四口之家（自發自用量 ÷ 設定用電基準）換算規則。

### Modified Capabilities

(none)

## Impact

- Affected specs:
  - New: `sustainability-calculation-settings`
- Affected code:
  - New:
    - apps/server/src/db/migrations/012_calculation_settings.sql
    - apps/server/src/services/calculationSettingsService.ts
    - apps/server/src/routes/calculation-settings.ts
    - apps/web/src/pages/DataSourceSettings/calculationSettings.ts
  - Modified:
    - apps/server/src/db/seed.ts
    - apps/server/src/services/displayStoryService.ts
    - apps/server/src/services/sustainabilityStoryService.ts
    - apps/server/src/services/householdEquivalenceService.ts
    - packages/shared/src/householdEquivalence.ts
    - apps/web/src/pages/DataSourceSettings/index.tsx
    - apps/web/src/pages/DataSourceSettings/viewModel.ts
  - Removed: (none)
