# E1｜建立電錶累積讀值與量測語意契約

## Why

使用者已確認廠區用電輸入是電錶累積讀值。必須先將「累積電量 kWh」與「瞬時功率 kW」分清楚，才能修復期間用電及部門比例，不能把修正寫成前端除法或改單位文字。

## Problem and Evidence

MetricsAccumulatorService 已讀 consumptionEnergy 並寫 cumulative counter；sumConsumptionPower 卻以 factory 前綴及 kW 篩選。DataHub 自訂來源只有 key/scope/unit/multiplier/valuePath，尚不足以表達 meter identity、counter epoch 與量測種類。本次未取得現場 MQTT payload，不能宣稱已確認每一條來源的實際單位。

基準：13535147ad47613cf80b2321d12cb131b30264ab（main，2026-09-04 提交）。來源與觀察界限見 `.scratch/datahub-energy-authoring/source-audit.md`。這是依原始碼與使用者回報起草的 change，不是現場測試報告。

## What Changes

- 在 shared、MQTT ingest 及 SQLite 持久層建立帶版本的物理來源、measurementKind 與 energyFlowRole(consumption/generation/grid-import/grid-export)，取代 metric key 前綴猜測；總錶、部門及比較分母只由 E6 profile 保存。
- 將 retain/dup/qos、origin 與時間證據傳至 E1 入庫閘門；無可信來源時間的 retained packet 只能供設定／診斷，不新增 accepted history 或改變 baseline、freshness、epoch。
- sourceTimestampTimeZone 僅解析無 offset 的裝置時間；E6 siteTimeZone 是唯一日曆邊界權威，解析錯誤不能用接收時間掩蓋。來源以版本化 timestampPolicy 明確批准 receive-time estimate，預設要求來源時間。
- 既有來源先做清冊與確認，不自動把所有 factory 欄位改成 kWh；補上重啟 retained replay、accounting ownership 與來源時間解析的驗收情境。

## Non-Goals

不改 Solar Collector 已提供的今日／本月發電量語意；不推算電價、不操作現場電錶、不重設實體或既有累積 counter；不把 kWh 冒充 kW，也不在本 change 實作期間差值。

## Capabilities

### New Capabilities

- `meter-reading-contracts`：建立電錶累積讀值與量測語意契約；具體規則與例外見同目錄 specs。

### Modified Capabilities

- 無；本 change 以新增的限定能力補充既有契約，不刪除既有權限、版位與相容性約束。

## Dependencies and Delivery Boundary

- 類型：Feature / corrective foundation。
- 優先序：P0。
- 前置 change：無。
- 可先評審草案；只有前置契約及對應驗證完成後才可以進入相依實作。
- 本 change 以自己的 tasks 作實作進度來源；其他 change 未完成不能靠此 change 臨時 hardcode 代替。

## Success Criteria

- 每一個 requirement 的 GIVEN / WHEN / THEN 必須由 test-plan 指定的驗證層實際驗證。
- 失敗狀態、權限與跨廠區隔離和正常狀態同為交付條件。
- 保存來源或草稿不代表發布；伺服器發布不代表裝置已套用。
- 所有實作 task、受影響測試、實際 pnpm verify 及必要人工驗收完成後才可 archive。

## Impact

- Existing files to modify（基準路徑／整合點，實作前須依最新 main 再確認）：
  - `apps/server/src/mqtt/MqttClientService.ts`
  - `apps/server/src/services/MetricsAccumulatorService.ts`
  - `apps/server/src/routes/settings-mqtt.ts`
  - `apps/server/src/db/migrate.ts`
  - `packages/shared/src/index.ts`
- Proposed new implementation files（尚未建立，不是本包已實作）：
  - `packages/shared/src/meterReading.ts`
  - `apps/server/src/services/meterReadingService.ts`
  - `apps/server/src/services/meterSourceCatalogService.ts`
  - `apps/server/src/services/meterReadingService.test.ts`
- Removed: 無。
- Specification artifacts: `openspec/changes/add-meter-reading-contracts/`。
- 本包只新增提案檔；不含應用程式修正、資料库 migration 執行或正式資料更新。

## V3 MQTT Source Integration

新增E1-R7：以M1/M2補齊來源探索→穩定tag選擇→批次preview/apply。此change維持原有單一權責，UI不再要求先到外部client查訂閱/publish後手抄Topic。M1/M2為新的前置/整合契約，不代表功能已在main。
