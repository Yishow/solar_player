# Design: Source edit transactions

## Context

原本 full-list PUT 以 `(metric_scope, metric_key)` 重組既有欄位，並保留部分 selector/scaling metadata，然後 DELETE＋INSERT。不能把 table id 直接作長期 deep link；也不能讓來自 A 的單筆 footer 暗中保存所有 draftTopics。本提案限定管理 CRUD 邊界，不改接受讀值的領域算法。

## Goals / Non-Goals

保證只變動使用者確認的來源、版本衝突零寫入、不遺失其他 scope 配置、unknown 不當安全；保留目前 managed/E1 ownership guard。不做資料歷史合併或強制解衝突。

## Technical Approach

### D1. Draft/observation/server baseline 三分

每個 session key = authorized principal context + connectionRef + siteScope + stable sourceRef。資料模型：baselineConfig/configRevision、draftInput（保留輸入字串）、validation、observation、saveAttempt。sourceRef 不因合法的 topic／metric identity 變更而改變；created local draft 用 client-only nonce，正式保存後用 server 回覆 stable reference reconcile。

observation arrival 只更新觀察，不更新 draft 或比較基準。明確 reload settings 才讀新的 server baseline；本地有修改先 guard。canonical server save response 成功後重建 baseline/draft，不把 normalization 當新 dirty。僅觀察欄位變動不觸發 dirty。

### D2. 操作意圖與 API（新增契約提案）

建議新增 `PATCH /api/data-hub/source-mappings/:sourceRef`、`DELETE /api/data-hub/source-mappings/:sourceRef`，需要新 generic source 時可用對應 POST；實作路徑可調整，但方法、版本與 scope 不能含糊。回應跟隨現行 route style，不硬套全站新 envelope。

```
PATCH body:
  expectedRevision: opaque configuration revision
  idempotencyKey: opaque key for this exact mutation
  patch: allowlisted configuration fields only
response:
  sourceRef, configuration, revision,
  persistence: committed,
  runtime: unchanged | pending | active | failed | unknown
```

讀取只給已授權 site 的所需 config 與 version；raw observation/secret 不在 patch。server validation 的三條支線：

1. 純名稱等 metadata：可做單筆 patch，不改 meter identity/history。
2. 非 reviewed 的 legacy generic transport/scaling：依既有 domain validation、impact 與版本原子檢查；欄位改變可能需要 runtime reconciliation。
3. Managed、derived-owned 或 E1-reviewed 語意／selector/identity：沿用既有 conflict/revision guard，導向 M2/source revision 流程，不允許 v2 變成繞路。

已引用來源的 scope/key 變更不作簡單 rename；保留 technical 檢視與明確說明，透過既有受控 revision/ownership 流程或阻擋。對未引用且可合法改 identity 的 generic source，必須經 impact＋uniqueness＋revision transaction，stable sourceRef 保持一致。跨 scope mutation 要有舊/新兩範圍授權，不能靠 management filter。

### D3. 穩定引用與相容性

建議新增 immutable public sourceRef 與 monotonic config revision。既有 rows 回填不改 `(scope,key)`、selector_json、offset、decimal_places、created_at、enabled、名字、單位、歷史與 profile reference。既有全量 PUT 要改成以識別 upsert／計畫差異，不能每次重建使 sourceRef 漂移。

舊 caller 需要 collection revision 前置條件；與 v2 共用 transaction layer。開啟 v2 安全保證後，沒有 version 的 legacy replace 必須回可識別升級衝突（如 409 LEGACY_WRITE_REQUIRES_REVISION），不能靜默放行。為避免破壞未知 caller，先盤點所有 caller，再以 feature flag 協調升級與回退；未完成就不啟用 v2 UI。回退 UI 不刪新增欄位、不重建 rows；也不默默回到 blind replace。

### D4. 原子檢查與冪等

同一 DB transaction 內重新核對 authorization、source ownership、expected revision、唯一性及 impact。查詢「無引用」只是一時證據；送出前／commit 邊界須檢查當時引用，不能採用幾秒前 UI 結果。impact failure 或 unknown 對 delete/reidentify 停下來，不把未取得 consumers 解作 empty。

同一 idempotency key＋相同 canonical request 回原結果，即使 first response 遺失；同 key＋不同 body 是 conflict。紀錄不可包含 raw payload/credential。config commit 與 runtime reconciliation 分離：資料庫成功而 subscribe 失敗要回可觀測 saved/pending/failed，不假裝整筆 rollback。retry activation 不重建 mapping，也不重播 capture。

### D5. Dirty guard 與儲存狀態機

```
pristine → editing → validating → saving → saved / saved-pending-runtime
                    ↘ invalid       ↘ conflict / rejected / outcome-unknown
```

關閉、選另一筆、換 scope、切 specialist page、refresh settings、browser Back 都由一個 coordinator 決策。僅切本來源分頁不提示。dirty 時選「繼續編輯」「捨棄修改」「儲存並離開」（僅支援時）；只出現一次 dialog，不讓 shared guard＋useBlocker 重複問。

保存期間不能重複提交；取消 UI request 不是撤回 server transaction。若 response 不明，保留 attempt key，先讀取／同-key retry 確認結果。onBeforeUnload 用 browser 能支持的通用警告，不承諾自訂文字。機密或 sample 不存 localStorage；本提案不承諾關掉瀏覽器後恢復未保存表單。

### D6. 刪除與錯誤

新增尚未保存的 local draft 可直接捨棄，不拿臨時 id 查 source-impact。既有來源刪除需 impact、明確確認名稱與 scope、server commit check；受管/有引用則顯示去哪解除或修正。不顯示未實作的 undo；若僅 staged deletion 必須顯示「尚未保存的刪除」。一般 validation error 指到欄位，403/404/409 不移到其他 source，也不回退假成功。

## Architecture Decisions

採 true single-intent mutation 而非「先 GET 最新全部，再覆蓋 PUT」；後者仍有讀寫競爭。新 contract 能與既有 M2 transaction service share primitives，但不得合併成新的 source-of-truth。先加 backend 保證再宣稱單筆 UI 保證。

## File Changes

Sources、SourcesModel、sourceWorkspace、draftGuard、workspaceContext；settings-mqtt 中 legacy full-list writer 與 stable serialization；新的 source-mapping service/routes/tests 和 additive migration；現有 source-impact checker與 E1 conflict guard復用。檔名/編號為 apply 時依最新 repo 分配。

## Risks / Trade-offs

新增 revision/read model 是實作成本，但缺少它就不能可信地宣稱多人安全單筆編輯。舊 caller 可能收到升級衝突，需盤點並納入 rollout，不接受 silent last-writer-wins。Authorization 限制應由既有 security layer 和 route 檢查共同證明，不在 UI 假造權限系統。

## Migration Plan

備份 synthetic database fixture → additive sourceRef/revision → migrate callers/legacy service → server conflict/idempotency tests → feature detect v2 → A footer 接入 → 全路徑 regression。每步都有回退：保留舊 read APIs，不刪欄位，不改歷史；未升級 server 時 frontend保持清楚的 legacy semantics。

## Validation

兩操作者改不同 site、改同來源、query-filter外來源、source deletion、rename impact、E1 guard、retained evidence zero replay、normalization後 dirty清除、timeout後同-key重試、permission中途撤回。比較 unrelated config 的 byte-equivalent editable fields、stable references與歷史行數。

## Open Questions

其他 legacy write callers 及 background jobs 的完整清單尚需 apply 前沿 callgraph 確認；未確認前 feature flag 不開。sourceRef 可用已存在的等價穩定身份時優先重用，不為規格名稱額外造一張重複表。

## Cross-change contract

路由、四軸狀態、單筆API與重試期限的共用細節見 [STATE-AND-API-CONTRACTS](../../../docs/plans/data-hub-reception-ux/STATE-AND-API-CONTRACTS.md)。A–E的責任／交付順序見 [ROLLOUT-AND-ACCEPTANCE](../../../docs/plans/data-hub-reception-ux/ROLLOUT-AND-ACCEPTANCE.md)。

## 2026-09-15 跨發布端審查更新

本輪基準為 `fd405ebc2957232b6c622071622b9c7d830a3a42`。本 change 仍是未實作提案，不勾選產品驗收、不歸檔。與本輪新增的 `plan-power-mqtt-publishing-and-kn-onboarding` 共用 [MQTT-OWNERSHIP](../../../docs/plans/data-hub-reception-ux/MQTT-OWNERSHIP.md) 與 [PUBLISH-TAG-REGISTER](../../../docs/plans/data-hub-reception-ux/PUBLISH-TAG-REGISTER.md)。

### 更新決策與邊界

單筆操作只修改 Player 來源配置；不退訂 Solar 託管 filters、不修改發布端。另守住同一實體通道的 legacy/v1 雙寫衝突與配置版本／讀值版本分離。

本輪具體實作責任與驗收由 DHT-R6 約束；不得把新增發布契約當作現行 API 已支援，也不將隔離 fixture 當現場測試。

## 2026-09-16 工程別修訂（取代舊 KN 逐錶前提）

單筆來源配置與報表更正版分開。工程purpose/effective window最多一個authority；E管receiver配置，G管報表交易與投影，更正不走generic PATCH。

觀音結果契約由 [`add-kn-engineering-mqtt-sources`](../add-kn-engineering-mqtt-sources/proposal.md) 的 KNE/EPR 要求負責；本文件舊段落中的 DDE/physical/raw 與 F v1 前置僅適用明確選擇的物理來源，不得套成工程別必要條件。A 的焦點、B 的路由、C 的連線責任、D 的預覽及 E 的配置安全依原規格保留。需要逐來源核對的是工程成果模式與涵蓋範圍，不是上游每顆錶。
