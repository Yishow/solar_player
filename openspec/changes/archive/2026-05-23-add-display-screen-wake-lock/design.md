## Context

播放外殼 `apps/web/src/layouts/LayoutShell.tsx` 是展示模式的進入外殼，管理頁使用 `ManagementShell.tsx`。目前無任何 `navigator.wakeLock` 使用。Wake Lock API 特性：`navigator.wakeLock.request("screen")` 回傳 sentinel；當分頁隱藏或系統決定時，sentinel 會被釋放並觸發其 `release` 事件，需在分頁恢復可見時重取。並非所有目標瀏覽器都支援（需特性偵測），且請求可能在低電量等情況被拒。

## Goals / Non-Goals

**Goals:**

- 在支援的瀏覽器上，播放期間保持螢幕常亮。
- 分頁重新可見時自動重取被釋放的 wake lock。
- 不支援或被拒時靜默退化，不影響播放、不丟例外。
- 判斷邏輯抽為純函式以利測試。

**Non-Goals:**

- 不調整作業系統電源設定或主機層 kiosk 配置（屬部署層）。
- 不在管理外殼啟用 wake lock。
- 不把 wake lock 開關做成可設定項；本變更預設於播放外殼啟用（後續若需設定再開新變更）。
- 不處理崩潰/停滯復原（屬 add-playback-shell-crash-recovery-watchdog）。

## Decisions

- **支援偵測與重取判斷抽成純函式**：`apps/web/src/hooks/screenWakeLock.ts` 匯出 `isWakeLockSupported(nav)` 與 `shouldReacquireWakeLock({ visibilityState, hasSentinel })`。理由：sentinel 與瀏覽器 API 難以在單元測試模擬，但「是否該重取」的決策可純函式化並完整測試。
- **hook 管理 sentinel 生命週期**：`useScreenWakeLock({ enabled })` 以 ref 持有目前 sentinel，掛載時若 `enabled && isWakeLockSupported` 則請求；註冊 `visibilitychange` 監聽，依 `shouldReacquireWakeLock` 重取；監聽 sentinel 的 `release` 事件清除 ref；卸載時釋放並移除監聽。理由：sentinel 為命令式資源，集中於單一 hook 管理可避免洩漏。
- **僅在播放外殼啟用**：在 `LayoutShell.tsx` 呼叫 `useScreenWakeLock({ enabled: true })`；管理外殼不接線。理由：常亮只對展示畫面有意義。
- **所有請求以 try/catch 包覆並靜默退化**：請求被拒時不丟例外、不顯示錯誤。理由：低電量等情況屬正常瀏覽器行為，不應影響展示。

## Implementation Contract

- **Behavior**：在支援的瀏覽器，展示畫面播放時螢幕保持常亮；切走分頁再切回時自動恢復常亮；不支援或被拒時播放照常、無錯誤訊息。
- **Interface / data shape**（`screenWakeLock.ts` 匯出）：
  - `isWakeLockSupported(nav: { wakeLock?: unknown } | undefined): boolean`（`navigator` 具備 `wakeLock.request` 函式時為 true）。
  - `shouldReacquireWakeLock(input: { visibilityState: DocumentVisibilityState; hasSentinel: boolean }): boolean`（僅 `visible && !hasSentinel` 為 true）。
  - `useScreenWakeLock(options: { enabled: boolean }): void`（hook，無回傳值；可選注入 `navigator`/`document` 以利測試）。
- **Failure modes**：`navigator.wakeLock` 不存在 → 不請求、不丟例外；`request("screen")` reject → catch 後不丟例外、ref 維持 null；sentinel `release` 事件 → 清除 ref，待下次可見時重取；`enabled` 為 false → 不請求。
- **Acceptance criteria**：
  - `screenWakeLock.test.ts` 覆蓋 `isWakeLockSupported`（有/無 wakeLock）與 `shouldReacquireWakeLock` 的 Example 表三列。
  - `useScreenWakeLock.test.ts`：以假 navigator/document 驗證—掛載且支援時呼叫 `request("screen")`；不支援時不呼叫且不丟例外；request reject 時不丟例外；可見性由 hidden→visible 且無 sentinel 時重取；卸載時呼叫 sentinel.release。
  - `pnpm --filter @solar-display/web test` 全綠、`pnpm --filter @solar-display/web build` 型別通過。
- **Scope boundaries**：
  - In scope：純函式、`useScreenWakeLock` hook、在 `LayoutShell.tsx` 接線、對應測試。
  - Out of scope：管理外殼接線、設定化開關、OS/主機層電源設定、崩潰復原、Wake Lock 以外的螢幕控制。

## Risks / Trade-offs

- **瀏覽器支援差異**：以特性偵測處理，不支援時退化；屬可接受限制。
- **請求被拒**：低電量等情況請求可能失敗；靜默退化，不影響播放。
- **與看門狗重載互動**：重載後 hook 會重新請求 wake lock，行為冪等，無衝突。
