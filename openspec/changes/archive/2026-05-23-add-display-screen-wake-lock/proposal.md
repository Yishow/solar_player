## Why

展示機需要長時間保持畫面常亮，但前端目前完全沒有使用 Screen Wake Lock。`playback_settings` 雖有 `brightness`、`orientation`，卻沒有任何 `navigator.wakeLock` 呼叫，作業系統或瀏覽器的省電設定可能讓螢幕在閒置後進入待機，導致展示中斷。本變更在播放外殼取得並維持 screen wake lock，並在分頁重新可見時自動重取（wake lock 在分頁隱藏時會被系統釋放）。

## What Changes

- 新增純函式 `isWakeLockSupported(navigatorLike)` 與 `shouldReacquireWakeLock({ visibilityState, hasSentinel })`，封裝支援偵測與「何時需要重取」的判斷，便於單元測試。
- 新增 `useScreenWakeLock({ enabled })` hook：在啟用且瀏覽器支援時取得 `screen` wake lock sentinel；監聽 `visibilitychange`，當分頁回到可見且目前無 sentinel 時重取；元件卸載時釋放 sentinel。
- 在播放外殼啟用此 hook（管理外殼不啟用）。
- 在瀏覽器不支援或請求被拒（例如低電量）時靜默退化，不丟出錯誤、不影響播放。

## Non-Goals (optional)

(none — design.md 會記錄 Goals/Non-Goals)

## Capabilities

### New Capabilities

- `display-screen-wake-lock`: 播放外殼透過 Screen Wake Lock API 保持展示螢幕常亮，並於分頁重新可見時自動重取。

### Modified Capabilities

(none)

## Impact

- Affected specs: display-screen-wake-lock（新增）
- Affected code:
  - New:
    - apps/web/src/hooks/screenWakeLock.ts
    - apps/web/src/hooks/useScreenWakeLock.ts
  - Modified:
    - apps/web/src/layouts/LayoutShell.tsx
  - Removed:
    - (none)
