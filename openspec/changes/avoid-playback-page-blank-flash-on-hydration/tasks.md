## 1. 共用載入占位元件

- [x] 1.1 實作 spec requirement「Loading state is accessible and respects reduced motion」：先寫 apps/web/src/components/DisplayPageLoadingState.test.tsx（渲染含 `role="status"` 與 polite live region；具控制動效用的 class），再實作 apps/web/src/components/DisplayPageLoadingState.tsx 與其樣式，動效以 `@media (prefers-reduced-motion: reduce)` 停用，填滿內容區並沿用 `--stage-bg` 等 token。驗證：`pnpm --filter @solar-display/web test` 下該檔 RED→GREEN。

## 2. 五個播放頁改渲染載入占位

- [x] 2.1 實作 spec requirement「Playback pages show a loading state instead of blank during cold hydration」：在 apps/web/src/pages/Overview/index.tsx、Solar/index.tsx、Sustainability/index.tsx、FactoryCircuit/index.tsx、Images/index.tsx 將 `shouldDeferDisplayPageRuntimeRender` 為真時的 `return null` 改為 `return <DisplayPageLoadingState />`，保留 guard 呼叫位置（仍於 view model builder 之前）。驗證：`pnpm --filter @solar-display/web test` 既有測試仍綠。
- [x] 2.2 擴充 apps/web/src/pages/runtimeConfigHydration.test.ts：對五頁斷言 defer 分支渲染 `DisplayPageLoadingState`（原始碼含該元件名）而非 `return null`，並確認既有「guard 在 view model builder 之前」與「使用 shared runtime hook」斷言仍通過。驗證：該測試通過。

## 3. 整合驗證

- [x] 3.1 執行 `pnpm --filter @solar-display/web test` 與 `pnpm --filter @solar-display/web build` 全綠。驗證：兩指令成功結束、無型別或測試錯誤。
