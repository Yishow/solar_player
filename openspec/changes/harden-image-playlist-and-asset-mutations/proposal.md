## Why

圖片 runtime 目前每次組 playlist 都會對每張檔案 `readFileSync` 並重新計算 SHA-256，而 playback runtime 約每數秒 refresh 一次；圖片多或檔案大時會把不必要的磁碟 I/O 與 CPU 成本放進 Pi 的熱路徑。另兩個 mutation 邊界也不夠安全：bulk duration 缺欄位/NaN 會被轉成 1 秒後更新全部 entries；刪圖片則先刪 playlist/DB row 再刪檔，檔案刪除失敗時會留下 catalog 已消失但 served storage仍殘留的孤兒檔。

## What Changes

- 圖片 content hash 在 upload/import/backfill 時計算並保存；runtime playlist read 重用 metadata，檔案未變時不得重新讀完整 file body 算 hash。
- legacy assets 在受控 migration/bootstrap 階段補 hash；檔案被替換或 metadata identity 改變時才重算。
- bulk duration API 僅接受明確提供的有限正整數；missing、NaN、0、負數或非數字回 400 且整批不變。
- 圖片刪除採 staged filesystem delete：先把檔案移出 served namespace，再做 DB transaction；DB 失敗則復原檔案，final unlink 失敗則留下不可被 `/uploads` 服務的 tombstone 並交由 cleanup。
- 增加 repeated runtime-read I/O witness、bulk validation 與 filesystem/DB failure injection tests。

## Non-Goals

- 不改圖片視覺版型、crop 或 slideshow shuffle。
- 不在本 change 新增圖片時間排程；由 `add-image-playlist-scheduling` 處理。
- 不導入外部 object storage。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `image-playlist-runtime-read-purity`: runtime playlist reads 必須重用持久化 hash metadata，避免未變檔案在 polling hot path 被完整重讀。
- `images-playlist-bulk-duration-authoring`: bulk duration invalid input 必須 fail without mutation。
- `image-management-display-reference-integration`: image delete 必須維持 served filesystem 與 catalog/playlist mutation 的一致性。

## Impact

- Affected specs: `image-playlist-runtime-read-purity`, `images-playlist-bulk-duration-authoring`, `image-management-display-reference-integration`
- Affected code: image playlist service/routes、image upload/delete support、DB migration/seed bootstrap、Image Management API handling 與 tests。
- Affected data: `image_assets` 需要持久化 content hash/identity metadata；既有 assets 做安全 backfill。
- Dependency: `add-image-playlist-scheduling` 應建立在本 change 收斂後的 playlist mutation 契約上。
