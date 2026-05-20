## Summary

把 `Images` 從「image asset 與 playlist entry 混合治理」收斂成正式的 playlist runtime domain，讓播放數值、fallback、封面、排序與管理頁責任一致。

## Motivation

目前 `Images` 播放頁實際讀的是 `/api/image-playlist`，但管理頁仍同時編輯 `image_assets` 的 legacy slideshow fields 與 `image_playlist_entries`。`ImageManagement` 在單一 entry 情況還會鏡像寫回 `includedInSlideshow` 與 `displayDuration`。這導致 `Images` 頁上的計數、停留秒數、解析度、fallback reason 雖然看起來已 runtime 化，但治理真相其實分散在兩個資料模型。

## Proposed Solution

- 定義 playlist entry 為 `Images` 播放的唯一真相來源。
- 將 image asset 收斂為媒體庫與檔案/尺寸 metadata，不再承擔播放排序、啟用與停留秒數。
- 讓 runtime 與 management 共用同一套 entry-level fallback 與 provenance 語意。
- 釐清 cover image 與 playlist active entry 的關係，避免 fallback 行為模糊。

## Non-Goals

- 不重做 `Images` 頁版型與 thumbnails 排版。
- 不引入新的相簿分類功能。
- 不處理 general security/auth，那在另一個 change。

## Impact

- Affected specs: `images-playlist-management`, `image-management-display-reference-integration`, `images-playback-fallback-behavior`
- Affected code:
  - Modified: `apps/server/src/services/imagePlaylistService.ts`
  - Modified: `apps/server/src/routes/image-playlist.ts`
  - Modified: `apps/web/src/pages/Images/index.tsx`
  - Modified: `apps/web/src/pages/Images/viewModel.ts`
  - Modified: `apps/web/src/pages/ImageManagement/index.tsx`
  - Modified: `apps/web/src/pages/ImageManagement/viewModel.ts`
  - Modified: `apps/web/src/services/api.ts`
  - Modified: `packages/shared/src/imagePlaylist.ts`
  - Modified: `apps/web/src/pages/Images/*.test.ts*`
  - Modified: `apps/web/src/pages/ImageManagement/*.test.ts*`
