## Why

除了設定頁與 editor，支援型 management pages 也有每次進頁重載資料的成本。Energy History、Device Status、Offline、Slideshow Preview 等頁面目前將首屏、診斷、preview catalog、socket reconnect 或多 API history payload 綁在同一個掛載流程，會讓樹莓派上管理頁切換顯得延遲。

## What Changes

- 新增 management support page loading 契約，要求支援/診斷/監控頁將首屏必要內容與背景資料刷新分段。
- EnergyTrend 保持單一 history runtime 但補上 initial payload 與 stale-while-refresh 規則，避免 range 切換或 route 重入時清空首屏。
- EnergyHistory 將 history snapshots、daily summaries、cumulative counters 的 3 API payload 分級，允許先呈現既有或部分資料，再補齊完整 chart/counters。
- DeviceStatus 將 getDeviceStatus、getDeviceLogExportMetadata、useDeviceDisplayOpsSummary 分段，避免任一診斷讀取拖住整頁首屏。
- OfflineError 避免重複啟動 MQTT status bootstrap 與 socket reconnect loop，保留 retry countdown 與 return route 行為。
- SlideshowPreview 收斂 usePageRotation 與 useLiveDisplayPagePreviewCatalog 的重型 preview catalog 載入，讓 rotation shell 先可用，preview cards 背景補齊。
- BrandAssets 保留 dirty blocker 與 sync guard，但允許用快取或 loader 初值呈現已知 active profile，再背景刷新 profile list。

## Capabilities

### New Capabilities

- `management-support-page-staged-loading`: support and diagnostics management pages SHALL keep route entry responsive by separating first-screen state from deferred diagnostics, history aggregates, preview catalogs, and reconnect loops.

### Modified Capabilities

(none)

## Impact

- Affected specs: management-support-page-staged-loading
- Affected code:
  - Modified: apps/web/src/pages/EnergyTrend/index.tsx
  - Modified: apps/web/src/pages/EnergyTrend/viewModel.ts
  - Modified: apps/web/src/pages/EnergyHistory/index.tsx
  - Modified: apps/web/src/pages/EnergyHistory/viewModel.ts
  - Modified: apps/web/src/pages/DeviceStatus/index.tsx
  - Modified: apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - Modified: apps/web/src/pages/OfflineError/index.tsx
  - Modified: apps/web/src/pages/OfflineError/viewModel.ts
  - Modified: apps/web/src/pages/SlideshowPreview/index.tsx
  - Modified: apps/web/src/pages/SlideshowPreview/viewModel.ts
  - Modified: apps/web/src/pages/BrandAssets/index.tsx
  - Modified: apps/web/src/hooks/useRuntimeRefreshLifecycle.ts
  - Modified: apps/web/src/hooks/useMqttStatus.ts
  - Modified: apps/web/src/pages/EnergyTrend/viewModel.test.ts
  - Modified: apps/web/src/pages/EnergyHistory/viewModel.test.ts
  - Modified: apps/web/src/pages/DeviceStatus/index.test.tsx
  - Modified: apps/web/src/recovery/crashRecovery.test.ts
  - Modified: apps/web/src/pages/SlideshowPreview/index.test.ts
  - New: apps/web/src/pages/BrandAssets/loadModel.test.ts
  - New: apps/web/src/hooks/useRuntimeRefreshLifecycle.test.ts
  - Removed: none
