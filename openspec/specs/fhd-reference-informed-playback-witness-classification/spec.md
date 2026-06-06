# fhd-reference-informed-playback-witness-classification Specification

## Purpose

TBD - created by archiving change 'capture-fhd-reference-informed-playback-witness-classifications'. Update Purpose after archive.

## Requirements

### Requirement: Capture a five-page reference-informed witness batch before tuning

The workflow SHALL capture or explicitly block a fresh FHD witness batch for Overview, Solar, Factory Circuit, Images, and Sustainability before page-specific reference-quality tuning begins. The batch SHALL include each route, FHD reference image, playback screenshot target, editor preview target, and capture result.

#### Scenario: Five playback pages receive fresh witness records

- **WHEN** FHD reference-informed playback closeout begins
- **THEN** the evidence includes witness records for `/overview`, `/solar`, `/factory-circuit`, `/images`, and `/sustainability`
- **AND** each record identifies the FHD reference image and the playback/editor witness path or a concrete capture blocker


<!-- @trace
source: capture-fhd-reference-informed-playback-witness-classifications
updated: 2026-06-07
code:
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - docs/reference-match/fhd-reference-informed-closeout-boundaries.md
  - apps/web/src/pages/Images/displayPageConfig.ts
  - data/server-runtime.lock.json
  - docs/reference-match/fhd-playback-boundary-classification-2026-06-05.md
  - docs/reference-match/images-reference-quality-closeout.md
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - docs/reference-match/display-launch-witness-matrix.md
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - docs/reference-match/overview-solar-reference-quality-closeout.md
  - docs/goal.md
  - docs/reference-match/factory-circuit-reference-quality-closeout.md
  - apps/server/src/services/displaySeedAssetManifest.ts
  - docs/fhd-editor-gap-ledger.md
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/scripts/run-tests.mjs
  - docs/reference-match/fhd-evidence-bundle-template.md
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/components/DisplayCanvas.tsx
  - docs/reference-match/sustainability-reference-quality-closeout.md
  - apps/web/src/pages/Solar/layout.ts
  - docs/reference-match/fhd-playback-witness-polish-pass-1-2026-06-06.md
  - apps/web/package.json
  - apps/web/src/hooks/displayTransition.ts
  - apps/web/src/components/displayCanvasSurfaceStyle.ts
  - docs/display-surface-visual-review-checklist.md
  - docs/reference-match/visual-fidelity-review-2026-06-06.md
  - docs/fhd-witness/playback-closeout-matrix.md
  - apps/web/src/layouts/playbackRotationFreeze.ts
  - scripts/capture-fhd-witness.mjs
  - apps/web/src/pages/Images/layout.ts
tests:
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/Images/layout.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/components/displayCanvasSurfaceStyle.test.ts
  - apps/web/src/pages/Solar/layout.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/web/src/pages/FactoryCircuit/svgRouting.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/layouts/playbackRotationFreeze.test.ts
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
-->

---
### Requirement: Classify each material reference mismatch in one boundary table

The workflow SHALL record material reference mismatches in a boundary decision table before downstream page closeout changes are applied. Each row SHALL use one classification token from `protected-product-choice`, `reference-quality-target`, or `actual-gap`.

#### Scenario: Shell choices and page content targets are separated

- **WHEN** a route has an accepted shared shell difference and unresolved page content polish
- **THEN** the shell difference is recorded as `protected-product-choice` with bounded Protected Attributes
- **AND** the page content polish is recorded separately as `reference-quality-target` or `actual-gap`
- **AND** downstream page changes reference the row they are implementing

##### Example: Overview classification input

| Surface | Classification | Implementation consequence |
| ----- | ----- | ----- |
| Shared header | `protected-product-choice` | Preserve accepted height and position |
| Overview hero photo fade | `reference-quality-target` | Tune hero media integration without pixel matching |
| Overview fallback witness | `actual-gap` | Keep gate blocked until fallback witness passes |


<!-- @trace
source: capture-fhd-reference-informed-playback-witness-classifications
updated: 2026-06-07
code:
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - docs/reference-match/fhd-reference-informed-closeout-boundaries.md
  - apps/web/src/pages/Images/displayPageConfig.ts
  - data/server-runtime.lock.json
  - docs/reference-match/fhd-playback-boundary-classification-2026-06-05.md
  - docs/reference-match/images-reference-quality-closeout.md
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - docs/reference-match/display-launch-witness-matrix.md
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - docs/reference-match/overview-solar-reference-quality-closeout.md
  - docs/goal.md
  - docs/reference-match/factory-circuit-reference-quality-closeout.md
  - apps/server/src/services/displaySeedAssetManifest.ts
  - docs/fhd-editor-gap-ledger.md
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/scripts/run-tests.mjs
  - docs/reference-match/fhd-evidence-bundle-template.md
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/components/DisplayCanvas.tsx
  - docs/reference-match/sustainability-reference-quality-closeout.md
  - apps/web/src/pages/Solar/layout.ts
  - docs/reference-match/fhd-playback-witness-polish-pass-1-2026-06-06.md
  - apps/web/package.json
  - apps/web/src/hooks/displayTransition.ts
  - apps/web/src/components/displayCanvasSurfaceStyle.ts
  - docs/display-surface-visual-review-checklist.md
  - docs/reference-match/visual-fidelity-review-2026-06-06.md
  - docs/fhd-witness/playback-closeout-matrix.md
  - apps/web/src/layouts/playbackRotationFreeze.ts
  - scripts/capture-fhd-witness.mjs
  - apps/web/src/pages/Images/layout.ts
tests:
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/Images/layout.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/components/displayCanvasSurfaceStyle.test.ts
  - apps/web/src/pages/Solar/layout.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/web/src/pages/FactoryCircuit/svgRouting.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/layouts/playbackRotationFreeze.test.ts
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
-->

---
### Requirement: Preserve launch blocked status until launch gates pass

The classification evidence SHALL NOT mark any playback page launch-ready by itself. The authoritative launch witness matrix SHALL remain blocked for any page missing runtime parity, publish refresh, fallback, or handoff evidence.

#### Scenario: Classification rationale does not become launch readiness

- **WHEN** the witness classification records a protected header or footer choice
- **THEN** the launch matrix references that choice as visual rationale
- **AND** the page remains fail or blocked when launch gate evidence is missing

##### Example: Solar protected footer with missing publish evidence

| Route | Classification row | Missing gate | Matrix result |
| ----- | ----- | ----- | ----- |
| `/solar` | Footer position is `protected-product-choice` | Publish refresh witness | Overall remains `blocked` |

<!-- @trace
source: capture-fhd-reference-informed-playback-witness-classifications
updated: 2026-06-07
code:
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - docs/reference-match/fhd-reference-informed-closeout-boundaries.md
  - apps/web/src/pages/Images/displayPageConfig.ts
  - data/server-runtime.lock.json
  - docs/reference-match/fhd-playback-boundary-classification-2026-06-05.md
  - docs/reference-match/images-reference-quality-closeout.md
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - docs/reference-match/display-launch-witness-matrix.md
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - docs/reference-match/overview-solar-reference-quality-closeout.md
  - docs/goal.md
  - docs/reference-match/factory-circuit-reference-quality-closeout.md
  - apps/server/src/services/displaySeedAssetManifest.ts
  - docs/fhd-editor-gap-ledger.md
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/scripts/run-tests.mjs
  - docs/reference-match/fhd-evidence-bundle-template.md
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/components/DisplayCanvas.tsx
  - docs/reference-match/sustainability-reference-quality-closeout.md
  - apps/web/src/pages/Solar/layout.ts
  - docs/reference-match/fhd-playback-witness-polish-pass-1-2026-06-06.md
  - apps/web/package.json
  - apps/web/src/hooks/displayTransition.ts
  - apps/web/src/components/displayCanvasSurfaceStyle.ts
  - docs/display-surface-visual-review-checklist.md
  - docs/reference-match/visual-fidelity-review-2026-06-06.md
  - docs/fhd-witness/playback-closeout-matrix.md
  - apps/web/src/layouts/playbackRotationFreeze.ts
  - scripts/capture-fhd-witness.mjs
  - apps/web/src/pages/Images/layout.ts
tests:
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/Images/layout.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/components/displayCanvasSurfaceStyle.test.ts
  - apps/web/src/pages/Solar/layout.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/web/src/pages/FactoryCircuit/svgRouting.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/layouts/playbackRotationFreeze.test.ts
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
-->