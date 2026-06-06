# Overview + Solar Reference Quality Closeout

Change: `polish-overview-solar-reference-quality-targets`
Inputs: `fhd-playback-boundary-classification-2026-06-05.md` + `visual-fidelity-review-2026-06-06.md`
Scope: 只調 `reference-quality-target` 列；shared header/footer 為 `protected-product-choice`，不動。

## Protected Shell Confirmation

- 本 change 未修改 shared shell 檔（header/footer height、footer position、shell density）。
- 未碰 `LayoutShell` 視覺、route group、shell CSS。Solar/Overview 的 header/footer 列維持 `protected-product-choice`，僅確認未變。

## Overview — config before/after（editor-backed）

| Surface | Field | Before | After | 依據 |
| --- | --- | --- | --- |
| Hero photo fade（左緣羽化） | `overviewHeroDefaultMediaEffects.edgeFade.width` | 0.56 | 0.62 | review：左緣 feather 略硬/範圍略窄，放寬一點點（小幅） |
| KPI card padding（上下） | `overviewMetricCardStyle.paddingTop/Bottom` | 20 / 16 | 22 / 18 | review：卡內上下 padding 微增一格 |
| KPI value 字級 | `overviewMetricCardStyle.valueFontSize` | 64 | 68 | review：value 字級微增一格、讓 value 更主導 |

> Baseline = git HEAD（committed）。上一 session 曾把這些值改到 68/22/18 與 fade 0.62 但未同步 snapshot 測試，造成 dirty tree；本 change 將其收斂為單一一致 diff（一格幅度），並更新 `displayPageCardStyleConfig.test.ts`、`displayPageChromeConfig.test.ts` 的 valueFontSize snapshot。

維持不動（review 判定「大致一致／維持即可」）：雙語 title/eyebrow/lead rhythm、gold line / leaf ornament。

### Overview actual-gap

- **無**。Overview 所有 page-content reference-quality-target 皆 editor-backed，已直接 polish。

## Solar — config before/after（editor-backed）

| Surface | Field | Before | After | 依據 |
| --- | --- | --- | --- |
| Connector stroke（三條同步加粗） | `connectorTreatments.solarToInverter/inverterToFactory.strokeWidth` | 9 / 9 | 11 / 11 | review：三條小幅加粗、主線粗的關係正確 |
| Connector stroke（CO2 線） | `connectorTreatments.inverterToCo2.strokeWidth` | 5 | 7 | review：同步加粗、仍細於主線 |
| KPI row 等寬節奏 | `solarKpiLayout[*].{left,width}` | width 330/360/380/330/350、left 不均 | width 全 350、left 52/418/784/1150/1516（pitch 366 均勻） | review：最右 1–2 張對齊成等寬（採用上一 session 未完成的等寬 layout，並同步修 `layout.test.ts`） |

維持不動：hero stage（review：reference 為直角 band、無圓角/外框，current 一致）。

### Solar actual-gap（→ Phase 4 editor-capability，禁止 page-local hardcode / 偷加 schema）

- **Flow node 綠飽和/權重**：review 指 node 偏淡偏 generic、需提高綠飽和；node bg 色屬 CSS，`flowNodeTreatments` 僅有 iconScale/iconLabelGap/valueAlign，無色彩欄位 → actual-gap。
- **Connector 顏色飽和度**：`FlowConnectorTreatmentConfig` 只有 strokeWidth/opacity/radius/lineCap，無 color → 「提高綠/橘飽和」屬 actual-gap。
- **Gold line 基底 left/top/width 與傾斜角**：`index.tsx` page-local hardcode，config 只有 thickness/opacity/offsetY。
- **Leaf ornament 基底 layout（left/top/width/height）**：`index.tsx` hardcode，config 只有 offset/scale/opacity。
- **Hero stage 圓角/框線 treatment**：heroContainer 只含 geometry，無 stage framing 欄位（人工看 02 PNG 確認是否需要）。

## Visual Witness Status

- 本輪完成 config-level before/after 與 focused test 驗證（15/15 pass）。
- **Fresh 1920×1080 視覺 witness 重截批次延到 Phase 2**（五頁一起 `pnpm run fhd:witness`，與 `docs/reference/FHD/01-02` 逐頁比對）；屆時把 Overview/Solar 的 before/after 截圖補進本檔。
- 在取得 fresh runtime parity / publish refresh / fallback witness 前，**Overview/Solar launch status 維持 `blocked`**（見 `display-launch-witness-matrix.md`）。視覺改善不等於 launch-ready。

## Focused Test Gate

```
pnpm --filter @solar-display/web test -- \
  src/pages/Overview/configRender.test.tsx \
  src/pages/Solar/configRender.test.ts \
  src/pages/Solar/layout.test.ts \
  src/pages/displayPageSeeds.test.ts
→ tests 15 / pass 15 / fail 0
```
