## 1. Playlist-facing governance fields

- [x] 1.1 實作 `Let Image Management govern playlist-facing playback metadata`：在 `apps/web/src/services/api.ts` 與 `apps/web/src/pages/ImageManagement/` 接入 image playlist entry 讀取與更新，讓管理頁可編輯播放層 metadata。
- [x] 1.2 依 `Extend the existing Image Management page instead of creating a second playlist screen` 與 `Separate asset semantics from playlist semantics`，在現有編輯面板中區分 asset-level 與 playlist-level 欄位。

## 2. Usage and deletion safety

- [x] 2.1 實作 `Surface deletion blockers from playlist usage and live display references`：補上 playlist usage 與 live display references 的可見狀態，讓操作員能知道某張圖是否正在被播放面依賴。
- [x] 2.2 依 `Block destructive actions when live or playlist usage still exists`，在刪除或替換圖片前加入 blocker 或明確風險提示，避免移除仍被 playlist 或 live display 使用的資產。

## 3. Verification

- [x] 3.1 補齊 `apps/web/src/pages/ImageManagement/viewModel.test.ts` 與相關互動 tests，覆蓋 metadata 更新、delete guard、usage 提示與成功/失敗回饋。
- [x] 3.2 執行 `pnpm --filter @solar-display/web test -- src/pages/ImageManagement/viewModel.test.ts` 與 `pnpm --filter @solar-display/web build`。
