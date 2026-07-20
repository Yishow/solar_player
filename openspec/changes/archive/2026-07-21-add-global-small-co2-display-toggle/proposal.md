## Why

目前 `Overview` / `Solar` 等播放頁的 CO2 數值一律以 `t` 顯示，當今日或低量級減碳值落在 `0.01 t` 這類小數時，現場可讀性很差，操作人員很難直覺理解。現有需求不是改 CO2 計算，而是提供一個可持久化的全域顯示偏好，讓 `< 1 t` 的 CO2 值可以在需要時改以 `kg` 顯示。

## What Changes

- 在全域 `calculation_settings` 增加一個布林顯示偏好，用來控制是否把 `< 1 t` 的 CO2 顯示自動轉成 `kg`
- 在 `/settings/data-source` 的換算係數區新增 checkbox，讓管理端可套用或取消這個全域顯示偏好
- 讓 shared monitoring story 與使用該 story 的播放頁在偏好開啟時，針對 `< 1 t` 的 CO2 顯示輸出 `kg` 格式，但保持原本 CO2 計算、儲存與 API 基礎語意不變
- 補上 server、shared formatter、以及 `Overview` / `Solar` 相關測試，確保關閉偏好時維持現況

## Non-Goals

- 不改 CO2 的計算公式、資料來源、MQTT topic mapping、或資料庫中 CO2 數值的基礎單位語意
- 不改匯出流程、歷史資料彙整邏輯、或把所有能源單位都做成動態自動轉換
- 不新增 page-local 的例外開關；此需求只做成單一全域顯示偏好

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `sustainability-calculation-settings`: calculation settings 需多保存一個全域 CO2 顯示偏好，供管理端讀寫並持久化
- `display-monitoring-story-model`: shared monitoring story 需能在不改變 CO2 計算語意的前提下，依全域偏好輸出 `< 1 t` 的 `kg` 顯示格式

## Impact

- Affected specs: `sustainability-calculation-settings`, `display-monitoring-story-model`
- Affected code:
  - Modified: `apps/server/src/db/migrations/015_calculation_settings.sql`, `apps/server/src/services/calculationSettingsService.ts`, `apps/server/src/routes/calculation-settings.ts`, `apps/server/src/routes/calculation-settings.test.ts`, `apps/web/src/services/api.ts`, `apps/web/src/pages/DataSourceSettings/index.tsx`, `apps/web/src/pages/DataSourceSettings/viewModel.ts`, `packages/shared/src/displayStory.ts`, `apps/server/src/services/displayStoryService.ts`, `apps/server/src/services/carbonReductionConsistency.test.ts`, `apps/web/src/pages/Overview/viewModel.test.ts`, `apps/web/src/pages/Solar/viewModel.test.ts`
  - New: `apps/server/src/db/migrations/016_co2_display_preference.sql`
  - Removed: (none)
