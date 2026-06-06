# images-reference-quality-closeout Specification

## Purpose

TBD - created by archiving change 'polish-images-reference-quality-targets'. Update Purpose after archive.

## Requirements

### Requirement: Tune only classified Images reference quality targets

The implementation SHALL tune only Images surfaces classified as `reference-quality-target` in the fresh boundary classification artifact. The implementation SHALL NOT tune surfaces classified as `protected-product-choice` except to verify they remain unchanged.

#### Scenario: Media content is tuned while shell stays protected

- **WHEN** Images reference-quality closeout is applied
- **THEN** page content targets such as media stage crop, thumbnail strip density, and caption hierarchy are eligible for tuning
- **AND** shared header/footer protected attributes remain unchanged

##### Example: Eligible and protected Images rows

| Surface | Classification | Result |
| ----- | ----- | ----- |
| Media stage crop | `reference-quality-target` | Eligible for config tuning |
| Shared header height | `protected-product-choice` | Verified unchanged |


<!-- @trace
source: polish-images-reference-quality-targets
updated: 2026-06-07
code:
  - docs/reference-match/fhd-evidence-bundle-template.md
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/components/displayCanvasSurfaceStyle.ts
  - apps/web/src/pages/Images/layout.ts
  - apps/web/package.json
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
  - docs/fhd-witness/playback-closeout-matrix.md
  - docs/reference-match/factory-circuit-reference-quality-closeout.md
  - apps/server/src/services/displaySeedAssetManifest.ts
  - docs/reference-match/images-reference-quality-closeout.md
  - docs/reference-match/visual-fidelity-review-2026-06-06.md
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - scripts/capture-fhd-witness.mjs
  - docs/reference-match/fhd-playback-boundary-classification-2026-06-05.md
  - docs/reference-match/fhd-playback-witness-polish-pass-1-2026-06-06.md
  - docs/reference-match/sustainability-reference-quality-closeout.md
  - data/server-runtime.lock.json
  - docs/reference-match/overview-solar-reference-quality-closeout.md
  - apps/web/src/pages/Solar/layout.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/scripts/run-tests.mjs
  - apps/web/src/hooks/displayTransition.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - docs/goal.md
  - apps/web/src/layouts/playbackRotationFreeze.ts
  - docs/display-surface-visual-review-checklist.md
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - docs/reference-match/fhd-reference-informed-closeout-boundaries.md
  - docs/reference-match/display-launch-witness-matrix.md
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - docs/fhd-editor-gap-ledger.md
tests:
  - apps/web/src/pages/Solar/layout.test.ts
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/FactoryCircuit/svgRouting.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/layouts/playbackRotationFreeze.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/pages/Images/layout.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/components/displayCanvasSurfaceStyle.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
-->

---
### Requirement: Preserve Images playback media hierarchy

Images closeout SHALL preserve a playback media-stage hierarchy with primary media dominant over thumbnails and captions. It SHALL NOT replace the page with an image-management grid, upload panel, asset browser, or settings-like card stack.

#### Scenario: Thumbnail strip remains subordinate to the primary media

- **WHEN** thumbnail strip density is tuned
- **THEN** thumbnails support the primary media stage and maintain display rhythm
- **AND** they do not become the dominant management grid on the page

##### Example: Thumbnail strip stays subordinate

| Target | Required presentation | Rejected presentation |
| ----- | ----- | ----- |
| Thumbnail strip | Compact support rail under primary media | Dominant asset-management grid |


<!-- @trace
source: polish-images-reference-quality-targets
updated: 2026-06-07
code:
  - docs/reference-match/fhd-evidence-bundle-template.md
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/components/displayCanvasSurfaceStyle.ts
  - apps/web/src/pages/Images/layout.ts
  - apps/web/package.json
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
  - docs/fhd-witness/playback-closeout-matrix.md
  - docs/reference-match/factory-circuit-reference-quality-closeout.md
  - apps/server/src/services/displaySeedAssetManifest.ts
  - docs/reference-match/images-reference-quality-closeout.md
  - docs/reference-match/visual-fidelity-review-2026-06-06.md
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - scripts/capture-fhd-witness.mjs
  - docs/reference-match/fhd-playback-boundary-classification-2026-06-05.md
  - docs/reference-match/fhd-playback-witness-polish-pass-1-2026-06-06.md
  - docs/reference-match/sustainability-reference-quality-closeout.md
  - data/server-runtime.lock.json
  - docs/reference-match/overview-solar-reference-quality-closeout.md
  - apps/web/src/pages/Solar/layout.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/scripts/run-tests.mjs
  - apps/web/src/hooks/displayTransition.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - docs/goal.md
  - apps/web/src/layouts/playbackRotationFreeze.ts
  - docs/display-surface-visual-review-checklist.md
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - docs/reference-match/fhd-reference-informed-closeout-boundaries.md
  - docs/reference-match/display-launch-witness-matrix.md
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - docs/fhd-editor-gap-ledger.md
tests:
  - apps/web/src/pages/Solar/layout.test.ts
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/FactoryCircuit/svgRouting.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/layouts/playbackRotationFreeze.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/pages/Images/layout.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/components/displayCanvasSurfaceStyle.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
-->

---
### Requirement: Keep Images closeout editor-maintainable

Images visual tuning SHALL use existing editor-maintainable display page config fields for media presentation, thumbnail treatment, caption typography, card family, and geometry. Treatment needs that cannot be represented by existing fields SHALL be recorded as `actual-gap` instead of implemented as a hardcoded runtime bypass.

#### Scenario: Media crop or caption styling exposes a capability gap

- **WHEN** fresh witness proves media crop, thumbnail density, or caption styling cannot be represented by current fields
- **THEN** the implementation records an `actual-gap` follow-up
- **AND** it does not add page-local CSS-only treatment that cannot be maintained from the editor

##### Example: Media crop gap handling

| Witness result | Current fields | Required result |
| ----- | ----- | ----- |
| Reference needs per-image focal crop unavailable in config | No focal crop field exists | Record `actual-gap`, do not hardcode CSS object-position |


<!-- @trace
source: polish-images-reference-quality-targets
updated: 2026-06-07
code:
  - docs/reference-match/fhd-evidence-bundle-template.md
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/components/displayCanvasSurfaceStyle.ts
  - apps/web/src/pages/Images/layout.ts
  - apps/web/package.json
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
  - docs/fhd-witness/playback-closeout-matrix.md
  - docs/reference-match/factory-circuit-reference-quality-closeout.md
  - apps/server/src/services/displaySeedAssetManifest.ts
  - docs/reference-match/images-reference-quality-closeout.md
  - docs/reference-match/visual-fidelity-review-2026-06-06.md
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - scripts/capture-fhd-witness.mjs
  - docs/reference-match/fhd-playback-boundary-classification-2026-06-05.md
  - docs/reference-match/fhd-playback-witness-polish-pass-1-2026-06-06.md
  - docs/reference-match/sustainability-reference-quality-closeout.md
  - data/server-runtime.lock.json
  - docs/reference-match/overview-solar-reference-quality-closeout.md
  - apps/web/src/pages/Solar/layout.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/scripts/run-tests.mjs
  - apps/web/src/hooks/displayTransition.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - docs/goal.md
  - apps/web/src/layouts/playbackRotationFreeze.ts
  - docs/display-surface-visual-review-checklist.md
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - docs/reference-match/fhd-reference-informed-closeout-boundaries.md
  - docs/reference-match/display-launch-witness-matrix.md
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - docs/fhd-editor-gap-ledger.md
tests:
  - apps/web/src/pages/Solar/layout.test.ts
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/FactoryCircuit/svgRouting.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/layouts/playbackRotationFreeze.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/pages/Images/layout.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/components/displayCanvasSurfaceStyle.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
-->

---
### Requirement: Preserve launch status until full gates pass

Images closeout SHALL NOT mark the page launch-ready unless runtime parity, publish refresh, fallback, and handoff evidence are all present.

#### Scenario: Visual polish does not complete launch readiness

- **WHEN** Images visual witness improves but fallback or publish refresh evidence remains missing
- **THEN** the launch matrix remains `blocked` for the missing gate
- **AND** the evidence notes record the visual closeout result separately from launch status

##### Example: Visual closeout does not override launch gate

| Route | Visual result | Missing gate | Launch matrix result |
| ----- | ----- | ----- | ----- |
| `/images` | Media/caption witness improved | Fallback witness | Overall remains `blocked` |

<!-- @trace
source: polish-images-reference-quality-targets
updated: 2026-06-07
code:
  - docs/reference-match/fhd-evidence-bundle-template.md
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/components/displayCanvasSurfaceStyle.ts
  - apps/web/src/pages/Images/layout.ts
  - apps/web/package.json
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
  - docs/fhd-witness/playback-closeout-matrix.md
  - docs/reference-match/factory-circuit-reference-quality-closeout.md
  - apps/server/src/services/displaySeedAssetManifest.ts
  - docs/reference-match/images-reference-quality-closeout.md
  - docs/reference-match/visual-fidelity-review-2026-06-06.md
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - scripts/capture-fhd-witness.mjs
  - docs/reference-match/fhd-playback-boundary-classification-2026-06-05.md
  - docs/reference-match/fhd-playback-witness-polish-pass-1-2026-06-06.md
  - docs/reference-match/sustainability-reference-quality-closeout.md
  - data/server-runtime.lock.json
  - docs/reference-match/overview-solar-reference-quality-closeout.md
  - apps/web/src/pages/Solar/layout.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/scripts/run-tests.mjs
  - apps/web/src/hooks/displayTransition.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - docs/goal.md
  - apps/web/src/layouts/playbackRotationFreeze.ts
  - docs/display-surface-visual-review-checklist.md
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - docs/reference-match/fhd-reference-informed-closeout-boundaries.md
  - docs/reference-match/display-launch-witness-matrix.md
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - docs/fhd-editor-gap-ledger.md
tests:
  - apps/web/src/pages/Solar/layout.test.ts
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/FactoryCircuit/svgRouting.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/layouts/playbackRotationFreeze.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/pages/Images/layout.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/components/displayCanvasSurfaceStyle.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
-->