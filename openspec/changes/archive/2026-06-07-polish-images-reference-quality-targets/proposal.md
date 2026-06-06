## Why

Images 的主要 closeout 落差集中在 media stage 的裁切比例、thumbnail strip 密度、caption card 字級與展示張力。header/footer 目前可作為產品選擇保護，不應因為追 reference 而重調 shell；這個 change 只把 Images 的 page content 質感往 reference 推。

## What Changes

- 依 `capture-fhd-reference-informed-playback-witness-classifications` 的分類結果，只處理 Images 的 `reference-quality-target` rows。
- 調整 media stage fit/crop、stage visual weight、thumbnail strip density、caption card typography hierarchy。
- 保護 shared header/footer 高度、位置、資訊密度，不把 shell 改成 reference pixel match。
- 維持 Images 作為 playback display surface，不把它退回 asset-management grid、upload panel 或 settings-like card stack。
- 優先使用現有 editor-maintainable config/seed controls；若 media crop、thumbnail strip 或 caption styling 無法表達，將缺口標為 `actual-gap`，不在本 change 偷加 schema。

## Non-Goals

- 不處理 Overview、Solar、Factory Circuit、Sustainability。
- 不新增 editor schema/control、server validation、playlist governance、image upload/asset pipeline。
- 不替換 production image assets 或重做 image manifest。
- 不把 Images 標為 launch-ready；只更新 visual quality witness 與 handoff。
- 不改 header/footer CSS 或 shared shell layout。

## Capabilities

### New Capabilities

- `images-reference-quality-closeout`: Tunes Images reference quality targets while preserving protected shell choices, playback media-stage hierarchy, and editor-maintainable boundaries.

### Modified Capabilities

(none)

## Impact

- Affected specs: images-reference-quality-closeout
- Affected code:
  - New: docs/reference-match/images-reference-quality-closeout.md
  - Modified: apps/web/src/pages/Images/displayPageConfig.ts, apps/web/src/pages/Images/images.css, apps/web/src/pages/Images/index.tsx, apps/web/src/pages/Images/configRender.test.ts, apps/web/src/pages/Images/layout.test.ts, apps/web/src/pages/Images/viewModel.test.ts, apps/web/src/pages/displayPageSeeds.test.ts, docs/reference-match/display-launch-witness-matrix.md, docs/fhd-witness/playback-closeout-matrix.md
  - Removed: none
