## Why

追查「上傳超過大小上限拿到 413 而不是路由訊息」時，發現症狀底下是一個更大的問題。

`apps/server/src/app.ts` 的 `app.setErrorHandler` 寫在所有 `app.register(...)` **之後**。Fastify 的 plugin 在 `register` 當下就建立它自己的封裝 context，並帶著那一刻存在的 error handler——也就是框架預設值。之後才在 root 設定的 handler 不會回溯套用。結果是：**每一個 API route 拋出的例外都繞過了 repo 的錯誤外殼**。

實測確認（最小重現）：先 `register` 一個會丟 `new Error("secret internal detail")` 的 plugin，再 `setErrorHandler`，回應是 `{"statusCode":500,"error":"Internal Server Error","message":"secret internal detail"}`——內部例外訊息原封不動送到呼叫端。

`docs/ops/conventions.md` 寫的是「`apps/server/src/app.ts` 統一處理未命中路由與未捕捉錯誤。常見錯誤形狀 `{ success: false, error, timestamp }`；500 回 `Internal Server Error`，不暴露內部例外。」這句話對所有 API route 都不成立，而且從未成立過。

原本的 413 症狀只是它的一個表現：`@fastify/multipart` 的 `limits.fileSize` 丟出的錯誤同樣走預設處理，於是呼叫端拿到 `{"statusCode":413,"code":"FST_REQ_FILE_TOO_LARGE","error":"Payload Too Large","message":"request file too large"}`——形狀不是 repo 的形狀，訊息是英文的函式庫字串，而且沒有說上限是多少。前端 `extractErrorMessage` 會優先取 `message`，所以使用者看到的就是「request file too large」。

修好 handler 之後還會暴露第二件事：`/api/shell-decorations/live` 這個管理專用讀取「壞掉的設定要對管理端可診斷」的行為，目前完全是靠 handler 沒生效才成立的。外殼一旦套用，那個意圖就會消失——它需要被真正實作出來，而不是繼續依賴漏洞。

## What Changes

- `setErrorHandler` 移到所有 `register` 之前，讓錯誤外殼真正涵蓋每一個 route。
- `/api/shell-decorations/live` 與 `/api/shell-decorations/draft` 明確實作「管理端可診斷」：偵測到儲存內容損壞時自行回 500 並帶上損壞細節，不再依賴外殼失效。
- 兩個上傳路由自行處理檔案過大：仍回 413（語意正確），但改用 repo 的錯誤形狀，訊息由該路由實際生效的上限推導。
- 移除兩個路由中執行不到的 `buffer.length > 上限` 分支。
- `docs/ops/conventions.md` 更新：移除上一個 change 留下的「已知缺陷」註記，改為記錄 handler 的註冊順序約束，以及管理專用讀取可以回報損壞細節這件事。

## Non-Goals

- 不改任何成功路徑、狀態碼或既有回應欄位（錯誤回應的形狀本來就應該是外殼那一份）。
- 不改 `setNotFoundHandler`。它在 root context 解析，目前運作正常，而且它用到的 `reply.sendFile` 依賴 static plugin 已註冊。
- 不放寬管理存取邊界。可診斷的損壞細節只出現在已經需要可信管理來源的路由上。
- 不調整任何檔案大小上限數值，也不新增內容驗證。

## Capabilities

### New Capabilities

- `server-error-response-envelope`: server 對呼叫端回報錯誤的統一外殼、它必須涵蓋的範圍，以及內部例外不得外洩的邊界

### Modified Capabilities

- `image-upload-content-validation`: 檔案過大的拒絕必須使用統一錯誤外殼，並說出該路由實際生效的上限

## Impact

- `apps/server/src/app.ts`
- `apps/server/src/app.test.ts`
- `apps/server/src/routes/shell-decorations.ts`
- `apps/server/src/routes/images.ts`
- `apps/server/src/routes/imagesSupport.ts`
- `apps/server/src/routes/brand.ts`
- `apps/server/src/routes/images.test.ts`
- `apps/server/src/routes/brand.test.ts`
- `docs/ops/conventions.md`
