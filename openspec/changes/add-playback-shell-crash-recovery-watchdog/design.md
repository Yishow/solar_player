## Context

播放外殼 `apps/web/src/layouts/LayoutShell.tsx` 透過 `usePageRotation`（包裝 `usePlaybackController`）驅動輪播，內容以 `<Outlet />` 渲染於 `DisplayCanvas` 內。app 進入點 `apps/web/src/main.tsx` 直接 `createRoot().render(<RouterProvider/>)`，沒有任何全域錯誤處理或 ErrorBoundary。專案以 Vite 動態 import 載入頁面，重新部署後舊 chunk 失效會丟出 dynamic-import 失敗。`usePlaybackController` 的 interval 每 `tickMs`（預設 250ms）推進 `runtime`，回傳 `currentPage`、`isPlaying`、`pages`。已存在 `/offline` 頁面與其視覺，可作為 fallback 風格參考。

## Goals / Non-Goals

**Goals:**

- render 期例外不再造成白屏，改為顯示 fallback 並在預算內自動重載。
- chunk/動態載入失敗能自動以重載復原。
- 偵測「播放中但輪播停止前進」的邏輯停滯並重載。
- 以重載預算避免無限重載迴圈。
- 所有判定邏輯為可測純函式，副作用集中於薄封裝。

**Non-Goals:**

- 不偵測主執行緒完全凍結：當 JS 主執行緒卡死，頁內計時器同樣凍結，無法自我偵測；該情境由 server 端展示機心跳缺失（add-display-client-liveness-heartbeat）負責觀測。
- 不做主機層 kiosk 重啟或螢幕電源控制。
- 不改動既有 `/offline` 路由判斷與 `shouldRedirectToOffline` 行為。
- 不在本變更加入 Wake Lock（屬 add-display-screen-wake-lock）。

## Decisions

- **判定邏輯與副作用分離**：`apps/web/src/recovery/crashRecovery.ts` 只放純函式與常數；`apps/web/src/recovery/installCrashRecovery.ts` 負責綁定 `window` 事件、讀寫 sessionStorage、呼叫 `location.reload`。理由：純函式可用 vitest 直接測，副作用層極薄、易以整合測試覆蓋。
- **重載預算持久化於 sessionStorage**：因為「重載」會清掉記憶體狀態，預算必須跨重載存活；sessionStorage 在分頁生命週期內持久且 kiosk 通常單分頁。替代方案 localStorage 會跨分頁/重開殘留，較不適合。鍵名 `solar-display:reload-budget`，值為 `{ reloadTimestamps: number[] }`。
- **停滯看門狗以「頁面前進」為訊號，而非 tick 存活**：偵測 `isPlaying && playablePageCount > 1 && msSinceLastPageChange > expectedDurationMs + graceMs`。理由：單頁情境下頁面本就不前進，不能視為停滯；以 tick 計時偵測凍結對主執行緒凍結無效（見 Non-Goals）。看門狗 hook 以自身 interval（每 5s）檢查，呼叫純函式 `decidePlaybackStall`。
- **chunk 錯誤辨識採訊息比對**：`isChunkLoadError` 比對已知字串（"Failed to fetch dynamically imported module"、"error loading dynamically imported module"、"Importing a module script failed"），並接受 `vite:preloadError` 事件。理由：跨瀏覽器訊息略有差異，列舉已知模式較穩。
- **fallback 不自動重載時保留可見訊息**：預算耗盡時顯示「顯示異常，請通知管理員」之類靜態訊息，避免無限重載又能讓現場人員察覺。

## Implementation Contract

- **Behavior**：
  - 任一播放頁 render 丟例外 → 看到極簡 fallback（非白屏），預算允許時數秒後自動重載。
  - 重新部署後舊 chunk 載入失敗 → 自動重載取得新資源。
  - 播放中且多頁時輪播卡住超過該頁時長加寬限期 → 自動重載。
  - 短時間內反覆失敗達上限 → 停止自動重載，保留 fallback 訊息。
- **Interface / data shape**（`crashRecovery.ts` 匯出）：
  - 常數 `PLAYBACK_RELOAD_MAX = 3`、`PLAYBACK_RELOAD_WINDOW_MS = 600000`、`PLAYBACK_STALL_GRACE_MS = 15000`、`PLAYBACK_WATCHDOG_INTERVAL_MS = 5000`、`PLAYBACK_ERROR_RELOAD_DELAY_MS = 5000`。
  - `isChunkLoadError(reason: unknown): boolean`。
  - `decidePlaybackStall(input: { isPlaying: boolean; playablePageCount: number; msSinceLastPageChange: number; expectedDurationMs: number; graceMs: number }): boolean`。
  - `evaluateReloadBudget(state: { reloadTimestamps: number[] }, now: number, options: { maxReloads: number; windowMs: number }): { allowed: boolean; nextState: { reloadTimestamps: number[] } }`（nextState 已濾除視窗外時間戳；allowed 時將 now 併入）。
  - `installCrashRecovery.ts` 匯出 `installCrashRecovery(): () => void`（回傳卸載函式），內部使用上述純函式並對 `window`/`sessionStorage`/`location` 操作。
  - `PlaybackErrorBoundary` 為 React class component，props 含 `children`，可選 `onReloadScheduled` 供測試注入。
  - `usePlaybackWatchdog(input: { isPlaying: boolean; playablePageCount: number; currentPageKey: string | null; expectedDurationMs: number })` 在內部追蹤 `lastPageChangeAt`，每 `PLAYBACK_WATCHDOG_INTERVAL_MS` 呼叫 `decidePlaybackStall`，停滯且預算允許時觸發重載。
- **Failure modes**：sessionStorage 不可用（讀寫丟例外）時，視為空預算狀態並仍允許首次重載，不得讓復原流程自身丟例外；`isChunkLoadError` 對非字串/未知 reason 回傳 false；fallback 元件本身不得再丟例外。
- **Acceptance criteria**：
  - `crashRecovery.test.ts` 覆蓋 spec 中三張 Example 表（chunk 辨識、stall 決策、budget 評估）全部 case。
  - `PlaybackErrorBoundary.test.tsx`：子元件丟例外時渲染 fallback 並呼叫 `onReloadScheduled`；預算耗盡時不排程重載。
  - `usePlaybackWatchdog.test.ts`：多頁播放卡住超時觸發重載；單頁不觸發；暫停不觸發。
  - `pnpm --filter @solar-display/web test` 全綠、`pnpm --filter @solar-display/web build` 型別通過。
- **Scope boundaries**：
  - In scope：recovery 純函式與封裝、ErrorBoundary、chunk 錯誤全域處理、停滯看門狗、在 `main.tsx` 與 `LayoutShell.tsx` 接線、對應測試。
  - Out of scope：主執行緒凍結偵測、server 端心跳、Wake Lock、`/offline` 既有判斷、主機層控制。

## Risks / Trade-offs

- **無法偵測完全凍結**：已於 Non-Goals 與 server 心跳變更分工說明；屬已知限制。
- **誤判停滯而重載**：以「該頁時長 + 寬限期」與「多頁且播放中」三重條件降低誤判；寬限期預設 15s 提供緩衝。
- **重載預算誤擋**：上限 3 次/10 分鐘為保守值；耗盡時保留可見 fallback 讓現場人員介入，優於無限重載。
