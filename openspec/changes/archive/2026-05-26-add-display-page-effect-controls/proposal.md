## Why

目前像 `Overview` 左側霧化、photo fade、overlay 這類視覺效果仍大量依賴 page-local CSS 與固定樣式，當 shared chrome 或 media rendering 調整時，很容易出現效果退化卻沒有正式資料契約可保護。若要讓 operator 能開關或微調這些效果，第一步必須把它們從硬寫 CSS 抽成可保存、可預覽、可驗證的 effect controls。

## What Changes

- 新增 display page effect controls，讓支援的 hero/media surfaces 可保存 bounded visual effect settings，而不是只能依賴寫死 CSS。
- 第一波 effect controls 先涵蓋與目前退化最相關的效果：edge fade、blur、overlay tint 或 opacity 等 hero/media surface effects。
- 讓 editor preview 與 playback runtime 使用同一個 effect resolver，避免編輯器看到一套、正式播放又是一套。
- 為 effect settings 新增範圍驗證與 fallback defaults，避免 effect config 失控導致畫面不可讀。

## Capabilities

### New Capabilities

- `display-page-effect-controls`: 提供 display hero/media surface 的 effect settings、預覽與播放契約。

### Modified Capabilities

- `display-page-media-placement-controls`: 將既有 media placement controls 擴充為可與 effect controls 並存的媒體調整契約。

## Impact

- Affected specs: display-page-effect-controls, display-page-media-placement-controls
- Affected code:
  - New: apps/web/src/pages/shared/displayPageEffectConfig.ts, apps/web/src/pages/shared/displayPageEffectConfig.test.ts, apps/web/src/pages/shared/displayPageEffectResolver.ts
  - Modified: apps/web/src/pages/Overview/displayPageConfig.ts, apps/web/src/pages/Solar/displayPageConfig.ts, apps/web/src/pages/Images/displayPageConfig.ts, apps/web/src/pages/shared/displaySurfaceChrome.css, apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx, packages/shared/src/displayEditorSchema.ts, packages/shared/src/index.ts
  - Removed: none
