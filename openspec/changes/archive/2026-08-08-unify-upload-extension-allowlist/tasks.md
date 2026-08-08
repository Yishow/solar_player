## 1. 副檔名清單只留一份

- [x] 1.1 依 requirement「Upload rejection messages match the accepted extension list」與設計決策「清單放在既有的上傳支援模組，不新開一個檔案」，刪除 `apps/server/src/routes/brand.ts` 自己宣告的 `ALLOWED_EXTENSIONS`，改為從 `imagesSupport.ts` import 同名匯出；`ALLOWED_MIME` 與 `MAX_FILE_SIZE` 留在 brand 不動。以 `grep -rc "ALLOWED_EXTENSIONS = new Set" apps/server/src/routes/` 在該目錄下的總數為 1，且 brand 實際接受與拒絕的檔案集合不變（既有 `brand.test.ts` 斷言未修改且通過）驗證。

## 2. 兩個拒絕訊息都由限制推導

- [x] 2.1 依設計決策「訊息由限制推導，而不是反過來」，在 `apps/server/src/routes/imagesSupport.ts` 匯出一個由副檔名集合產生拒絕訊息的函式，並讓既有的 `INVALID_FILE_TYPE_MESSAGE` 改由它產生，訊息內容不變。以 `apps/server/src/routes/images.test.ts` 既有斷言未修改且通過驗證。
- [x] 2.2 讓 `brand.ts` 的副檔名拒絕訊息由 `ALLOWED_EXTENSIONS` 推導，不再寫死 `僅支援 .png、.jpg、.jpeg、.webp、.svg`。先在 `apps/server/src/routes/brand.test.ts` 寫出「拒絕訊息列舉的副檔名集合等於 `ALLOWED_EXTENSIONS`」的失敗測試，再實作至通過。
- [x] 2.3 讓 `brand.ts` 的大小拒絕訊息由 brand 自己的大小上限推導而非寫死 `2 MB`，並在 `brand.test.ts` 記錄該訊息目前不可達：`@fastify/multipart` 的 `limits.fileSize` 會先以 413 拒絕，路由自身的大小檢查因此執行不到。以「超過上限的上傳得到 413」的斷言驗證這個實際行為，不宣稱訊息本身已被覆蓋。

## 3. 文件跟上現況

- [x] 3.1 依設計決策「conventions.md 必須跟著改」，更新 `docs/ops/conventions.md`〈安全與設定邊界〉中描述兩份 `ALLOWED_EXTENSIONS` 的段落，改為說明副檔名清單已合併為一份、brand 保留的是自己的 MIME 檢查與 2 MB 上限。以該檔不再出現「兩份尚未合併」的說法，且描述與 `brand.ts`、`imagesSupport.ts` 的實際內容一致驗證。

## 4. 驗證

- [x] 4.1 執行 `pnpm --filter @solar-display/server test src/routes/brand.test.ts src/routes/images.test.ts`，確認受影響測試全綠且既有斷言未修改。
- [x] 4.2 執行 `pnpm verify`，確認 `build`、`bundle-budget`、`server`、`web`、`deploy`、`server-runner` 六個 stage 全數通過。
