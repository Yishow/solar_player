## Why

`Playback Settings` 與 `Slideshow Preview` 目前仍依賴靜態 JPG / asset map 來表現頁面縮圖，但正式 display pages 已經改為 live stage config、asset binding 與 runtime data composition。結果是 editor 已發布的畫面、營運預覽與正式播放畫面可能互相不一致。

## What Changes

- 把 `Playback Settings` 與 `Slideshow Preview` 的頁面縮圖改為 live display page preview，而不是固定示意圖。
- 讓 preview surface 讀取正式 `live` stage config 與對應的 page preview renderer，確保已發布的 layout / media / icon 變更能反映到管理頁預覽。
- 定義 preview fallback 行為：當 live config、asset 或 runtime source 無法解析時，預覽需明確顯示 placeholder / stale state，而不是靜默回退成舊靜態圖。
- 保留預覽 surface 與正式播放頁的邊界，不把管理頁變成新的 editor；這個 change 只讓預覽來源與正式頁一致。

## Capabilities

### New Capabilities

- `live-display-page-preview-surfaces`: 管理頁預覽 surface 以正式 live display page renderer 與 config 作為單一來源，並提供可辨識的 preview fallback 狀態。

### Modified Capabilities

(none)

## Impact

- Affected specs: `live-display-page-preview-surfaces`
- Affected code:
  - Modified:
    - apps/web/src/pages/PlaybackSettings/index.tsx
    - apps/web/src/pages/PlaybackSettings/viewModel.ts
    - apps/web/src/pages/SlideshowPreview/index.tsx
    - apps/web/src/pages/SlideshowPreview/viewModel.ts
    - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.tsx
    - apps/web/src/services/api.ts
  - New:
    - apps/web/src/components/LiveDisplayPagePreview.tsx
    - apps/web/src/hooks/useLiveDisplayPagePreview.ts
    - apps/web/src/pages/shared/renderDisplayPagePreview.tsx
  - Removed:
    - apps/web/src/assets/playback/slide-overview.jpg
    - apps/web/src/assets/playback/slide-solar.jpg
    - apps/web/src/assets/playback/slide-circuit.jpg
    - apps/web/src/assets/playback/slide-images.jpg
    - apps/web/src/assets/playback/slide-sustainability.jpg
