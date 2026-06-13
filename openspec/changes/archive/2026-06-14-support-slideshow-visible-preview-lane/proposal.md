## Why

Slideshow Preview 雖然已經把 rotation 與 preview catalog 分開，但目前還沒有把「只先載可見 card」寫成獨立 contract。這頁是 preview-heavy support surface，值得單獨拆出來，避免和其他 support change 混在一起。

## What Changes

- 定義 Slideshow Preview 的 visible-card-first preview lane。
- 保留 rotation control、queue card、debug state 在 deferred preview 下仍可用。
- 加入 no-regression 邊界：playback summary、current page、manual next / prev、error semantics 不退化。

## Non-Goals (optional)

- 不處理 shared preview foundation 以外的 support 頁。
- 不改 rotation controller。

## Capabilities

### New Capabilities

- support-slideshow-visible-preview-lane: 定義 Slideshow Preview 先載可見 cards 的 preview lane 與 deferred-card 行為。

### Modified Capabilities

(none)

## Impact

- Affected specs: support-slideshow-visible-preview-lane
- Affected code:
  - New: (none)
  - Modified: apps/web/src/pages/SlideshowPreview/index.tsx
  - Removed: (none)
