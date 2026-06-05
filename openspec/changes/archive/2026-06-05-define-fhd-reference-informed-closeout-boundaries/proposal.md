## Why

目前 FHD closeout 已經有 witness、visual guardrails 與 launch matrix，但「reference 差異」仍容易被誤解成必須逐像素追齊。使用者已明確表示 header、footer 的高度與位置等現行產品選擇可以被保留；後續五頁 polish 需要一個可交接的分類 contract，讓團隊把質感往 reference 推進，同時不把已接受的產品選擇改壞。

## What Changes

- 新增 reference-informed closeout boundary 能力，定義三種 FHD 差異分類：protected product choice、reference quality target、actual gap。
- 要求 evidence bundle 在 FHD closeout 中記錄每個重要 reference 差異的分類、適用 surface、保護屬性、reference 借鑑方向、驗證 witness 與重新檢視條件。
- 要求 visual guardrails 把「intentional deviation」升級為可審查的 boundary decision，而不是一句籠統例外。
- 要求 launch witness matrix 在五個 playback 頁 closeout 時引用 boundary decision，避免 accepted shell choices 和 page-local polish gaps 混在同一個 pass/fail 判斷內。
- 明確把 header/footer 高度、位置、資訊密度等已被使用者接受的 shell 差異定義為可保護範例；同時要求 hero、KPI、flow、circuit、media stage、caption、ornament、highlight rail 等頁面內容仍要依 reference quality target 檢查質感方向。

## Capabilities

### New Capabilities

- `fhd-reference-informed-closeout-boundaries`: Defines how FHD closeout classifies reference differences as protected product choices, reference quality targets, or actual gaps before implementation changes are planned.

### Modified Capabilities

- `ai-frontend-fhd-evidence-workflow`: Evidence bundles must record reference-informed boundary classifications for FHD-affecting changes.
- `display-surface-visual-guardrails`: Visual review must treat intentional reference differences as scoped boundary decisions with protected attributes and verification evidence.
- `display-launch-witness-gates`: Launch witness status must distinguish accepted protected choices from unresolved page polish or capability gaps.

## Impact

- Affected specs: fhd-reference-informed-closeout-boundaries, ai-frontend-fhd-evidence-workflow, display-surface-visual-guardrails, display-launch-witness-gates
- Affected code:
  - New: docs/reference-match/fhd-reference-informed-closeout-boundaries.md
  - Modified: docs/reference-match/fhd-evidence-bundle-template.md, docs/display-surface-visual-review-checklist.md, docs/reference-match/display-launch-witness-matrix.md, docs/fhd-witness/playback-closeout-matrix.md, docs/fhd-editor-gap-ledger.md, apps/web/src/pages/fhdEvidenceWorkflow.test.ts, apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts, apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - Removed: none
