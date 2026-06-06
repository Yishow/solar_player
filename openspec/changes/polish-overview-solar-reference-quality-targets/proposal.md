## Why

Overview 與 Solar 是最適合先驗證 reference-informed closeout 邊界的兩頁：它們都有明確 page content quality targets，也有已接受的 shared header/footer shell choice 需要保護。先處理這兩頁可以在低風險範圍內驗證「保護 shell、推內容質感」的工作法。

## What Changes

- 依 `capture-fhd-reference-informed-playback-witness-classifications` 的分類結果，只處理 Overview 與 Solar 的 `reference-quality-target` rows。
- Overview 聚焦 hero photo fade、雙語 title/eyebrow/lead rhythm、KPI row spacing/card height/card hierarchy。
- Solar 聚焦 connector thickness/treatment、flow node placement/source-like node language、KPI row rhythm。
- 保護 shared header/footer 高度、位置、資訊密度，不把 shell 改成 reference pixel match。
- 優先使用現有 editor-maintainable config/seed controls；若分類結果顯示既有 controls 不足，將缺口標為 `actual-gap`，不在本 change 偷加 schema。

## Non-Goals

- 不處理 Factory Circuit、Images、Sustainability。
- 不新增 editor schema/control、server validation、asset pipeline 或 runtime data model。
- 不把 Overview/Solar 標為 launch-ready；只更新 visual quality witness 與 handoff。
- 不改 header/footer CSS 或 shared shell layout。

## Capabilities

### New Capabilities

- `overview-solar-reference-quality-closeout`: Tunes Overview and Solar reference quality targets while preserving protected shell choices and editor-maintainable boundaries.

### Modified Capabilities

(none)

## Impact

- Affected specs: overview-solar-reference-quality-closeout
- Affected code:
  - New: docs/reference-match/overview-solar-reference-quality-closeout.md
  - Modified: apps/web/src/pages/Overview/displayPageConfig.ts, apps/web/src/pages/Solar/displayPageConfig.ts, apps/web/src/pages/Overview/configRender.test.tsx, apps/web/src/pages/Solar/configRender.test.ts, apps/web/src/pages/Solar/layout.test.ts, apps/web/src/pages/displayPageSeeds.test.ts, docs/reference-match/display-launch-witness-matrix.md, docs/fhd-witness/playback-closeout-matrix.md
  - Removed: none
