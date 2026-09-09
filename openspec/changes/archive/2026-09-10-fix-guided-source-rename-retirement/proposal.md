## Why

Review 在 `5f68fa4c574e0176420440a9bfe409da1e727766` 重現：guided apply 將 enabled source 改到新 metricKey 與 topic 後，舊 source revision 已停用，舊 topic mapping 卻仍 enabled。實際 `MqttClientService` 在 post-commit activation 後仍保留新舊兩個 topic；舊封包因 `SOURCE_NOT_ACTIVE` 被拒絕，沒有證據顯示它污染了 accepted readings。

## What Changes

- Guided destination rename 在同一資料庫 transaction 中保存新來源、建立或更新新 mapping，並停用確實由該來源放棄的舊 destination mapping。
- 以 transaction 內讀取的 persisted previous source 與目前 ownership 判斷退役對象，不相信 client 自報的 old key，也不碰已由其他有效來源接手的 mapping。
- 沿用現有 post-commit 完整 enabled-topic 集合協調；舊 topic 沒有其他 owner 才移除，有其他 owner 或 managed owner 時保留。
- 維持 dependency guard、source revision、token/snapshot、ownership、atomic rollback 及相同 idempotency request 的無寫入 replay 行為。

## Capabilities

### New Capabilities

無。

### Modified Capabilities

- `guided-mqtt-tag-mapping`: 明定 destination rename 對舊 mapping 的原子退役及 shared-topic runtime 收斂行為。

## Impact

主要影響 `apps/server/src/services/guidedMqttMappingService.ts`、既有 source/mapping synchronization 責任與相鄰 service/route/runtime tests。若抽出共用的退役判定，direct caller 需保持相同 ownership 保護；不是另寫一套 MQTT runtime。

無新增 API 欄位、SQLite migration、套件、UI 或部署設定。不刪除 source lineage、accepted history、audit 或 apply receipts；不批次清理歷史孤兒 mapping；不把 broker failure 倒稱為 SQL save failure；不改變直接管理來源的 transport 改名功能範圍。證據見 `docs/reviews/2026-09-09-source-mutation-followup-review.md` 的 R2。本次只起草，不實作。
