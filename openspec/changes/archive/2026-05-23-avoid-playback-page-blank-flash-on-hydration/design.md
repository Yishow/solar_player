## Context

五個 live 播放頁（Overview、Solar、Sustainability、FactoryCircuit、Images）皆在 `apps/web/src/hooks/useDisplayPageConfig.ts` 的 `shouldDeferDisplayPageRuntimeRender` 為真時 `return null`。該 guard 僅在「冷啟動首次 live 載入」成立（`runtimeHydrationEnabled && stage === "live" && isLoading && lastLoadedEnvelope === null`）；一旦 session 快取建立（`sessions[pageId]`），後續切回該頁不再 defer。`LayoutShell` 在 Outlet 之外渲染 `AppHeader` 與 `AppFooterNav`，故 defer 期間 header/footer 仍在，空白只出現在 `DisplayCanvas` 的內容區（`main`）。既有 `apps/web/src/pages/runtimeConfigHydration.test.ts` 斷言每頁仍使用該 guard，且 guard 出現在 view model builder 之前。token 與舞台底色定義於 `apps/web/src/styles/tokens.css`（`--stage-bg` 等）。

## Goals / Non-Goals

**Goals:**

- 冷啟動首載期間內容區不再空白，改顯示沉穩的品牌化載入占位。
- 保留既有 defer 判斷與「view model 在 defer 之後才建立」的順序。
- 載入占位具無障礙狀態語意並尊重 reduced motion。

**Non-Goals:**

- 不改 `shouldDeferDisplayPageRuntimeRender` 的判斷條件（仍以同樣條件 defer）。
- 不改 header/footer（由 LayoutShell 渲染，本就在 defer 期間可見）。
- 不做「保留前一頁畫面」式的路由級轉場（route 切換會卸載前頁，超出此範圍）。
- 不改其他非 live 播放頁或管理頁。

## Decisions

- **以共用載入占位取代 null，而非渲染 seed 內容**：seed 內容可能與 live 不同，冷載時先顯示 seed 再跳成 live 會造成內容跳動；改用中性載入占位可同時避免「空白」與「seed→live 跳動」。占位元件 `apps/web/src/components/DisplayPageLoadingState.tsx` 填滿內容區。
- **保留 defer guard、只換輸出**：各頁維持 `shouldDeferDisplayPageRuntimeRender(...)` 呼叫於 view model 之前，僅把 `return null` 改為 `return <DisplayPageLoadingState />`。理由：滿足既有 `runtimeConfigHydration.test.ts` 對 guard 存在與順序的斷言，改動面最小。
- **無障礙與 reduced motion**：占位以 `role="status"` + `aria-live="polite"` 呈現，動效以 CSS 包在 `@media (prefers-reduced-motion: reduce)` 下停用。理由：展示機雖少互動，但維持基本無障礙與穩定觀感。

## Implementation Contract

- **Behavior**：冷啟動首次進入任一 live 播放頁時，內容區顯示沉穩的載入占位（非空白）；hydration 完成後切換為實際頁面內容；已快取過的頁面切回時行為不變（不再 defer）。
- **Interface / data shape**：
  - `DisplayPageLoadingState` 為無 props（或可選 `label?: string`）的展示元件，填滿內容區，包含 `role="status"`、`aria-live="polite"`，預設提示文字（例如「載入展示頁…」）。
  - 五個播放頁的 defer 分支由 `return null` 改為 `return <DisplayPageLoadingState />`；其餘邏輯與 guard 呼叫位置不變。
- **Failure modes**：占位元件不依賴任何 runtime 資料，永不丟例外；reduced-motion 下不得有動效；不得改變 guard 為真的條件，避免影響既有快取後不 defer 的行為。
- **Acceptance criteria**：
  - 新增 `apps/web/src/components/DisplayPageLoadingState.test.tsx`：渲染含 `role="status"`；（若以 class 控制動效）斷言具對應 class 供 reduced-motion CSS 套用。
  - 擴充 `apps/web/src/pages/runtimeConfigHydration.test.ts`：斷言每頁 defer 分支渲染 `DisplayPageLoadingState`（原始碼包含該元件名）而非 `return null`，且既有「guard 在 view model builder 之前」斷言仍通過。
  - `pnpm --filter @solar-display/web test` 全綠、`pnpm --filter @solar-display/web build` 型別通過。
- **Scope boundaries**：
  - In scope：`DisplayPageLoadingState` 元件與其樣式/測試、五個播放頁 defer 分支改渲染占位、擴充 `runtimeConfigHydration.test.ts`。
  - Out of scope：defer 判斷條件、header/footer、路由級轉場、seed 內容渲染、非 live 或管理頁。

## Risks / Trade-offs

- **占位與實際內容的切換**：hydration 完成時由占位切到內容仍有一次轉換，但不再是「空白→內容」，且不會出現 seed→live 的資料跳動，觀感較佳。
- **多頁重複改動**：五頁皆需把 `return null` 改為占位；屬同一關注點的一致改動，風險低。
