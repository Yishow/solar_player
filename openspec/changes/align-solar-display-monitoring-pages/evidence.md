# Monitoring Pages Evidence

## Scope status

- In progress change: `align-solar-display-monitoring-pages`
- This commit covers only the read-heavy half:
  - `/trends`
  - `/history`
- Pending next half:
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

## Verification

1. `pnpm --filter @solar-display/web test -- src/pages/EnergyTrend/viewModel.test.ts src/pages/EnergyHistory/viewModel.test.ts`
   - 結果：pass
2. `pnpm --filter @solar-display/web build`
   - 結果：pass

## Remaining gap

- `/offline`、`/slideshow-preview`、`/device-status` 尚未套用 prototype 對位。
- behavior-sensitive 驗證命令
  - `pnpm --filter @solar-display/web test -- src/layouts/offlineRouting.test.ts src/hooks/playbackRouteNavigation.test.ts src/hooks/playbackRouteSync.test.ts`
  仍留待下一批 runtime-sensitive pages 完成後一起執行。
