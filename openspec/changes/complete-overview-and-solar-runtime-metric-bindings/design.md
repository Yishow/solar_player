## Context

目前兩頁的數值來源實際情況如下：

- `Overview`
  - 即時發電功率：`realTimePower`
  - 今日發電量：`todayGeneration`
  - 累積發電量：`totalGeneration`
  - 今日 CO2 減量：`todayCo2Reduction`
  - 累積 CO2 減量：`totalCo2Reduction`
- `Solar`
  - Flow node 即時功率：`realTimePower`
  - 今日發電量：`todayGeneration`
  - 自發自用比例：`selfConsumptionRatio`
  - 今日減碳量：`todayCo2Reduction`
  - 累積減碳量：`totalCo2Reduction`
  - 系統效率：`systemEfficiency`

但 shared readiness 目前只追：

- `Overview`: `realTimePower`、`todayGeneration`、`totalGeneration`
- `Solar`: `realTimePower`、`systemEfficiency`

這表示畫面實際顯示的至少五個數值沒有被 readiness 或 source contract 完整覆蓋。

## Goals / Non-Goals

**Goals**

- 讓 `Overview` 與 `Solar` 每張數值卡都有明確 source contract。
- 區分 live metric、cumulative counter、derived metric、comparison target 等來源型別。
- 讓 readiness coverage 能反映真實畫面依賴。

**Non-Goals**

- 不改 page layout。
- 不引入新頁型或新 shell。
- 不處理其他三個 display 頁。

## Decisions

### Treat rendered metrics as a declared contract

決策：以頁面實際渲染的 KPI 集合作為 contract 真相，而不是以目前碰巧列在 readiness 裡的 metrics 為準。

理由：使用者問的是「所有 display 數值與後端的連結是否正確或有缺少」，所以需要從 UI rendered values 回推到 server sources，而不是反過來。

### Make provenance explicit in story payloads

決策：story payload 要能指出 value 來源是 live、cumulative、derived 或 fallback。

理由：目前前端只能看到一個字串值，無法區分這是後端真值、近似推導、還是 mock fallback。

### Align readiness with real rendered dependencies

決策：將 `todayCo2Reduction`、`totalCo2Reduction`、`selfConsumptionRatio` 等實際渲染依賴納入 readiness coverage。

理由：否則 readiness 綠燈不代表這兩頁真的能正確播放。

## Implementation Contract

1. `Overview` 與 `Solar` SHALL 為每個 KPI card 宣告對應 metric key、source class 與 fallback behavior。
2. server-side story payload MUST 對每個 returned KPI 保留 binding/freshness/fallback/provenance 等狀態。
3. readiness MUST 覆蓋這兩頁實際渲染的所有數值依賴，而非只覆蓋其中子集。
4. derived metrics 例如 `selfConsumptionRatio` 或 CO2 類指標 MUST 說明依賴哪些基礎輸入或累積 counters。

## Risks / Trade-offs

- 若 story payload 增加 provenance 欄位但前端不消費，診斷價值仍會停在 server 端。
- 若 derived rules 沒有共用位置，Overview/Solar 很容易再次各自重算，造成 drift。
- 若 readiness 與 view model 不共用同一份 metric descriptor，未來新增卡片時仍可能再漏接一次。
