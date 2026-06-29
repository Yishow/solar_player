## Context

減碳量、植樹等效、四口之家換算的係數目前散落且跨頁不一致。減碳量在 Overview／Solar 經 `apps/server/src/services/displayStoryService.ts` 讀 MQTT `todayCo2Reduction`／`totalCo2Reduction`，在 Sustainability 經 `apps/server/src/services/sustainabilityStoryService.ts` 讀 `co2` 累積 counter；植樹係數為該檔模組常數 `treeEquivalentFactor = 2.6`；四口之家換算 profile 由 `packages/shared/src/householdEquivalence.ts` 的 `createDefaultHouseholdEquivalenceCalcProfile()` 硬寫（每日 4／每月 120／電價 5）。沒有任何 settings／editor 持久化這些值。

既有 settings 採「逐領域 singleton-row 表＋service＋route＋設定頁」模式（如 `apps/server/src/db/migrations/010_weather_settings.sql`、`apps/server/src/services/weatherSettingsService.ts`、`apps/server/src/routes/weather.ts`）。

## Goals / Non-Goals

**Goals:**

- 以一張 singleton settings 表集中保存五個換算係數，帶建議預設與缺值回落，並提供讀寫 API 與管理設定面。
- 減碳量三頁統一改為「對應發電量 × 排碳係數 ÷ 1000」，消除跨頁不一致。
- 植樹等效改吃自算減碳量 × 設定植樹係數；四口之家換算改吃設定的用電基準與電價。

**Non-Goals:**

- 不調整純單位／數學換算（GWh 除數、百分比 ×100）。
- 不做係數歷史版本或排程更新。
- 不改卡片版面／視覺，不含 Change 1 的卡片狀態。

## Decisions

### 以獨立 singleton settings 表保存五個係數

新增 `calculation_settings` 表（`id` 固定為 1）與欄位 `carbon_emission_factor`、`tree_equivalent_factor`、`household_daily_usage_kwh`、`household_monthly_usage_kwh`、`estimated_tariff_per_kwh`，各帶預設 0.495／2.6／4／120／5。比照 weather_settings 模式新增 `calculationSettingsService.ts` 讀寫與 `routes/calculation-settings.ts`。

選擇獨立表而非塞進某一頁 display page config：排碳係數跨 Overview／Solar／Sustainability 三頁，綁在單一 page config 會造成跨頁重複與不一致，違背本次「統一來源」目標。獨立領域表沿用既有 settings 慣例，單一真實來源。

### 管理設定面沿用既有 settings 頁模式

係數為全域計算參數而非 FHD 版面屬性，置於管理設定面（比照 `apps/web/src/pages/DataSourceSettings`／`MqttSettings` 既有 settings 頁）而非 `/display-pages/editor`。具體掛載頁面於 apply 階段對既有設定頁結構確認後定案。

### 減碳量三頁統一以發電量 × 排碳係數推導

`displayStoryService` 的 Overview／Solar 減碳 binding 與 `sustainabilityStoryService` 的 `co2` 來源，統一改為讀設定的排碳係數並以「對應發電量(kWh) × 係數 ÷ 1000」計算今日／累積減碳量(t)；植樹等效改吃自算減碳量 × 設定植樹係數。不再讀 MQTT `todayCo2Reduction`／`totalCo2Reduction`／`co2` 作為減碳卡顯示來源。

## Implementation Contract

**Behavior：**

- 管理設定面顯示並可編輯五個係數；儲存後持久化，重新整理仍保留。
- 修改排碳係數並儲存後，Overview／Solar／Sustainability 三頁的今日／累積減碳量一致依新係數更新。
- 修改植樹係數後 Sustainability 植樹等效一致更新；修改每日／每月用電或電價後四口之家換算與 disclaimer 一致更新。
- 係數無資料（新環境）時，三頁與設定面一律回落建議預設（0.495／2.6／4／120／5）。

**Interface / data shape：**

- `calculation_settings` singleton row，欄位如上；service 提供讀（回落預設）與寫（驗證為正數）。
- API 回應沿用 repo 既有 settings route 形狀慣例（GET 回目前值、PUT/POST 寫入後回最新值）。
- 減碳換算：`carbonReductionTons = generationKwh * carbonEmissionFactor / 1000`；植樹：`treeEquivalent = round(carbonReductionTons * treeEquivalentFactor)`；四口之家：`households = round(selfConsumptionKwh / usageBasis)`，`usageBasis` 取每日或每月設定值。

**Failure modes：**

- 係數列缺失或欄位為空 → 回落對應建議預設（靜默）。
- 發電量資料缺失或非有限數 → 減碳卡維持既有「資料不足／`--`」fallback，不輸出錯誤數字。
- 寫入非正數或非數值 → API 拒絕並回錯誤，不寫入。

**Acceptance criteria：**

- 新增 server 測試：service 讀缺值回預設；減碳/植樹/四口之家換算依設定值計算；三頁減碳 binding 在同一係數下一致。
- 新增 migration/seed 測試：表建立且 seed 提供預設列。
- `pnpm --filter @solar-display/server test`、`pnpm run build` 通過；前端設定面有 viewModel 測試。

**Scope boundaries：**

- 範圍內：settings 表/service/route/設定面、三頁減碳統一自算、植樹與四口之家係數設定化、測試與 seed。
- 範圍外：單位/百分比換算、卡片視覺、Change 1 卡片狀態、係數歷史版本。

## Risks / Trade-offs

- [減碳語意由 MQTT 直餵改為推導，可能與既有 dashboard 數值不同] → 於 proposal 標記 BREAKING；以測試固定新公式，並在設定面顯示目前係數以利對帳。
- [新增 settings 表與 API 增加面] → 嚴格比照 weather_settings 既有模式，最小化新慣例。
- [三處換算分散在 server/shared] → 換算公式集中於 service 層讀同一 settings 來源，避免重複常數再度漂移。

## Migration Plan

- 新增 migration `012_calculation_settings.sql` 建表並插入預設列；seed 確保預設存在。
- 舊環境升級後即取得預設係數，行為等同現行預設值（0.495 等），減碳改自算後數值可能變動屬預期。
- Rollback：移除 route/service/UI 並還原減碳 binding 即回到 MQTT 直餵；保留或丟棄 settings 表皆不影響回退。

## Open Questions

- 減碳量自算後是否需與既有 MQTT co2 並存對帳期（過渡顯示兩值）？預設不並存，直接切換；如需過渡於 apply 確認。
- 「累積發電量」單位基準（kWh vs 既有 GWh 顯示）在套入係數時的取數點，apply 階段對 `displayStoryService` 既有 metric 單位確認後定案。
