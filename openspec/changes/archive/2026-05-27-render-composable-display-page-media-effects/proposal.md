## Why

就算 shared schema 先重構完成，如果 runtime 與 editor preview 仍各自只會畫 left/right/bottom 的固定 class names，新的 effect model 也只是資料長漂亮而已。這包的重點是讓 composable zones 與 effect stacking 真的被渲染出來，而且 editor preview 與 playback runtime 語意一致。

## What Changes

- 重構 media presentation builder 與 shared chrome CSS，使其能渲染 composable effect layers。
- 支援 zone-bounded overlays 與 same-zone effect stacking。
- 保持 effect overlays 只作用於 owning media layer，不覆蓋 shell 或其他內容。
- 讓 editor preview 與 playback runtime 走同一套 rendering semantics。

## Capabilities

### New Capabilities

- `display-page-media-effect-rendering`: 定義 composable media effects 的 runtime/editor rendering semantics、stacking order 與 bounded overlay contract。

### Modified Capabilities

(none)

## Impact

- Affected specs: `display-page-media-effect-rendering`
- Affected code:
  - Modified:
    - `apps/web/src/pages/displayPageMediaStyle.ts`
    - `apps/web/src/pages/shared/displaySurfaceChrome.css`
    - `apps/web/src/pages/shared/liveDisplayPagePreview.tsx`
    - `apps/web/src/pages/Overview/index.tsx`
    - `apps/web/src/pages/Images/index.tsx`
    - `apps/web/src/pages/displayPageMediaStyle.test.tsx`
    - `apps/web/src/pages/shared/displaySurfaceChrome.test.ts`
    - `apps/web/src/pages/shared/liveDisplayPagePreview.test.ts`
  - New:
    - `openspec/changes/render-composable-display-page-media-effects/specs/display-page-media-effect-rendering/spec.md`
  - Removed:
    - (none)
