## Why

`Slideshow Preview` 目前比較像視覺化輪播展示頁，能看目前頁、倒數、卡片順序，但還缺少 rotation debugging 所需的判讀資訊，例如 skip reason、fallback route、有效播放序列是怎麼決定的。對 operator 而言，這頁還不足以回答「為什麼現在播這張」。

## What Changes

- 讓 `Slideshow Preview` 直接揭露 rotation debugging 所需的有效序列、skip 狀態、fallback route 與目前播放決策來源。
- 讓這頁和 `Playback Settings` / display ops summary 對同一套 rotation state 使用一致語意。
- 補上 preview regression tests，確保播放順序與 debug 資訊不漂移。

## Non-Goals

- 不把這頁擴成新的播放設定編輯器。
- 不重寫輪播控制器核心算法。

## Capabilities

### New Capabilities

- `slideshow-preview-rotation-debugging`: 定義 Slideshow Preview 如何揭露有效播放序列、skip state 與 fallback route，作為 rotation debug surface。

### Modified Capabilities

(none)

## Impact

- Affected specs: `slideshow-preview-rotation-debugging`
- Affected code:
  - Modified: `apps/web/src/pages/SlideshowPreview/index.tsx`
  - Modified: `apps/web/src/pages/SlideshowPreview/viewModel.ts`
  - Modified: `apps/web/src/pages/SlideshowPreview/index.test.ts`
  - Modified: `apps/web/src/pages/SlideshowPreview/viewModel.test.ts`
  - Modified: `apps/web/src/hooks/usePageRotation.ts`
  - Modified: `apps/web/src/services/api.ts`
