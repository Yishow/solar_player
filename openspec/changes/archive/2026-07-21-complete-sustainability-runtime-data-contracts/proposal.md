## Problem

`Sustainability` 目前的 runtime 仍以 `system_settings.sustainability_story` 與 page-local mocks 混合組裝。頁面上還有 `NT$ 60 M+`、固定 ESG bullets、固定 `較去年成長 2.1%` 等靜態值。另一方面，readiness 追的是 `consumptionEnergy` 與 `selfConsumptionEnergy`，但畫面真正展示的是累積發電量、累積減碳量、年度節能成效與植樹等值，coverage 並未對齊。

## Root Cause

`Sustainability` 被當成「故事頁」先做出 presentation contract，但沒有把 manual modules、derived big numbers、provenance 與 readiness 定義成同一份正式資料模型。因此現在看似 runtime-driven，實際上仍有多處寫死文案與數值。

## Proposed Solution

- 把 `Sustainability` 拆成三類正式來源：derived aggregate numbers、editorial story modules、provenance metadata。
- 讓 big numbers 優先來自 server-side counters/rollups，manual modules 則走可持久化 story module contract。
- 移除 page-local mock summaries/highlights 與硬寫死成長數值，改由 payload 顯式提供或顯式缺值。
- 補齊 readiness/diagnostic coverage，讓它對應實際渲染的 sustainability indicators。

## Non-Goals

- 不重做 `Sustainability` 頁面的美術與 layout。
- 不在這個 change 引入新的外部 ESG CMS。
- 不處理 playback shell、offline shell 或 security boundary。

## Success Criteria

- `Sustainability` 各數值卡、highlight rail、provenance 區塊都有明確資料來源與 missing semantics。
- 頁面不再靠 page-local mock 或靜態 hardcoded 數值補足 production runtime。
- readiness 與 diagnostics 能指出哪個 sustainability indicator 缺少上游資料或尚未配置。

## Impact

- Affected code:
  - Modified: `apps/server/src/services/sustainabilityStoryService.ts`
  - Modified: `apps/server/src/services/displayReadinessService.ts`
  - Modified: `packages/shared/src/displayReadiness.ts`
  - Modified: `apps/web/src/pages/Sustainability/index.tsx`
  - Modified: `apps/web/src/pages/Sustainability/viewModel.ts`
  - Modified: `apps/web/src/services/api.ts`
  - Modified: `apps/server/src/services/MetricsAccumulatorService.ts`
  - Modified: `apps/web/src/pages/Sustainability/*.test.ts*`
