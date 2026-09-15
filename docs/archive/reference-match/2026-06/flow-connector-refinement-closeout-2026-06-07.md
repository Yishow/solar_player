# Flow Connector Refinement Closeout — 2026-06-07

Change: `refine-flow-connector-visual-language`
觸發：使用者回報先前 polish/SVG 讓 flow 走線「不精緻且不一致（normal → near ugly）」。

## Before / After（git HEAD baseline = 先前 commit 狀態）

| Surface | Field | Before | After | 依據 |
| --- | --- | --- | --- |
| Solar connector 主線 | `connectorTreatments.solarToInverter/inverterToFactory.strokeWidth` | 11 / 11 | 6 / 6 | 先前加粗到 11 顯 chunky；收細貼近 reference 細線 |
| Solar connector CO2 線 | `connectorTreatments.inverterToCo2.strokeWidth` | 7 | 4 | 同步收細，保留 main>co2 |
| Factory routing 顏色 | `connectorTreatments.*.strokeColor` | `#6f9b5a` | `#527d3b` | 統一為 Solar 既有 sage，跨頁一致 |
| Factory 負載 fan-out | `index.tsx` routing path | 單點 bezier 噴射 | 結構化 comb（負載旁垂直 bus + 短分支） | 貼近 reference 樹狀走線 |

Solar 顏色維持 CSS `#527d3b`（原本就是 reference-like sage，未動）。

## Witness

- run `refine-v1`：`/solar`、`/factory-circuit` 重截。
- Solar：connector 由 chunky 變細、sage、附箭頭，貼近 reference 02。
- Factory：fan-out 由噴射變結構化 comb（共用垂直 bus + 短支），thin sage，貼近 reference 03。
- 兩頁 flow 語言現在一致。

## 仍未處理（屬其他 change）
- node tile 綠飽和、整頁暖綠 palette、字級、hero 質感 → `extend-display-editor-ornament-and-media-controls`、`extend-typography-palette-and-fix-ornament-bindings`。
- launch status 維持 `blocked`（僅視覺改善）。

## Gate
```
pnpm --filter @solar-display/web test → 495 pass
pnpm run build → exit 0
spectra validate --strict → valid
```
