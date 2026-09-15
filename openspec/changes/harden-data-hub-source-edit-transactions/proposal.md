# 單筆來源編輯：草稿、衝突與安全儲存

## Why

現在 Sources 在父層保存整份 draftTopics，使用整份 PUT `/api/settings/mqtt/topics`；server transaction 刪除再重建 topic_mappings。已有 mergeScopedTopicEdits 保護畫面篩選之外的本地快照，但不能以此宣稱可防另一位管理者的較新變更。側欄若改成單筆 save，需要真正的單筆意圖、穩定引用、版本檢查與明確結果。

## What Changes

- 每筆來源有獨立 immutable baseline 與 editable draft；live observation 單獨合併。
- 建立可用於 URL 與 mutation 的穩定 sourceRef／configuration revision，不將重建後的 DB row id 視為永久 ID。
- 提案新增 versioned generic source mutation contract；與既有 M2 reviewed apply 分工，不繞過 E1 revision guard。
- 統一關閉／換頁／換 scope／重新整理／Back 的 dirty decision，避免重複 confirmation。
- 原子化做授權、ownership、impact 與 revision 檢查；未知影響阻擋破壞性操作。
- 保存成功、runtime reconciliation、讀值 freshness 分開；失敗保留草稿。

## Capabilities

### New Capabilities
- `data-hub-source-edit-transactions`：非託管 generic mapping 的穩定、版本化單筆編輯及相容遷移。

### Modified Capabilities
- `data-hub-task-workspace`：強化 U1-R5 的草稿與跨 scope 保護。

## Impact

Sources/SourcesModel/sourceWorkspace/draftGuard/workspaceContext、settings-mqtt、source-impact 與既有 mutation/authorization service。新 API/欄位都是提案，不是現況。需要 additive migration 或等價穩定引用策略；確切 migration 編號 apply 前依最新 repo 決定。

**Compatibility impact**：新 UI 不再對單筆意圖呼叫 blind full-list replace。舊全量寫入需加 collection-version 前置條件並經同一服務，或在交易 v2 啟用後明確拒絕舊無版本寫入並要求升級；不能維持旁路破壞保證。

## Non-goals

不新增跨站自動搬移電錶、不重置歷史／基線、不取代 M2 preview/apply、不提供強制覆寫其他人變更、不宣稱 network abort 等於 server rollback。

## 2026-09-15 跨發布端審查更新

本輪基準為 `fd405ebc2957232b6c622071622b9c7d830a3a42`。本 change 仍是未實作提案，不勾選產品驗收、不歸檔。與本輪新增的 `plan-power-mqtt-publishing-and-kn-onboarding` 共用 [MQTT-OWNERSHIP](../../../docs/plans/data-hub-reception-ux/MQTT-OWNERSHIP.md) 與 [PUBLISH-TAG-REGISTER](../../../docs/plans/data-hub-reception-ux/PUBLISH-TAG-REGISTER.md)。

單筆操作只修改 Player 來源配置；不退訂 Solar 託管 filters、不修改發布端。另守住同一實體通道的 legacy/v1 雙寫衝突與配置版本／讀值版本分離。
