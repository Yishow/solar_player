## Why

樹莓派上 playback 換頁每次都慢，症狀是 route 已經切換但新頁內容要等 live config、story runtime、playlist 或 circuit runtime hydration 完成才完整出現。現有五個 playback pages 都在元件掛載後各自啟動資料讀取，且 shell route host 也會重讀 registry/config，造成每次換頁都把首屏渲染與 runtime refresh 綁在一起。

## What Changes

- 新增 playback runtime hydration performance 契約，要求 playback route 切換不可等所有非首屏資料完成才呈現頁面骨架。
- 收斂 display page registry/live config 的重複讀取，讓 route loader、route host、playback shell metadata、live page config hook 共用可驗證的初始資料與快取失效規則。
- 將五個 playback pages 的 runtime hydration 分級：live config 屬於首屏必要資料，story/runtime metrics、Images playlist、Factory Circuit circuit list 屬於可用 fallback 或背景 refresh 的資料。
- 簡化重複載入函式，包含 loadDisplayPageRoute、useDisplayPageRegistry、useDisplayPageConfig、useRuntimeRefreshLifecycle、useDisplayStoryRuntime、useImagePlaylistRuntime、FactoryCircuit 的 loadCircuitsRef 流程。
- 保留現有 FHD visual output、display sync refresh、runtime fallback banner、playback transition 行為，不引入整頁 keep-alive。

## Capabilities

### New Capabilities

- `playback-runtime-hydration-performance`: playback pages SHALL separate route-visible hydration from background runtime refresh while preserving live config correctness and fallback behavior.

### Modified Capabilities

(none)

## Impact

- Affected specs: playback-runtime-hydration-performance
- Affected code:
  - Modified: apps/web/src/app/router.tsx
  - Modified: apps/web/src/layouts/LayoutShell.tsx
  - Modified: apps/web/src/pages/shared/displayPageRouteHost.tsx
  - Modified: apps/web/src/hooks/useDisplayPageRegistry.ts
  - Modified: apps/web/src/hooks/useDisplayPageConfig.ts
  - Modified: apps/web/src/hooks/useRuntimeRefreshLifecycle.ts
  - Modified: apps/web/src/hooks/useDisplayStoryRuntime.ts
  - Modified: apps/web/src/hooks/useImagePlaylistRuntime.ts
  - Modified: apps/web/src/pages/Overview/index.tsx
  - Modified: apps/web/src/pages/Solar/index.tsx
  - Modified: apps/web/src/pages/FactoryCircuit/index.tsx
  - Modified: apps/web/src/pages/Images/index.tsx
  - Modified: apps/web/src/pages/Sustainability/index.tsx
  - Modified: apps/web/src/pages/shared/displayPageRouteHost.test.tsx
  - Modified: apps/web/src/hooks/useDisplayPageConfig.test.ts
  - Modified: apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - New: apps/web/src/hooks/useDisplayPageRegistry.test.ts
  - New: apps/web/src/hooks/useRuntimeRefreshLifecycle.test.ts
  - Removed: none
