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
5. `pnpm --filter @solar-display/web test -- src/services/api.test.ts src/pages/DeviceStatus/viewModel.test.ts src/pages/OfflineError/viewModel.test.ts src/pages/SlideshowPreview/viewModel.test.ts src/layouts/offlineRouting.test.ts src/hooks/playbackRouteNavigation.test.ts src/hooks/playbackRouteSync.test.ts`
   - 結果：pass
6. `pnpm --filter @solar-display/web build`
   - 結果：pass（在補 `requestJson` 空 body 修正後重跑）

## FHD readability review

- Review environment
  - 以 `pnpm dev` 啟動前端；當下 Vite 佔用到 `http://localhost:5177/`。
  - `3333` 已被本機既有 server 佔用，因此本輪 browser walkthrough 實際連到既有 backend / proxy。
  - 使用 `npx playwright-cli` 將 viewport 固定為 `1920x1080`，並逐頁保存 screenshot 到本地 `artifacts/monitoring-batch-fhd/`。
- `/offline`
  - 雙欄告警版面、倒數區、最後更新與 guidance rows 在 FHD 下可同時看見，不會擠壓 action buttons。
  - 本地 dev socket 持續對 `ws://localhost:5177/socket.io` 發出 warning，因此 screenshot 主要驗證 fallback copy 與版面可讀性；reconnect / returnTo contract 仍以 automated tests 為主。
- `/slideshow-preview`
  - 本地資料集沒有 enabled pages，因此畫面呈現 empty-state；status rail、queue 區與播放設定摘要在 FHD 下仍清楚可讀，controls 沒被擠出首屏。
- `/trends`
  - range tabs、5 張 metric cards 與 refresh copy 可以在單一 FHD 視窗內辨識；缺資料時的 fallback 文案仍可讀。
- `/history`
  - 側邊 range nav、dense table header、peak summary 與資料來源區塊在 FHD 下維持分區，沒有把關鍵欄位擠出視窗。
  - 在本地資料稀疏時，empty-row copy 仍能留在表格結構內可讀呈現。
- `/device-status`
  - system info、resource monitor、maintenance actions 與 feedback panel 在 FHD 下同屏可讀。
  - browser smoke 先抓到 `clear-cache` 因 `requestJson` 對無 body POST 強塞 `Content-Type: application/json` 而回 `400 Bad Request`；修正後同一路徑重新驗證為 `200 OK`，feedback 顯示 `清除快取完成`。
  - `system update` 仍維持 visible unsupported feedback，顯示 `目前尚未實作 system update endpoint。`，沒有退化成 silent swallow。

## Browser walkthrough bundle

- Commands
  - `npx playwright-cli open http://localhost:5177/offline`
  - `npx playwright-cli resize 1920 1080`
  - `npx playwright-cli goto http://localhost:5177/slideshow-preview`
  - `npx playwright-cli goto http://localhost:5177/device-status`
  - `npx playwright-cli goto http://localhost:5177/history`
  - `npx playwright-cli goto http://localhost:5177/trends`
  - `npx playwright-cli requests`
- Local screenshots saved but intentionally not committed
  - `artifacts/monitoring-batch-fhd/offline-fhd.png`
  - `artifacts/monitoring-batch-fhd/slideshow-preview-fhd.png`
  - `artifacts/monitoring-batch-fhd/history-fhd.png`
  - `artifacts/monitoring-batch-fhd/trends-fhd.png`
  - `artifacts/monitoring-batch-fhd/device-status-loaded-fhd.png`
  - `artifacts/monitoring-batch-fhd/device-status-maintenance-feedback.png`
  - `artifacts/monitoring-batch-fhd/device-status-unsupported-feedback.png`

## Remaining gap

- Monitoring batch 的程式實作、FHD 可讀性 review 與本地 evidence bundle 已補齊。
- 後續若要完成 umbrella change 的總收尾，仍需處理 `9.1` ~ `9.3` 那層的全 14 頁 mapping review、完整 walkthrough 與 Spectra analyze/validate。
