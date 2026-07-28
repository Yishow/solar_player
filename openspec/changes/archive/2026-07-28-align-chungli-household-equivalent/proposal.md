## Why

永續頁的累積發電主指標已依中壢 MQTT summary 解析，但家庭等效累積卡仍讀舊的全站累積計數器，導致同一頁面顯示 45,678 MWh 與 950 戶這類不一致結果。月用量曲線也需要確認資料來源、單位與月初邊界，避免將即時功率、累積電量與日彙總混在同一曲線語意中。

## What Changes

- 讓永續頁的累積家庭等效卡使用與累積發電主指標相同的中壢廠區 MQTT scope 與 fresh 狀態。
- 保留今日家庭等效卡既有的「今日自發自用量／今日發電量」規則，不以累積 MQTT 值覆寫它。
- 檢視月用量曲線的資料查詢、單位與月份邊界；若現況不符合月度電量曲線語意，補上最小修正與回歸測試。

## Capabilities

### New Capabilities

- `chungli-household-equivalent-alignment`: 永續頁累積家庭等效與中壢累積發電指標一致，並明確處理資料 stale 狀態。

### Modified Capabilities

- `sustainability-household-equivalent-storytelling`: 調整累積家庭等效的資料來源需求，使其可依啟用廠區的 MQTT 累積發電計算。

## Impact

- Affected code:
  - Modified: apps/server/src/services/householdEquivalenceService.ts
  - Modified: apps/server/src/services/householdEquivalenceService.test.ts
  - Modified: apps/server/src/services/sustainabilityStoryService.ts
  - Modified: apps/server/src/services/sustainabilityStoryService.test.ts
  - Modified: apps/server/src/routes/metrics-history.ts
  - Modified: apps/server/src/routes/metrics-history.test.ts
  - Modified: apps/web/src/pages/EnergyTrend/viewModel.ts
  - Modified: apps/web/src/pages/EnergyTrend/viewModel.test.ts
- Affected specs: sustainability-household-equivalent-storytelling, chungli-household-equivalent-alignment
