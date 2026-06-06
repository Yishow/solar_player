## Why

五個 playback 頁要開始 reference-informed closeout 前，需要先取得 fresh FHD witness 並用三分類 contract 標記差異。沒有這個前置證據，後續 tuning 容易把已接受的 header/footer shell choice 誤改成 pixel match，也可能把真正阻塞 launch 的 runtime/fallback/editor gap 混進單純視覺微調。

## What Changes

- 針對 `/overview`、`/solar`、`/factory-circuit`、`/images`、`/sustainability` 跑 fresh playback/editor witness batch。
- 產生一份 reference-informed boundary evidence bundle，逐頁記錄 `protected-product-choice`、`reference-quality-target`、`actual-gap`。
- 將 header/footer 高度、位置、資訊密度等已接受 shell choice 作為 protected boundary，但不豁免 page content review。
- 將每頁後續 tuning target 與 actual gap 寫回 launch witness matrix / closeout handoff，不改 launch status 為 ready。
- 建立後續四個 page closeout changes 的執行輸入，讓它們只能處理已分類的 `reference-quality-target` 或明確列出的 `actual-gap`。

## Non-Goals

- 不調整五個 playback 頁的 CSS、seed config、runtime renderer、editor schema 或 server validation。
- 不把任何 route 標成 launch-ready；缺 fresh publish/fallback/runtime witness 時仍維持 `blocked`。
- 不新增 screenshot diff threshold、不引入 visual regression service。
- 不用 prototype HTML 取代現行 React runtime。

## Capabilities

### New Capabilities

- `fhd-reference-informed-playback-witness-classification`: Captures fresh five-page FHD witness evidence and classifies reference differences before page tuning begins.

### Modified Capabilities

- `display-launch-witness-gates`: Launch matrix entries must consume the fresh boundary classification without treating it as launch-ready status.
- `ai-frontend-fhd-evidence-workflow`: Evidence bundles must include the five-page boundary decision table for this witness batch.

## Impact

- Affected specs: fhd-reference-informed-playback-witness-classification, display-launch-witness-gates, ai-frontend-fhd-evidence-workflow
- Affected code:
  - New: docs/reference-match/fhd-playback-boundary-classification-2026-06-05.md
  - Modified: docs/reference-match/display-launch-witness-matrix.md, docs/fhd-witness/playback-closeout-matrix.md, docs/reference-match/fhd-evidence-bundle-template.md, apps/web/src/pages/displayLaunchWitnessGates.test.ts, apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - Removed: none
