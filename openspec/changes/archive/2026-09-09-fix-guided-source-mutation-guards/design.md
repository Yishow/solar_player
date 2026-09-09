## Context

動機與重現見 `proposal.md` 及 review F1。固定基準為 `26c5598e590c05d993833b3b890149657ede13ab`。

`routes/meter-sources.ts` 在原子交易內對停用與 metricKey 變更呼叫 `readSourceImpact`，有相依或查詢未知時拒絕。`guidedMqttMappingService.ts` 的首次 apply 雖檢查 token、來源快照與 managed ownership，卻直接保存來源；其快照不包含頁面或衍生指標依賴。`persistAppliedSelector` 現已正確同步 enabled，故缺少阻擋會真的停用來源，而不是只改畫面狀態。

## Goals / Non-Goals

**Goals:** 使兩個來源寫入入口對相同既有來源變更得到相同阻擋結果；檢查與寫入同一交易，錯誤後零配置寫入且不觸發 runtime。

**Non-Goals:** 不重做相依圖、不修跨站引用辨識、不新增 profile consumer 類別、不建立解除引用流程；不讓 UI flag 代表相依已解決。未確認的相鄰問題不藉此擴張。

## Decisions

### 1. 共用既有 destructive-transition 決策，而非複製第二套 guard

從 `sourceImpactService.ts` 附近收斂最小 helper，由直接來源路由與 guided apply 共同使用。輸入是已從資料庫讀取的 previous source 與已驗證的 next source；trigger 沿用 `(previous.enabled && !next.enabled) || previous.metricKey !== next.metricKey`。查詢依據固定為 previous 的 scope/key。沒有 previous 就不執行 destructive impact check。

不選擇只在 UI disable 按鈕，因為 API 仍可被呼叫；也不把所有 `saveMeterSource` 的初始註冊與內部測試一律附加新相依查詢。可重用的範圍只有此次涉及的 guard，不整理整個來源服務。

### 2. 首次 apply 交易內重查；preview 不是安全鎖

沿用 `database.transaction(...).immediate()`，在既有 token、快照、ownership 與來源合法性檢查完成後，於任何 `saveMeterSource` / audit / selector / receipt 寫入前執行 guard。驗收以最終零寫入為準；若既有來源合法性在 save 內才檢查，仍保留其交易 rollback，不為調整錯誤優先序重寫整套驗證。

預覽後新增頁面引用不會改變 mapping/source snapshot，因此一定要於 apply 重查，不能只把 snapshot 相等當安全證明。拒絕會在 route 呼叫 `activateGuidedMapping` 前拋出。

### 3. 沿用現有錯誤契約與依賴檢視入口

已知使用中回 `E1_SOURCE_IN_USE`，查不明回 `E1_SOURCE_IMPACT_UNKNOWN`；兩者 apply HTTP 409，使用現有 failure envelope。`/api/data-hub/source-impact` 已能列 consumer，本案不擴 response shape。實作不得依 request 的 `confirmResolved` 跳過 guard。

`fix-guided-preview-rejection-status` 已限定 preview ownership-only 409，本案不把 source dependency code 加入 ownership code 集合，也不新增 blocking preview 行為。需要改善預覽說明可另行提出，不是補洞的前提。

### 4. 保持重送與安全操作的既有語意

已提交的相同 idempotency request 仍先走既有 receipt replay；它不是新 destructive mutation，不因後來新增 consumer 而再寫一次。既有 replay ownership recheck 保留。新建、重新啟用、改名稱與明確無使用者的停用維持可用；不繞過其他 revision/owner/token 保護。

## Risks / Trade-offs

[既有 impact resolver 的 scope 表達或 consumer 覆蓋可能不完整] → 本案確保兩入口一致且 unknown fail-closed；不把尚未重現的完整相依模型問題塞入本案。

[守衛位置導致零寫入保證只停留在推測] → 測試比對 sources、mappings、audit、receipts、page/profile configuration，並 spy runtime subscription；加入 preview 後新增引用案例。

[重構動到冪等或預覽錯誤分類] → 保留既有早期 receipt 路徑，回歸 malformed preview 422、owner preview/apply 409、過期 token 與重送；不擴安全豁免。

## Migration Plan

不需要 schema migration 或資料回填。Apply 階段先加入會失敗的回歸，補 guard，再重跑相依 service/route tests 與當下 `pnpm verify`。既存被錯誤停用的來源不自動重新啟用，需依其目前引用與使用者意圖處理。本次僅建立計畫；不部署、不 archive、不 commit。實作若需回復，只回復該次程式修補，不刪來源或頁面資料。
