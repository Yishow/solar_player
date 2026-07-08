## Context

目前 `MQTT Settings` 已有 broker 設定、topic mapping workspace、readiness coverage 與 runtime preview。`selfConsumptionEnergy` 與 `consumptionEnergy` 已在預設 metric option 與 seed mapping 中，但操作員只能等待現場 MQTT 送值，不能從管理頁對既有 mapping 發佈測試值來驗證 broker/topic/ingestion 是否正確。

播放頁的 monitoring cards 已透過 story/view model 帶有 `metricKey`、`dependencyKeys`、`sourceClass`、`provenance` 等 metadata，但 UI 主要顯示 label/value/helper。操作員要追「這張卡由哪些 tag 組成」時，必須回到 MQTT 設定或程式碼推斷。

## Goals / Non-Goals

**Goals:**

- 讓 `MQTT Settings` 的既有 topic row 能輸入數字並發佈到該 row 的 configured topic。
- 讓 `selfConsumptionEnergy` 與 `consumptionEnergy` 維持可設定、可測試發佈，支撐 Solar「自發自用比例」推導。
- 讓 Overview、Solar、Factory Circuit、Sustainability 的 monitoring cards 顯示來源 tooltip，列出 direct metric key、topic、unit 與 dependency keys。
- 以測試先行鎖住 server publish contract、web UI contract、card tooltip metadata contract。

**Non-Goals:**

- 不提供任意 topic 或任意 payload 的 MQTT publish console。
- 不把測試值直接寫入 SQLite live metric table。
- 不改 MQTT ingestion parser 的 value path 語意。
- 不改自發自用比例名稱與公式。
- 不新增外部 dependency。

## Decisions

### Safe numeric publish from existing topic mappings

新增管理 API 使用 `metricKey` 尋找目前 enabled topic mapping，只接受 finite number，payload 固定為 `{ "value": <number> }`。這避免操作員輸入任意 topic 或任意 JSON，同時仍能完整驗證 broker publish 與現有 ingestion path。

替代方案一是任意 topic console，排除原因是它繞過 mapping/readiness 管理且風險較高。替代方案二是直接寫 `live_metric_values`，排除原因是它不能驗證 broker 與 MQTT client。

### Publish result must be observable and fail closed

`MqttClientService.publish` 目前是 fire-and-forget。此 change 要讓 settings route 能判斷發佈是否成功送到 client callback：mock mode 可回 success 並記錄 mock publish；未連線或 client callback error 要回明確錯誤。這讓 UI 不會在 broker 未連線時顯示成功。

### Per-row publish UI in MQTT Settings

在 `TopicWorkspaceRow` 加入數值輸入與發佈按鈕。按鈕 disabled 條件以 row 狀態推導：沒有 topic、disabled、saving/publishing 中、輸入不是 finite number 時不可送。成功後更新 message，並觸發 topic reload/readiness refresh 讓 runtime preview 能反映 broker 回寫後的收值。

### Source tooltip derived from story metadata

每張 monitoring card 的 tooltip 不由頁面硬寫文案，而由 card metric metadata 與 topic mapping/runtime metadata 組合。最小契約是顯示 metric key、source class、直接 topic（若有）、unit，以及 dependency keys。衍生卡例如 Solar「自發自用比例」要顯示 `selfConsumptionRatio` 以及 fallback dependency `selfConsumptionEnergy + consumptionEnergy`。

### Keep playback visuals stable

Tooltip 以 `title` 或既有 card component 的非侵入屬性起步，不改 card layout 尺寸與 FHD rhythm。若後續需要客製 hover panel，再另拆 visual polish change。

## Implementation Contract

**Behavior:**

- 在 MQTT topic workspace 中，已設定且啟用的 row 可輸入測試數值並發佈到該 row 的 MQTT topic。
- `selfConsumptionEnergy` 與 `consumptionEnergy` row 可用同一 publish affordance 驗證 Solar「自發自用比例」的兩個來源 metric。
- Broker 未連線、mapping 不存在、mapping disabled、topic 空白、value 非 finite number 時，server SHALL return a non-2xx error and UI SHALL surface the message.
- Monitoring card hover/focus tooltip SHALL expose source composition for cards that display runtime/story metrics.

**Interface / data shape:**

- Server endpoint: `POST /api/settings/mqtt/topics/:metricKey/publish` with body `{ "value": number }`.
- Successful response includes `{ success: true, metricKey, topic, payload, status }` where `payload` is the JSON string sent to broker.
- Failure response uses the existing settings route style with a clear `error` string and HTTP status: 400 for invalid value, 404 for missing mapping, 409 for disabled/empty-topic/disconnected publish state.
- UI adds transient per-row draft state for publish value/status; it does not persist test values into topic mappings.
- Tooltip string format is deterministic enough for tests: it includes `Metric: <metricKey>`, `Topic: <topic or -->`, and `Depends on: <keys or -->`.

**Acceptance criteria:**

- Server tests prove successful publish sends `{ "value": 1200 }` to the mapped topic for `selfConsumptionEnergy` and rejects disconnected publish.
- Web tests prove topic rows render publish input/button and call the publish handler with the row metric key and numeric value.
- View model or rendering tests prove Solar self-consumption card tooltip includes `selfConsumptionRatio`, `selfConsumptionEnergy`, and `consumptionEnergy`.
- Existing MQTT settings tests and affected playback view model/render tests remain green.

**Scope boundaries:**

- In scope: MQTT settings route/service, MQTT settings page, monitoring card source tooltip rendering, focused tests.
- Out of scope: arbitrary broker console, raw payload editor, formula changes, route shell changes, SQLite schema migration unless current code requires it.

## Risks / Trade-offs

- [Risk] Broker publish can succeed while ingestion does not immediately receive the echoed message if broker ACLs or subscriptions differ. → Mitigation: response only claims publish delivery to MQTT client callback; UI reloads topics but does not claim live metric updated until runtime preview receives it.
- [Risk] Native browser `title` tooltip is less visually rich. → Mitigation: it is layout-stable and sufficient for this operational trace; visual treatment can be refined later.
- [Risk] Source tooltip can become stale if topic mappings change while playback page is already loaded. → Mitigation: reuse existing runtime/config refresh where available and keep tooltip based on current story/config payload rather than hardcoded page text.
- [Risk] Some cards use aggregate or non-MQTT sources. → Mitigation: tooltip displays available source class and dependencies; missing direct topic is shown as `Topic: --` rather than hidden.

## Migration Plan

No database migration is expected. Existing `topic_mappings` rows continue to work. Deployment can roll forward with the normal build/test path. Rollback removes the publish endpoint/UI and returns cards to their previous rendering without data loss.

## Open Questions

None for MVP. If operators later require arbitrary payloads or retained messages, that must be proposed separately because it changes broker safety boundaries.
