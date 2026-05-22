## 1. 連線狀態映射純函式

- [x] 1.1 實作 spec requirement「Playback header reflects real connection status」的映射：先在 apps/web/src/components/headerConnectionMeta.test.ts 覆蓋 Example 表五列（connected→connected/Online、reconnecting→connecting、offline→disconnected、未 hydrated→connecting、mock→connected/Mock），再在 apps/web/src/components/headerConnectionMeta.ts 實作 `resolveHeaderConnectionMeta({ connected, reason, isHydrated })`（非預期 reason 落 disconnected）。驗證：`pnpm --filter @solar-display/web test` 下該檔 RED→GREEN。

## 2. LayoutShell 接線真實狀態

- [x] 2.1 實作 spec requirement「Playback header reflects real connection status」的接線：在 apps/web/src/layouts/LayoutShell.tsx 以 `resolveHeaderConnectionMeta({ connected: status.connected, reason: status.reason, isHydrated })` 結果作為 `<AppHeader meta={{ status, statusLabel }} />`。驗證：apps/web/src/layouts/LayoutShell.test.ts 增案例—status 為斷線時傳入 AppHeader 的 meta.status 為 disconnected，`pnpm --filter @solar-display/web test` 通過。

## 3. AppHeader 移除捏造天氣與寫死 fallback

- [x] 3.1 實作 spec requirement「Header does not display fabricated weather」：在 apps/web/src/components/AppHeader.tsx 移除 weather 顯示區塊、`SunGlyph` 使用點與 `meta.weather`，並移除 status/statusLabel 的寫死 fallback（改為必由 meta 傳入）。驗證：AppHeader 相關測試（或 apps/web/src/layouts/LayoutShell.test.ts 整合）斷言渲染結果不含 `晴 26°C` 或 weather 節點，`pnpm --filter @solar-display/web test` 通過。

## 4. 整合驗證

- [x] 4.1 執行 `pnpm --filter @solar-display/web test` 與 `pnpm --filter @solar-display/web build` 全綠。驗證：兩指令成功結束、無型別或測試錯誤。
