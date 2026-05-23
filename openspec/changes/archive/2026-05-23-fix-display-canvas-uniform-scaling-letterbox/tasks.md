## 1. 版面計算純函式

- [x] 1.1 實作 spec requirement「Display canvas scales uniformly to preserve aspect ratio」：先在 apps/web/src/components/displayCanvasLayout.test.ts 覆蓋 Example 表四列（1920×1080→scale 1/offset 0,0；1280×720→0.6667/0,0；1920×1200→1/0,60；1080×1920→0.5625/0,656，容許浮點誤差），再在 apps/web/src/components/displayCanvasLayout.ts 實作 `computeCanvasLayout(viewport, design)`（scale=min 比例、offset 置中、寬或高非有限時安全退回不丟例外）。驗證：`pnpm --filter @solar-display/web test` 下該檔 RED→GREEN。

## 2. DisplayCanvas 套用等比縮放與 letterbox

- [x] 2.1 實作 spec requirement「Off-aspect viewports are letterboxed and centered」：在 apps/web/src/components/DisplayCanvas.tsx 改用 `computeCanvasLayout` 的單一 scale，frame 的 transform 改為 `translate(offsetX, offsetY) scale(scale)`（transformOrigin 維持 top left），並將外層 viewport 容器背景設為 `var(--stage-bg)`。驗證：DisplayCanvas/shell 測試斷言 16:9 viewport 下 offset 為 0、非 16:9（如 1920×1200）下 offsetY 非零且 transform 為單一 scale，`pnpm --filter @solar-display/web test` 通過。

## 3. 整合驗證

- [x] 3.1 執行 `pnpm --filter @solar-display/web test` 與 `pnpm --filter @solar-display/web build` 全綠。驗證：兩指令成功結束、無型別或測試錯誤。
