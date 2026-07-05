## Context

`useLiveMetrics()` 目前在頁面層維護完整 `LiveMetricsSnapshot` 與 socket connection state。`Overview`、`Solar`、`FactoryCircuit` 三個 playback 頁直接在 page component 內消費這個完整 snapshot，因此每次 `liveMetrics:update` 都會把頁面層 render 邊界一起帶動，即使大部分 static shell、hero、ornament、connector、layout 與 card shell 並未依賴變動中的 metric。

先前的 `optimize-display-runtime-render-memoization` 已把 viewModel 建構、config merge、style props 與 shared display primitives 做過一輪 memoization，並建立 `display-runtime-render-invariance` 等 guardrail。但目前的主要剩餘成本不是單純「缺少 memo」，而是 live metrics 的訂閱粒度仍過大。既有 specs 也已明確要求 `Overview` / `Solar` 保持 static subtree 穩定、`FactoryCircuit` 保留 circuits/story refresh boundary、以及 render output / FHD witness 不得因效能優化漂移。

這次 change 的限制很明確：
- 不改 server API、socket event 名稱或 payload shape。
- 不順手改 `Images`、`Sustainability`、management surfaces。
- 不接受只換來 CPU 降幅、卻破壞 fallback、loading guard、story refresh 或 FHD 視覺等既有契約。

## Goals / Non-Goals

**Goals:**

- 將 playback live metrics 的更新邊界縮小到實際依賴該值的 consumers，避免 `Overview`、`Solar`、`FactoryCircuit` 每次收到完整 snapshot 都重跑大範圍 page render。
- 保留 `useLiveMetrics()` 既有對外契約，讓非目標頁面與既有呼叫端可以在不一次性重寫的前提下繼續工作。
- 讓 `Overview`、`Solar`、`FactoryCircuit` 的 static shell 與 value-bearing subtree 明確分離，滿足既有 refresh isolation 與 runtime boundary specs。
- 以 regression-first 方式驗證 selector equality、live updates、fallback state、render invariance 與 FHD witness，確保效能優化不造成機能回歸。

**Non-Goals:**

- 不引入新的 socket channel、server-side diff payload、或 API selector endpoint。
- 不把所有 `useLiveMetrics()` 呼叫端一次改成 granular subscription；本 change 只要求三個 playback 頁率先採用。
- 不重寫 `useDisplayStoryRuntime()`、`useDisplayPageConfig()`、weather polling、MQTT status bootstrap 或 `FactoryCircuit` 的 circuits API fallback。
- 不做視覺調整、layout 微調、card family polish 或 witness 參考圖重分類。

## Decisions

### Add a shared selector-based live metrics store with `useSyncExternalStore`

決策：在 web 端新增 shared live metrics store，統一保存最新 `LiveMetricsSnapshot` 與 socket connection state，並以 `useSyncExternalStore` 為基礎提供 selector-based 訂閱介面。

理由：
- `useSyncExternalStore` 是 React 內建 external-store contract，不需要額外依賴，足以支撐 selector-scoped 訂閱。
- 與 page-level `useState` 相比，shared store 能把 snapshot 寫入與 consumer render 邊界拆開，讓只有被選中的值才驅動對應 consumer 更新。
- 這個做法保留未來把其他 playback 或 support 頁逐步切到 granular subscription 的延展空間，而不要求這次就全域改完。

替代方案：
- page-level subtree split only：風險最低，但 page 本體仍會在每次 snapshot 時進入 render，CPU 改善有限。
- 新增第三方 state library：沒有必要，且會擴大依賴面與驗證面。
- server-side diff / metric-specific event：會改動 runtime contract，超出 scope。

### Keep `useLiveMetrics()` as a compatibility wrapper while adding granular hooks

決策：保留 `useLiveMetrics()` 既有對外 shape，內部改成讀 shared store；另外新增 granular hooks 給目標 playback 頁使用，例如選取 metric reading、selected values 與 connection state。

理由：
- 這可避免一次推倒 `EnergyTrend`、`OfflineError`、settings pages 或其他尚未優化的呼叫端。
- source-level tests 與 page wiring 可以漸進調整，而不是因為 hook 更名造成大面積非必要 diff。
- `useLiveMetrics()` 可以作為 fallback / compatibility lane，降低 rollout 風險。

替代方案：
- 直接刪除 `useLiveMetrics()`、全面換新 hook：blast radius 過大，且與使用者要求的「修正後確保所有機能無誤」相衝突。
- 繼續只提供完整 snapshot hook：達不到這次的效能目標。

### Split Overview and Solar into static shells and live value-bearing subtrees

決策：`Overview` 與 `Solar` 採 page-local boundary 拆分。page component 保留 static shell、runtime config、story runtime、hero media、ornament、layout；即時數值、story-derived values、phase table、trend、alerts 與 KPI value rows 移到只訂閱必要 live inputs 的 subtree。

理由：
- 這兩頁已經有既有 spec 明確要求 static subtree 在 value refresh 下保持穩定，拆 boundary 符合既有 product contract。
- 直接在 page-local 完成拆分，可以避免過早抽象成跨頁 generic runtime framework。
- `Overview` 先行可同時覆蓋 KPI、weather、phase、trend、alerts，多數 selector 風險都能在第一頁暴露。

替代方案：
- 抽全新的跨頁 display runtime orchestration 層：重構成本過大，與最小變動原則不符。
- 只靠更細的 `useMemo`：無法消除 page component 因完整 snapshot 訂閱而持續進入 render 的問題。

### Retain Factory Circuit circuits/story refresh boundaries and layer selector isolation on top

決策：`FactoryCircuit` 維持目前的 `circuits` API fallback、`useDisplaySyncRefresh()`、`useDisplayStoryRuntime()` 與 last-known usable state contract；live metrics 優化只加在 metric consumption boundary，不改現有 circuits/story refresh 拓樸。

理由：
- `FactoryCircuit` 已有獨立 specs 保護 circuits refresh 與 story refresh 的邊界，以及 refresh fail 後保留可用狀態的 contract。
- 若這次把 circuits fallback、story runtime 與 live metrics 一起重寫，風險會從效能優化膨脹成 runtime architecture rewrite。
- 將 live metric consumption 變細，不代表要破壞既有 page-local fallback lane；兩者必須分開。

替代方案：
- 把 circuits/story/runtime 全部收進同一個 selector store：不符合現有 boundary specs，也會增加 stale state 風險。

### Preserve behavior-level guardrails while allowing implementation-detail test updates

決策：render invariance、visual guardrail、FHD witness 與 runtime behavior assertions維持為主要驗證門檻；若既有 source-level tests 只是硬綁 `useLiveMetrics()` 文字或 page 內部 hook 位置，可調整為驗證新 contract，而不是把舊實作細節凍成不可改。

理由：
- 這次 change 的核心是改 subscription boundary；若所有測試都必須保留舊 internal shape，會把實作卡死在舊成本模型。
- 真正不能退的是 observable behavior、fallback contract、visual output，而不是 hook 名稱或 page file 中的字串位置。

替代方案：
- 嚴格禁止任何既有測試修改：會讓 implementation-detail assertions 阻止合理的架構優化。
- 放寬所有既有測試：會失去 guardrail，不可接受。

## Implementation Contract

**Behavior:**
- `Overview`、`Solar`、`FactoryCircuit` 在收到 live metrics、story payload 或 connection state 更新時，只有實際依賴該更新的 subtree 重新渲染。
- 三頁的 static shell、hero、layout、connector、ornament、card shell、fallback messaging、loading guard、story runtime 與 circuits fallback 仍維持既有使用者可見行為。
- 對於與頁面無關或與某個 subtree 無關的 metric 更新，該 subtree 不應被迫重建，且頁面輸出不得出現新的視覺差異或 stale 值。

**Interface / data shape:**
- 既有 `useLiveMetrics()` hook SHALL 維持目前回傳 shape：`connectionState`、`isSocketConnected`、`lastUpdatedAt`、`snapshot`。
- 新增的 shared store SHALL 至少保存兩類 state：最新 `LiveMetricsSnapshot` 與 socket connection state。
- 新增的 granular hooks SHALL 允許 consumer 選取單一 metric reading、衍生值或 connection state，而不要求 consumer 讀取整個 snapshot。
- `socket.ts` 對外 socket contract、event names、payload shapes SHALL 維持不變；變更只限於 web 端如何把收到的事件寫入 shared store。

**Failure modes:**
- 若 selector equality 或訂閱邏輯錯誤，風險是畫面 stale 或無關 subtree 仍過度重 render。這必須由 store tests、page regression tests 與 render invariance checks 捕捉。
- 當 metric 缺值、socket 斷線、story fallback 或 circuits refresh 失敗時，頁面 SHALL 繼續沿用既有 degraded / fallback 表現，不得因 store refactor 額外清空可用畫面。
- 引入 shared store SHALL NOT 產生額外 socket client、重複 bootstrap 請求或新的 runtime refresh source。

**Acceptance criteria:**
- store / selector 測試覆蓋：selected metric 更新、無關 metric 更新不誤觸、connection state 更新、legacy full-snapshot hook compatibility。
- `pnpm --filter @solar-display/web test` 綠燈；涉及 observable behavior 的既有 assertions 不因本 change 被放寬。
- `pnpm run build` 綠燈。
- `pnpm run fhd:witness -- --base-url <url>` 對 `/overview`、`/solar`、`/factory-circuit` 產生 fresh witness，對照 `docs/reference/FHD/` 無新增差異。

**Scope boundaries:**
- In scope：web-side live metrics store、`useLiveMetrics()` compatibility refactor、`Overview` / `Solar` / `FactoryCircuit` live-subtree isolation、相關 regression tests 與 invariance verification。
- Out of scope：server socket payload redesign、`Images` / `Sustainability` playback optimizations、settings / management surface optimizations、display story schema changes、visual redesign。

## Risks / Trade-offs

- [Selector equality 寫錯導致 stale render] → 先補 store-level failing tests，再做頁面切換；每頁至少覆蓋 selected-value update 與 unrelated update 兩種情境。
- [相容層與 granular hooks 並存，短期內有雙軌 API] → 僅把雙軌範圍限制在本 change 需要的頁面；`useLiveMetrics()` 保留是為了降低 blast radius，不是長期鼓勵雙軌擴散。
- [Factory Circuit 同時受 circuits、story、live metrics 三條來源影響，最容易踩 stale boundary] → 最後才切 `FactoryCircuit`，且明確禁止順手改 circuits/story refresh topology。
- [source-level tests 反映舊 internal wiring 而不是 observable contract] → 允許必要的 contract-level test rewrite，但 visual / behavior guardrails 仍須維持或增強。
- [page-local subtree 拆分增加檔案內部結構複雜度] → 優先用 page-local subcomponents 或小型 hooks，避免提早抽成跨頁 generic runtime layer。

## Migration Plan

- 本 change 不涉及資料庫、API 或持久化設定 migration。
- rollout 方式為純前端內部替換：先導入 store 與相容層，再逐頁切換 consumer，最後跑 witness 驗證。
- 若 rollout 中發現 selector 邊界造成 stale rendering，可直接回退到 `useLiveMetrics()` page-level consumer，因為相容層會被保留到 change 完成。

## Open Questions

- 無阻塞性 open questions。若實作時發現某頁必須跨出 page-local subtree 才能滿足 isolation 契約，應回到此 design 補 decision，而不是在 apply 階段擴 scope。
