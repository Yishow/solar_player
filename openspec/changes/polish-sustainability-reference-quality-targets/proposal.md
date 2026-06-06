## Why

Sustainability 的 reference-informed closeout 重點在 hero media 與 ring ornament 疊合、Trees/stat card 節奏、highlight rail 密度。header/footer 目前可作為產品選擇保護，不應為了追 reference 而改 shell；這個 change 只處理 Sustainability page content 的質感收斂。

## What Changes

- 依 `capture-fhd-reference-informed-playback-witness-classifications` 的分類結果，只處理 Sustainability 的 `reference-quality-target` rows。
- 調整 ring ornament / hero media overlap、Trees/stat card rhythm、highlight rail density、supporting copy hierarchy。
- 保護 shared header/footer 高度、位置、資訊密度，不把 shell 改成 reference pixel match。
- 維持 Sustainability 作為 playback story surface，不退回 KPI management dashboard 或 generic stat grid。
- 優先使用現有 editor-maintainable config/seed controls；若 ornament overlap、hero media treatment 或 highlight rail density 無法表達，將缺口標為 `actual-gap`，不在本 change 偷加 schema。

## Non-Goals

- 不處理 Overview、Solar、Factory Circuit、Images。
- 不新增 editor schema/control、server validation、runtime data model 或 sustainability API。
- 不重做 production assets、icon registry 或 household equivalent logic。
- 不把 Sustainability 標為 launch-ready；只更新 visual quality witness 與 handoff。
- 不改 header/footer CSS 或 shared shell layout。

## Capabilities

### New Capabilities

- `sustainability-reference-quality-closeout`: Tunes Sustainability reference quality targets while preserving protected shell choices, story/stat hierarchy, and editor-maintainable boundaries.

### Modified Capabilities

(none)

## Impact

- Affected specs: sustainability-reference-quality-closeout
- Affected code:
  - New: docs/reference-match/sustainability-reference-quality-closeout.md
  - Modified: apps/web/src/pages/Sustainability/displayPageConfig.ts, apps/web/src/pages/Sustainability/sustainability.css, apps/web/src/pages/Sustainability/index.tsx, apps/web/src/pages/Sustainability/configRender.test.ts, apps/web/src/pages/Sustainability/layout.test.ts, apps/web/src/pages/Sustainability/viewModel.test.ts, apps/web/src/pages/displayPageSeeds.test.ts, docs/reference-match/display-launch-witness-matrix.md, docs/fhd-witness/playback-closeout-matrix.md
  - Removed: none
