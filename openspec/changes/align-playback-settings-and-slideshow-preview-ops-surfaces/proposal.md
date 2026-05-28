## Why

`/settings/playback` 與 `/slideshow-preview` 都在處理 rotation、preview、skip 與 runtime diagnostics，但目前前者更像一張自訂 settings page，後者則像獨立 showcase/debug page。兩頁在 action bar、preview board、status rail、summary surface 上沒有形成同一個 operations family，導致操作者在「設定輪播」與「驗證實際輪播」之間切換時需要重新理解介面。

## What Changes

- 對齊 `/settings/playback` 與 `/slideshow-preview` 的 page title、preview board、status/action surfaces 與 summary language。
- 讓 `Playback Settings` 明確區分 configured rotation、effective playable sequence、skip reasons 與 page-instance governance。
- 讓 `Slideshow Preview` 以同一套 tokenized surface language 承接 configured vs effective rotation debugging，而不是只做獨立的 preview showcase。
- 保留 live preview 與 instance-aware preview contract，不把 QA/debug surface 退回 generic settings cards。

## Capabilities

### New Capabilities

- `playback-preview-ops-surface`: 定義 playback rotation 管理與 slideshow rotation 驗證共用的 operations surface 與 effective-rotation debugging contract。

### Modified Capabilities

(none)

## Impact

- Affected specs: playback-preview-ops-surface
- Affected code:
  - New:
    - apps/web/src/components/management/rotationOpsSummary.tsx
    - apps/web/src/components/management/rotationOpsSummary.test.tsx
  - Modified:
    - apps/web/src/pages/PlaybackSettings/index.tsx
    - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
    - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
    - apps/web/src/pages/PlaybackSettings/viewModel.ts
    - apps/web/src/pages/PlaybackSettings/playbackSettings.css
    - apps/web/src/pages/SlideshowPreview/index.tsx
    - apps/web/src/pages/SlideshowPreview/viewModel.ts
    - apps/web/src/pages/SlideshowPreview/preview.css
    - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - Removed:
    - (none)
