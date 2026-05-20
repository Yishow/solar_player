## Context

`Factory Circuit` 目前的數值來源混合如下：

- slot row live power：若 server story 可用，使用 story slot；否則 `buildFactoryCircuitRuntimes()` 依固定 sharePercent 製造 `livePowerKw`
- 目前廠區總用電：story slot sum 或 prototype `1280`
- 太陽能供應占比：`realTimePower / totalPower`
- 今日自發自用電量：`selfConsumptionEnergy` 或 prototype `2430`
- 尖峰負載：`totalPower * 1.45` 或 prototype `1860`
- 目前綠電流向：以 summary freshness / load state 組字串

這條鏈的主要問題不是「頁面沒值」，而是 fallback 太像真值，導致使用者無法知道哪些 kW/% 其實只是維持版型的近似數字。

## Goals / Non-Goals

**Goals**

- 將 slot runtime 與 KPI aggregate 收斂成同一份 server contract。
- 讓 unbound/conflict/stale 狀態可見。
- 移除前端自製 `livePowerKw` 假資料。

**Non-Goals**

- 不變更 page 幾何與 CSS。
- 不做新的 circuit editing UX。

## Decisions

### Move KPI truth to the server

決策：`Factory Circuit` 的 KPI truth 應在 server 端組裝，前端只負責呈現。

理由：目前前端同時負責 story fallback 與 aggregate 推導，太容易把版型 fallback 誤當 production runtime。

### Keep skeletons, not fake live numbers

決策：沒有 slot binding 或 live metric 時，保留 row/card skeleton 與 degraded label，但不生成假 kW。

理由：MVP 可以容忍可讀 fallback，但不能容忍看似精準的錯值。

### Make aggregate provenance explicit

決策：每個 KPI 必須能指出自己是 slot aggregate、MQTT metric、derived formula 或 fallback placeholder。

理由：這是把 `Factory Circuit` 從半 prototype 狀態拉回正式 runtime contract 的必要條件。

## Implementation Contract

1. server runtime SHALL 回傳 `Factory Circuit` slot rows 與 KPI aggregates 的共同 payload。
2. `totalPower`、`solarShare`、`selfConsumption`、`peak` 與 `flow` MUST 帶出 provenance 或 degraded reason。
3. 未綁定或衝突 slot MUST 維持可區分的 empty/unbound state，不得顯示 fabricated live power。
4. 前端 fallback MAY 顯示 skeleton copy，但 MUST 不冒充 live numeric readings。

## Risks / Trade-offs

- 若 aggregate 邏輯只放在前端，後續 diagnostics、device-status 與頁面數值仍會 drift。
- 若完全移除 fallback 而不保留 skeleton，MQTT 暫時斷線時頁面可讀性會過低。
- 若 story payload 不區分 slot-level 與 KPI-level provenance，debugging 仍會困難。
