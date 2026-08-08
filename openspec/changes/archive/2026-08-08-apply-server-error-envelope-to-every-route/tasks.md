## 1. 錯誤外殼真正涵蓋每一個 route

- [x] 1.1 依 requirement「Every route answers errors through one envelope」與設計決策「handler 的註冊順序是契約的一部分，必須寫下來」，把 `apps/server/src/app.ts` 的 `app.setErrorHandler` 移到第一個 `app.register(...)` 之前，handler 主體不變，並在呼叫處寫明「必須在所有 register 之前」與原因。以下一項的回歸測試驗證。
- [x] 1.2 依 requirement「Internal exception detail never reaches the caller on a server error」，新增 `apps/server/src/app.test.ts`：註冊一個會拋出帶有可辨識字串之例外的暫時性 route，斷言回應為 `{ success: false, error: "Internal Server Error", timestamp }` 且整個 body 不含該字串。先確認這條測試在 handler 位置還原時會失敗，再確認移動後通過。
- [x] 1.3 依設計決策「`setNotFoundHandler` 不動」，確認 SPA fallback 與 404 形狀未受影響：執行 `pnpm --filter @solar-display/server test src/appOpenapiDocs.test.ts` 與涵蓋 404 的既有測試，斷言未修改且通過。

## 2. 管理端可診斷改由路由自己表達

- [x] 2.1 依 requirement「A management-only read may disclose stored-content corruption」與設計決策「管理端可診斷改由路由自己表達」，讓 `apps/server/src/routes/shell-decorations.ts` 的 `GET /api/shell-decorations/live` 與 `GET /api/shell-decorations/draft` 在讀取儲存內容失敗時自行回 500 並帶上損壞細節，管理存取判定仍在最前面。以 `apps/server/src/routes/shell-decorations.test.ts` 的「masks corrupted live config on the public route but stays diagnosable for management」與「surfaces partially corrupted stored objects instead of truncating them」兩條既有測試在斷言未修改的情況下通過驗證。
- [x] 2.2 確認公開的 `GET /api/shell-decorations` 在同樣的損壞內容下仍只回外殼、不含損壞細節。以上述第一條測試中的 `assert.doesNotMatch(publicResponse.body, /corrupt/i)` 通過驗證。

## 3. 檔案過大由路由自己回報

- [x] 3.1 依 requirement「Upload rejection messages match the accepted extension list」與設計決策「檔案過大維持 413，但換成 repo 的形狀與推導出的訊息」，在 `apps/server/src/routes/imagesSupport.ts` 匯出一個以 multipart 錯誤碼判斷「這個錯誤是不是檔案過大」的函式。以下兩項的路由測試驗證。
- [x] 3.2 讓 `apps/server/src/routes/images.ts` 在讀取檔案內容時捕捉檔案過大錯誤並回 413 與由 `MAX_FILE_SIZE` 推導的訊息，同時刪除執行不到的 `buffer.length > MAX_FILE_SIZE` 分支與其寫死的 `File too large. Maximum size is 10MB.`。先在 `apps/server/src/routes/images.test.ts` 寫出「超過上限得到 413、body 為 `{ success: false, error, timestamp }`、訊息含 `10`」的失敗測試，再實作至通過。
- [x] 3.3 依設計決策「執行不到的大小分支刪除」，讓 `apps/server/src/routes/brand.ts` 做同樣的事，訊息由 `BRAND_MAX_FILE_SIZE` 推導，並刪除執行不到的大小分支。將 `apps/server/src/routes/brand.test.ts` 中目前只斷言 413 的那條測試擴充為同時斷言 body 形狀與訊息含 `2`。

## 4. 文件跟上現況

- [x] 4.1 更新 `docs/ops/conventions.md`：移除上一個 change 留下的「已知缺陷：兩個路由自己的大小檢查都執行不到」註記，改為記錄 `setErrorHandler` 必須在所有 route 註冊之前、500 一律不暴露內部例外，以及管理專用讀取可以回報儲存內容損壞細節這個明說的例外。以該檔描述與 `app.ts`、`shell-decorations.ts`、兩個上傳路由的實際內容一致驗證。

## 5. 驗證

- [x] 5.1 執行 `pnpm --filter @solar-display/server test`，確認全部測試通過，且 `shell-decorations.test.ts` 的既有斷言未被修改。
- [x] 5.2 執行 `pnpm verify`，確認 `build`、`bundle-budget`、`server`、`web`、`deploy`、`server-runner` 六個 stage 全數通過。
