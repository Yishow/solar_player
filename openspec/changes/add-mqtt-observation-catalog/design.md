# Design｜受控MQTT接收清單

## Context

已核對：MqttClientService的desiredTopics來自啟用mapping及managed adapter；generic handleMessage以exact topic查表，零mapping直接return；目前message callback只把topic與payload傳下去，沒有packet retained/QoS證據。SourceCards及TopicWorkspaceRow主要是手工欄位，而不是未映射訊息瀏覽器。來源：MQTT-SOURCE-AUDIT.md。

## Scope

**In scope**：受控接收、已觀察候選、有限sample、明確coverage、共用來源選擇器的後端依據與唯讀診斷。
**Out of scope**：Broker admin庫存API、掃網段、替使用者擴權、修改發布端韌體、全域永久訂閱、任意payload解碼與歷史資料復原。

## Architecture and Decisions

1. Connection reference重用既有中央Broker，不新增假的每廠Broker設定；廠區獨立的是經確認的reception profile（名稱、scope、允許filters、權限）。一個connection可服務多個scope，但不能用UI切換當成證據。
2. Runtime被動tap只提供非阻塞、受限事件給catalog，在generic parse之前即可記錄允許的candidate。主動探索用獨立短生命週期MQTT client，unique clientId、clean session、normal non-shared subscriptions、不可publish。不和正式client共用unsubscribe生命週期。
3. Discovery client只讀命名且已允許的prefix。沒有namespace設定时，需在同一任務由有權限者選擇候選或一次填入filter；沒有候選不能憑空創造，不能預設#。設定scope保存後日常只顯示「觀音電力資料」。
4. Broker回覆與無流量是不同狀態。MQTT 3.1.1允許某些權限情況不完整可觀察，UI只說「此窗口沒有收到」，不把推測當確定原因。不能將整個result命名成「Broker全部Topics」。
5. Catalog是觀察證據，不是電錶清冊權威。每個接收封包建立不可變的transport evidence envelope，保存connectionRef、captureId、candidateId、exactTopic、schemaVersion、declaredTag、sampleRef、receivedAt、sourceTimestamp、timestampQuality、retained/dup/qos、origin、coverage；`receivedAt`是接收端時間，`sourceTimestamp`只代表來源事件時間，缺少封包旗標或來源時間時保留unknown，不能預設成`false`或現在。catalog的`retained`旗標到sample evidence的`retain`欄位必須是明確一對一映射。receiver到extractor到E1輸入的`retain/dup/qos/receivedAt/origin`必須原樣保留；`sourceTimestamp`與`timestampQuality`若不是封包metadata，可依reviewed selector的timestamp path在extractor/E1解析，但原始時間證據與解析狀態必須一路保留，不可只傳topic/payload、把`retained=true`轉成`false`或以receive time捏造可信source time。來源tag是外部識別；E1 meterRef、metricScope/metricKey是內部目的，不能混用。
6. Interleaved tags不能只留每topic最後一包；按受限候選id保留多樣本，array先找structural candidate但不把index認定成物理身分。正式selector由M2確認。
7. Candidate metadata/approved recipes可持久化；raw bodies受TTL限制，預設只留capture生命週期；過期顯示需要重新取樣，lastSeen不改成現在。`retained=true`且沒有可信`sourceTimestamp`的封包，`timestampQuality`必須是unknown、age必須是unknown，只能作設定／診斷evidence，E1回報`RETAINED_SOURCE_TIME_UNKNOWN`。只有E1 source上經明確審核、具sourceRevision/audit的`timestampPolicy=allow-receive-time-estimate`，且封包為正式來源、`retain=false`、`dup=false`、`qos∈{0,1,2}`、缺少source timestamp時，才可依E1契約使用receive-time-estimated；預設`timestampPolicy=source-required`，packet或profile不得自行宣告放寬，source timestamp存在但解析失敗不得fallback。缺少必要transport evidence且沒有可信source timestamp時回報`TRANSPORT_EVIDENCE_MISSING`。對於沒有可信source timestamp的retained replay，E1在deduplication、負差檢查、epoch切換、accepted write、live狀態、baseline或freshness更新之前隔離；有可信source timestamp的正式retained packet仍依E1-R2的去重與late-event規則處理。重啟後重送無時間舊值不得改變目前accepted讀值或製造discontinuity。Catalog/capture retained evidence與offline evidence（origin=catalog/offline）永遠不直接進入accepted history。

## Proposed API Contracts

新增管理API（設計名稱，實作前依repo conventions確認route掛載）：
- GET /api/settings/mqtt/reception-profiles：目前帳號可選的命名觀察範圍，不回密碼。
- POST /api/settings/mqtt/captures：connectionRef、siteScope、receptionProfileId、requestedDuration；回captureId/expiresAt/filter status。
- GET /api/settings/mqtt/captures/:id/candidates：分頁/搜尋/state/schema refs與coverage。可用SSE或既有authenticated socket adapter，二者都需scope auth。
- GET /api/settings/mqtt/captures/:id/samples/:sampleId：有界、redacted、versioned。
- DELETE /api/settings/mqtt/captures/:id：冪等停止；不可解除production subscriptions。
- POST /api/settings/mqtt/sample-evidence：paste/import支援的scalar/JSON範例，origin固定offline，不允許payload指定host。

錯誤包含UNAUTHORIZED_SCOPE、SCOPE_NOT_CONFIGURED、SUBSCRIPTION_REFUSED、NO_OBSERVATION、CAPTURE_EXPIRED、EVIDENCE_CHANGED、PAYLOAD_UNSUPPORTED、CAPTURE_LIMIT_REACHED、TRANSPORT_EVIDENCE_MISSING、RETAINED_SOURCE_TIME_UNKNOWN。不可把這些都縮成「連線失敗」。

## Implementation Contract

**Behavior**：catalog只展示受控窗口內的觀察與診斷證據。receiver、extractor與E1之間必須保留`retained`、`dup`、`qos`、`receivedAt`、`sourceTimestamp`、`timestampQuality`及`origin`的值與unknown狀態；沒有可信source timestamp的retained replay不能被視為現在收到的新量測。

**Interface / data shape**：接收封包的metadata envelope至少包含上述七個欄位，以及`connectionRef`、`exactTopic`與payload/schema references；catalog `retained`到sample `retain`的映射必須可逐欄驗證。`retain/dup/qos/receivedAt/origin`是不可變transport evidence；`sourceTimestamp`與`timestampQuality`可由reviewed selector與E1解析產生，但必須同時保留raw timestamp evidence、timestamp path與解析結果。`receivedAt`與`sourceTimestamp`不可互換；`timestampQuality=unknown`不可由receive-time推導成可信時間。`retained=true`不得在任一層被省略或正規化為false。

**Failure modes**：retained且沒有可信source timestamp時，catalog回報age unknown與configuration/diagnostic-only，E1回報`RETAINED_SOURCE_TIME_UNKNOWN`；必要transport evidence缺失時回報`TRANSPORT_EVIDENCE_MISSING`。只有source上明確審核且有sourceRevision/audit的`timestampPolicy=allow-receive-time-estimate`，加上正式`retain=false`、`dup=false`、`qos∈{0,1,2}`且缺timestamp才允許receive-time-estimated；預設`source-required`，packet/profile不得放寬，timestamp存在但解析失敗不得fallback。E1在dedupe、負差、epoch、accepted write、live、baseline及freshness之前隔離不符合條件的證據。offline或catalog evidence（origin=catalog/offline）若過期、schema改變或缺少權限，只回可重試診斷狀態，不以無關最新payload替代，也不寫accepted history。

**Acceptance criteria**：測試必須從MQTT receiver穿過extractor檢查不可變transport metadata與source-time解析證據，並以重啟後重送`10000`、目前accepted為`10100`的fixture證明不產生discontinuity、不寫accepted reading、不改live/freshness/baseline；catalog與offline前後SQLite snapshot均不得出現accepted history變更。

**Scope boundary**：本change只定義受控catalog、evidence傳遞與隔離邊界；E1的累積值計算及E2/E6 accounting規則由相依change實作。本change不把catalog、retained或offline樣本回填成正式歷史。

## Limits and Safety

設計預設：session180秒，明確操作可延至600秒；payload256KiB，depth16，leaves2000，topics1000，candidates5000，samples10/候選，10MiB/session。另設instance全域memory/concurrent sessions/rate ceilings；以測試設備實測後調整預設，不能聲稱本值就是效能保證。超量drop/throttle計數與coverage incomplete呈現，主runtime不等待UI採樣。記錄token等需redaction；URL只放opaque id，不塞broker密碼或rawPayload。停止capture不清除broker retained messages。

## Migration and Rollout

Additive metadata schema、feature flag預設關閉；先在隔離broker驗證與runtime共存，再開命名範圍。既有mapping/managed subscriptions不改；現有rawPayload snapshot不是可任意無遮罩展示的client端資料。
回退只停capture與catalog讀取、清TTL samples；不刪來源、不改既有counter baseline。capture重新連線須重新檢查權限與scope版本。

## Acceptance and Open Evidence

按M1 specs測正常/拒絕/無流量/過期/飽和/跨廠越權/rollback。尚未取得觀音現場topic/payload/ACL與更新頻率；因此資料樣例只用合成。不能從程式碼review宣稱現場Broker可被掃描，需部署驗收。本次文件analyze/validate已執行，但不代表相依實作、MQTT runtime或現場驗收。
