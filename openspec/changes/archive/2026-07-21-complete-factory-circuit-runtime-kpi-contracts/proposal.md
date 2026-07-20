## Problem

`Factory Circuit` 目前仍混用真實 story slot、socket metric 與 prototype heuristics。`buildFactoryCircuitRuntimes()` 直接用固定百分比分配 `livePowerKw`，KPI 也以 `prototypeTotalLoadKw`、`prototypeSolarShareSourceKw`、`prototypeSelfConsumptionKwh` 補值。這代表畫面上多個 kW / % / kWh 值看起來合理，但其實不一定來自真實後端 runtime。

## Root Cause

目前後端只對 `Factory Circuit` 提供部分 slot story；前端 fallback path 為了維持版型可播放，自己生成假負載值。slot binding contract 已存在，但 KPI provenance contract 尚未補齊。

## Proposed Solution

- 擴充 `Factory Circuit` server runtime contract，讓 slot rows 與 KPI 共用同一份可驗證資料來源。
- 將 `totalPower`、`solarShare`、`selfConsumption`、`peak`、`flow` 的來源改成明確 server-side aggregate 或明確 degraded/fallback state。
- 未綁定 slot 仍可顯示骨架，但不得偽造為正常 live kW 數值。
- 補齊 readiness 與 targeted tests，驗證 conflict、unbound、stale 與 aggregate 缺值情境。

## Non-Goals

- 不重畫迴路 routing board 與 FHD layout。
- 不在這個 change 重新設計 circuit settings CRUD。
- 不把 rotation/offline policy 混進同一個 change。

## Success Criteria

- `Factory Circuit` 每個 load row 與 KPI 都能說明其後端來源或 degraded 原因。
- slot 未綁定、slot 衝突、MQTT 缺值與 aggregate 缺值會反映在頁面與 diagnostics，而不是被 prototype kW 蓋掉。
- 前端不再自行生成看似 live 的 `livePowerKw` 假資料。

## Impact

- Affected code:
  - Modified: `apps/server/src/services/displayStoryService.ts`
  - Modified: `apps/server/src/services/displayReadinessService.ts`
  - Modified: `apps/web/src/pages/FactoryCircuit/index.tsx`
  - Modified: `apps/web/src/pages/FactoryCircuit/viewModel.ts`
  - Modified: `apps/web/src/services/api.ts`
  - Modified: `packages/shared/src/displayReadiness.ts`
  - Modified: `apps/server/src/routes/circuits.ts`
  - Modified: `apps/web/src/pages/FactoryCircuit/*.test.ts*`
  - Modified: `apps/server/src/services/displayStoryService.test.ts`
