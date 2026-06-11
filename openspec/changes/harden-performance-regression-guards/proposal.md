## Why

第二輪性能重構已修掉 immediate regressions，但目前防線仍偏 page-local 與 source-contract 分散，未來再移動 staged loading 或 preview window 相關程式時容易重複踩到 hooks order、重載抖動、listener churn 類問題。這個 change 把上一輪修復後的風險收斂成可重用、可驗證的防退化 guard。

## What Changes

- 將 playback runtime loading 的 hooks order 檢查收斂成跨五個 playback page 的共用測試合約。
- 補強 live preview catalog 的 request-window stability 行為驗證，確認同一組 visible page keys 的順序抖動不會被視為新的資料需求。
- 保留目前 production 行為；只在必要時抽出小型純函式或測試輔助以支撐可驗證合約。

## Non-Goals

- 不處理 Vite large chunk warning 或 route-level code splitting；那是獨立的性能 change。
- 不重寫 live preview catalog loader、display sync socket hook、playback route host 或 display page runtime 架構。
- 不新增 browser visual witness gate；本 change 聚焦單元/合約測試防退化。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `display-runtime-render-invariance`: 增加性能 refactor 不得破壞 staged loading hooks order 的防退化要求。
- `instance-aware-live-display-previews`: 增加 live preview requested-window stability 的防退化要求。

## Impact

- Affected specs: display-runtime-render-invariance, instance-aware-live-display-previews
- Affected code:
  - Modified: apps/web/src/pages/Solar/configRender.test.ts
  - Modified: apps/web/src/pages/Sustainability/configRender.test.ts
  - Modified: apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - Modified: apps/web/src/pages/shared/liveDisplayPagePreviewCatalogLoader.ts
  - New: apps/web/src/pages/displayRuntimeHookOrder.test.ts
  - Removed: none
