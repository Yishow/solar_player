## 1. 純函式：支援偵測與重取判斷

- [x] 1.1 實作 spec requirement「Unsupported or denied wake lock degrades silently」的偵測部分：先在 apps/web/src/hooks/screenWakeLock.test.ts 覆蓋 `isWakeLockSupported`（navigator 具 `wakeLock.request`→true；缺 wakeLock 或非函式→false），再在 apps/web/src/hooks/screenWakeLock.ts 實作 `isWakeLockSupported`。驗證：`pnpm --filter @solar-display/web test` 下該檔 RED→GREEN。
- [x] 1.2 [P] 實作 spec requirement「Wake lock is re-acquired when the tab becomes visible」的判斷：在 screenWakeLock.test.ts 覆蓋 `shouldReacquireWakeLock` 的 Example 表三列（visible+無 sentinel→true、visible+有 sentinel→false、hidden→false），再實作 `shouldReacquireWakeLock`。驗證：該測試通過。

## 2. Hook：sentinel 生命週期

- [x] 2.1 實作 spec requirement「Playback shell keeps the screen awake」：先寫 apps/web/src/hooks/useScreenWakeLock.test.ts（以假 navigator/document 驗證—enabled 且支援時呼叫 `request("screen")`；卸載時呼叫 sentinel.release），再實作 apps/web/src/hooks/useScreenWakeLock.ts 取得並於卸載釋放 sentinel。驗證：`pnpm --filter @solar-display/web test` 下該檔 RED→GREEN。
- [x] 2.2 在 useScreenWakeLock.test.ts 增案例並於 useScreenWakeLock.ts 實作可見性重取：監聽 `visibilitychange`，依 `shouldReacquireWakeLock` 在 hidden→visible 且無 sentinel 時重取；監聽 sentinel `release` 事件清除內部 ref。驗證：測試斷言可見性由 hidden→visible 觸發再次 `request("screen")`，且已持有 sentinel 時不重複請求。
- [x] 2.3 實作 spec requirement「Unsupported or denied wake lock degrades silently」的退化行為：在 useScreenWakeLock.test.ts 增案例—不支援時不呼叫 request 且不丟例外、`request` reject 時不丟例外且 ref 維持 null、`enabled=false` 時不請求；於 useScreenWakeLock.ts 以特性偵測 + try/catch 實作。驗證：上述案例全綠。

## 3. 接線播放外殼

- [x] 3.1 在 apps/web/src/layouts/LayoutShell.tsx 呼叫 `useScreenWakeLock({ enabled: true })`（管理外殼 ManagementShell 不接線）。驗證：apps/web/src/layouts/LayoutShell.test.ts 增補斷言 hook 以 `{ enabled: true }` 被呼叫，`pnpm --filter @solar-display/web test` 通過。

## 4. 整合驗證

- [x] 4.1 執行 `pnpm --filter @solar-display/web test` 與 `pnpm --filter @solar-display/web build` 全綠。驗證：兩指令成功結束、無型別或測試錯誤。
