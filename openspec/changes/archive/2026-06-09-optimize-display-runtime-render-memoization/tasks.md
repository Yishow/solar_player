## 0. Design / spec traceability

對照 design.md 的 decisions 與 spec requirements，確認 tasks 涵蓋無遺漏（不需改碼，僅作為實作前核對）：

- Decision「Wrap per-page viewModel construction in useMemo」→ tasks 2.1 / 3.1 / 4.1。
- Decision「Memoize resolvedConfig deep merge separately from snapshot」→ tasks 2.2 / 3.2 / 4.2。
- Decision「Stabilize inline style and array props before memoizing children」→ tasks 2.3 / 3.3 / 4.2 / 4.3。
- Decision「Add React.memo to shared display card and sparkline components」→ tasks 1.1 / 1.2。
- Decision「Use stable metric keys for list rendering」→ tasks 2.3 / 3.3 / 4.2。
- Requirement「Render-output invariance under performance memoization」→ 由 task 5.1（web tests）與 task 5.2（FHD witness）共同把關。
- Requirement「Live data updates remain visible after memoization」→ 由 tasks 2.1–4.3 的 dependency 精確列出與 task 5.1 驗證。
- Requirement「Existing visual-guardrail tests pass without modification」→ 由 task 5.1 把關（不得修改既有視覺/行為斷言）。

## 1. Shared display components memoization

- [x] 1.1 [P] 在 `apps/web/src/components/displayPageCards.tsx` 為 `DisplayCardFrame`、`DisplayCardHeader`、`DisplayCardValueRow` 以 `React.memo` 包裝匯出，維持各自既有 props 介面不變；確認 props 為淺層可比較（無新建巢狀物件作為預設值）。完成標準：三個元件以 memo 匯出，型別與既有呼叫端皆通過 `pnpm --filter @solar-display/web build` 型別檢查。
- [x] 1.2 [P] 在 `apps/web/src/components/Sparkline.tsx` 為 `Sparkline` 以 `React.memo` 包裝匯出，並確認其 SVG point 計算（`toPoints`）只依 `values` 與既有 props。完成標準：元件以 memo 匯出且型別檢查通過。

## 2. Overview page memoization

- [x] 2.1 在 `apps/web/src/pages/Overview/index.tsx` 將 `buildOverviewViewModel(...)` 呼叫包進 `useMemo`，dependency 精確列出該函式實際讀取的輸入（含 `snapshot` 與 connection/socket 狀態）。回傳 viewModel 在相同輸入下 shape 與內容不變。完成標準：頁面渲染輸出不變，既有 Overview 測試不需修改即通過。
- [x] 2.2 在 `apps/web/src/pages/Overview/index.tsx` 將 render body 內的 `resolvedConfig` 深層 merge 與 `withContentOffset` 重複呼叫結果包進 `useMemo`，dependency 只放 runtime config 來源（不含 `snapshot`）。完成標準：config 改變時仍正確重算，snapshot tick 不再觸發 config 重 merge。
- [x] 2.3 在 `apps/web/src/pages/Overview/index.tsx` 將傳給 KPI 卡與 widgets 的每秒重建 inline style 物件與 `.map()` array prop 改為穩定 reference（`useMemo` 或拆出），並把 metric list 的 key 改用穩定 metricKey。完成標準：傳入 memo 化展示元件的 style/array prop 在資料不變時 reference 穩定；render 輸出位元等價。

## 3. Solar page memoization

- [x] 3.1 在 `apps/web/src/pages/Solar/index.tsx` 將 `buildSolarViewModel(...)` 包進 `useMemo`，dependency 精確列出實際輸入（含 `snapshot`）。完成標準：render 輸出不變，既有 Solar 測試不需修改即通過。
- [x] 3.2 在 `apps/web/src/pages/Solar/index.tsx` 將 render body 內的 `resolvedConfig` 深層 merge 與重複 `withContentOffset` 結果包進 `useMemo`，dependency 只放 runtime config 來源。完成標準：config 改變時正確重算，snapshot tick 不再重 merge config。
- [x] 3.3 在 `apps/web/src/pages/Solar/index.tsx` 將 flowNodes/connectors/kpis 的 inline style 與 array prop 穩定化，list key 改用穩定 key（`node` 與 `metric` 的既有 stable id）。完成標準：render 輸出位元等價，prop reference 在資料不變時穩定。

## 4. FactoryCircuit page memoization

- [x] 4.1 在 `apps/web/src/pages/FactoryCircuit/index.tsx` 將 `buildFactoryCircuitViewModel(...)` 包進 `useMemo`，dependency 精確列出實際輸入（含 `snapshot` 與來自 API 的 `circuits`）。完成標準：render 輸出不變，既有 FactoryCircuit 測試不需修改即通過。
- [x] 4.2 在 `apps/web/src/pages/FactoryCircuit/index.tsx` 將 `resolvedConfig` merge 與 `powerConnectors` map 結果包進 `useMemo`，dependency 不含 `snapshot`；load rows 的 inline render function 與 key 穩定化。完成標準：connectors/load rows 在資料不變時不重建。
- [x] 4.3 在 `apps/web/src/pages/FactoryCircuit/index.tsx` 把傳給 `Sparkline` 的 `values`（目前以 `.map()` 即時產生）包進 `useMemo`，使 task 1.2 的 `React.memo` 能生效。完成標準：`Sparkline` 的 `values` prop 在來源資料不變時 reference 穩定。

## 5. Verification（render-output invariance gate）

- [x] 5.1 執行 `pnpm --filter @solar-display/web test`，驗證 spec requirement「Existing visual-guardrail tests pass without modification」與「Live data updates remain visible after memoization」：確認全綠且未修改任何既有視覺/行為斷言（含 `displaySurfaceVisualGuardrails`、`displayPageMediaStyle` 等）。若需改既有斷言，停下檢視為非預期 render 變動。
- [ ] 5.2 驗證 spec requirement「Render-output invariance under performance memoization」：對 `/overview`、`/solar`、`/factory-circuit` 執行 `pnpm run fhd:witness -- --base-url <url>`，對照 `docs/reference/FHD/` 確認無新增視覺差異；將 witness/gap notes 摘要寫入本 change artifact。
