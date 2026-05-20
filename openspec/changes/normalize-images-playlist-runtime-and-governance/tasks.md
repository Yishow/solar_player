## 1. Ownership cleanup

- [ ] 1.1 實作 `Treat Images as a playlist domain with ordered entries` 的 ownership audit，明確標記哪些欄位屬於播放語意、哪些屬於媒體庫 metadata。
- [ ] 1.2 移除管理頁對 legacy slideshow 欄位的鏡像更新依賴，落實 `playlist entry owns playback behavior` 與 `asset library owns file metadata only`。

## 2. Runtime and management alignment

- [ ] 2.1 對齊 `/api/image-playlist` 與 governance payload，實作 `Integrate Image Management with display page references`。
- [ ] 2.2 明確定義 `use-cover`、`skip`、`display-placeholder` 的 runtime behavior 與 operator-facing diagnostics，落實 `Make fallback behavior explicit for missing or pending Images slides` 與 `make fallback behavior explicit`。

## 3. Verification

- [ ] 3.1 更新 `Images` 與 `ImageManagement` tests，覆蓋 cover fallback、missing asset、single-entry save 與 multi-entry governance。
- [ ] 3.2 執行受影響 server/web tests 與 build。
