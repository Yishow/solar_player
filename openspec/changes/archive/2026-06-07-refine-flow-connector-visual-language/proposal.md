## Why

先前的 polish/SVG 工作讓 Solar 與 Factory 的 flow 走線「不精緻且不一致」：Solar connector 被加粗到 11px 顯得 chunky；Factory routing 換成 SVG 後第一版 fan-out 是單點噴射、且用較亮的 `#6f9b5a`。reference（`docs/reference/FHD/02`、`03`）的 flow 走線是**細、柔、結構化、跨頁一致**的 sage green。本 change 把兩頁的 flow 走線統一成 reference 的細緻語言。

## What Changes

- Solar：connector strokeWidth 由 11/11/7 收細為 6/6/4（保留主線粗於 CO2 線的關係）；維持既有 `#527d3b` sage 顏色（CSS）。
- Factory：SVG routing strokeColor 由 `#6f9b5a` 改為與 Solar 一致的 `#527d3b`；負載 fan-out 由單點 bezier 噴射改為**結構化 comb**（靠近負載的垂直 bus + 短分支），貼近 reference 的樹狀走線。
- 對應 focused tests 與 fresh witness。

## Non-Goals

- 不改 shell、route、API、資料模型；不碰其他頁。
- 不處理 node 飽和 / palette / 字級（屬 `extend-*` changes）。
- 不宣告 launch-ready。

## Capabilities

### New Capabilities

- `refined-flow-connector-language`: A unified thin sage-green flow-connector treatment across Solar and Factory, with structured Factory routing, matching FHD reference refinement.

## Impact

- Modified: `apps/web/src/pages/Solar/displayPageConfig.ts`、`apps/web/src/pages/FactoryCircuit/displayPageConfig.ts`、`apps/web/src/pages/FactoryCircuit/index.tsx` 與對應 *.test.ts。
