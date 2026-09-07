## Why

使用者不應先離開系統查看client訂閱或publish內容，再複製Topic、猜取值路徑、逐筆建立tag。三階段MQTT欄位選取、穩定tag與批次電錶配對補上現有手工mapping流程的前置缺口。本提案基於 main 13535147ad47613cf80b2321d12cb131b30264ab 的接收/解析/來源設定程式碼，不假定已連接現場Broker，也不宣稱已有可用UI。

## What Changes

- 共用三階段panel、多選、已有來源短路、scope與origin保留。
- 定義typed message/record equality、tokenized paths與stable source fingerprint。
- 實作scalar/object/tag packet/tag array同production engine及lossless counter取值。
- 可點選欄位與tag rows、自動編譯selector、中文名稱/目標選擇器。
- 累積/區間/功率、energyFlowRole、單位倍率與timestampPolicy確認、baseline狀態；僅在offset-free source timestamp需要時選sourceTimestampTimeZone，阻擋CT/PT重複套用。
- 帶證據的建議、批次套用已確認格式、既有對應重用及不相容列修正。
- versioned唯讀preview共用engine，回傳由server保存的opaque previewToken，將canonical draft、選定列、版本與review evidence snapshot綁在一起，正反例與零publish/零live-history寫入。
- apply必須帶previewToken、相同canonical draft與idempotency key；server計算request hash，處理token/revision conflict、same-key changed payload及lost-response retry，並以atomic transaction與pending runtime subscription reconcile保存結果。
- 嵌入U6與E6 draft/atomic final apply、返回原欄位；standalone只建立source並綁相關profile baseline或明確unconfigured，不自動選分母或複製E1 accounting欄位。
- cross-site/reserved/physical duplicate檢查與逐列修正。
- schema/type/tag/身份異動診斷、source revision/epoch安全更換。
- 既有PUT保留selector-aware資料或明確拒絕，舊mapping不被覆寫/重複計量。
- isolated broker＋SQLite/API＋UI實測全部scenario與runtime rollout/rollback。
- 至少3位未受教學操作員完成batch/change/recovery/return profile，保存結果再跑pnpm verify及必要FHD。

## Non-Goals

不列舉Broker曾經所有訊息或所有client發布歷史，不擴張ACL，不預設全域#，不以client ID猜發布者，不新增未實作的工業協定connector，不把示例重播成正式電量，不自動判定總錶/分母，不重做頁面自由設計器。

## Capabilities

### New Capabilities

- `guided-mqtt-tag-mapping`：三階段MQTT欄位選取、穩定tag與批次電錶配對；規則、例外和驗收由本change specs定義。

### Modified Capabilities

- 無既有spec條文被刪除；既有接收、權限、source ownership與draft/live隔離仍適用。U2/U6在本bundle中更新相依與入口，不另建一套相同驗證。

## Dependencies and Delivery Boundary

- 前置：E1, E6, M1, U1。
- 草案先行；相依契約及對應驗證完成後才進入相依實作。文件analyze/validate不代表相依實作、MQTT runtime或現場驗收。
- 實作與驗證checkbox只在本change tasks維護。

## Success Criteria

每個scenario須在test-plan對應層實測；不只demo正常路徑。未跑MQTT/SQLite/API/瀏覽器或人工任務不能宣稱已修好。來源已存、訂閱已生效、收到新資料與可計算期間是不同狀態。preview後變更selector（importEnergy→activePower）、target、measurement semantics、selected item set、source/profile/candidate/sample revision或optional E6 mutation均須重新preview；token過期或首次apply的revision不符時409且零寫入，同key同canonical request重試即使token後續過期也回原結果。

## Impact

Existing files to modify（已核對整合點，實作前重查最新main）：
- `apps/server/src/mqtt/PayloadParser.ts`
- `apps/server/src/mqtt/MqttClientService.ts`
- `apps/server/src/routes/settings-mqtt.ts`
- `apps/web/src/pages/DataHub/SourceCards.tsx`
- `apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx`
- `packages/shared/src/index.ts`

Proposed new implementation files（尚未建立的產品檔案，不是此包已實作）：
- `packages/shared/src/mqttBindingSelector.ts`
- `apps/server/src/mqtt/MqttBindingExtractor.ts`
- `apps/server/src/services/mqttMappingBatchService.ts`
- `apps/server/src/routes/mqtt-mapping-batches.ts`
- `apps/web/src/pages/DataHub/onboarding/MqttSourcePicker.tsx`
- `apps/web/src/pages/DataHub/onboarding/MqttMappingBatchReview.tsx`
- `apps/server/src/mqtt/MqttBindingExtractor.test.ts`

Specification artifacts: `openspec/changes/add-guided-mqtt-tag-mapping/`。
