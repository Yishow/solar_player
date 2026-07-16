## Context

Overview 的發電趨勢來自 `metric_snapshots.generation_power`，產品語意是當日本地時區的即時功率 profile；月用量曲線來自 `/api/metrics/daily-summary?range=month` 的每日 `consumption_total`。目前 mock feed 與 daily summary persistence 的語意不一致，導致 snapshots 持續增加但 cumulative counters 不動、daily summaries 為 0，且 widget 初次載入後不再刷新。

## Goals / Non-Goals

**Goals:**

- mock 模式的能源累積讀值在同日及跨日皆不倒退，並保留足以反映小於 1,000 kWh 變化的精度。
- 當日 daily summary 隨 accumulator 週期持續 upsert，服務重啟時由同日既有 summary 恢復基線。
- 月用量 widget 在 `monitoring-history` display sync 後重讀當月 summary。
- MQTT mode 重啟後，在新 message 抵達前仍以 SQLite 已持久化資料恢復 Overview 的累積值、當日 summary 與發電趨勢。

**Non-Goals:**

- 不把發電趨勢改成累積發電量曲線；它仍是即時功率時序。
- 不把每日用量再做 month-to-date 累計；月用量曲線仍是一日一點。
- 不修改 SQLite schema、MQTT topic contract、Overview editor geometry 或圖表視覺。
- 不回填既有錯誤的 0 值歷史列。

## Decisions

### Mock energy readings use deterministic cumulative totals

mock feed 以固定 epoch、已完成日數及當日 profile 產生累積發電、用電與自發自用讀值，並提高 GWh 精度。這比在 accumulator 偵測「數值不動」後偷偷積分更安全，因為真實設備的 authoritative cumulative meter 即使短暫不變也不應被重複加值。

### Current-day summaries are persisted on every service tick

`DailySummaryService` 每次 `processAt` 在更新 peak 後 upsert 當日 summary，而不是只在跨日寫入昨天。初始化時若同日 row 已存在，使用 `current counters - stored daily totals` 重建日初 baseline，使重啟後繼續累積同一列；不存在時沿用當前 counters 作為 baseline。

### Monthly consumption reuses the monitoring-history refresh lifecycle

月用量 widget 使用既有 `useRuntimeRefreshLifecycle` 與 `resolveMonitoringHistoryRuntimeRefreshSpec("month")`，只回應 `monitoring-history` scope。這避免另建 polling 或 Overview 特例，也沿用既有 socket refresh 邊界。

### MQTT restart recovery reads persisted history before new messages

正式 MQTT mode 不啟動 `MockMetricsFeedService`，也不以 mock 補正式資料。`MetricsAccumulatorService.initialize` 從 `cumulative_counters` 恢復累積值；`DailySummaryService` 從同日 `daily_energy_summaries` 恢復 baseline；Overview generation trend 直接讀 current-day `metric_snapshots`。因此 server 重啟到下一筆 MQTT message 之間仍有可信的最後持久化狀態。替代方案「重啟後等待新 MQTT 才顯示」會造成 kiosk 暫時空白，不採用。

## Implementation Contract

- Behavior: mock 模式同日較晚時間的 `totalGeneration`、`consumptionEnergy`、`selfConsumptionEnergy` SHALL 大於或等於較早時間，隔日讀值 SHALL NOT 回到日初基線；發電趨勢仍輸出當日 `generation_power` profile。
- Behavior: `DailySummaryService.processAt` SHALL 在當日產生或更新對應日期 row；同日 counters 增加時 row 的 daily totals SHALL 增加；重建 service 後 SHALL 從既有 row 延續而非歸零。
- Behavior: Overview 月用量 widget SHALL 初次讀取 month summaries，並在 `monitoring-history` display sync 後重新讀取；失敗或空資料時 SHALL 顯示既有空狀態，不製造 mock 曲線。
- Behavior: MQTT mode 重啟後且尚未收到新 broker message 時，Overview SHALL 由 SQLite 既有 counters、current-day daily summary 與 current-day metric snapshots 恢復累積 KPI、月用量與發電趨勢；正式 MQTT mode SHALL NOT 啟動或讀取 mock feed。
- Interface / data shape: 既有 metrics API response、SQLite tables、display sync event shape 與 widget props 保持不變。
- Failure modes: 無有效 summary 或 API 失敗時保留空狀態；無 current-day row 時 baseline 從當前 counters 開始，不推測服務啟動前的未知用量。
- Acceptance criteria: 新增 server tests 證明 mock 同日／跨日單調、daily summary 當日更新與重啟延續、accumulator 從 persisted counters 恢復，且 display story 在沒有新 MQTT message 時仍由 persisted snapshots 回傳 trend；web tests 證明 month refresh scope predicate；targeted server/web tests、完整 `pnpm test`、`pnpm run build` 與 fresh Overview FHD witness 通過。
- Scope boundaries: 僅修改 proposal Impact 列出的 runtime、service、widget 與其測試；不改 editor/schema/layout/CSS。

## Risks / Trade-offs

- [Risk] mock 累積基線是展示資料而非現場電表 → Mitigation: 僅在既有 mock feed 內使用，MQTT mode 不受影響。
- [Risk] 每分鐘 upsert summary 增加 SQLite write → Mitigation: 沿用既有 60 秒 service cadence 與單列 `ON CONFLICT`，不增加新 timer。
- [Risk] 首次部署在當日中途沒有既有 row，無法重建凌晨至啟動前的 daily delta → Mitigation: 明確從當前 counters 建 baseline，後續重啟可由已持久化 row 延續，避免猜測資料。
