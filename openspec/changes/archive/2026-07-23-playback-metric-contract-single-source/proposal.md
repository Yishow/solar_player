## Why

Playback 頁與 MQTT／live metrics 的關聯被拆成三套各自維護的清單（readiness／freshness gate、各頁 runtime 訂閱 key、story／viewModel binding），導致同一 metric 的 `sourceClass`、dependency 與是否訂閱不一致，排查「數字從哪來／為何 skip」成本高。需要先把 Overview 與 Solar 的 metric 契約收斂成 shared 單一真相，讓後續 Factory Circuit／Sustainability 與 ops 診斷有穩定基礎。

## What Changes

- 新增 capability：定義 per-page playback metric contract（requirementKey、metricKey、sourceType、dependencyKeys、runtime subscription keys）的單一 shared 契約與匯出 API
- Overview／Solar 的 runtime 訂閱清單改為消費 shared 匯出，刪除 page-local 硬編碼 metric key 陣列（在不破壞 value-refresh isolation 的前提下）
- Overview／Solar 的 viewModel／server story binding 的 `sourceClass` 與 readiness 對齊（derived 標 derived，不再把 aggregate／derived 標成 mqtt-live）
- 既有 freshness／readiness／rotation 行為語意維持；本 change 以「清單與語意單一真相」為主，不改 MQTT 連線、socket protocol、輪播 policy 數值
- 補 shared／web 測試，鎖定 Overview／Solar 契約與 runtime 消費一致

## Capabilities

### New Capabilities

- `playback-metric-contract`: 定義 playback 頁（本 change 先涵蓋 Overview、Solar）的 metric 契約單一真相：gate requirements、runtime subscription keys、display sourceClass 語意對齊，以及可驗證的匯出 API

### Modified Capabilities

- `playback-overview-solar-value-refresh-isolation`: Overview／Solar runtime 訂閱來源改為 shared contract 匯出，仍須維持 value-only refresh 時 static subtree 穩定
- `overview-story-metric-binding`: Overview KPI binding 的 sourceClass／dependency 語意須與 shared contract／readiness 一致
- `display-monitoring-story-model`: Solar／Overview monitoring story binding 不得再以與 readiness 衝突的 sourceClass 描述同一 metric
- `display-readiness-checks`: 澄清 readiness requirement 清單即 contract 的 gate 面向；不新增 skip reason，但要求 consumer 不得平行維護另一套 page metric keys

## Impact

- Affected specs: `playback-metric-contract`（new）；`playback-overview-solar-value-refresh-isolation`、`overview-story-metric-binding`、`display-monitoring-story-model`、`display-readiness-checks`（modified）
- Affected code:
  - New: `packages/shared/src/playbackMetricContract.ts`（薄 wrapper：消費既有 `displayReadiness.ts`／`displayPageFreshness.ts`，匯出 contract 三層 API，不重寫底層 registry）
  - Consumed unchanged: `packages/shared/src/displayReadiness.ts`、`packages/shared/src/displayPageFreshness.ts`、`packages/shared/src/displayStory.ts`（design Decision 1 採薄 wrapper，未直接修改這些檔）
  - Modified: `packages/shared/src/index.ts`（re-export contract API）
  - Modified: `apps/server/src/services/displayStoryService.ts`（Overview／Solar binding sourceClass 改讀 contract resolver）
  - Modified: `apps/web/src/pages/Overview/runtimeContent.tsx`、`apps/web/src/pages/Solar/runtimeContent.tsx`（runtime keys 改消費 shared resolver）
  - Modified: `apps/web/src/pages/Overview/viewModel.ts`、`apps/web/src/pages/Solar/viewModel.ts`（fallback binding sourceClass 改讀 contract resolver）
  - New: `apps/web/src/pages/shared/playbackMetricContract.test.ts`（contract 行為鎖定；repo 無 shared test runner，故落點在會執行的 web suite）
  - Modified: existing Overview／Solar tests that assert sourceClass（displayStoryService.test.ts、Overview/Solar viewModel.test.ts）
  - Removed: page-local Overview／Solar runtime metric key constant arrays（由 shared export 取代）
