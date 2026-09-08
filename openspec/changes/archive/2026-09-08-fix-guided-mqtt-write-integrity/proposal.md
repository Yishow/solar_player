## Why

最新 `main` 的 MQTT 導引仍能保存 Solar 受管名稱，而且重新啟用來源時可能留下停用的 topic mapping；前者破壞來源歸屬，後者讓「已保存」無法真正恢復收資料。這兩項已在隔離資料庫重現，應補上同一條寫入路徑的保護，而不是再做一套接入流程。

## What Changes

- 在 guided mapping 的 preview 與 apply 都檢查目的指標的既有歸屬；Solar、已註冊並保留身分的 derived metric（包含停用者）及 server-owned period metric 不得被一般 MQTT mapping 接管。Apply 必須重新檢查，不能只相信舊 preview token。
- 同一交易內保存來源、selector 與 mapping 的 enabled 狀態；新增、停用、重新啟用都以已驗證並保存的來源狀態為準，保留來源 revision、其他廠區與無關 mapping。
- 拒絕的操作不得留下 source、mapping、audit、receipt 或 runtime 啟用副作用；成功操作維持現有 saved／activated／observed 區別與可安全重試的行為。

## Capabilities

### New Capabilities

無。

### Modified Capabilities

- `guided-mqtt-tag-mapping`：補強每次 preview/apply 的受管身分衝突檢查，以及 source/mapping 啟用狀態一致的可驗收契約。

## Impact

預期影響 `apps/server/src/services/guidedMqttMappingService.ts`、`meterSourceCatalogService.ts`、相關 ownership helper、`routes/site-energy-profiles.ts` 與相鄰測試。既有 `routes/settings-mqtt.ts` 的衝突保護應被沿用或共用，不另抄一份逐漸分歧的黑名單。只有既有 UI 無法呈現錯誤或停用狀態時才做對應的最小修正。

不新增 endpoint、不更改 MQTT topic 結構、不增加資料表或套件；已被接受但本來就違反 ownership 的寫入，修復後將被明確拒絕。正式資料整批清理或重新映射不屬於本提案。

## Evidence and Review Boundary

基準：`8323c33c12464adf1b5f42670d82d4fe7ae03a7c^...98979b6f46b124a7b568167e42cc9a261024fa18`。本 change 對應 `docs/reviews/2026-09-08-energy-authoring-followup-review.md` 的 N1、N2。

N1 的 HTTP preview 接受 `cl:factoryGeneration.totalKw`，同一 token 的 service apply 保存 enabled mapping；既有 Solar ownership helper 已判定該身分受管。N2 在先停用再 guided apply 啟用後，資料庫為 `meter_sources.enabled=1`、`topic_mappings.enabled=0`。這些是測試資料的重現，不是正式 broker 或現場資料污染的證明。

## Non-Goals

不重做 discovery、selector parser、MQTT transport、E6 總錶／部門歸屬或頁面發布；不自動修復既有衝突資料，不修改正式 broker、`.env`、部署或歷史讀值。不因 code smell 順便整理其他來源服務。

## Delivery Boundary

本輪只產出規劃；所有實作工作由同目錄 `tasks.md` 的未勾選項目追蹤。後續 apply 必須先加入可失敗的回歸測試，再修復並通過 focused tests 與 `pnpm verify`；不得把重現缺陷的測試通過寫成缺陷已修好。
