# factory-circuit-reference-quality-closeout Specification

## Purpose

TBD - created by archiving change 'polish-factory-circuit-reference-quality-targets'. Update Purpose after archive.

## Requirements

### Requirement: Tune only classified Factory Circuit reference quality targets

The implementation SHALL tune only Factory Circuit surfaces classified as `reference-quality-target` in the fresh boundary classification artifact. The implementation SHALL NOT tune surfaces classified as `protected-product-choice` except to verify they remain unchanged.

#### Scenario: Circuit content is tuned while shell stays protected

- **WHEN** Factory Circuit reference-quality closeout is applied
- **THEN** page content targets such as circuit routing, line weight, ornament treatment, and load panel hierarchy are eligible for tuning
- **AND** shared header/footer protected attributes remain unchanged

##### Example: Eligible and protected Factory Circuit rows

| Surface | Classification | Result |
| ----- | ----- | ----- |
| Circuit line weight | `reference-quality-target` | Eligible for config tuning |
| Shared footer position | `protected-product-choice` | Verified unchanged |


<!-- @trace
source: polish-factory-circuit-reference-quality-targets
updated: 2026-06-07
code:
  - apps/web/src/pages/Images/layout.ts
  - docs/reference-match/fhd-reference-informed-closeout-boundaries.md
  - docs/reference-match/images-reference-quality-closeout.md
  - apps/web/package.json
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - docs/reference-match/factory-circuit-reference-quality-closeout.md
  - docs/reference-match/overview-solar-reference-quality-closeout.md
  - docs/reference-match/fhd-evidence-bundle-template.md
  - docs/reference-match/sustainability-reference-quality-closeout.md
  - docs/reference-match/visual-fidelity-review-2026-06-06.md
  - apps/web/src/components/displayCanvasSurfaceStyle.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - docs/display-surface-visual-review-checklist.md
  - docs/goal.md
  - docs/reference-match/fhd-playback-boundary-classification-2026-06-05.md
  - docs/reference-match/display-launch-witness-matrix.md
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - docs/reference-match/fhd-playback-witness-polish-pass-1-2026-06-06.md
  - apps/web/src/hooks/displayTransition.ts
  - apps/web/scripts/run-tests.mjs
  - apps/web/src/pages/Solar/layout.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - docs/fhd-witness/playback-closeout-matrix.md
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - docs/fhd-editor-gap-ledger.md
  - apps/web/src/layouts/LayoutShell.tsx
  - scripts/capture-fhd-witness.mjs
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
  - data/server-runtime.lock.json
  - apps/web/src/layouts/playbackRotationFreeze.ts
tests:
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/FactoryCircuit/svgRouting.test.ts
  - apps/web/src/pages/Images/layout.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/layouts/playbackRotationFreeze.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/components/displayCanvasSurfaceStyle.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/Solar/layout.test.ts
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
-->

---
### Requirement: Preserve Factory Circuit display language

Factory Circuit closeout SHALL preserve source-like circuit routing, factory icon vocabulary, and playback display hierarchy. It SHALL NOT replace circuit/load presentation with a table-first management panel, generic dashboard card stack, or settings-like glass surface.

#### Scenario: Load presentation remains a playback surface

- **WHEN** the load panel hierarchy is tuned
- **THEN** the result emphasizes display hierarchy, source/load relationship, and visual rhythm
- **AND** it does not become a CRUD-style table or management summary grid

##### Example: Load hierarchy remains display-first

| Target | Required presentation | Rejected presentation |
| ----- | ----- | ----- |
| Load panel | Source/load relationship with visual rhythm | CRUD-style table with management controls |


<!-- @trace
source: polish-factory-circuit-reference-quality-targets
updated: 2026-06-07
code:
  - apps/web/src/pages/Images/layout.ts
  - docs/reference-match/fhd-reference-informed-closeout-boundaries.md
  - docs/reference-match/images-reference-quality-closeout.md
  - apps/web/package.json
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - docs/reference-match/factory-circuit-reference-quality-closeout.md
  - docs/reference-match/overview-solar-reference-quality-closeout.md
  - docs/reference-match/fhd-evidence-bundle-template.md
  - docs/reference-match/sustainability-reference-quality-closeout.md
  - docs/reference-match/visual-fidelity-review-2026-06-06.md
  - apps/web/src/components/displayCanvasSurfaceStyle.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - docs/display-surface-visual-review-checklist.md
  - docs/goal.md
  - docs/reference-match/fhd-playback-boundary-classification-2026-06-05.md
  - docs/reference-match/display-launch-witness-matrix.md
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - docs/reference-match/fhd-playback-witness-polish-pass-1-2026-06-06.md
  - apps/web/src/hooks/displayTransition.ts
  - apps/web/scripts/run-tests.mjs
  - apps/web/src/pages/Solar/layout.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - docs/fhd-witness/playback-closeout-matrix.md
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - docs/fhd-editor-gap-ledger.md
  - apps/web/src/layouts/LayoutShell.tsx
  - scripts/capture-fhd-witness.mjs
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
  - data/server-runtime.lock.json
  - apps/web/src/layouts/playbackRotationFreeze.ts
tests:
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/FactoryCircuit/svgRouting.test.ts
  - apps/web/src/pages/Images/layout.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/layouts/playbackRotationFreeze.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/components/displayCanvasSurfaceStyle.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/Solar/layout.test.ts
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
-->

---
### Requirement: Keep Factory Circuit closeout editor-maintainable

Factory Circuit visual tuning SHALL use existing editor-maintainable display page config fields for circuit layout, connector treatment, ornament presentation, card family, and geometry. Treatment needs that cannot be represented by existing fields SHALL be recorded as `actual-gap` instead of implemented as a hardcoded runtime bypass.

#### Scenario: Ornament or connector treatment exposes a capability gap

- **WHEN** fresh witness proves ornament scale, ornament opacity, connector stroke, or connector cap treatment cannot be represented by current fields
- **THEN** the implementation records an `actual-gap` follow-up
- **AND** it does not add page-local CSS-only treatment that cannot be maintained from the editor

##### Example: Ornament control gap handling

| Witness result | Current fields | Required result |
| ----- | ----- | ----- |
| Reference needs lower leaf ornament opacity | No ornament opacity field exists | Record `actual-gap`, do not hardcode CSS opacity |


<!-- @trace
source: polish-factory-circuit-reference-quality-targets
updated: 2026-06-07
code:
  - apps/web/src/pages/Images/layout.ts
  - docs/reference-match/fhd-reference-informed-closeout-boundaries.md
  - docs/reference-match/images-reference-quality-closeout.md
  - apps/web/package.json
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - docs/reference-match/factory-circuit-reference-quality-closeout.md
  - docs/reference-match/overview-solar-reference-quality-closeout.md
  - docs/reference-match/fhd-evidence-bundle-template.md
  - docs/reference-match/sustainability-reference-quality-closeout.md
  - docs/reference-match/visual-fidelity-review-2026-06-06.md
  - apps/web/src/components/displayCanvasSurfaceStyle.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - docs/display-surface-visual-review-checklist.md
  - docs/goal.md
  - docs/reference-match/fhd-playback-boundary-classification-2026-06-05.md
  - docs/reference-match/display-launch-witness-matrix.md
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - docs/reference-match/fhd-playback-witness-polish-pass-1-2026-06-06.md
  - apps/web/src/hooks/displayTransition.ts
  - apps/web/scripts/run-tests.mjs
  - apps/web/src/pages/Solar/layout.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - docs/fhd-witness/playback-closeout-matrix.md
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - docs/fhd-editor-gap-ledger.md
  - apps/web/src/layouts/LayoutShell.tsx
  - scripts/capture-fhd-witness.mjs
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
  - data/server-runtime.lock.json
  - apps/web/src/layouts/playbackRotationFreeze.ts
tests:
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/FactoryCircuit/svgRouting.test.ts
  - apps/web/src/pages/Images/layout.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/layouts/playbackRotationFreeze.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/components/displayCanvasSurfaceStyle.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/Solar/layout.test.ts
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
-->

---
### Requirement: Preserve launch status until full gates pass

Factory Circuit closeout SHALL NOT mark the page launch-ready unless runtime parity, publish refresh, fallback, and handoff evidence are all present.

#### Scenario: Visual polish does not complete launch readiness

- **WHEN** Factory Circuit visual witness improves but fallback or publish refresh evidence remains missing
- **THEN** the launch matrix remains `blocked` for the missing gate
- **AND** the evidence notes record the visual closeout result separately from launch status

##### Example: Visual closeout does not override launch gate

| Route | Visual result | Missing gate | Launch matrix result |
| ----- | ----- | ----- | ----- |
| `/factory-circuit` | Circuit/load witness improved | Publish refresh witness | Overall remains `blocked` |

<!-- @trace
source: polish-factory-circuit-reference-quality-targets
updated: 2026-06-07
code:
  - apps/web/src/pages/Images/layout.ts
  - docs/reference-match/fhd-reference-informed-closeout-boundaries.md
  - docs/reference-match/images-reference-quality-closeout.md
  - apps/web/package.json
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - docs/reference-match/factory-circuit-reference-quality-closeout.md
  - docs/reference-match/overview-solar-reference-quality-closeout.md
  - docs/reference-match/fhd-evidence-bundle-template.md
  - docs/reference-match/sustainability-reference-quality-closeout.md
  - docs/reference-match/visual-fidelity-review-2026-06-06.md
  - apps/web/src/components/displayCanvasSurfaceStyle.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - docs/display-surface-visual-review-checklist.md
  - docs/goal.md
  - docs/reference-match/fhd-playback-boundary-classification-2026-06-05.md
  - docs/reference-match/display-launch-witness-matrix.md
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - docs/reference-match/fhd-playback-witness-polish-pass-1-2026-06-06.md
  - apps/web/src/hooks/displayTransition.ts
  - apps/web/scripts/run-tests.mjs
  - apps/web/src/pages/Solar/layout.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - docs/fhd-witness/playback-closeout-matrix.md
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - docs/fhd-editor-gap-ledger.md
  - apps/web/src/layouts/LayoutShell.tsx
  - scripts/capture-fhd-witness.mjs
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
  - data/server-runtime.lock.json
  - apps/web/src/layouts/playbackRotationFreeze.ts
tests:
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/FactoryCircuit/svgRouting.test.ts
  - apps/web/src/pages/Images/layout.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/layouts/playbackRotationFreeze.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/components/displayCanvasSurfaceStyle.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/Solar/layout.test.ts
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
-->