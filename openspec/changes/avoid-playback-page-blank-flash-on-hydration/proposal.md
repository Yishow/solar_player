## Problem

每個 live 播放頁（Overview、Solar、Sustainability、FactoryCircuit、Images）在「冷啟動首次同步 live 設定」期間，會因 `shouldDeferDisplayPageRuntimeRender` 為真而 `return null`，使內容區整塊消失成空白。在無人值守的展示看板上，這個首載空白（content 區短暫無內容）很明顯，影響展示觀感。

## Root Cause

播放頁在 defer 條件成立時直接 `return null`，內容區（DisplayCanvas 的 main）暫時沒有任何節點；header 與 footer 由 LayoutShell 渲染於 Outlet 之外仍在，但中央內容區呈現空白，造成首載閃爍。

## Proposed Solution

- 新增共用元件 `DisplayPageLoadingState`，填滿內容區呈現一個沉穩的品牌化載入占位（沿用既有 token 與既有舞台底色），具 `role="status"`、`aria-live="polite"` 與 `prefers-reduced-motion` 友善的動效。
- 將五個 live 播放頁 defer 成立時的 `return null` 改為 `return <DisplayPageLoadingState />`，保留既有 defer 判斷（`shouldDeferDisplayPageRuntimeRender` 仍在 view model 建立前呼叫），只改變 defer 期間的呈現。

## Non-Goals (optional)

(none — design.md 會記錄 Goals/Non-Goals)

## Success Criteria

- 五個 live 播放頁在 defer 期間不再渲染 null，而是渲染 `DisplayPageLoadingState`。
- 既有 `runtimeConfigHydration.test.ts` 對「defer guard 存在且在 view model 之前」的斷言仍通過。
- 新增測試斷言 defer 期間渲染的是載入狀態（具 `role="status"`），而非空內容。
- `DisplayPageLoadingState` 在 `prefers-reduced-motion: reduce` 下不播放動效。

## Impact

- Affected specs: playback-page-hydration-loading-state（新增）
- Affected code:
  - New:
    - apps/web/src/components/DisplayPageLoadingState.tsx
  - Modified:
    - apps/web/src/pages/Overview/index.tsx
    - apps/web/src/pages/Solar/index.tsx
    - apps/web/src/pages/Sustainability/index.tsx
    - apps/web/src/pages/FactoryCircuit/index.tsx
    - apps/web/src/pages/Images/index.tsx
    - apps/web/src/pages/runtimeConfigHydration.test.ts
  - Removed:
    - (none)
