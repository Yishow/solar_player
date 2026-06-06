## Why

Factory Circuit 的主要落差不是 shared header/footer，而是 page content 的 circuit display language：線條粗細、routing 密度、`DisplayLeafOrnament` 的 opacity/scale、load panel 的展示層級，仍需要往 `docs/reference/FHD/` 的質感靠近。這一頁也最容易在 polish 時退回 management-surface table，所以需要獨立 change 明確保護邊界。

## What Changes

- 依 `capture-fhd-reference-informed-playback-witness-classifications` 的分類結果，只處理 Factory Circuit 的 `reference-quality-target` rows。
- 調整 circuit line weight、routing visual density、node spacing、load panel hierarchy、leaf ornament opacity/scale。
- 保留 source-like circuit / factory icon vocabulary，不以 generic management glyph、table-first panel 或 settings-like glass card 取代。
- 保護 shared header/footer 高度、位置、資訊密度，不把 shell 改成 reference pixel match。
- 優先使用現有 editor-maintainable config/seed controls；若 connector stroke、ornament treatment 或 load panel rhythm 無法表達，將缺口標為 `actual-gap`，不在本 change 偷加 schema。

## Non-Goals

- 不處理 Overview、Solar、Images、Sustainability。
- 不新增 editor schema/control、server validation、runtime data model 或 load API。
- 不重做 factory reference assets 或 icon registry。
- 不把 Factory Circuit 標為 launch-ready；只更新 visual quality witness 與 handoff。
- 不改 header/footer CSS 或 shared shell layout。

## Capabilities

### New Capabilities

- `factory-circuit-reference-quality-closeout`: Tunes Factory Circuit reference quality targets while preserving circuit display language, protected shell choices, and editor-maintainable boundaries.

### Modified Capabilities

(none)

## Impact

- Affected specs: factory-circuit-reference-quality-closeout
- Affected code:
  - New: docs/reference-match/factory-circuit-reference-quality-closeout.md
  - Modified: apps/web/src/pages/FactoryCircuit/displayPageConfig.ts, apps/web/src/pages/FactoryCircuit/factoryCircuit.css, apps/web/src/pages/FactoryCircuit/index.tsx, apps/web/src/pages/FactoryCircuit/configRender.test.ts, apps/web/src/pages/FactoryCircuit/layout.test.ts, apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts, apps/web/src/pages/FactoryCircuit/cardFamily.test.ts, apps/web/src/pages/displayPageSeeds.test.ts, docs/reference-match/display-launch-witness-matrix.md, docs/fhd-witness/playback-closeout-matrix.md
  - Removed: none
