## Problem

`Overview` 與 `Solar` 雖然已經吃 `/api/display-story`，但顯示數值與 readiness coverage 仍未完整對齊。`Overview` 實際顯示五個 KPI，readiness 只追三個；`Solar` 實際顯示即時功率、今日發電量、自發自用比例、今日減碳、累積減碳、系統效率，但 readiness 只追 `realTimePower` 與 `systemEfficiency`。目前頁面看起來有值，不代表所有 card 都真的被後端契約覆蓋。

## Root Cause

`displayStoryService`、`displayReadinessService`、`Overview/Solar` view model 是分批演進的。server 已經能產出部分 story payload，但沒有一份 page-level metric coverage contract 強制「每張數值卡都要有來源、derived rule 與缺值語意」。

## Proposed Solution

- 為 `Overview` 與 `Solar` 建立完整的數值來源盤點與 contract，逐卡定義資料來源是 live MQTT、cumulative counter、derived metric 還是 comparison target。
- 讓 server story payload 對每個 KPI 回傳可驗證的 binding/provenance/fallback 狀態，而不是只有 value。
- 補齊 readiness coverage，使它能反映實際渲染中的 metrics，不再只覆蓋部分 card。
- 補齊 targeted tests，驗證 story payload、derived values 與 missing mapping 行為。

## Non-Goals

- 不改 `Overview`、`Solar` 的 reference 對齊幾何與 CSS。
- 不在這個 change 處理 `Factory Circuit`、`Sustainability` 或 `Images`。
- 不把 rotation/offline fault policy 併入同一個 change。

## Success Criteria

- `Overview` 與 `Solar` 每個展示數值都能對應到明確後端來源或明確 derived rule。
- readiness 報告與頁面實際顯示的 metrics 一致，不再漏報 CO2、自發自用比例等依賴。
- 當 mapping 缺失或 derived input 不足時，頁面呈現可讀 degraded state，而不是靜默套用 mock 值。

## Impact

- Affected code:
  - Modified: `apps/server/src/services/displayStoryService.ts`
  - Modified: `apps/server/src/services/displayReadinessService.ts`
  - Modified: `packages/shared/src/displayReadiness.ts`
  - Modified: `apps/web/src/pages/Overview/index.tsx`
  - Modified: `apps/web/src/pages/Overview/viewModel.ts`
  - Modified: `apps/web/src/pages/Solar/index.tsx`
  - Modified: `apps/web/src/pages/Solar/viewModel.ts`
  - Modified: `apps/web/src/services/api.ts`
  - Modified: `apps/web/src/pages/Overview/*.test.ts*`
  - Modified: `apps/web/src/pages/Solar/*.test.ts*`
