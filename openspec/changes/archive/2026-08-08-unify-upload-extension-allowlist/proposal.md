## Why

`docs/ops/conventions.md` 的〈安全與設定邊界〉明文寫著：images 上傳的拒絕訊息 `INVALID_FILE_TYPE_MESSAGE` 由 `ALLOWED_EXTENSIONS` 推導、不要另外寫死字串，而且「`brand.ts` 目前另有一份自己的 `ALLOWED_EXTENSIONS`……改其中一份時要確認另一份是否也該跟著改」。

`repair-freshness-upload-and-playback-runtime-defects` 只改了 images 那一半。`brand.ts` 至今仍是：一份獨立複製的副檔名集合、一句寫死的 `僅支援 .png、.jpg、.jpeg、.webp、.svg`、一句寫死的 `檔案需小於 2 MB`。三者目前恰好都正確，但這正是 images 那一側先前的狀態——它的訊息曾經只列四種 raster 格式而實際接受 `.svg`，而那個落差正是未驗證 SVG 路徑長期沒被注意到的原因之一。

同一個 bug 的另一半還在，只是還沒被踩到。

## What Changes

- 副檔名允許清單只留一份，`brand.ts` 改為引用 images 上傳支援模組匯出的那一份。
- brand 的副檔名拒絕訊息由該清單推導，不再寫死。
- brand 的大小拒絕訊息由它自己的大小上限推導，不再寫死 `2 MB`；同時記錄一個新發現：兩個上傳路由的大小檢查都不可達，`@fastify/multipart` 的 `limits.fileSize` 會先回 413。
- `docs/ops/conventions.md` 的〈安全與設定邊界〉更新為現況：清單已合併為一份，brand 保留的是自己的 MIME 檢查與 2 MB 上限。

## Non-Goals

- 不合併 MIME 檢查。brand 額外檢查 `Content-Type` 是它刻意比 images 嚴格的地方，維持不變。
- 不合併檔案大小上限。brand 是 2 MB、images 是 10 MB，這是刻意的差異。
- 不新增 byte-level 內容驗證，也不改 `/uploads/` 的安全 header；SVG 的防線仍然是 `X-Content-Type-Options` 與 `Content-Security-Policy: sandbox`。
- 不改任何上傳端點的成功路徑或回應形狀。

## Capabilities

### Modified Capabilities

- `image-upload-content-validation`: 拒絕訊息必須由實際生效的限制推導，且此要求涵蓋每一個上傳路由，不只 images

## Impact

- `apps/server/src/routes/brand.ts`
- `apps/server/src/routes/imagesSupport.ts`
- `apps/server/src/routes/brand.test.ts`
- `docs/ops/conventions.md`
