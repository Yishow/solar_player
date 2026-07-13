## Summary

將 management 與 playback templates 從單一 production entry 拆成可辨識 route/template chunks，並在輪播切換前預載下一個 effective playback chunk。

## Motivation

目前 `apps/web/src/app/router.tsx` 靜態 import 所有 management routes，playback host 又透過 editor runtime definitions 靜態帶入五個 templates；production build 因而產生約 1.48 MB 的單一 JS entry。單純 lazy load 若沒有 playback-aware prefetch，會把首載成本轉成輪播時的空白 frame。

## Proposed Solution

- 使用 React Router lazy route modules 切開 management-only pages，保留既有 hidden-route gate 與 loaders。
- 建立 playback template loader registry，讓 route host 只載入當前 template，並解除 playback runtime 對 editor definitions 的靜態耦合。
- 當 rotation plan 或 current page 改變時預載下一個 effective page 的 template chunk與既有 config warmup；載入失敗交由既有 crash recovery/fallback，不渲染白畫面。
- 建立 build budget test：initial entry gzip 較基準下降至少 25%，輸出存在 route chunks，cold/warm rotation witness 無 blank frame。
- 保持 production react-grab alias、DOM/CSS/render ordering 與 FHD geometry 不變。

## Non-Goals

- 不改 server API、rotation semantics 或 display editor schema。
- 不在此 change 轉換圖片格式。
- 不以人工 manualChunks 清單掩蓋仍存在的靜態 imports。

## Capabilities

### New Capabilities

- `playback-route-bundle-loading`: 定義 management lazy loading、playback template chunks、next-page prefetch、failure fallback 與 bundle budget。

### Modified Capabilities

（無）

## Impact

- Affected specs: `playback-route-bundle-loading`
- Affected code:
  - Modified: `apps/web/src/app/router.tsx`, `apps/web/src/app/router.test.ts`, `apps/web/src/pages/shared/displayPageRouteHost.tsx`, `apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.tsx`, `apps/web/src/hooks/usePlaybackController.ts`, `apps/web/vite.config.ts`
  - New: `apps/web/src/pages/shared/displayPageTemplateLoaders.ts`, `apps/web/src/pages/shared/displayPageTemplateLoaders.test.ts`, `scripts/check-web-bundle-budget.mjs`
  - Removed: none
