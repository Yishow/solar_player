## Why

使用者不應先離開系統查看client訂閱或publish內容，再複製Topic、猜取值路徑、逐筆建立tag。MQTT已接收資料清單與受控來源探索補上現有手工mapping流程的前置缺口。本提案基於 main 13535147ad47613cf80b2321d12cb131b30264ab 的接收/解析/來源設定程式碼，不假定已連接現場Broker，也不宣稱已有可用UI。

## What Changes

- 建立observation/reception/capture/candidate shared types及metadata schema。
- 命名範圍設定、授權查詢與未知namespace的inline分支。
- runtime parse前的非阻塞catalog tap與有限候選queue，不改accepted history。
- unique-ID只讀capture client、非shared訂閱、timeout/reconnect/stop清理。
- 逐filter訂閱回覆與coverage/無流量/部分失敗狀態。
- 保存retained/dup/qos/receivedAt/sourceTimestamp/timestampQuality/origin證據，從接收封包經extractor完整傳到E1；retained且沒有可信source timestamp的資料只能作設定／診斷證據，不得刷新accepted history或freshness，並正確標示未知publisher。
- 候選tag/欄位搜尋、sampleRefs與version/pagination，選取不隨stream跳動。
- 實作payload/session/global budgets、rate/drop counters、auth/redaction。
- 原地paste/import的有限JSON/scalar evidence與TTL過期提示。
- capture CRUD、樣本與列表/stream API的錯誤語意與server-side scope驗證。
- feature flag、managed來源合併展示、退出/rollback保持production。
- 隔離MQTT broker/SQLite/API實测正常、拒絕、無資料、retained、負載、越權及清理，再跑repo驗證。

## Non-Goals

不列舉Broker曾經所有訊息或所有client發布歷史，不擴張ACL，不預設全域#，不以client ID猜發布者，不新增未實作的工業協定connector，不把示例重播成正式電量，不自動判定總錶/分母，不重做頁面自由設計器。

## Capabilities

### New Capabilities

- `mqtt-observation-catalog`：MQTT已接收資料清單與受控來源探索；規則、例外和驗收由本change specs定義。

### Modified Capabilities

- 無既有spec條文被刪除；既有接收、權限、source ownership與draft/live隔離仍適用。U2/U6在本bundle中更新相依與入口，不另建一套相同驗證。

## Dependencies and Delivery Boundary

- 前置：無；可以先交付只讀探索。
- 草案先行；相依契約及對應驗證完成後才進入相依實作。文件analyze/validate不代表相依實作、MQTT runtime或現場驗收。
- 實作與驗證checkbox只在本change tasks維護。

## Success Criteria

每個scenario須在test-plan對應層實測；不只demo正常路徑。未跑MQTT/SQLite/API/瀏覽器或人工任務不能宣稱已修好。來源已存、訂閱已生效、收到新資料與可計算期間是不同狀態；catalog與offline evidence永不直接寫入accepted history。重啟後重送沒有source timestamp的retained讀值，不能改變既有accepted讀值、製造counter discontinuity或刷新live/freshness/baseline。

## Impact

Existing files to modify（已核對整合點，實作前重查最新main）：
- `apps/server/src/mqtt/MqttClientService.ts`
- `apps/server/src/routes/settings-mqtt.ts`
- `apps/web/src/pages/DataHub/Sources.tsx`
- `apps/web/src/pages/DataHub/SourcesModel.ts`
- `packages/shared/src/index.ts`

Proposed new implementation files（尚未建立的產品檔案，不是此包已實作）：
- `packages/shared/src/mqttObservation.ts`
- `apps/server/src/mqtt/MqttDiscoveryService.ts`
- `apps/server/src/services/mqttObservationCatalogService.ts`
- `apps/server/src/routes/mqtt-captures.ts`
- `apps/server/src/mqtt/MqttDiscoveryService.test.ts`

Specification artifacts: `openspec/changes/add-mqtt-observation-catalog/`。
