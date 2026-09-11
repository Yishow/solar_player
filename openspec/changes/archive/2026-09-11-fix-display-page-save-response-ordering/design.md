## Context

useDisplayPageConfig 同時管理 stage/page 共用 cache 與 mounted owner 的 session。既有 read generation 可阻止舊 GET，commitServerEnvelope 卻先發布所有 save/conflict envelope，再檢查 owner。已重現 v6 儲存完成後，舊 owner 的 v5 回應把 cache 退版，直到 remount 才看到錯誤。

## Goals / Non-Goals

**Goals:**

- 權威 save/conflict envelope 在同一 stage/page 已確認的版本範圍內保持單調且冪等。
- 保留合法較新回應的 cache publication，以及各 owner 草稿與 loading 的 lifecycle 隔離。

**Non-Goals:**

- 不修改 Server API、版號產生、資料庫、cache reset 語意或其他資源的並行協定。
- 不調整 FHD 外觀、不新增全域狀態套件、不重構整個 hook。

## Decisions

### 權威回應版本准入

在 commitServerEnvelope 發布前，以同一 stage/page 的已確認 envelope 判斷候選版本。較低版本不 prime、不 invalidate 讀取 generation；相同版本重用已確認 envelope，不再建立 publication barrier；較高版本才發布。比較以伺服器既有 version 為準，禁止跨 page/stage 取最大值。拒絕「舊 owner 一律丟棄」方案，因為切頁後合法完成的儲存仍須可供 remount 使用。

### Cache 與 owner 狀態分開收斂

准入結果須供 save success 與 409 latestEnvelope 路徑一致使用，避免 cache 雖未退版，current owner baseline 卻使用被拒絕的候選。只有仍持有該 operation 的 owner 能結束自己的 loading 或處理訊息；舊 owner 不清除新 owner 狀態。current owner 面對較舊衝突時保留草稿，baseline 以該 key 已確認 envelope 收斂；相同版本允許完成自己的 operation，但不能重新發布 cache。沿用現有 lifecycle/read generation，避免另造並行協定。

## Implementation Contract

- In scope：apps/web/src/hooks/useDisplayPageConfig.ts 的 commitServerEnvelope 與相關 save/conflict 消費路徑，以及 apps/web/src/hooks/useDisplayPageConfig.test.ts 的 mounted regressions。
- Interface：沿用 stage/page cache key、DisplayPageConfigEnvelope.version 與既有 save baseVersion；不新增 HTTP 欄位。內部准入須能區分 rejected、unchanged、published，具體型別保持最小。
- Behavior：v4 的 R1 尚未回應，切頁返回後 R2 409 得 v5、retry 得 v6，最後 R1 回 v5；cache、remount、下一次 baseVersion 均維持 v6。舊 409 不覆蓋新版或本地草稿。
- Failure：一般失敗沿用既有錯誤訊息並保留草稿；被版本拒絕的權威回應不得推進 cache generation、清除新 owner loading 或重播舊成功狀態。較新回應在 owner unmount 後仍只更新 matching cache。
- Acceptance：測試透過 mounted hook、受控 deferred fetch 與實際 remount，覆蓋成功／409 亂序、同版本重複、舊 GET fencing、跨 stage/page、unmount 後較新回應。斷言使用內容、版本、baseVersion 與操作狀態，不只 mock helper 呼叫次數。
- Out of scope：server reset/restore 的新 epoch 協定、其他管理頁 cache、視覺與人工 acceptance。

## Risks / Trade-offs

- [同版本被誤當作新 publication] → 測試確認重複回應不使已在途的新 read 失效，同時 current owner 能正常結束自己的儲存。
- [只擋 cache 卻仍降版 baseline] → 用 remount 與後續 baseVersion 一起驗證兩條 save/conflict 路徑。
- [hook 已較長] → 僅將本次准入判斷保持為小而可命名的內部責任；不為行數進行無關拆檔。
