## Summary

在不改變任何 render 輸出（DOM 結構、CSS class、inline style 值、文字內容完全一致，零視覺變動）的前提下，消除 Playback 三頁 Overview / Solar / FactoryCircuit 因 `useLiveMetrics` 每秒推送 socket snapshot 而造成的整頁 viewModel 與 config 重算、子元件 cascade re-render。

## Motivation

`useLiveMetrics`（`apps/web/src/hooks/useLiveMetrics.ts`）在收到 `liveMetrics:update` socket 事件時呼叫 `setSnapshot`，實務上每秒觸發一次，使所有訂閱頁面每秒 re-render。三個 playback 頁目前在每次 render 都做以下昂貴工作，且完全沒有 memo 保護：

- `buildOverviewViewModel` / `buildSolarViewModel` / `buildFactoryCircuitViewModel` 直接在 component body 呼叫，每秒重跑 sort/filter/map 與多次 metric binding 解析。
- 各頁在 render body 內用 spread 做 `resolvedConfig` 深層 merge，runtime hydration 完成後 config 已固定，卻每秒重新 merge 整個 config tree。
- 傳給展示元件的 inline style 物件與 `.map()` 產生的 array prop 每秒都是新 reference。
- 展示元件 `DisplayCardFrame` / `DisplayCardHeader` / `DisplayCardValueRow`（`apps/web/src/components/displayPageCards.tsx`）與 `Sparkline`（`apps/web/src/components/Sparkline.tsx`）皆無 `React.memo`，父層每秒 tick 即全數重繪，即使其顯示資料未變。

這是專案標記為 FHD closeout 保護範圍的五個 playback 頁之三，效能優化必須嚴格維持零視覺變動，並以既有 web tests 與 FHD witness 佐證。本提案是一系列 render 效能 change 的第一個，負責建立「純效能、零視覺變動」的驗證模式；後續 editor 拖曳、settings、management 為各自獨立的 change，不在本次範圍。

## Proposed Solution

1. 將三頁的 `buildXxxViewModel(...)` 呼叫包進 `useMemo`，dependency 精確列出實際輸入（如 `snapshot`、resolved config、runtime 狀態）。snapshot 每秒變動的事實不變，但能避免在非 snapshot 觸發的 re-render（例如其他 local state 改變）時重算，並讓記憶體分配集中於 memo 邊界。
2. 將 render body 內的 `resolvedConfig` 深層 merge 包進 `useMemo`，dependency 只放 runtime config 來源，使其在 config 真正改變時才重算，與每秒 snapshot tick 脫鉤。
3. 把每秒重建的 inline style 物件與 `.map()` array prop 改用 `useMemo` 產生或拆出為穩定 reference，作為後續 `React.memo` 生效的前提。
4. 為 `DisplayCardFrame`、`DisplayCardHeader`、`DisplayCardValueRow`、`Sparkline` 加上 `React.memo`，使顯示資料未變動的卡片在父層 tick 時可跳過 re-render。
5. list rendering 改用穩定的 metric key（既有 stable id 或 metricKey）取代 label/index 組合，避免 array reference 變動時的非必要 reconciliation。

驗證以「render 輸出位元等價」為門檻：既有 `apps/web` 測試全綠，並對三頁跑 FHD witness（`pnpm run fhd:witness`）對照 `docs/reference/FHD/` 確認零視覺差異。

## Non-Goals

- 不更動任何 spec-level 行為、API、資料模型或 socket 契約；本 change 僅為實作層 render 效能優化，因此不新增或修改任何 capability spec。
- 不改變 render 輸出的 DOM 結構、class、style 值或文字（零視覺變動是硬性約束）。
- 不處理 Images 與 Sustainability 兩個 playback 頁（本批僅針對使用 `useLiveMetrics`、每秒 tick 壓力最大的三頁）。
- 不處理 editor 拖曳、settings 頁、management 頁的效能問題——各自為獨立後續 change。
- 不引入 `useSyncExternalStore` 重寫 metric 訂閱、不引入虛擬化或 web worker 等較大型架構改動。

## Alternatives Considered

- **改寫 `useLiveMetrics` 為 selector 式 `useSyncExternalStore`，讓元件只訂閱所需 metric 子集**：能更徹底地避免每秒全頁 re-render，但屬於跨頁共用 hook 的架構級改動，風險與 review 成本高，且可能影響 FHD 行為；保留為未來獨立評估，不納入本次「低風險、零視覺」批次。
- **維持現狀只加 `React.memo`**：若不先穩定 inline prop reference，`React.memo` 會被每秒新建的 style/array prop 破壞而失效，故 memo 與 prop 穩定化必須一起做。

## Capabilities

### New Capabilities

- `display-runtime-render-invariance`: 釘住「playback render 效能優化必須維持 render 輸出位元等價」的契約——memoization 與 prop 穩定化在相同 socket snapshot 序列下不得改變 DOM 結構、class、inline style 計算值、文字內容或卡片順序，並以既有 web tests 與 FHD witness 為驗證門檻。此 capability 供本批與後續效能 change 共用引用。

### Modified Capabilities

(none)

## Impact

- Affected specs: `display-runtime-render-invariance`（新增；描述效能優化的零視覺變動契約，不改任何既有 capability 的 spec-level 行為）。
- Affected code:
  - Modified:
    - apps/web/src/pages/Overview/index.tsx
    - apps/web/src/pages/Solar/index.tsx
    - apps/web/src/pages/FactoryCircuit/index.tsx
    - apps/web/src/components/displayPageCards.tsx
    - apps/web/src/components/Sparkline.tsx
  - New: 無
  - Removed: 無
