## Why

現場 `solar_mqtt` 已發布 CL、KN 的日量、月量與各 zone 累積 `total_mwh`，但廠區 summary/scalar 尚未發布 zone 合計的 `total_mwh`；Solar Player 也尚未讓 Sustainability 依播放設定中啟用的廠區，使用 CL、KN 或 CL + KN 的累積發電量作為累積發電量與累積 CO₂ 的正式來源。結果是圖片中的 zone 累積讀值無法沿同一 MQTT 契約進入永續頁，且既有 `totalGeneration` 可能仍來自舊 mapping 或本機 accumulator。

## What Changes

- 在 `solar_mqtt` 以每輪完整 zones snapshot 計算每廠 `total_mwh`，加入 retained `solar/{factory}/summary.total_mwh` 與 `solar/{factory}/total_mwh`。
- 任一 zone 的 `total_mwh` 缺失或非有限值時，該輪不發布新的廠區 scalar 總量、不把缺值當 0，保留 broker 上一次 retained 正確值並發布 bounded alert。
- Solar Player 訂閱 CL、KN summary，以 `today_mwh`、`month_mwh`、`total_mwh` 建立雙廠完整 snapshot；只有兩廠資料都有效時才更新 canonical combined metrics。
- 將 CL + KN 累積 `total_mwh` 正規化為 canonical `totalGeneration`，保留 Overview、Solar 與既有 cumulative counter 的 combined 契約。
- Sustainability 不新增頁內 selector，而是沿用播放設定的兩個廠區啟用開關：只啟用中壢時使用 CL，只啟用觀音時使用 KN，兩廠都啟用時使用 CL + KN；兩廠都停用時顯示未選擇廠區／資料不可用。
- Sustainability 的累積發電、累積 CO₂、植樹等效及來源狀態全部使用同一個播放廠區 scope，不得在單廠模式混入另一廠數值。
- 累積 CO₂ 延用既有 `carbonEmissionFactor`，不訂閱或使用外部 CO₂ topic，也不寫死係數。
- 在 MQTT Settings／readiness 與 Sustainability provenance 顯示雙廠來源、更新狀態及缺廠／stale 狀態，避免部分總量冒充完整總量。
- 增加 publisher、subscriber、migration、aggregation、Sustainability 與 live MQTT/FHD witness 驗證。

## Capabilities

### New Capabilities

- `solar-mqtt-factory-total-publishing`: 定義現場發布端如何從 zone 累積讀值產生 retained 廠區 total summary/scalar，並在缺值時保留最後正確總量。
- `multi-factory-generation-aggregation`: 定義 Solar Player 如何訂閱 CL／KN summary、建立完整雙廠 snapshot，並產生 canonical 日、月、累積發電量。
- `sustainability-factory-scope-by-playback-settings`: 定義單一 Sustainability 頁如何依播放設定的廠區啟用組合解析 CL、KN、CL + KN 或未選擇 scope。

### Modified Capabilities

- `sustainability-calculation-settings`: Sustainability 累積 CO₂ 的 generation basis 改為播放設定所選 scope 的 cumulative `total_mwh`，仍沿用已設定的 carbon factor。
- `sustainability-data-provenance`: Sustainability 累積指標須揭露目前 scope 的 MQTT 來源、同步時間與完整性。
- `mqtt-settings-display-coverage`: MQTT Settings 須將 CL／KN summary mappings 與 derived canonical generation 的完整性顯示為一組 dependency coverage，而不是把 derived metric 誤判為缺少直接 topic。

## Impact

- Affected specs: `solar-mqtt-factory-total-publishing`, `multi-factory-generation-aggregation`, `sustainability-factory-scope-by-playback-settings`, `sustainability-calculation-settings`, `sustainability-data-provenance`, `mqtt-settings-display-coverage`
- Affected code:
  - Modified: `solar_mqtt/solar/service.py`, `solar_mqtt/solar/display.py`, `solar_mqtt/test_mqtt_retain.py`, `apps/server/src/mqtt/MqttClientService.ts`, `apps/server/src/mqtt/MqttClientService.test.ts`, `apps/server/src/db/seed.ts`, `apps/server/src/services/MetricsAccumulatorService.ts`, `apps/server/src/services/MetricsAccumulatorService.test.ts`, `apps/server/src/services/sustainabilityStoryService.ts`, `apps/server/src/services/sustainabilityStoryService.test.ts`, `apps/server/src/services/displayReadinessService.ts`, `apps/server/src/services/displayReadinessService.test.ts`, `apps/server/src/services/displayRotationService.ts`, `apps/server/src/routes/display-story.ts`, `apps/web/src/pages/Sustainability/index.tsx`, `apps/web/src/pages/Sustainability/viewModel.test.ts`, `apps/web/src/pages/MqttSettings/viewModel.test.ts`
  - New: `solar_mqtt/test_factory_total_mwh.py`, `apps/server/src/services/factoryGenerationAggregateService.ts`, `apps/server/src/services/factoryGenerationAggregateService.test.ts`, `apps/server/src/db/migrations/025_cl_kn_generation_summary_topics.sql`, `apps/server/src/db/migrations/clKnGenerationSummaryTopics.test.ts`
  - Removed: none
- Runtime systems: the existing field MQTT broker, CL/KN retained topics, installed Pi SQLite topic mappings, live metrics, cumulative counters, playback page enablement, MQTT Settings readiness, and the Sustainability playback story.
