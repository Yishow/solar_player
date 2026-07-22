## 1. Shared playback metric contract

- [x] 1.1 稽核 Solar／Overview client 實際讀取的 live snapshot keys（含 `selfConsumptionEnergy`／`consumptionEnergy` 是否在 client 讀），定案 runtime subscription 集合與 server-only dependency 標記，關閉 design Open Questions；驗證：在測試名稱或 shared 註解留下最終 key 集合，供後續 API 使用
- [x] 1.2 實作 design Decision: 以既有 displayReadiness + displayPageFreshness 為 contract 核，不另起平行 registry，以及 Decision: 區分 gate keys、runtime subscription keys、display binding metadata 與 Implementation Contract 的 Interface / data shape：匯出 `resolvePlaybackRuntimeMetricKeys`（或同等）與 Overview／Solar display sourceClass descriptors，滿足 Shared package owns Overview and Solar playback metric contract 與 Runtime subscription keys are exported for Overview and Solar consumers；驗證：shared 測試斷言 overview／solar 三層非空、unknown page 空且不 throw（Failure modes；Unknown page key is empty and safe）
- [x] 1.3 實作 Decision: sourceClass 對齊表（Overview／Solar）與 Derived and aggregate metrics MUST NOT be labeled mqtt-live：Behavior 上 KPI sourceClass 符合表（`todayGeneration`／`todayCo2Reduction`=`derived-metric`，直接 MQTT=`mqtt-live`，cumulative 不為 mqtt-live）；驗證：shared 表格測試 = Acceptance criteria 中 sourceClass 斷言
- [x] 1.4 鎖定 Materialized upstream dependencies remain explicit in the contract：gate 層保留 factory generation dependencies，runtime 可僅 canonical；驗證：shared 測試比較 gate vs runtime 差異集合

## 2. Overview／Solar runtime 消費 shared

- [x] 2.1 實作 Decision: Overview／Solar runtime 改讀 shared，保留 selector isolation 形狀（Overview）：Overview and Solar runtime subscriptions consume shared playback metric contract keys，訂閱集合等於 shared overview runtime keys，移除 page-local 權威陣列；驗證：`apps/web/src/pages/Overview/runtimeIsolation.test.tsx` 通過（Shared-backed keys preserve isolation on value-only updates）
- [x] 2.2 同上 Decision 套用 Solar（含 1.1 energy keys 策略），移除 page-local 權威陣列；驗證：`apps/web/src/pages/Solar/runtimeIsolation.test.tsx` 通過

## 3. Story／viewModel sourceClass 對齊

- [x] 3.1 server display-story Overview／Solar bindings 滿足 Overview story and fallback bindings use contract-aligned sourceClass values 與 Overview and Solar monitoring bindings keep sourceClass consistent with readiness semantics；驗證：直跑 `apps/server/src/services/displayStoryService.test.ts`（或同等 sourceClass 測試）exit 0
- [x] 3.2 Overview／Solar fallback viewModel 在 story 缺席時使用 contract sourceClass；驗證：web viewModel 測試斷言 sourceClass 並通過

## 4. Readiness、TDD 回歸與 Scope

- [x] 4.1 滿足 Readiness gate metric requirements remain the single gate-facing contract for Overview and Solar 與 Scope boundaries：不新增 skip reason、不改 overview／solar gate requirement 語意（除非測試證明必須且 playable 不變）；驗證：既有 readiness／rotation 測試通過 + rg 無新 skip reason
- [x] 4.2 執行 Decision: 測試策略（TDD）與 Acceptance criteria 全套：shared contract／freshness、Overview／Solar isolation、displayStoryService、viewModel；驗證：所列命令皆 exit 0（server 頂層注意直跑）

## 5. 收尾（Decision: 範圍只含 Overview + Solar；FC／Sustainability 列 follow-up）

- [x] 5.1 確認 Scope boundaries in-scope 完成：Overview／Solar runtimeContent 無平行權威 key 陣列，shared 已 export contract API；驗證：rg + 測試
- [x] 5.2 記錄 Decision: 範圍只含 Overview + Solar；FC／Sustainability 列 follow-up 與 Non-Goals follow-up（Factory Circuit、Sustainability、ops 診斷 UI），本 change 不實作；驗證：change 筆記或 PR 描述有文字
