## 1. Route-visible hydration uses shared registry and live config cache

- [x] 1.1 [P] 交付 Playback route entry remains visible during runtime hydration：讓 loadDisplayPageRoute、DisplayPageRouteHost、LayoutShell 的 registry/live config 初始資料可共用，切到 /overview、/solar、/factory-circuit、/images、/sustainability 時不因 duplicate blocking fetch 才顯示目的頁；驗證 apps/web/src/pages/shared/displayPageRouteHost.test.tsx 新增 cache reuse/active snapshot 測試。
- [x] 1.2 [P] 交付 Playback runtime data loads without duplicate blocking reads：useDisplayPageRegistry 保留 pages/isLoading/errorMessage/reload 介面並加入 shared snapshot 或 pending request 行為，LayoutShell 與 route host 不各自 cold-start registry；驗證 apps/web/src/hooks/useDisplayPageRegistry.test.ts 覆蓋 shared pending request 與 display:sync invalidation。
- [x] 1.3 交付 Route-visible hydration uses shared registry and live config cache：useDisplayPageConfig 接受 route-primed live config/session 並避免 matching cache 下的 duplicate first-render request；驗證 apps/web/src/hooks/useDisplayPageConfig.test.ts 覆蓋 cached live envelope、cold fallback、display:sync reload。

## 2. Playback runtime hooks accept initial payloads and refresh in background

- [x] 2.1 [P] 交付 Playback runtime data loads without duplicate blocking reads：useRuntimeRefreshLifecycle 支援 optional initial payload，背景 refresh 期間保持 last-known payload 並設定 isRefreshing/errorMessage/usesFallback；驗證 apps/web/src/hooks/useRuntimeRefreshLifecycle.test.ts 覆蓋 success、failure、stale request ignore。
- [x] 2.2 [P] 交付 Playback runtime hooks accept initial payloads and refresh in background：useDisplayStoryRuntime 與 useImagePlaylistRuntime 保持既有呼叫相容並能傳入 initial payload，目的頁先顯示 last-known/seed fallback 再背景刷新；驗證 apps/web/src/hooks/useDisplayStoryRuntime.test.ts 與 apps/web/src/hooks/useImagePlaylistRuntime.test.ts。

## 3. Page-specific runtime data stays outside live config blocking path

- [x] 3.1 [P] 交付 Page-specific runtime data stays outside live config blocking path：Overview、Solar、Sustainability 使用 staged story runtime 後仍保留現有 view model、fallback banner、errorMessage 與 socket live metrics 行為；驗證既有 configRender/viewModel 測試加上 staged runtime fallback case。
- [x] 3.2 [P] 交付 Page-specific runtime data stays outside live config blocking path：Images 使用 staged playlist runtime 後仍保留 autoplay duration、shuffle、thumbnail、fallback banner 與 click next/prev 行為；驗證 apps/web/src/hooks/useImagesAutoplay.test.ts 與 apps/web/src/pages/Images/configRender.test.ts。
- [x] 3.3 [P] 交付 Page-specific runtime data stays outside live config blocking path：FactoryCircuit 的 circuit runtime loader 與 story dependencyKey 不阻塞 live config 首屏，且 error loadState 仍可見；驗證 apps/web/src/pages/FactoryCircuit/index.test.tsx 或新增 focused test 覆蓋 loading/error/refresh。

## 4. Existing playback behavior and errors remain invariant

- [x] 4.1 交付 Playback optimization preserves functionality and errors：display:sync、playback:settingsUpdated、MQTT-triggered reload、transition hold/in phase、footer route metadata 均維持既有行為；驗證 apps/web/src/hooks/displayTransition.test.ts、apps/web/src/hooks/playbackRuntimeRefresh.test.ts、apps/web/src/app/playbackRouteMeta.test.ts。
- [x] 4.2 交付 Existing playback behavior and errors remain invariant：執行 pnpm --filter @solar-display/web test，並手動以 browser 或 fhd witness 檢查五個 playback routes 切換後無空白、fallback/error 可見、播放仍會前進；驗證結果記錄在 apply 回報。
