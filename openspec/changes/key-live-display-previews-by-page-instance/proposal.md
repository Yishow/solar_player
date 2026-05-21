## Why

目前 `Playback Settings` 與 `Slideshow Preview` 的 live preview catalog 以 canonical `displayPageKey` / `templateKey` 建索引，而不是以實際 page instance 建索引。只要 registry 裡同 template 有多個 live 實例、且它們的 live config 不同，管理端看到的 preview 就會錯把不同頁實例渲染成同一張畫面，讓播放設定與輪播診斷失去可信度。

## What Changes

- 讓 shared live preview catalog 以 page instance 為鍵載入 live config，而不是只以 template key 取單一 preview state。
- 讓 `Playback Settings` 與 `Slideshow Preview` 的 preview consumer 以 page instance 解析 preview state，確保 duplicate template instances 顯示各自的 live config。
- 保留 template-level renderer registry，但把 state lookup、cache key 與 fallback message 區分成 instance 與 renderer 兩個層次。
- 在 registry mutation 或 publish 後，讓 preview consumers 對新增/更新/歸檔的 page instance 收斂到正確 preview state。

## Capabilities

### New Capabilities

- `instance-aware-live-display-previews`: 定義 live display preview 以 page instance 載入與查找 preview state 的 contract，確保 duplicate template instances 各自顯示正確的 live config。

### Modified Capabilities

- `slideshow-preview-rotation-debugging`: 調整輪播診斷規格，讓 `Slideshow Preview` 顯示的是當前 rotation row 對應的 page instance preview，而不是 template-shared preview。

## Impact

- Affected specs: `instance-aware-live-display-previews`, `slideshow-preview-rotation-debugging`
- Affected code:
  - New: `apps/web/src/pages/shared/liveDisplayPagePreviewState.ts`, `apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts`
  - Modified: `apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts`, `apps/web/src/pages/shared/liveDisplayPagePreview.tsx`, `apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx`, `apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx`, `apps/web/src/pages/PlaybackSettings/index.tsx`, `apps/web/src/pages/SlideshowPreview/index.tsx`, `apps/web/src/pages/shared/liveDisplayPagePreview.test.ts`, `apps/web/src/pages/PlaybackSettings/index.test.ts`, `apps/web/src/pages/SlideshowPreview/index.test.ts`
  - Removed: none
