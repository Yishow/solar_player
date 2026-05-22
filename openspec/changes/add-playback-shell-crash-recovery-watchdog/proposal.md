## Why

展示機無人值守，但前端目前完全沒有崩潰自我復原：全 repo 沒有 React ErrorBoundary、沒有 `window.onerror` / `unhandledrejection` 處理、沒有 Vite 動態載入失敗（`vite:preloadError`）的處置，也沒有任何重新載入機制。常見故障如重新部署後舊 chunk 失效、單頁 render 例外、播放輪播卡死，都會讓畫面停在白屏或錯誤狀態直到有人現場處理。本變更在播放外殼加入可自我復原的防線（錯誤邊界 + 重新載入 + 輪播停滯看門狗），並以重載預算避免無限重載迴圈。

## What Changes

- 新增 `PlaybackErrorBoundary`：包住播放路由的 `Outlet`，攔截 render 期例外，顯示極簡 fallback 畫面，並在重載預算允許時於延遲後自動 `location.reload()`。
- 在 app 進入點安裝全域復原處理：監聽 `vite:preloadError` 與 `unhandledrejection`，當判定為 chunk/動態載入失敗時，在預算允許下重新載入。
- 新增輪播停滯看門狗 hook：當播放中且有多個可播頁，但目前頁面在「該頁時長 + 寬限期」內未前進時，判定輪播停滯並在預算允許下重新載入。
- 新增重載預算純函式：在滑動視窗內限制最大重載次數，超過時停止自動重載並維持 fallback 畫面，避免無限重載迴圈。
- 復原判定邏輯（chunk 錯誤辨識、重載預算、停滯判定）皆抽為純函式並單元測試；副作用（讀寫 sessionStorage、呼叫 `location.reload`）集中於薄封裝層。

## Non-Goals (optional)

(none — design.md 會記錄 Goals/Non-Goals)

## Capabilities

### New Capabilities

- `playback-shell-crash-recovery`: 播放外殼的崩潰與停滯自我復原（錯誤邊界、chunk 載入失敗復原、輪播停滯看門狗、重載預算防迴圈）。

### Modified Capabilities

(none)

## Impact

- Affected specs: playback-shell-crash-recovery（新增）
- Affected code:
  - New:
    - apps/web/src/recovery/crashRecovery.ts
    - apps/web/src/recovery/installCrashRecovery.ts
    - apps/web/src/components/PlaybackErrorBoundary.tsx
    - apps/web/src/hooks/usePlaybackWatchdog.ts
  - Modified:
    - apps/web/src/main.tsx
    - apps/web/src/layouts/LayoutShell.tsx
  - Removed:
    - (none)
