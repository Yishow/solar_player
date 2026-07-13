## Problem

image upload 目前只檢查 filename extension 與 10 MB buffer size，並把 multipart 宣告的 MIME 直接寫入 DB；重新命名的文字／binary、截斷容器或超大 pixel dimensions 可能被保存並進入播放流程。

## Root Cause

`apps/server/src/routes/images.ts` 在寫檔與 DB insert 前沒有檢查 PNG/JPEG/WebP signature、container completeness、實際 dimensions，亦未比對 extension、declared MIME 與 detected type。

## Proposed Solution

- 在任何檔案或 DB 寫入前解析 PNG、JPEG、WebP 的 signature、必要結構、dimensions 與結尾／declared container bounds。
- extension、declared MIME、detected type 必須一致；DB mime_type 使用 detected type。
- 固定上限為單邊 8192 pixels、總像素 33,177,600，延續既有 10 MB compressed-size limit。
- validation failure 回傳 bounded 400 error，不包含 server path 或 buffer；既有 save failure cleanup 不退化。
- 以合法 fixtures、renamed text/binary、truncated files、MIME mismatch 與超大 dimensions 鎖住行為。

## Non-Goals

- 不轉碼、壓縮、修復或做病毒掃描。
- 不新增 SVG/GIF/AVIF 支援。
- 不建立完整 media processing pipeline 或 native image dependency。

## Success Criteria

- 合法 PNG/JPEG/WebP 在既有 10 MB 邊界內仍可上傳。
- renamed、truncated、MIME mismatch 與超過 dimension budget 的輸入在寫檔／DB 前被拒絕。
- error response 不洩漏 server path、檔案內容或 stack。
- image playlist、fallback 與 delete-reference guards 的既有 tests 維持通過。

## Capabilities

### New Capabilities

- `image-upload-content-validation`: 定義允許格式的 byte-level identification、container/dimension budgets、MIME consistency 與 failure cleanup。

### Modified Capabilities

（無）

## Impact

- Affected specs: `image-upload-content-validation`
- Affected code:
  - Modified: `apps/server/src/routes/images.ts`, `apps/server/src/routes/images.test.ts`, `README.md`
  - New: `apps/server/src/services/imageContentValidation.ts`, `apps/server/src/services/imageContentValidation.test.ts`
  - Removed: none
