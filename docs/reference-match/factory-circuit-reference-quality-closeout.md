# Factory Circuit Reference Quality Closeout

Change: `polish-factory-circuit-reference-quality-targets`
Inputs: `fhd-playback-boundary-classification-2026-06-05.md` + `visual-fidelity-review-2026-06-06.md`
Scope: 只調 `reference-quality-target` 列；shared header/footer 為 `protected-product-choice`，不動。

## Protected Shell Confirmation

- 本 change 未修改 shared shell 檔（header/footer height、footer position、shell density）。
- 未碰 `LayoutShell`、route group、shell CSS。Factory header/footer 維持 `protected-product-choice`，僅確認未變。

## Editor-Backed Tuning Result（this round）

對照 review 與分類表，Factory Circuit 本輪**沒有需要調整的 editor-backed reference-quality-target 值**：

| Surface | 分類 measured（=current） | review 判定 | 動作 |
| --- | --- | --- | --- |
| Flow node geometry | nodes 已對齊 measured | 大致一致 | 不動 |
| Node icon scale/label/value align | iconScale 1、align center | 大致一致 | 不動 |
| Load panel geometry + row rhythm | 1392,146 470x580；6 rows pitch 95 | 維持「從屬展示」，未退化成管理表格 | 不動 |
| Leaf ornament opacity/scale | seed opacity 0.38 | 「淡浮水印，大致一致，不需大改」 | 保持 0.38，不動 |
| Gold line | height 2 opacity 1 | review 未指偏差 | 不動 |
| Hero/KPI typography（config 部分） | 大致一致 | 大致一致 | 不動 |

> 結論：所有 Factory page-content 的可見質感差距都落在 actual-gap（CSS/PNG，無 config 欄位），不是 editor-backed 值可表達。本輪不做無依據的數值調整（避免假性 polish），真正的 Factory 質感提升（可調 circuit 線寬）改由 Phase 4 editor-capability change 處理。

## Actual-gap（→ Phase 4 editor-capability / bug fix，禁止 page-local hardcode）

- **電路線條粗細（最大 blocker）**：可見 routing 線烘焙進 `.factory-circuit-routing-reference` PNG 點陣，非 config 驅動 SVG stroke；`connectorTreatments.strokeWidth`（seed 16）量不到對應渲染。review 指扇出線「明顯偏細/偏淡、幾乎看不清，需加粗（中–高幅度）」。→ 另開 change 評估把 routing 換成可調 SVG，禁止偷加 schema 或 page-local CSS。
- **Node tile 綠飽和**：review 指 node tile 整體略淡、需小幅提綠飽和；node bg 色屬 CSS，`flowNodeTreatments` 無色彩欄位。
- **KPI value/title 字級、hero copy-en 字級、line-leaf/leaf-vine opacity**：寫死於 `factoryCircuit.css` custom props，無 config 欄位。
- **Leaf opacity binding 疑異**：seed 0.38 vs DOM 實測 watermark img opacity 1，套用點可能不一致（潛在 binding bug）。視覺上 review 判為「大致一致」，故本輪不改 opacity 值；binding 套用點留 Phase 4 程式追查。

## Visual Witness Status

- 本輪確認 Factory focused 測試綠（config render / layout / vocabulary / card family / seed），未動任何 editor-backed 值。
- **Fresh 1920×1080 視覺 witness 重截批次延 Phase 2**（與 `docs/reference/FHD/03` 逐頁比對），屆時補 before/after。
- 取得 fresh runtime parity / publish refresh / fallback witness 前，**Factory launch status 維持 `blocked`**。視覺改善 ≠ launch-ready。

## Focused Test Gate

```
pnpm --filter @solar-display/web test -- \
  src/pages/FactoryCircuit/configRender.test.ts \
  src/pages/FactoryCircuit/layout.test.ts \
  src/pages/FactoryCircuit/nodeVocabulary.test.ts \
  src/pages/FactoryCircuit/cardFamily.test.ts \
  src/pages/displayPageSeeds.test.ts
→ all pass（baseline 未因本 change 變動）
```
