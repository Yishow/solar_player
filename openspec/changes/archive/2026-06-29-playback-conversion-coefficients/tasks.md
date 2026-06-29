## 1. 換算係數 settings 儲存

- [x] 1.1 依設計決策「以獨立 singleton settings 表保存五個係數」，新增 `apps/server/src/db/migrations/012_calculation_settings.sql`（`id=1` singleton，欄位 carbon_emission_factor／tree_equivalent_factor／household_daily_usage_kwh／household_monthly_usage_kwh／estimated_tariff_per_kwh，預設 0.495／2.6／4／120／5）並於 `apps/server/src/db/seed.ts` 確保預設列存在，落實 requirement「Calculation coefficients are stored in a settings store with recommended defaults」。完成後：新環境 migrate+seed 後表存在且含預設列。驗證：新增 migration/seed 測試斷言表結構與預設值。
- [x] 1.2 新增 `apps/server/src/services/calculationSettingsService.ts`：讀取時缺列/缺欄位回落建議預設、寫入時驗證為正數否則拒絕，落實 requirement「Operators can view and update calculation coefficients」的讀寫與驗證。完成後：service 讀缺值得預設、寫非正數被拒。驗證：新增 service 測試涵蓋預設回落與非正數拒絕。

## 2. API 與管理設定面

- [x] 2.1 [P] 新增 `apps/server/src/routes/calculation-settings.ts`：GET 回目前五係數、寫入後回最新值，沿用 repo 既有 settings route 形狀慣例，落實 requirement「Operators can view and update calculation coefficients」的 API。完成後：可經 API 讀寫五係數。驗證：新增 route 測試涵蓋讀、寫、非法值拒絕。
- [x] 2.2 [P] 依設計決策「管理設定面沿用既有 settings 頁模式」，在管理設定面（比照 `apps/web/src/pages/DataSourceSettings`）新增五係數的檢視與編輯，串接 2.1 API 並走儲存後持久化。完成後：營運可於設定面改五係數且重整後保留。驗證：新增/擴充 `apps/web/src/pages/DataSourceSettings/viewModel.test.ts` 斷言載入/編輯/儲存流程。

## 3. 換算規則改吃設定

- [x] 3.1 依設計決策「減碳量三頁統一以發電量 × 排碳係數推導」，在 `apps/server/src/services/displayStoryService.ts`（Overview/Solar 減碳 binding）與 `apps/server/src/services/sustainabilityStoryService.ts`（`co2` 來源）改為讀設定排碳係數、以「對應發電量(kWh) × 係數 ÷ 1000」計算今日/累積減碳量，不再讀 MQTT `todayCo2Reduction`/`totalCo2Reduction`/`co2`，落實 requirement「Carbon reduction is derived uniformly from generation and the carbon emission factor across playback pages」；發電量缺失維持既有 `--`/unavailable fallback。完成後：三頁同一係數下減碳值一致。驗證：新增 server 測試斷言三頁減碳一致與缺值 fallback。
- [x] 3.2 在 `apps/server/src/services/sustainabilityStoryService.ts`（植樹）、`apps/server/src/services/householdEquivalenceService.ts` 與 `packages/shared/src/householdEquivalence.ts` 改為植樹等效＝自算減碳量 × 設定植樹係數、四口之家換算吃設定每日/每月用電與電價，落實 requirement「Tree equivalent and household equivalence derive from the configured coefficients」。完成後：改植樹係數/用電/電價後對應卡一致更新。驗證：擴充 `householdEquivalence`/`sustainabilityStoryService` 測試涵蓋設定值換算。

## 4. 整體驗證

- [x] 4.1 跑後端測試與型別建置確認無回歸。完成後：settings、API、三頁減碳與植樹/四口之家換算全綠。驗證：`pnpm --filter @solar-display/server test` 與 `pnpm run build` 皆通過。
