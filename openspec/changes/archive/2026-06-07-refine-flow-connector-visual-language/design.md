## Context

Solar connectors 是 CSS bar（`.solar-connector`，color `#527d3b`，height 由 `--display-flow-connector-stroke-width` 即 treatment.strokeWidth 控制）。Factory routing 是本 repo 新做的 inline SVG（`routingPaths` → `<path>`），stroke 來自 resolved connectorTreatments。兩者目前粗細/顏色/結構不一致。

## Goals / Non-Goals

**Goals:** 統一為細、柔、結構化的 sage flow 語言；Solar 收細；Factory 對齊顏色並改 comb fan-out。
**Non-Goals:** 不改 node 飽和/palette/字級、不碰其他頁、不改 shell/API。

## Decisions

### Unified sage color `#527d3b`
採用 Solar 既有的 `#527d3b`（reference-like sage）為統一色。Factory SVG strokeColor 從 `#6f9b5a` 改為 `#527d3b`。Solar 顏色維持 CSS `#527d3b` 不變。

### Thin Solar connectors
Solar connectorTreatments strokeWidth 11/11/7 → 6/6/4，保留 main(6) > co2(4)。

### Structured Factory comb fan-out
負載 fan-out 改為 comb：自 boardRight 水平 trunk 至接近負載的 busX（負載 left − 30），於 busX 形成垂直 bus，再以短分支接到各 loadRow anchor。取代單點 bezier 噴射。power connectors（solar→inverter、inverter→board）維持直線。

## Implementation Contract

**Observable behavior:** Solar 與 Factory 的 flow 走線都呈現細的 sage 線；Factory 負載分支為結構化 comb（共用垂直 bus），整體更貼近 reference 且兩頁一致。

**Interface / data shape:** 只調 connectorTreatments seed 值、Factory SVG path 推導與 focused tests。strokeWidth/strokeColor 皆來自既有 resolved connectorTreatments（editor-maintainable）。

**Failure modes:** 幾何需用 resolved node/loadRow config，不得 hardcode 絕對座標 path。

**Acceptance criteria:** Solar/Factory focused tests 通過；full web + build 綠；fresh witness 顯示細緻一致的走線。

**Scope boundaries:** 無 API、無 schema、無其他頁、無 shell。

## Risks / Trade-offs

- [Risk] busX 太靠近負載導致 trunk 過長 → 取負載 left − 30，trunk 為 board→bus，分支短，視覺乾淨。
- [Risk] Solar 箭頭（::after 固定 11px）與細 bar 比例 → 箭頭略大於線屬可接受的指向裝飾；如需再調另記。
