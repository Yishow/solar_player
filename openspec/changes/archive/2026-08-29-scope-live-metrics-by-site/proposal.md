## Why

Solar Player 目前以全域 `metric_key` 儲存、查詢與廣播 live metrics；在 CL 與 KN 分開部署時這個限制被不同資料庫掩蓋，但合併成單一 Server 後會造成同名 metric 互相覆蓋、跨廠即時資料外洩，以及 story value、freshness、trend 與 display override 使用不同 scope 的錯配。單 Server 必須先把 site scope 變成資料 runtime 的一級維度，才能安全承載兩廠共用頁面與後續可配置 widget。

## What Changes

- 引入資料層 `MetricScope = cl | kn | global`，與播放裝置既有 `SiteScope = cl | kn` 分離；`global` 只代表明確的跨廠或全域資料，不以 `NULL` 暗示。
- **BREAKING**：將 topic mapping、live metric identity、需要廠別語意的 monitoring history/counters，以及 display-only overrides 改為 scope-aware identity；提供可驗證的既有資料 migration，避免 CL/KN 同名 metric 碰撞。
- 建立單一 `Scoped Metric Runtime` / `MetricResolver` seam，負責依 trusted Display Client Context 解析 semantic metric、freshness、provenance、fallback 與 override；播放端不得以 query/header/client state 自行指定廠別。
- 將 playback live REST bootstrap、Socket.IO updates 與 page-scoped Display Story 全部改成同一個 scope resolver；未有額外可信 binding 時，CL 裝置只收到 CL 與允許的 global 資料，KN 同理。後續由 server-side published page config 明確指定的 cross-site binding 可透過同一 resolver 精準取用所需 metric，但 client/Pi 不得自行擴張 scope；management diagnostics 則走受信任的明確 scope 查詢。
- 讓 Overview trend、monitoring snapshots、daily summaries 與相關 restart restoration 保持與播放裝置 site scope 一致；全域 aggregate/history 必須以 `global` 明確標示，不與 site history 混用。
- 統一 semantic metric naming：site 不再藏在 metric key 內；例如 CL/KN 應共用 `factoryCircuit.stampingPower` 類型的 semantic key，由 scope 區分，不繼續擴張 `factoryCircuit.guanyin.*` 形式。
- 保留現有 Device → Group → `siteScope` → Playback Profile 模型，以及既有 CL/KN Factory Circuit page instance 分流；本 change 不合併不同版型。
- 不修改 Solar collector 的實作語言，也不讓 Pi 直接連 MQTT 或保存 raw topic 清單。

## Capabilities

### New Capabilities

- `site-scoped-metric-runtime`: 定義 scope-aware metric identity、持久化、resolver、REST/Socket delivery、history 與 override isolation 的核心契約。

### Modified Capabilities

- `device-context-site-scoped-playback`: formal playback metric/history/story 必須以 trusted device context 的 site scope 解析。
- `playback-live-metrics-subscription-isolation`: shared live metric state 必須接收已授權且 site-scoped 的 snapshot/update，而不是全域 snapshot。
- `page-scoped-display-story-runtime`: page story 的 value、freshness 與 provenance 必須來自同一個 scoped runtime。
- `display-monitoring-story-model`: monitoring story binding 與 display override 必須保留 resolved metric scope。
- `display-page-per-metric-freshness`: freshness 必須針對 resolved scope 的 metric/dependencies 評估。
- `playback-metric-contract`: semantic metric contract 必須與 site identity 解耦，site 不得再透過 metric key 命名編碼。
- `monitoring-history-accumulation`: persisted snapshots、daily summaries、counter restoration 必須保留 site/global scope 語意。
- `monitoring-history-runtime-refresh`: history refresh 必須攜帶或保留 scope，避免一廠寫入造成另一廠畫面讀取錯誤資料集。
- `overview-trend-data-integrity`: Overview trend 必須與該播放裝置 resolved site scope 一致。
- `multi-factory-generation-aggregation`: CL/KN site metrics 與跨廠 canonical aggregate 必須分離，aggregate 明確屬於 `global`。
- `factory-circuit-multi-site-split`: 既有兩個 page instances 保留，但 circuit semantic metrics 改以 scope 區分而非廠名 metric key。
- `display-card-data-management`: provenance、current value 與 display-only override 必須包含 scope，且 override 不得跨 site 套用。

## Impact

- Affected shared contracts: `packages/shared/src/deviceIdentity.ts`, `packages/shared/src/displayStory.ts`, `packages/shared/src/playbackMetricContract.ts` 與新增 metric scope/runtime types。
- Affected persistence: `apps/server/src/db/migrations/002_mqtt.sql`, history/counter tables的後續 migration、`display_value_overrides` 的後續 migration，以及 seed/migration tests。
- Affected server runtime: `apps/server/src/mqtt/MqttClientService.ts`, `apps/server/src/metrics/liveMetrics.ts`, history/accumulator services, `displayStoryService.ts`, `/api/metrics/live`, `/api/display-story/:pageId`, Socket.IO routing 與 management diagnostics。
- Affected web runtime: `apps/web/src/hooks/useLiveMetrics.ts`, live metrics store、Overview/Solar/Factory Circuit view models 與 trend consumers。
- Migration risk: 現有 DB 內部分 metric key 已把 site 編進名稱，migration 必須以明確 mapping 轉成 `(scope, semanticMetricKey)`，不允許以字串猜測未知 custom metrics。
