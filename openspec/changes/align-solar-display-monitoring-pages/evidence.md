# Monitoring Pages Evidence

## Scope status

- In progress change: `align-solar-display-monitoring-pages`
- This change now covers all five monitoring / maintenance routes:
  - `/trends`
  - `/history`
  - `/offline`
  - `/slideshow-preview`
  - `/device-status`

## Read-heavy alignment completed

- `/trends`
  - 將單一 mock chart 改為 prototype 導向的 5 張 trend cards。
  - range tabs 透過 `/api/metrics/history` 取資料，live KPI 透過 `useLiveMetrics()` 補最新值。
  - 新增 page-local `viewModel.ts` 與測試，集中 chart card、tabs、refresh copy mapping。
- `/history`
  - 將簡化表格改為 prototype 導向的 side range nav、metric cards、big chart、dense history table、bottom summary。
  - 整合 `/api/metrics/history`、`/api/metrics/daily-summary`、`/api/metrics/cumulative`。
  - 新增 page-local `viewModel.ts` 與測試，集中 metric cards、bottom summary、dense rows mapping。

## Runtime-sensitive alignment completed

- `/offline`
  - 改為 prototype 導向的雙欄告警版面，保留 retry countdown、returnTo 與 reconnect flow。
  - 新增 page-local `viewModel.ts` 與測試，集中 timestamp、reason、retry copy 與 guidance rows。
- `/slideshow-preview`
  - 改為 prototype 導向的 status rail、current slide highlight、queue cards 與 playback summary。
  - 保留 `usePageRotation()` 控制流程與 prev/next/play 互動。
  - 新增 page-local `viewModel.ts` 與測試，集中 queue、summary、progress mapping。
- `/device-status`
  - 改為 prototype 導向的 system info、resource monitor、maintenance actions 與 visible feedback panel。
  - 補上 maintenance action feedback，不再只是 silent swallow。
  - 新增 page-local `viewModel.ts` 與測試，集中 system/resource rows 與 feedback copy。

## Verification

1. `pnpm --filter @solar-display/web test -- src/pages/EnergyTrend/viewModel.test.ts src/pages/EnergyHistory/viewModel.test.ts`
   - 結果：pass
2. `pnpm --filter @solar-display/web build`
   - 結果：pass
3. `pnpm --filter @solar-display/web test -- src/pages/OfflineError/viewModel.test.ts src/pages/SlideshowPreview/viewModel.test.ts src/pages/DeviceStatus/viewModel.test.ts`
   - 結果：pass
4. `pnpm --filter @solar-display/web test -- src/layouts/offlineRouting.test.ts src/hooks/playbackRouteNavigation.test.ts src/hooks/playbackRouteSync.test.ts`
   - 結果：pass

## Remaining gap

- 尚未完成真正的人工 FHD 可讀性巡檢，因此 `tasks.md` 的 2.2 仍保留 pending。
- 尚未保存 browser screenshot / walkthrough artifact，後續需要補。
