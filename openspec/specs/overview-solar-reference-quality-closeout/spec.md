# overview-solar-reference-quality-closeout Specification

## Purpose

TBD - created by archiving change 'polish-overview-solar-reference-quality-targets'. Update Purpose after archive.

## Requirements

### Requirement: Tune only classified Overview and Solar reference quality targets

The implementation SHALL tune only Overview and Solar surfaces classified as `reference-quality-target` in the fresh boundary classification artifact. The implementation SHALL NOT tune surfaces classified as `protected-product-choice` except to verify they remain unchanged.

#### Scenario: Page content is tuned while shell stays protected

- **WHEN** Overview and Solar reference-quality closeout is applied
- **THEN** page content targets such as Overview hero/KPI rhythm and Solar flow/KPI rhythm are eligible for tuning
- **AND** shared header/footer protected attributes remain unchanged

##### Example: Eligible and protected Overview/Solar rows

| Route | Surface | Classification | Result |
| ----- | ----- | ----- | ----- |
| `/overview` | Hero photo fade | `reference-quality-target` | Eligible for config tuning |
| `/solar` | Footer position | `protected-product-choice` | Verified unchanged |


<!-- @trace
source: polish-overview-solar-reference-quality-targets
updated: 2026-06-07
code:
  - apps/web/src/hooks/displayTransition.ts
  - docs/display-surface-visual-review-checklist.md
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/layouts/playbackRotationFreeze.ts
  - apps/web/package.json
  - data/server-runtime.lock.json
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - docs/fhd-editor-gap-ledger.md
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - docs/goal.md
  - docs/reference-match/fhd-playback-boundary-classification-2026-06-05.md
  - docs/reference-match/overview-solar-reference-quality-closeout.md
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
  - docs/reference-match/fhd-evidence-bundle-template.md
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - docs/reference-match/images-reference-quality-closeout.md
  - docs/reference-match/visual-fidelity-review-2026-06-06.md
  - apps/web/scripts/run-tests.mjs
  - scripts/capture-fhd-witness.mjs
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - docs/fhd-witness/playback-closeout-matrix.md
  - apps/web/src/pages/Images/layout.ts
  - docs/reference-match/fhd-reference-informed-closeout-boundaries.md
  - apps/server/src/services/displaySeedAssetManifest.ts
  - docs/reference-match/fhd-playback-witness-polish-pass-1-2026-06-06.md
  - docs/reference-match/display-launch-witness-matrix.md
  - apps/web/src/pages/Images/displayPageConfig.ts
  - docs/reference-match/factory-circuit-reference-quality-closeout.md
  - apps/web/src/pages/Solar/layout.ts
  - apps/web/src/components/displayCanvasSurfaceStyle.ts
  - docs/reference-match/sustainability-reference-quality-closeout.md
tests:
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/layouts/playbackRotationFreeze.test.ts
  - apps/web/src/pages/FactoryCircuit/svgRouting.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/Images/layout.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/components/displayCanvasSurfaceStyle.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/Solar/layout.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
-->

---
### Requirement: Keep Overview closeout editor-maintainable

Overview visual tuning SHALL use existing editor-maintainable display page config fields for hero typography, hero media presentation, summary/KPI card style, and geometry. It SHALL NOT introduce page-local hardcoded runtime values outside the existing config path.

#### Scenario: Overview runtime still reads resolved display config

- **WHEN** Overview closeout updates hero or KPI presentation
- **THEN** the runtime continues to render from the resolved display page config
- **AND** focused tests cover the changed config fields or seed values

##### Example: Overview hero and KPI fields stay config-backed

| Target | Allowed path | Disallowed path |
| ----- | ----- | ----- |
| Hero media fade | `Overview/displayPageConfig.ts` seed/config field | Page-local hardcoded runtime constant |
| KPI card height | Existing resolved display config field | Shared shell CSS override |


<!-- @trace
source: polish-overview-solar-reference-quality-targets
updated: 2026-06-07
code:
  - apps/web/src/hooks/displayTransition.ts
  - docs/display-surface-visual-review-checklist.md
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/layouts/playbackRotationFreeze.ts
  - apps/web/package.json
  - data/server-runtime.lock.json
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - docs/fhd-editor-gap-ledger.md
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - docs/goal.md
  - docs/reference-match/fhd-playback-boundary-classification-2026-06-05.md
  - docs/reference-match/overview-solar-reference-quality-closeout.md
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
  - docs/reference-match/fhd-evidence-bundle-template.md
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - docs/reference-match/images-reference-quality-closeout.md
  - docs/reference-match/visual-fidelity-review-2026-06-06.md
  - apps/web/scripts/run-tests.mjs
  - scripts/capture-fhd-witness.mjs
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - docs/fhd-witness/playback-closeout-matrix.md
  - apps/web/src/pages/Images/layout.ts
  - docs/reference-match/fhd-reference-informed-closeout-boundaries.md
  - apps/server/src/services/displaySeedAssetManifest.ts
  - docs/reference-match/fhd-playback-witness-polish-pass-1-2026-06-06.md
  - docs/reference-match/display-launch-witness-matrix.md
  - apps/web/src/pages/Images/displayPageConfig.ts
  - docs/reference-match/factory-circuit-reference-quality-closeout.md
  - apps/web/src/pages/Solar/layout.ts
  - apps/web/src/components/displayCanvasSurfaceStyle.ts
  - docs/reference-match/sustainability-reference-quality-closeout.md
tests:
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/layouts/playbackRotationFreeze.test.ts
  - apps/web/src/pages/FactoryCircuit/svgRouting.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/Images/layout.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/components/displayCanvasSurfaceStyle.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/Solar/layout.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
-->

---
### Requirement: Keep Solar closeout editor-maintainable

Solar visual tuning SHALL use existing editor-maintainable display page config fields for flow nodes, connectors, KPI cards, icon sources, and geometry. Connector or node treatment needs that cannot be represented by existing fields SHALL be recorded as `actual-gap` instead of implemented as a hardcoded runtime bypass.

#### Scenario: Solar connector treatment exposes a capability gap instead of a bypass

- **WHEN** fresh witness proves connector stroke or cap treatment cannot be represented by current connector fields
- **THEN** the implementation records an `actual-gap` follow-up
- **AND** it does not add page-local CSS-only treatment that cannot be maintained from the editor

##### Example: Solar connector gap handling

| Witness result | Current fields | Required result |
| ----- | ----- | ----- |
| Reference uses a connector cap unavailable in config | No cap field exists | Record `actual-gap`, do not hardcode CSS cap |


<!-- @trace
source: polish-overview-solar-reference-quality-targets
updated: 2026-06-07
code:
  - apps/web/src/hooks/displayTransition.ts
  - docs/display-surface-visual-review-checklist.md
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/layouts/playbackRotationFreeze.ts
  - apps/web/package.json
  - data/server-runtime.lock.json
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - docs/fhd-editor-gap-ledger.md
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - docs/goal.md
  - docs/reference-match/fhd-playback-boundary-classification-2026-06-05.md
  - docs/reference-match/overview-solar-reference-quality-closeout.md
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
  - docs/reference-match/fhd-evidence-bundle-template.md
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - docs/reference-match/images-reference-quality-closeout.md
  - docs/reference-match/visual-fidelity-review-2026-06-06.md
  - apps/web/scripts/run-tests.mjs
  - scripts/capture-fhd-witness.mjs
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - docs/fhd-witness/playback-closeout-matrix.md
  - apps/web/src/pages/Images/layout.ts
  - docs/reference-match/fhd-reference-informed-closeout-boundaries.md
  - apps/server/src/services/displaySeedAssetManifest.ts
  - docs/reference-match/fhd-playback-witness-polish-pass-1-2026-06-06.md
  - docs/reference-match/display-launch-witness-matrix.md
  - apps/web/src/pages/Images/displayPageConfig.ts
  - docs/reference-match/factory-circuit-reference-quality-closeout.md
  - apps/web/src/pages/Solar/layout.ts
  - apps/web/src/components/displayCanvasSurfaceStyle.ts
  - docs/reference-match/sustainability-reference-quality-closeout.md
tests:
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/layouts/playbackRotationFreeze.test.ts
  - apps/web/src/pages/FactoryCircuit/svgRouting.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/Images/layout.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/components/displayCanvasSurfaceStyle.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/Solar/layout.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
-->

---
### Requirement: Preserve launch status until full gates pass

Overview and Solar closeout SHALL NOT mark either page launch-ready unless runtime parity, publish refresh, fallback, and handoff evidence are all present.

#### Scenario: Visual polish does not complete launch readiness

- **WHEN** Overview or Solar visual witness improves but fallback or publish refresh evidence remains missing
- **THEN** the launch matrix remains `blocked` for the missing gate
- **AND** the evidence notes record the visual closeout result separately from launch status

##### Example: Visual closeout does not override launch gate

| Route | Visual result | Missing gate | Launch matrix result |
| ----- | ----- | ----- | ----- |
| `/overview` | Hero/KPI witness improved | Fallback witness | Overall remains `blocked` |

<!-- @trace
source: polish-overview-solar-reference-quality-targets
updated: 2026-06-07
code:
  - apps/web/src/hooks/displayTransition.ts
  - docs/display-surface-visual-review-checklist.md
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/layouts/playbackRotationFreeze.ts
  - apps/web/package.json
  - data/server-runtime.lock.json
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - docs/fhd-editor-gap-ledger.md
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - docs/goal.md
  - docs/reference-match/fhd-playback-boundary-classification-2026-06-05.md
  - docs/reference-match/overview-solar-reference-quality-closeout.md
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
  - docs/reference-match/fhd-evidence-bundle-template.md
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - docs/reference-match/images-reference-quality-closeout.md
  - docs/reference-match/visual-fidelity-review-2026-06-06.md
  - apps/web/scripts/run-tests.mjs
  - scripts/capture-fhd-witness.mjs
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - docs/fhd-witness/playback-closeout-matrix.md
  - apps/web/src/pages/Images/layout.ts
  - docs/reference-match/fhd-reference-informed-closeout-boundaries.md
  - apps/server/src/services/displaySeedAssetManifest.ts
  - docs/reference-match/fhd-playback-witness-polish-pass-1-2026-06-06.md
  - docs/reference-match/display-launch-witness-matrix.md
  - apps/web/src/pages/Images/displayPageConfig.ts
  - docs/reference-match/factory-circuit-reference-quality-closeout.md
  - apps/web/src/pages/Solar/layout.ts
  - apps/web/src/components/displayCanvasSurfaceStyle.ts
  - docs/reference-match/sustainability-reference-quality-closeout.md
tests:
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/layouts/playbackRotationFreeze.test.ts
  - apps/web/src/pages/FactoryCircuit/svgRouting.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/Images/layout.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/components/displayCanvasSurfaceStyle.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/Solar/layout.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
-->