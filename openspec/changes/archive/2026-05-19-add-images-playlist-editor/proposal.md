## Why

Images 展示頁目前只有基本的主舞台、縮圖與單張素材資訊，圖片管理頁也只做到素材 CRUD 與是否加入輪播，缺少真正的 playlist authoring、排序、字幕與播放策略。若不把圖片播放清單拉成一個獨立 change，Images 頁會持續卡在只能展示素材、無法編排內容的階段。

## What Changes

- 建立 Images playlist editor，讓維運人員可管理播放順序、單張停留秒數、啟用狀態與主要展示圖的切換邏輯。
- 為每張 slide 補上標題、區域、日期、標籤與說明欄位，使資訊面板能顯示真正的內容 metadata，而非只剩 placeholder。
- 補上圖片播放時的 fallback 行為，讓缺圖、尺寸不符或素材尚未同步時，Images 頁能有一致的替代顯示與播放策略。
- 讓 playlist 模型可被 DisplayPagesEditor 與 ImageManagement 共用，而不是在 runtime、settings 與 editor 各自保存不同概念。

## Capabilities

### New Capabilities

- `images-playlist-management`: 提供 Images 的播放清單排序、啟用與單張停留時間編輯能力。
- `images-slide-metadata-panels`: 提供 Images slide 的標題、區域、日期、標籤與說明 metadata 能力。
- `images-playback-fallback-behavior`: 提供 Images 對缺圖、素材未同步與尺寸不符的降級播放能力。

### Modified Capabilities

(none)

## Impact

- Affected specs: `images-playlist-management`, `images-slide-metadata-panels`, `images-playback-fallback-behavior`
- Affected code:
  - Modified: `apps/web/src/pages/Images/index.tsx`, `apps/web/src/pages/Images/viewModel.ts`, `apps/web/src/pages/Images/displayPageConfig.ts`, `apps/web/src/pages/ImageManagement/index.tsx`, `apps/web/src/services/api.ts`, `apps/server/src/routes/images.ts`, `packages/shared/src/types.ts`
  - New: `packages/shared/src/imagePlaylist.ts`, `apps/server/src/services/imagePlaylistService.ts`, `apps/server/src/routes/image-playlist.ts`
  - Removed: none
