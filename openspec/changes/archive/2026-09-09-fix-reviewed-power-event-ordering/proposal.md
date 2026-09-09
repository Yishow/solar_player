## Why

在 `26c5598e590c05d993833b3b890149657ede13ab` 的隔離測試中，正式 MQTT message handler 先收到 10:02 的 20 kW，再收到 10:01 的 5 kW，`live_metric_values` 的值與時間戳都退回較舊觀測。已審查功率來源目前每次有效擷取都宣告 `liveUpdated=true`，因此合法但遲到的封包也能覆蓋畫面所稱的最新值。

## What Changes

- 已審查功率來源更新 live 值前，在同一資料庫交易中比較目前已保存的有效觀測時間；較舊封包不得改變值、單位、時間戳、quality、raw payload 或 freshness。
- 同時刻同觀測採無變更重送；同時刻不同功率或單位保留既有值並提供可測試的衝突診斷，不任意選最後抵達者。
- 使用既有 persisted live state，重啟後仍保護目的身分 `(metric_scope, metric_key)` 的時間順序。合法來源時間優先；經明確核准的無來源時間封包仍只採原始 receivedAt，且保留 estimated quality。
- 新來源的首筆與較新觀測維持正常更新；功率仍不得寫進 accepted energy history、energy quarantine 或 period baseline。

## Capabilities

### New Capabilities

無。

### Modified Capabilities

- `meter-reading-contracts`: 補充已審查 power-gauge 的持久化 live 觀測排序、等時刻重送／衝突與來源／接收時間證據要求。

## Impact

主要範圍為 `apps/server/src/services/mqttMeterIngest.ts`、`apps/server/src/mqtt/MqttClientService.ts` 與相關 ingest/runtime tests。沿用 E1 的時間與 transport admission 邊界，以及 Data Hub 對最新值／freshness 的要求；把 power live 的未明訂排序邊界補成可驗收契約。

不新增 power history、資料表、API 回應形狀或套件；不改累積電量差值、不回填歷史、不擴大為 broker 重排系統。未經審查的 legacy mapping 相容路徑保持原行為。目的身分不因來源 revision 更新就自動允許時間倒退；校正上游錯誤時鐘或重設時間軸不在本案範圍。

此案可獨立於 `fix-guided-source-mutation-guards` 實作。成功重現與未驗證範圍見 `docs/reviews/2026-09-08-mqtt-runtime-safety-review.md` F2；本提案未實作修復。
