## Context

`/solar` 已完成 FHD 版型、hero、flow nodes、connectors 與 KPI composition，但目前頁面仍直接從 `useLiveMetrics()` 組 flow state、comparison 與 KPI 文案。server 端其實已經提供 `/api/display-story` 的 `solar` payload，包含 flow state 與 comparison context。

所以這個頁面的 MVP 缺口也不是新能力，而是播放端尚未正式消費共享 story contract。若不補上，Solar 會繼續維持 page-local 推導，和 server diagnostics 看到的 story 狀態可能不一致。

## Goals / Non-Goals

**Goals**

- 讓 `/solar` 以 `/api/display-story` 的 `solar` payload 作為 flow nodes、KPI 與 comparison 的主要來源。
- 保留既有 hero、connector、node 幾何與 display page config，不重做視覺。
- 保留 comparison target 缺值、flow 降級與 request failure 時的 readable fallback。
- 補齊 Solar route adapter 與 targeted tests。

**Non-Goals**

- 不重做 `Solar` 的 reference alignment。
- 不新增新的 solar backend endpoint 或新 socket schema。
- 不把 `Overview`、`Solar`、`Factory Circuit` 合併成一個 monitoring umbrella change。

## Decisions

### Use the server-composed solar story as the single playback source of truth

決策：`/solar` 播放頁直接消費 server 組好的 `solar.kpis` 與 `solar.story.flowState`。

理由：comparison target、flow degradation 與 freshness 已在 shared contract 內定義，前端重算只會產生第二套規則。

### Preserve node geometry and media config as page config concerns

決策：Solar 的 hero、nodes、connectors 與 KPI 幾何仍由 page config 決定，story payload 不承擔畫面座標責任。

理由：這樣可以保持 editor/config 與 runtime data 的邊界清楚。

### Treat missing comparison targets as a fallback state, not a render blocker

決策：comparison target 缺值或部分 metric 不完整時，頁面顯示 predictable fallback，而不是整頁進入錯誤狀態。

理由：這頁本質上是 story-driven playback surface，不應因單點 comparison 缺值失去播放能力。

## Implementation Contract

1. `/solar` SHALL 以 `/api/display-story` 的 `solar.kpis` 與 `solar.story.flowState` 作為主要播放資料來源。
2. page-local flow 與 KPI 推導邏輯 SHALL 收斂成 shared story adapter，而不是在 route 內重算第二份 business logic。
3. `Solar` 的 hero、node、connector 與 KPI layout MUST 維持既有 FHD 幾何與 display page config 邏輯。
4. 當 comparison target 缺值、單一 KPI 缺讀值或 request 失敗時，頁面 MUST 保留完整畫面並提供可讀 fallback。
5. targeted tests SHALL 覆蓋正常、comparison 缺值、flow degraded 與 request failure 情境。

## Risks / Trade-offs

- 若 flow state 仍部分由前端重算，server 與 page 顯示可能不一致。
- 若把 comparison 文案寫死在 JSX，之後 story contract 調整時容易破版。
- 若沒有驗證 degraded / missing target 情境，demo 時很容易出現空 comparison 區塊。
