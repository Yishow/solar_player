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
5. Catalog是觀察證據，不是電錶清冊權威。保存connectionRef、captureId、candidateId、exactTopic、schemaVersion、declaredTag、sampleRef、receivedAt、observedAt、retained/dup/qos、origin、coverage。來源tag是外部識別；E1 meterRef、metricScope/metricKey是內部目的，不能混用。
6. Interleaved tags不能只留每topic最後一包；按受限候選id保留多樣本，array先找structural candidate但不把index認定成物理身分。正式selector由M2確認。
7. Candidate metadata/approved recipes可持久化；raw bodies受TTL限制，預設只留capture生命週期；過期顯示需要重新取樣，lastSeen不改成現在。

## Proposed API Contracts

新增管理API（設計名稱，實作前依repo conventions確認route掛載）：
- GET /api/settings/mqtt/reception-profiles：目前帳號可選的命名觀察範圍，不回密碼。
- POST /api/settings/mqtt/captures：connectionRef、siteScope、receptionProfileId、requestedDuration；回captureId/expiresAt/filter status。
- GET /api/settings/mqtt/captures/:id/candidates：分頁/搜尋/state/schema refs與coverage。可用SSE或既有authenticated socket adapter，二者都需scope auth。
- GET /api/settings/mqtt/captures/:id/samples/:sampleId：有界、redacted、versioned。
- DELETE /api/settings/mqtt/captures/:id：冪等停止；不可解除production subscriptions。
- POST /api/settings/mqtt/sample-evidence：paste/import支援的scalar/JSON範例，origin固定offline，不允許payload指定host。

錯誤包含UNAUTHORIZED_SCOPE、SCOPE_NOT_CONFIGURED、SUBSCRIPTION_REFUSED、NO_OBSERVATION、CAPTURE_EXPIRED、EVIDENCE_CHANGED、PAYLOAD_UNSUPPORTED、CAPTURE_LIMIT_REACHED。不可把這些都縮成「連線失敗」。

## Limits and Safety

設計預設：session180秒，明確操作可延至600秒；payload256KiB，depth16，leaves2000，topics1000，candidates5000，samples10/候選，10MiB/session。另設instance全域memory/concurrent sessions/rate ceilings；以測試設備實測後調整預設，不能聲稱本值就是效能保證。超量drop/throttle計數與coverage incomplete呈現，主runtime不等待UI採樣。記錄token等需redaction；URL只放opaque id，不塞broker密碼或rawPayload。停止capture不清除broker retained messages。

## Migration and Rollout

Additive metadata schema、feature flag預設關閉；先在隔離broker驗證與runtime共存，再開命名範圍。既有mapping/managed subscriptions不改；現有rawPayload snapshot不是可任意無遮罩展示的client端資料。
回退只停capture與catalog讀取、清TTL samples；不刪來源、不改既有counter baseline。capture重新連線須重新檢查權限與scope版本。

## Acceptance and Open Evidence

按M1 specs測正常/拒絕/無流量/過期/飽和/跨廠越權/rollback。尚未取得觀音現場topic/payload/ACL與更新頻率；因此資料樣例只用合成。不能從程式碼review宣稱現場Broker可被掃描，需部署驗收。OpenSpec/Spectra原生validate尚未執行。
