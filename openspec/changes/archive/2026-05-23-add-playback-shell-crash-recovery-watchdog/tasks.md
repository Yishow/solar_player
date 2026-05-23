## 1. 復原純函式與常數

- [x] 1.1 實作 spec requirement「Reload budget prevents infinite reload loops」：先在 apps/web/src/recovery/crashRecovery.test.ts 覆蓋 `evaluateReloadBudget` 的 Example 表（視窗內 0/2 次→allowed=true、3 次→allowed=false，且 nextState 濾除視窗外時間戳），再在 apps/web/src/recovery/crashRecovery.ts 實作該函式與常數 `PLAYBACK_RELOAD_MAX=3`、`PLAYBACK_RELOAD_WINDOW_MS=600000`。驗證：`pnpm --filter @solar-display/web test` 下該檔 RED→GREEN。
- [x] 1.2 [P] 實作 spec requirement「Dynamic import (chunk load) failures trigger recovery」中的辨識邏輯：在 crashRecovery.test.ts 覆蓋 `isChunkLoadError` 的 Example 表（三種已知訊息→true、一般 TypeError→false、非字串 reason→false），再實作 `isChunkLoadError`。驗證：該測試通過。
- [x] 1.3 [P] 實作 spec requirement「Playback rotation stall is detected and recovered」中的決策邏輯：在 crashRecovery.test.ts 覆蓋 `decidePlaybackStall` 的 Example 表四列（多頁超時→true、未超時→false、單頁→false、暫停→false），再實作 `decidePlaybackStall` 與常數 `PLAYBACK_STALL_GRACE_MS=15000`、`PLAYBACK_WATCHDOG_INTERVAL_MS=5000`、`PLAYBACK_ERROR_RELOAD_DELAY_MS=5000`。驗證：該測試通過。

## 2. 副作用封裝層

- [x] 2.1 在 apps/web/src/recovery/installCrashRecovery.ts 實作 `installCrashRecovery(): () => void`：監聽 `window` 的 `vite:preloadError` 與 `unhandledrejection`，對 chunk 失敗以 `evaluateReloadBudget`（讀寫 sessionStorage 鍵 `solar-display:reload-budget`）判定後呼叫 `location.reload`；sessionStorage 讀寫丟例外時退化為空預算且不向外丟例外；回傳卸載函式移除監聽。驗證：apps/web/src/recovery/installCrashRecovery.test.ts 以注入的假 window/storage/reload 驗證 chunk reject 在預算內觸發 reload、非 chunk reject 不觸發、storage 失效時不丟例外。

## 3. ErrorBoundary

- [x] 3.1 實作 spec requirement「Playback render errors are contained and recovered」：先寫 apps/web/src/components/PlaybackErrorBoundary.test.tsx（子元件丟例外→渲染 fallback 並呼叫 `onReloadScheduled`；預算耗盡→渲染 fallback 但不排程重載），再實作 apps/web/src/components/PlaybackErrorBoundary.tsx（class component，`getDerivedStateFromError` + `componentDidCatch` 記錄，預算允許時於 `PLAYBACK_ERROR_RELOAD_DELAY_MS` 後重載，否則保留 fallback 訊息）。驗證：`pnpm --filter @solar-display/web test` 下該檔 RED→GREEN。

## 4. 停滯看門狗 hook

- [x] 4.1 實作 spec requirement「Playback rotation stall is detected and recovered」的接線：先寫 apps/web/src/hooks/usePlaybackWatchdog.test.ts（多頁播放且 currentPageKey 超時未變→觸發 reload；單頁→不觸發；isPlaying=false→不觸發），再實作 apps/web/src/hooks/usePlaybackWatchdog.ts，內部追蹤 `lastPageChangeAt`（currentPageKey 改變時更新），每 `PLAYBACK_WATCHDOG_INTERVAL_MS` 以 `decidePlaybackStall` 判定並在預算允許時重載。驗證：該測試 RED→GREEN。

## 5. 接線進入點與播放外殼

- [x] 5.1 在 apps/web/src/main.tsx 於 render 前呼叫 `installCrashRecovery()`，使 chunk 載入失敗與未捕捉 rejection 走復原流程。驗證：手動於 dev 模式觸發一次動態 import 失敗（或以 installCrashRecovery.test.ts 覆蓋）後頁面自動重載；`pnpm --filter @solar-display/web build` 通過。
- [x] 5.2 在 apps/web/src/layouts/LayoutShell.tsx 將 `<Outlet />` 以 `PlaybackErrorBoundary` 包住，並接線 `usePlaybackWatchdog`（以 controller 的 isPlaying、可播頁數、currentPage.pageKey、目前頁時長為輸入）。驗證：apps/web/src/layouts/LayoutShell.test.ts 增補斷言 Outlet 被 ErrorBoundary 包住且 watchdog 以正確輸入被呼叫，`pnpm --filter @solar-display/web test` 通過。

## 6. 整合驗證

- [x] 6.1 執行 `pnpm --filter @solar-display/web test` 與 `pnpm --filter @solar-display/web build` 全綠。驗證：兩指令成功結束、無型別或測試錯誤。
