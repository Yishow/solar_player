## Why

目前 live preview catalog 雖然已經集中 loader，但仍傾向一次展開整份 preview state。Playback Settings 與 Slideshow Preview 其實只需要先顯示可見 card；若不把 requested-window contract 拆成獨立 change，後續會很難確認是 shared preview foundation 還是 page-local UI 造成效能差異。

## What Changes

- 定義 requested visible preview window 的 shared contract。
- 規範 deferred preview keys 的 loading、warm reuse、與 error isolation 行為。
- 加入 no-regression 邊界：preview loading 策略變更不得影響既有 card status、publish state、或 refresh semantics。

## Non-Goals (optional)

- 不處理 registry / config warm cache；那是另一個 change。
- 不處理 Slideshow Preview 的 rotation controller 或 Playback Settings 的 tick subtree。

## Capabilities

### New Capabilities

- shared-visible-preview-window-loading: 定義 preview consumer 以可見 page key 視窗優先載入 preview state 的 shared contract。

### Modified Capabilities

(none)

## Impact

- Affected specs: shared-visible-preview-window-loading
- Affected code:
  - New: (none)
  - Modified: apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts, apps/web/src/pages/shared/liveDisplayPagePreviewCatalogLoader.ts, apps/web/src/pages/PlaybackSettings/index.tsx, apps/web/src/pages/SlideshowPreview/index.tsx
  - Removed: (none)
