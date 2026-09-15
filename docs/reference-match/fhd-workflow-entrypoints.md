# FHD Workflow Entrypoints

日期：2026-05-27

這份 index 只做導覽，不重述完整流程。它把 visual canonicals、evidence workflow、launch witness gates，還有各入口文件的責任串起來。

## Canonical Workflow Documents

- `visual canonicals`
  - `docs/reference-match/playback-visual-canonicals.md`
  - `docs/reference-match/display-surface-visual-review-checklist.md`
- `evidence workflow`
  - `docs/reference-match/fhd-evidence-bundle-template.md`
  - `docs/reference-match/fhd-surface-split-guide.md`
  - `docs/reference-match/fhd-exception-ledger-template.md`
- `launch witness gates`
  - `docs/reference-match/display-launch-witness-matrix.md`
  - `docs/reference-match/display-launch-verification-pack.md`

## Current Vs Historical In This Folder

這個資料夾目前同時放了兩種文件：

- **current workflow docs**
  - `docs/reference-match/fhd-workflow-entrypoints.md`
  - `docs/reference-match/playback-visual-canonicals.md`
  - `docs/reference-match/fhd-reference-informed-closeout-boundaries.md`
  - `docs/reference-match/fhd-surface-split-guide.md`
  - `docs/reference-match/fhd-evidence-bundle-template.md`
  - `docs/reference-match/fhd-exception-ledger-template.md`
  - `docs/reference-match/display-launch-witness-matrix.md`
  - `docs/reference-match/display-launch-verification-pack.md`
- **supporting historical evidence now archived under `docs/archive/reference-match/`**
  - `docs/archive/reference-match/2026-05/all-pages-audit.md`
  - `docs/archive/reference-match/2026-05/all-pages-checklist.md`
  - `docs/archive/reference-match/2026-06/fhd-playback-boundary-classification-2026-06-05.md`
  - `docs/archive/reference-match/2026-06/fhd-playback-witness-polish-pass-1-2026-06-06.md`
  - `docs/archive/reference-match/2026-06/visual-fidelity-review-2026-06-06.md`
  - `docs/archive/reference-match/2026-06/overview-density-baseline-2026-06-07.md`
  - `docs/archive/reference-match/2026-06/fhd-closeout-handoff-2026-06-07.md`
  - `docs/archive/reference-match/2026-06/phase4-visual-witness-2026-06-07.md`
  - `docs/archive/reference-match/2026-06/flow-connector-refinement-closeout-2026-06-07.md`
  - `docs/archive/reference-match/2026-06/overview-solar-reference-quality-closeout.md`
  - `docs/archive/reference-match/2026-06/factory-circuit-reference-quality-closeout.md`
  - `docs/archive/reference-match/2026-06/images-reference-quality-closeout.md`
  - `docs/archive/reference-match/2026-06/sustainability-reference-quality-closeout.md`
  - `docs/archive/reference-match/2026-06/settings-images-layout-refactor-plan.md`

若你是第一次進入 FHD workflow，先只讀上面的 current workflow docs。若你是要追 spec trace、dated witness、closeout rationale 或 historical gap evidence，再回頭讀 archive 裡的 supporting historical evidence。

這些 historical evidence 已集中移到 `docs/archive/reference-match/`。`openspec/specs/` 與相關測試已改寫到 archive 路徑，因此 `docs/reference-match/` 頂層現在只保留現行 workflow、launch gates 與 active supporting input。

## Workflow Vocabulary

- `witness batch`
  - 一次一起審查的一組頁面或 surface。
- `evidence bundle`
  - 這次 change 的 review bundle，會指向 witness batch、surface family、protected attributes、exception ledger、verification pack。
- `visual canonicals`
  - 這次 change 不可默默退化的 playback/FHD 視覺契約。
- `launch witness gates`
  - page-by-page launch readiness 的 pass/fail/blocked gate。

## Entrypoint Responsibilities

- `AGENTS.md`
  - 給 agent 的 repo 工作守則與 workflow 入口。
- `CLAUDE.md`
  - 給另一個 agent entrypoint 的 mirror 指引，應與 `AGENTS.md` 保持同樣 workflow vocabulary。
- `README.md`
  - 給新進開發者的輕量入口，指向 canonical docs。
- `docs/README.md`
  - 給補充文件讀者的 docs index，應指向本頁與 deeper reference-match docs。
- `.agents/skills/display-asset-generation/*`
  - 資產工作如何落在同一套 witness batch / evidence bundle / visual canonicals / launch witness gates 語彙上。
- `.agents/skills/product-gap-audit/SKILL.md`
  - 在 apply 前把 reviewed change 轉成可執行 prompt 時，也沿用同一套 workflow vocabulary。

## Suggested Reading Order

1. 想知道 playback/FHD 視覺不能退化什麼：先看 `docs/reference-match/playback-visual-canonicals.md`
2. 想知道 AI 或 reviewer 在動手前要準備什麼：看 `docs/reference-match/fhd-surface-split-guide.md` 與 `docs/reference-match/fhd-evidence-bundle-template.md`
3. 想知道 launch closeout 看什麼：看 `docs/reference-match/display-launch-witness-matrix.md` 與 `docs/reference-match/display-launch-verification-pack.md`
4. 若遇到 dated audit / closeout / handoff 檔名，先把它當 supporting historical evidence，不要誤當成新的 workflow 入口。
5. 想知道正式 spec 與 change source of truth：回到 `openspec/specs/` 與 `openspec/changes/`
