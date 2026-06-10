## 1. Runtime refresh lifecycle supports stale visible payloads

- [x] 1.1 [P] 交付 Management support pages render primary state before deferred sources：useRuntimeRefreshLifecycle 支援 initial/stale visible payload，background refresh 不清空既有 payload；驗證 apps/web/src/hooks/useRuntimeRefreshLifecycle.test.ts 覆蓋 pending、success、failure、stale request。
- [x] 1.2 [P] 交付 Runtime refresh lifecycle supports stale visible payloads：EnergyTrend route 重入或 range refresh 時保留 visible payload/loading state，complete snapshots 的 chart output 不變；驗證 apps/web/src/pages/EnergyTrend/viewModel.test.ts 與 index-level staged loading test。

## 2. Energy history splits history, summary, and cumulative sources

- [x] 2.1 [P] 交付 Management support loaders preserve partial source state：EnergyHistory 將 snapshots、daily summaries、cumulative counters 分段載入或以 partial payload 表示，任何成功 source 不被其他 pending/failure source 清空；驗證 apps/web/src/pages/EnergyHistory/viewModel.test.ts 與 index-level partial source test。
- [x] 2.2 [P] 交付 Energy history splits history, summary, and cumulative sources：complete payload 下 chart lines、valid points、summaries、counters 與 pre-optimization output 等價；驗證 EnergyHistory viewModel equivalence tests。

## 3. Device status separates status, log export, and display ops diagnostics

- [x] 3.1 [P] 交付 Management support loaders preserve partial source state：DeviceStatus 將 getDeviceStatus、getDeviceLogExportMetadata、useDeviceDisplayOpsSummary 分段呈現，status 成功時不等 log/display ops 才顯示；驗證 apps/web/src/pages/DeviceStatus/index.test.tsx。
- [x] 3.2 [P] 交付 Device status separates status, log export, and display ops diagnostics：log export 與 display ops 的 error/accessDenied/loading 各自可見，device safe ops guidance 不被錯誤啟用；驗證 DeviceStatusContent 與 index tests。

## 4. Offline and slideshow avoid duplicate bootstrap work

- [x] 4.1 [P] 交付 Management support pages render primary state before deferred sources：OfflineError 保留 retry countdown、returnTo、socket reconnect，但避免重複 MQTT bootstrap/reconnect loop；驗證 apps/web/src/pages/OfflineError/index.test.tsx 或 recovery fake timer tests。
- [x] 4.2 [P] 交付 Management support pages render primary state before deferred sources：SlideshowPreview 先呈現 usePageRotation 的 rotation status/controls，live preview catalog pending 時使用 loading preview states；驗證 apps/web/src/pages/SlideshowPreview/index.test.ts。
- [x] 4.3 [P] 交付 Offline and slideshow avoid duplicate bootstrap work：SlideshowPreview 的 preview catalog failure 不清空 rotation controls，並呈現 config-unavailable/renderer-unavailable/loading states；驗證 liveManagementPreviewSurfaces 或 SlideshowPreview preview card tests。

## 5. Brand profiles use initial active profile before full list refresh

- [x] 5.1 [P] 交付 Management support loaders preserve partial source state：BrandAssets 使用 cached/initial active profile 作為 first visible state，full profile list 背景 refresh 完成後更新 selected/draft state；驗證 apps/web/src/pages/BrandAssets/loadModel.test.ts。
- [x] 5.2 [P] 交付 Brand profiles use initial active profile before full list refresh：dirty blocker、pending action、upload/crop/delete/save 不因背景 profile refresh 覆蓋 local dirty edits；驗證 apps/web/src/pages/BrandAssets/index.test.tsx 或新增 focused tests。

## 6. Management support behavior and errors remain invariant

- [x] 6.1 交付 Management support optimization preserves behavior and errors：history chart/counters、device safe ops/access denied、offline reconnect、slideshow controls、brand dirty/save/upload/delete 功能不缺失不退化；驗證各頁既有 viewModel/component tests。
- [x] 6.2 交付 Management support behavior and errors remain invariant：deferred support source failure 保留 successful unrelated state，並透過既有 error/access denied/degraded UI 呈現；驗證 EnergyHistory、DeviceStatus、SlideshowPreview、BrandAssets failure tests。
- [x] 6.3 交付 Management support optimization preserves behavior and errors：執行 pnpm --filter @solar-display/web test，並手動檢查 /trends、/history、/device-status、/offline、/slideshow-preview、/brand 在延遲資料下首屏可見且錯誤不被隱藏；驗證結果記錄在 apply 回報。
