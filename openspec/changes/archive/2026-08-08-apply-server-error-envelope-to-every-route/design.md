## Context

Fastify 的 `register` 會在呼叫當下建立一個封裝 context，並把「此刻的」error handler 記進去。root 之後才設定的 handler 不會回溯套用到已建立的 context。`app.ts` 目前的順序是先註冊約 30 個 route plugin，最後才 `setErrorHandler`——所以那個 handler 對任何 API route 都不生效。

以最小重現確認過這個行為：

```
register(plugin that throws) → setErrorHandler → inject
→ {"statusCode":500,"error":"Internal Server Error","message":"secret internal detail"}
```

`error` 欄位是 HTTP 狀態片語，`message` 才是例外訊息，兩者都不是 repo 的形狀，而且例外訊息完整外洩。

把 handler 移到前面之後，server 測試從 638 通過變成 638 通過、2 失敗。兩條失敗都是 `shell-decorations.test.ts`，都在斷言管理專用讀取 `/api/shell-decorations/live` 的 500 回應要含有損壞細節（`/corrupt/i`）。也就是說，那個「對管理端可診斷」的行為從來沒有被實作過，它只是外殼失效的副作用。

## Goals / Non-Goals

**Goals:**

- 讓 `docs/ops/conventions.md` 描述的錯誤外殼對每一個 route 真正生效。
- 內部例外訊息不再出現在 500 回應中。
- 把「管理專用讀取對損壞內容可診斷」從副作用變成實作。
- 讓檔案過大的拒絕說出該路由實際生效的上限，並使用統一形狀。

**Non-Goals:**

- 不改成功路徑、狀態碼或既有回應欄位。
- 不改 `setNotFoundHandler`。
- 不放寬管理存取邊界。
- 不調整大小上限數值，不新增內容驗證。

## Decisions

### handler 的註冊順序是契約的一部分，必須寫下來

把 `setErrorHandler` 移到第一個 `register` 之前就修好了現況，但下一個人在它上面插入一個 `register` 就會再壞一次，而且不會有任何測試失敗提醒他——除非有測試。因此除了移動位置，還要：在該呼叫處寫明「必須在所有 register 之前」與原因，並加一條回歸測試斷言「route 內拋出的例外不會外洩訊息」。順序約束由測試守住，不是由註解守住。

### `setNotFoundHandler` 不動

404 的解析路徑不同：未命中任何 route 的請求由 root context 的 handler 處理，目前正常運作。而且它呼叫 `reply.sendFile`，那是 static plugin 註冊時才加上的裝飾——把它往前移會讓 SPA fallback 在設定時就指向一個還不存在的裝飾。沒有壞的東西不動。

### 管理端可診斷改由路由自己表達

`/api/shell-decorations/live` 與 `/api/shell-decorations/draft` 是管理專用讀取，兩者都已經先過 `isTrustedManagementReadRequest`。它們讀取儲存內容時可能因為內容損壞而丟出帶有診斷訊息的錯誤。既然「讓管理端看得到損壞細節」是被測試明確記載的意圖，就由路由自己捕捉並回 500 帶上細節，而不是仰賴全域外殼失效。

這不放寬邊界：細節只出現在已經要求可信管理來源的路由上，公開的 `/api/shell-decorations` 仍然只拿到外殼。

### 檔案過大維持 413，但換成 repo 的形狀與推導出的訊息

413 是「Payload Too Large」的正確語意，改成 400 是退步。目前實際回的就是 413，所以維持 413 對呼叫端不是行為變更，變的只有 body。

`@fastify/multipart` 在 `toBuffer()` 時以 `FST_REQ_FILE_TOO_LARGE` 丟出錯誤。由路由捕捉它並回自己的訊息，是唯一能讓訊息說出「這條路由的上限是多少」的位置——全域 handler 不知道是哪條路由的上限。偵測邏輯放進 `imagesSupport.ts`（既有的上傳支援模組），兩條路由共用；訊息各自產生，因為 10 MB 與 2 MB 是刻意的差異，語言也不同。

### 執行不到的大小分支刪除

`limits.fileSize` 已經是實際的執行點，`buffer.length > 上限` 永遠不會為真。上一個 change 已經把它記錄為已知缺陷；既然現在有了可達的處理路徑，就刪掉那兩個分支，不留假的防線。

## Implementation Contract

**Behavior**

- 任何 route 內未捕捉的例外，回應為 `{ success: false, error, timestamp }`；狀態碼 ≥ 500 時 `error` 一律是 `Internal Server Error`，例外訊息不出現在回應的任何欄位。
- 狀態碼在 400–499 之間時，`error` 是該錯誤自己的訊息（既有行為）。
- 公開的 `GET /api/shell-decorations` 在儲存內容損壞時回 500 外殼，回應不含損壞細節。
- 管理專用的 `GET /api/shell-decorations/live` 與 `GET /api/shell-decorations/draft` 在儲存內容損壞時回 500，回應含損壞細節；未通過管理存取判定者仍先被拒絕。
- 上傳超過該路由大小上限時回 413，body 為 `{ success: false, error, timestamp }`，`error` 說出該路由實際生效的上限。

**Interface / data shape**

- `apps/server/src/app.ts` 的 `setErrorHandler` 位置移到第一個 `register` 之前；handler 主體不變。
- `apps/server/src/routes/imagesSupport.ts` 匯出一個判斷「這個錯誤是不是檔案過大」的函式，以 multipart 的錯誤碼判定。
- `images.ts` 與 `brand.ts` 各自持有由自身上限推導的過大訊息，並在讀取檔案內容時捕捉該錯誤。
- 沒有任何成功回應的形狀改變。

**Failure modes**

- 若 multipart 未來改變錯誤碼，判斷函式會失效，檔案過大會回落成 500 外殼而不是 413。以一條測試釘住 413 與訊息，讓這種漂移會被測出來而不是靜默發生。
- 非「檔案過大」的錯誤仍照常往上拋，由全域外殼處理。

**Acceptance criteria**

- 新增 `apps/server/src/app.test.ts`，斷言一個在 route plugin 內拋出的例外得到 `{ success: false, error: "Internal Server Error", timestamp }`，且回應 body 不含該例外的訊息。
- `apps/server/src/routes/shell-decorations.test.ts` 的兩條既有測試在斷言未修改的情況下通過。
- `apps/server/src/routes/images.test.ts` 與 `brand.test.ts` 各有一條測試斷言超過上限的上傳得到 413、body 為 repo 錯誤形狀、且訊息含該路由的上限數字。
- `pnpm --filter @solar-display/server test` 全綠。
- `pnpm verify` 全綠。

**Scope boundaries**

- 在範圍內：`app.ts` 的 handler 位置與其回歸測試、`shell-decorations.ts` 的兩個管理讀取、`images.ts`／`brand.ts`／`imagesSupport.ts` 的檔案過大處理、`docs/ops/conventions.md`。
- 不在範圍內：`setNotFoundHandler`、任何成功路徑、管理存取判定、大小上限數值、內容驗證、前端任何檔案。

## Risks / Trade-offs

- 這個改動會讓所有 route 的 500 回應內容改變。對外是修正（不再外洩例外），但任何依賴例外訊息做除錯的既有流程會改看 server log 而不是 HTTP 回應。這正是「不暴露內部例外」的意思，是刻意的取捨。
- 只有兩條測試因此失敗，代表其餘 route 的錯誤路徑幾乎沒有斷言在例外訊息上。低失敗數是好消息，但也代表這次改動的實際涵蓋面比測試看到的大；`pnpm verify` 全綠是必要條件而非充分條件。
- 管理專用讀取回報損壞細節，等於承認「可信管理來源看得到內部字串」。這在已經需要管理信任的路由上是可接受的，而且它本來就是被測試記載的意圖；但它是一個必須明說的例外，不能默默擴散到其他路由。
