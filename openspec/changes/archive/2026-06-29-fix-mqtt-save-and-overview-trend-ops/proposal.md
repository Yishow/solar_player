## Why

目前 `MQTT Settings` 的 broker / weather 設定在 broker reconnect 失敗時會讓操作員誤以為「沒有存成功」；同時，樹莓派本機瀏覽器對 read-only management API 的同主機 GET 在缺少 `Origin` 時可能被誤擋。另一邊，Overview 發電趨勢現在會沿用最新有資料的那一天，跨日後容易繼續顯示昨天曲線；當系統時間異常時，操作員也缺少明確診斷與安全的「只清今天曲線」維運入口。

## What Changes

- 讓 `PUT /api/settings/mqtt` 先持久化 broker / weather 設定，再非阻塞地嘗試 broker reconnect；即使 reconnect 失敗，已儲存設定仍可在後續載入中讀回。
- 允許 read-only management GET 在 `Origin` 缺失但 `Referer` 與當前 host 同源時視為 trusted browser read，不放寬 mutation API。
- 將 Overview 發電趨勢收斂成「只顯示目前本地日的 snapshot profile」；若當前日尚無 snapshot，runtime 回傳空 trend，由現有 empty-state 顯示處理。
- 在 `/settings/data-source` 新增監看資料時間異常與重設今日曲線的維運能力；reset 只清當日 `metric_snapshots`，並觸發 monitoring-history refresh。

## Non-Goals

- 不新增完整 raw MQTT payload 歷史儲存；該需求另開獨立 change。
- 不修正或自動同步裝置 NTP / 系統時間，只提供診斷與人工 reset 能力。
- 不變更 `live_metric_values`、`daily_energy_summaries`、`cumulative_counters` 的資料模型。

## Capabilities

### New Capabilities

- `management-read-browser-trust`: 允許同主機瀏覽器對 read-only management API 的無 `Origin` GET 以同源 `Referer` 通過 trusted read 判定。
- `data-source-monitoring-ops`: 在 `/settings/data-source` 暴露 snapshot 日期診斷、時間異常提示，以及只清今日曲線的維運操作。

### Modified Capabilities

- `mqtt-settings-weather-management`: MQTT / weather 設定儲存契約改為先持久化再背景 reconnect，避免 broker 異常掩蓋已存設定。
- `overview-trend-data-integrity`: Overview 趨勢契約改為只呈現目前本地日的 trend profile；跨日但尚無新 snapshot 時必須回傳空資料。

## Impact

- Affected specs: management-read-browser-trust, data-source-monitoring-ops, mqtt-settings-weather-management, overview-trend-data-integrity
- Affected code:
  - Modified: apps/server/src/plugins/managementAuth.ts
  - Modified: apps/server/src/routes/settings-mqtt.ts
  - Modified: apps/server/src/routes/data-source.ts
  - Modified: apps/server/src/routes/data-source.test.ts
  - Modified: apps/server/src/services/generationTrendSeries.ts
  - Modified: apps/server/src/services/generationTrendSeries.test.ts
  - Modified: apps/server/src/services/displayStoryService.ts
  - Modified: apps/web/src/services/api.ts
  - Modified: apps/web/src/pages/DataSourceSettings/index.tsx
  - Modified: apps/web/src/pages/DataSourceSettings/viewModel.ts
  - Modified: apps/web/src/pages/DataSourceSettings/viewModel.test.ts
  - Modified: apps/server/src/plugins/managementAuth.test.ts
  - Modified: apps/server/src/routes/settings-mqtt.test.ts
