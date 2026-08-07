## 1. 聚合器

- [x] 1.1 依設計決策「以錯誤碼為鍵的定量聚合，不保留逐筆記錄」，在 `packages/shared/src/displayClientLiveness.ts` 匯出未配對存取摘要型別，欄位為依 Display Client Context 錯誤碼分類的計數對應表、`totalCount`、`firstSeenAt`、`lastSeenAt`、`lastDeniedRoute`，且型別中不含任何網路識別欄位。以 `pnpm --filter @solar-display/shared test` 確認型別匯出可用。
- [x] 1.2 依「Expose unpaired display access to management」，實作 `apps/server/src/services/unpairedDisplayAccessRegistry.ts`：提供記錄一次失敗（接受錯誤碼與路由路徑）與讀取摘要兩個操作；初始摘要為八個計數皆零、`totalCount` 為零、三個時間與路由欄位為 `null`。先在 `apps/server/src/services/unpairedDisplayAccessRegistry.test.ts` 寫出初始摘要與「記錄一次後對應計數與總數各加一且時間戳更新」的失敗測試，再實作至通過。
- [x] 1.3 依「Unknown error codes do not grow the key set」，讓聚合器在收到八個已知錯誤碼以外的值時，仍增加 `totalCount` 與時間戳但不新增計數鍵；並讓讀取回傳快照，呼叫端修改該快照不影響後續讀取。在同一測試檔補上這兩條失敗測試後實作至通過。

## 2. 記錄接線

- [x] 2.1 依「Fail closed when Device context is unavailable」與設計決策「記錄點放在 Device Context 前置處理的失敗分支」，讓 `apps/server/src/plugins/deviceContext.ts` 的 `requireDisplayClientContext` 在捕捉到 `DisplayClientContextServiceError` 時記錄一次，路由只取請求路徑不含 query string，且 401 回應的狀態碼、錯誤碼與 body 與變更前完全相同。在 `apps/server/src/plugins/deviceContext.test.ts` 寫出「失敗時記錄一次」與「401 回應內容不變」兩條失敗測試後實作至通過。
- [x] 2.2 依「Recording failure does not suppress the denial」，讓記錄動作拋出例外時 401 回應仍照常送出且不產生未捕捉例外。在同一測試檔以會拋例外的聚合器替身寫出失敗測試後實作至通過。
- [x] 2.3 於 `apps/server/src/app.ts` 建立聚合器實例並注入 `deviceContextPlugin` 與 device 路由，確認兩者共用同一個實例。以一條整合測試驗證：打一次未配對的 display runtime 路由後，`GET /api/device/status` 讀到的計數為一。

## 3. 管理端出口與呈現

- [x] 3.1 依「Expose unpaired display access to management」與設計決策「從既有的 device status 出口帶出，不新增路由」，讓 `apps/server/src/routes/device.ts` 的 `GET /api/device/status` 在 `data` 中與 `displayClients` 並列帶出未配對存取摘要，既有欄位不變更、不重新命名。以 `apps/server/src/routes/device.test.ts` 斷言「未配對存取後摘要計數增加且 `displayClients` 與其 summary 不變」驗證。
- [x] 3.2 依「Summary carries no network identifiers」與「Untrusted request receives no unpaired access summary」，斷言序列化後的摘要不含 IP、User-Agent 或 cookie 相關欄位，且未受信任請求被既有管理端存取邊界拒絕並且回應不含摘要。以 device 路由測試的兩條斷言驗證。
- [x] 3.3 依「Render unpaired display access on Device Status」，讓 `apps/web/src/pages/DeviceStatus/viewModel.ts` 由摘要產出總次數、最近發生時間與最近被拒路由三個顯示標籤。在 `apps/web/src/pages/DeviceStatus/viewModel.test.ts` 以 spec 對照表的三種摘要狀態為案例寫出失敗測試後實作至通過。
- [x] 3.4 依設計決策「零值明確呈現而非隱藏區塊」，讓 `apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx` 在 display client 區塊旁呈現該摘要，且總次數為零時明確顯示無未配對存取而非隱藏區塊。以該頁測試斷言零值與非零值兩種情形的渲染輸出驗證。

## 4. 驗證與交付

- [x] 4.1 執行 `pnpm verify` 並確認全數通過；若有失敗，修正後重跑至通過並保留實際輸出作為佐證。
- [x] 4.2 以未配對瀏覽器開啟 `/overview` 後讀取 `GET /api/device/status`，確認未配對存取摘要的計數與時間戳確實反映該次存取，且 `displayClients` 未受影響；保留實際回應作為交付佐證。
