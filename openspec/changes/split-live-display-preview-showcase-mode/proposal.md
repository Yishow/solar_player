## Why

`SlideshowPreview` 目前已經使用 live display page preview，而不是靜態截圖。這是正確架構，因為輪播卡片能反映正式 display page 的 runtime renderer。不過目前 `LiveDisplayPagePreview` 的呈現偏 editor/management context：包含唯讀預覽 badge、明顯外框、fallback 技術文案與管理味較重的包裝。這對後台編輯很有用，但放在 slideshow showcase 視覺中，會削弱 prototype 所需的展示牆質感。

這個 change 要把 live preview 拆成 editor mode 與 showcase mode。editor mode 保留診斷資訊；showcase mode 弱化管理 UI 包裝，讓輪播卡片看起來像 display miniature，而不是「後台裡的後台」。

## What Changes

- `LiveDisplayPagePreview` 新增 mode contract，例如 `editor` 與 `showcase`。
- `editor` mode 保留唯讀預覽 badge、fallback detail、可診斷狀態與明顯邊框。
- `showcase` mode 移除或弱化 badge、外框與技術型 fallback 文案，使用更貼近 display surface 的 miniature treatment。
- `SlideshowPreview` 的 carousel card 使用 showcase mode；DisplayPagesEditor / PlaybackSettings 等管理介面可繼續使用 editor mode。
- 保留目前 live renderer、preview scaling、template resolution、runtime state handling 與 fallback safety。

## Non-Goals

- 不改輪播引擎、播放順序、countdown、autoplay 或 rotation preview logic。
- 不改 display page runtime renderer 本身。
- 不改 display page config schema 或 backend contract。
- 不移除 editor diagnostics；只讓 showcase context 不被 diagnostics 視覺干擾。

## Capabilities

### New Capabilities

- `live-display-preview-showcase-mode`: 定義 live display page preview 在 editor 與 showcase contexts 中的 presentation split。

### Modified Capabilities

- (none)

## Impact

- Affected specs: `live-display-preview-showcase-mode`
- Affected code:
  - `apps/web/src/pages/shared/liveDisplayPagePreview.tsx`
  - `apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx`
  - `apps/web/src/pages/SlideshowPreview/preview.css`
  - `apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx` if it consumes live preview mode
  - related tests under `apps/web/src/pages/shared` and `apps/web/src/pages/SlideshowPreview`
- Validation:
  - `pnpm --filter @solar-display/web exec tsc --noEmit -p tsconfig.json`
  - targeted live preview tests
  - `spectra validate --strict --changes split-live-display-preview-showcase-mode`
  - review checklist: `docs/display-surface-visual-review-checklist.md`
