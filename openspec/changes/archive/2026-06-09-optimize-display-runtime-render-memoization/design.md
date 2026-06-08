## Context

`useLiveMetrics`（`apps/web/src/hooks/useLiveMetrics.ts`）訂閱 `liveMetrics:update` socket 事件並在收到資料時 `setSnapshot`，實務上每秒觸發一次。Overview、Solar、FactoryCircuit 三個 playback 頁皆訂閱此 hook，因此每秒整頁 re-render。

三頁在 component body 直接呼叫 `buildOverviewViewModel` / `buildSolarViewModel` / `buildFactoryCircuitViewModel`，並在 render body 用 spread 做 `resolvedConfig` 深層 merge；展示元件 `DisplayCardFrame` / `DisplayCardHeader` / `DisplayCardValueRow`（`apps/web/src/components/displayPageCards.tsx`）與 `Sparkline`（`apps/web/src/components/Sparkline.tsx`）皆無 `React.memo`。結果是每秒一次的 viewModel 重算、config 重 merge，以及全部展示子元件的 cascade re-render。

這三頁屬於 FHD closeout 保護範圍。專案規範要求 playback 頁不得因 component/style cleanup 退回 management-surface 樣式，且任何 closeout 都需以 FHD witness 對照 `docs/reference/FHD/`。因此本次優化的硬性約束是「render 輸出位元等價、零視覺變動」。

## Goals / Non-Goals

**Goals:**

- 在 render 輸出（DOM 結構、class、inline style 值、文字）完全不變的前提下，降低三頁每次 render 的計算與重繪成本。
- 讓 viewModel 與 resolvedConfig 的重算與每秒 snapshot tick 的「非 snapshot 觸發 re-render」脫鉤，並讓顯示資料未變的展示卡片可跳過 re-render。
- 建立一個可被後續效能 change 沿用的「render-output invariance」驗證模式（既有 tests + FHD witness）。

**Non-Goals:**

- 不改任何 spec-level 行為、API、socket 契約或資料模型。
- 不改 render 輸出的任何視覺面向。
- 不處理 Images / Sustainability 兩頁，亦不處理 editor 拖曳、settings、management（各自獨立 change）。
- 不重寫 `useLiveMetrics` 為 selector 式訂閱、不引入虛擬化／web worker。

## Decisions

### Wrap per-page viewModel construction in useMemo

把 `buildOverviewViewModel` / `buildSolarViewModel` / `buildFactoryCircuitViewModel` 的呼叫包進 `useMemo`，dependency 精確列出實際輸入（snapshot、resolved config、runtime 狀態等）。回傳物件的 shape 與內容必須與優化前在相同輸入下完全一致。理由：snapshot 每秒變動無法消除，但可避免非 snapshot 觸發的 re-render 重算，並把分配集中在 memo 邊界，便於後續 `React.memo` 生效。替代方案（selector 式訂閱）風險過高，已於 proposal 排除。

### Memoize resolvedConfig deep merge separately from snapshot

把 render body 內的 `resolvedConfig` 深層 merge 包進獨立 `useMemo`，dependency 只放 runtime config 來源（hydration 結果與 seed config），不含 snapshot。理由：config 在 runtime hydration 後即固定，與每秒 tick 無關，獨立 memo 可讓它在 config 真正改變時才重算。

### Stabilize inline style and array props before memoizing children

把每秒重建、傳給展示元件的 inline style 物件與 `.map()` 產生的 array prop 改為 `useMemo` 產生或拆出為穩定 reference。理由：`React.memo` 的 shallow compare 會被每秒新建的 style/array prop 破壞；prop 穩定化是 memo 生效的前提，兩者必須一起做。

### Add React.memo to shared display card and sparkline components

為 `DisplayCardFrame`、`DisplayCardHeader`、`DisplayCardValueRow`、`Sparkline` 加上 `React.memo`。理由：這些元件由多個 playback 頁共用，顯示資料未變時應可在父層 tick 跳過 re-render。因屬共用元件，須確認其他使用端（如 Overview KPI footer、widgets）傳入的 prop 在資料不變時 reference 穩定，否則 memo 不生效但也不會破壞正確性。

### Use stable metric keys for list rendering

list rendering 改用穩定的 metric key（既有 stable id 或 metricKey）取代 label 或 index 組合。理由：避免每秒全新 array 導致非必要的 reconciliation 與潛在 remount。

## Implementation Contract

**Behavior（對使用者／witness 而言）：** 三頁在優化前後，於相同 socket snapshot 序列下的 render 輸出位元等價——DOM 結構、CSS class、inline style 計算值、文字內容、卡片順序皆不變。FHD witness（1920x1080）對照 `docs/reference/FHD/` 對應頁面無新增視覺差異。

**Interface / data shape：** 不新增或變更任何匯出函式簽名、props 介面、socket 事件或 API。`buildOverviewViewModel` / `buildSolarViewModel` / `buildFactoryCircuitViewModel` 的輸入與回傳 shape 維持不變；本 change 只改變這些函式「被呼叫的時機」（memo 邊界）與其結果如何被傳遞（穩定 reference），不改其輸出。`DisplayCardFrame` / `DisplayCardHeader` / `DisplayCardValueRow` / `Sparkline` 維持相同 props 介面，僅以 `React.memo` 包裝匯出。

**Failure modes：** memo dependency 若漏列實際輸入，會表現為「資料更新但畫面未更新」——這會被既有頁面測試與 FHD witness 捕捉，屬必須修正的回歸，不得以放寬驗證掩蓋。memo dependency 若多列，最壞情況退化為現狀（每秒重算），正確性不受影響。

**Acceptance criteria：**

- `pnpm --filter @solar-display/web test` 全綠。
- 三頁既有測試（含 `displayPageMediaStyle`、`displaySurfaceVisualGuardrails` 等視覺護欄測試）不需修改即通過；若需修改測試，視為視覺/行為變動的訊號，須停下檢視。
- 對 `/overview`、`/solar`、`/factory-circuit` 跑 `pnpm run fhd:witness -- --base-url <url>`，對照 `docs/reference/FHD/` 無新增差異，evidence 記在本 change artifact。

**Scope boundaries：**

- In scope：`apps/web/src/pages/Overview/index.tsx`、`apps/web/src/pages/Solar/index.tsx`、`apps/web/src/pages/FactoryCircuit/index.tsx`、`apps/web/src/components/displayPageCards.tsx`、`apps/web/src/components/Sparkline.tsx` 的 memoization 與 prop 穩定化。
- Out of scope：viewModel 內部演算法改寫、config merge 邏輯改寫、`useLiveMetrics` 改寫、Images/Sustainability、settings/management/editor、任何視覺調整。

## Risks / Trade-offs

- [漏列 memo dependency 導致畫面 stale] → 以既有頁面測試 + 三頁 FHD witness 對照驗證；dependency 以「函式實際讀取的輸入」為準逐一核對。
- [共用元件加 React.memo 後，其他使用端傳入不穩定 prop 使 memo 無效] → 不影響正確性，僅效益打折；在 tasks 中核對主要使用端的 prop 穩定性，但不為此擴張 scope 去重構非三頁的呼叫端。
- [props 穩定化過程不慎改到 style 物件的鍵或值] → render 輸出位元等價為驗證門檻，FHD witness 與視覺護欄測試會捕捉任何偏差。
- [Sparkline 以 `values` array 為 prop，呼叫端每次 `.map()` 產生新 array] → memo 需搭配呼叫端把 `values` 也穩定化（useMemo），否則 memo 不生效；已列入 tasks。
