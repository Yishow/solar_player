# sustainability-reference-quality-closeout Specification

## Purpose

TBD - created by archiving change 'polish-sustainability-reference-quality-targets'. Update Purpose after archive.

## Requirements

### Requirement: Tune only classified Sustainability reference quality targets

The implementation SHALL tune only Sustainability surfaces classified as `reference-quality-target` in the fresh boundary classification artifact. The implementation SHALL NOT tune surfaces classified as `protected-product-choice` except to verify they remain unchanged.

#### Scenario: Story content is tuned while shell stays protected

- **WHEN** Sustainability reference-quality closeout is applied
- **THEN** page content targets such as hero/ring composition, Trees/stat rhythm, and highlight rail density are eligible for tuning
- **AND** shared header/footer protected attributes remain unchanged

##### Example: Eligible and protected Sustainability rows

| Surface | Classification | Result |
| ----- | ----- | ----- |
| Ring ornament / hero overlap | `reference-quality-target` | Eligible for config tuning |
| Shared footer position | `protected-product-choice` | Verified unchanged |


<!-- @trace
source: polish-sustainability-reference-quality-targets
updated: 2026-06-07
code:
  - apps/web/src/pages/Images/layout.ts
  - docs/reference-match/sustainability-reference-quality-closeout.md
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - docs/fhd-editor-gap-ledger.md
  - apps/web/package.json
  - apps/web/src/hooks/displayTransition.ts
  - apps/web/src/layouts/playbackRotationFreeze.ts
  - apps/web/src/pages/Solar/layout.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - scripts/capture-fhd-witness.mjs
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - docs/fhd-witness/playback-closeout-matrix.md
  - docs/reference-match/fhd-evidence-bundle-template.md
  - docs/reference-match/factory-circuit-reference-quality-closeout.md
  - docs/reference-match/overview-solar-reference-quality-closeout.md
  - docs/reference-match/fhd-playback-boundary-classification-2026-06-05.md
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
  - apps/web/scripts/run-tests.mjs
  - docs/reference-match/visual-fidelity-review-2026-06-06.md
  - data/server-runtime.lock.json
  - docs/display-surface-visual-review-checklist.md
  - docs/goal.md
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/components/displayCanvasSurfaceStyle.ts
  - docs/reference-match/fhd-reference-informed-closeout-boundaries.md
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - docs/reference-match/images-reference-quality-closeout.md
  - docs/reference-match/fhd-playback-witness-polish-pass-1-2026-06-06.md
  - docs/reference-match/display-launch-witness-matrix.md
tests:
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/web/src/pages/FactoryCircuit/svgRouting.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/components/displayCanvasSurfaceStyle.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/Solar/layout.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/Images/layout.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/layouts/playbackRotationFreeze.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
-->

---
### Requirement: Preserve Sustainability story playback hierarchy

Sustainability closeout SHALL preserve a playback story hierarchy with hero composition, stat rhythm, and highlight rail pacing. It SHALL NOT replace the page with a generic KPI dashboard, management summary grid, or settings-like card stack.

#### Scenario: Stat cards support the story rather than dominate it

- **WHEN** Trees/stat card rhythm is tuned
- **THEN** the stat cards support the Sustainability story flow and hero composition
- **AND** they do not become the dominant management dashboard on the page

##### Example: Stat rhythm stays story-first

| Target | Required presentation | Rejected presentation |
| ----- | ----- | ----- |
| Trees/stat card rhythm | Story-supporting statistic cadence | Generic management KPI dashboard |


<!-- @trace
source: polish-sustainability-reference-quality-targets
updated: 2026-06-07
code:
  - apps/web/src/pages/Images/layout.ts
  - docs/reference-match/sustainability-reference-quality-closeout.md
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - docs/fhd-editor-gap-ledger.md
  - apps/web/package.json
  - apps/web/src/hooks/displayTransition.ts
  - apps/web/src/layouts/playbackRotationFreeze.ts
  - apps/web/src/pages/Solar/layout.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - scripts/capture-fhd-witness.mjs
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - docs/fhd-witness/playback-closeout-matrix.md
  - docs/reference-match/fhd-evidence-bundle-template.md
  - docs/reference-match/factory-circuit-reference-quality-closeout.md
  - docs/reference-match/overview-solar-reference-quality-closeout.md
  - docs/reference-match/fhd-playback-boundary-classification-2026-06-05.md
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
  - apps/web/scripts/run-tests.mjs
  - docs/reference-match/visual-fidelity-review-2026-06-06.md
  - data/server-runtime.lock.json
  - docs/display-surface-visual-review-checklist.md
  - docs/goal.md
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/components/displayCanvasSurfaceStyle.ts
  - docs/reference-match/fhd-reference-informed-closeout-boundaries.md
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - docs/reference-match/images-reference-quality-closeout.md
  - docs/reference-match/fhd-playback-witness-polish-pass-1-2026-06-06.md
  - docs/reference-match/display-launch-witness-matrix.md
tests:
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/web/src/pages/FactoryCircuit/svgRouting.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/components/displayCanvasSurfaceStyle.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/Solar/layout.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/Images/layout.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/layouts/playbackRotationFreeze.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
-->

---
### Requirement: Keep Sustainability closeout editor-maintainable

Sustainability visual tuning SHALL use existing editor-maintainable display page config fields for hero media, ornament presentation, stat cards, highlight rail, card family, and geometry. Treatment needs that cannot be represented by existing fields SHALL be recorded as `actual-gap` instead of implemented as a hardcoded runtime bypass.

#### Scenario: Ring ornament or highlight rail styling exposes a capability gap

- **WHEN** fresh witness proves ring ornament overlap, hero media treatment, or highlight rail density cannot be represented by current fields
- **THEN** the implementation records an `actual-gap` follow-up
- **AND** it does not add page-local CSS-only treatment that cannot be maintained from the editor

##### Example: Ring overlap gap handling

| Witness result | Current fields | Required result |
| ----- | ----- | ----- |
| Reference needs ring/media overlap unavailable in config | No overlap field exists | Record `actual-gap`, do not hardcode CSS transform |


<!-- @trace
source: polish-sustainability-reference-quality-targets
updated: 2026-06-07
code:
  - apps/web/src/pages/Images/layout.ts
  - docs/reference-match/sustainability-reference-quality-closeout.md
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - docs/fhd-editor-gap-ledger.md
  - apps/web/package.json
  - apps/web/src/hooks/displayTransition.ts
  - apps/web/src/layouts/playbackRotationFreeze.ts
  - apps/web/src/pages/Solar/layout.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - scripts/capture-fhd-witness.mjs
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - docs/fhd-witness/playback-closeout-matrix.md
  - docs/reference-match/fhd-evidence-bundle-template.md
  - docs/reference-match/factory-circuit-reference-quality-closeout.md
  - docs/reference-match/overview-solar-reference-quality-closeout.md
  - docs/reference-match/fhd-playback-boundary-classification-2026-06-05.md
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
  - apps/web/scripts/run-tests.mjs
  - docs/reference-match/visual-fidelity-review-2026-06-06.md
  - data/server-runtime.lock.json
  - docs/display-surface-visual-review-checklist.md
  - docs/goal.md
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/components/displayCanvasSurfaceStyle.ts
  - docs/reference-match/fhd-reference-informed-closeout-boundaries.md
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - docs/reference-match/images-reference-quality-closeout.md
  - docs/reference-match/fhd-playback-witness-polish-pass-1-2026-06-06.md
  - docs/reference-match/display-launch-witness-matrix.md
tests:
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/web/src/pages/FactoryCircuit/svgRouting.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/components/displayCanvasSurfaceStyle.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/Solar/layout.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/Images/layout.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/layouts/playbackRotationFreeze.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
-->

---
### Requirement: Preserve launch status until full gates pass

Sustainability closeout SHALL NOT mark the page launch-ready unless runtime parity, publish refresh, fallback, and handoff evidence are all present.

#### Scenario: Visual polish does not complete launch readiness

- **WHEN** Sustainability visual witness improves but fallback or publish refresh evidence remains missing
- **THEN** the launch matrix remains `blocked` for the missing gate
- **AND** the evidence notes record the visual closeout result separately from launch status

##### Example: Visual closeout does not override launch gate

| Route | Visual result | Missing gate | Launch matrix result |
| ----- | ----- | ----- | ----- |
| `/sustainability` | Hero/ring witness improved | Publish refresh witness | Overall remains `blocked` |

<!-- @trace
source: polish-sustainability-reference-quality-targets
updated: 2026-06-07
code:
  - apps/web/src/pages/Images/layout.ts
  - docs/reference-match/sustainability-reference-quality-closeout.md
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - docs/fhd-editor-gap-ledger.md
  - apps/web/package.json
  - apps/web/src/hooks/displayTransition.ts
  - apps/web/src/layouts/playbackRotationFreeze.ts
  - apps/web/src/pages/Solar/layout.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - scripts/capture-fhd-witness.mjs
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - docs/fhd-witness/playback-closeout-matrix.md
  - docs/reference-match/fhd-evidence-bundle-template.md
  - docs/reference-match/factory-circuit-reference-quality-closeout.md
  - docs/reference-match/overview-solar-reference-quality-closeout.md
  - docs/reference-match/fhd-playback-boundary-classification-2026-06-05.md
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
  - apps/web/scripts/run-tests.mjs
  - docs/reference-match/visual-fidelity-review-2026-06-06.md
  - data/server-runtime.lock.json
  - docs/display-surface-visual-review-checklist.md
  - docs/goal.md
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/components/displayCanvasSurfaceStyle.ts
  - docs/reference-match/fhd-reference-informed-closeout-boundaries.md
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - docs/reference-match/images-reference-quality-closeout.md
  - docs/reference-match/fhd-playback-witness-polish-pass-1-2026-06-06.md
  - docs/reference-match/display-launch-witness-matrix.md
tests:
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/web/src/pages/FactoryCircuit/svgRouting.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/components/displayCanvasSurfaceStyle.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/Solar/layout.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/Images/layout.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/layouts/playbackRotationFreeze.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
-->