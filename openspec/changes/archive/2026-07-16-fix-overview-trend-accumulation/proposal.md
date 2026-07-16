## Why

Overview 的「發電趨勢」與「月用量曲線」目前無法可信地反映持續運行中的能源變化：mock 累積發電量因過早四捨五入長時間不變、每日用量被當成全期累積值而跨日歸零，且當日 summary 與已開啟的月用量 widget 都不會持續刷新。這使 SQLite 已持續寫入 snapshot 時，畫面仍呈固定平線或 0 kWh。

## What Changes

- 修正 mock energy readings 的累積語意與精度，使發電、用電與自發自用累積值隨時間前進且跨日不倒退。
- 讓 `DailySummaryService` 在當日運行中持續 upsert 當日 summary，並在服務重啟後延續既有當日基線，而非等到隔日才產生資料。
- 明確鎖定正式 MQTT mode 的重啟恢復：未收到新 broker message 前，Overview 仍從 SQLite 既有 counters、daily summaries 與 current-day snapshots 顯示資料；mock 累積生成只在既有 `data_mode=mock` lifecycle 啟動。
- 讓 Overview 月用量 widget 沿用 monitoring-history runtime refresh 契約，在 daily summary 更新後重新取得當月資料。
- 保留圖表既有產品語意：發電趨勢顯示即時功率時序；月用量曲線顯示每日用量，不額外做 month-to-date 二次累加。

## Capabilities

### New Capabilities

- `monitoring-history-accumulation`: 定義累積能源讀值、當日 daily summary 與跨重啟／跨日持續更新的正確性契約。

### Modified Capabilities

- `overview-density-widgets`: 月用量曲線在當日 summary 更新後需刷新資料，並持續顯示每日用量序列。

## Impact

- Affected specs: `monitoring-history-accumulation`, `overview-density-widgets`
- Affected code:
  - Modified: apps/server/src/services/MockMetricsFeedService.ts
  - Modified: apps/server/src/services/MockMetricsFeedService.test.ts
  - Modified: apps/server/src/services/DailySummaryService.ts
  - Modified: apps/server/src/services/DailySummaryService.test.ts
  - Modified: apps/server/src/services/MetricsAccumulatorService.test.ts
  - Modified: apps/server/src/routes/display-story.test.ts
  - Modified: apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - Modified: apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.test.tsx
