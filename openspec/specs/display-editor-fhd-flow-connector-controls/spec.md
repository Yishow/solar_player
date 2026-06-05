# display-editor-fhd-flow-connector-controls Specification

## Purpose

Define persisted editor-backed connector treatment controls for Solar and Factory Circuit FHD playback closeout.

## Requirements

### Requirement: Editor SHALL expose FHD connector treatment controls for supported flow pages

The system SHALL let `/display-pages/editor` expose persisted FHD connector treatment controls for supported Solar and Factory Circuit connector regions.

#### Scenario: Solar connector stroke width is editor-backed

- **GIVEN** the operator is editing a `Solar` connector region
- **WHEN** they change connector stroke width, opacity, line cap, or radius treatment from the inspector
- **THEN** the draft preview SHALL update the connector treatment
- **AND** publishing the draft SHALL make `/solar` render the same connector treatment
- **AND** the connector source and runtime flow data SHALL remain unchanged

#### Scenario: Factory Circuit connector treatment survives publish

- **GIVEN** the operator is editing a `FactoryCircuit` connector region
- **WHEN** they change connector stroke width, opacity, or visual layer treatment from the inspector
- **THEN** the draft preview SHALL show the changed circuit line treatment
- **AND** the published `/factory-circuit` route SHALL use the same persisted values
- **AND** circuit metric data SHALL continue to come from the existing runtime model


<!-- @trace
source: add-display-editor-fhd-flow-connector-controls
updated: 2026-06-05
code:
  - apps/web/src/pages/Images/images.css
  - docs/reference-match/display-launch-witness-matrix.md
  - AGENTS.md
  - data/server-runtime.lock.json
  - apps/web/package.json
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/shared/displayPageFhdRhythmConfig.ts
  - docs/fhd-witness/evidence-template.md
  - CLAUDE.md
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/Solar/solar.css
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - README.md
  - package.json
  - docs/fhd-editor-gap-ledger.md
  - docs/reference-match/fhd-evidence-bundle-template.md
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - scripts/capture-fhd-witness.mjs
  - scripts/fhd-witness-config.mjs
  - docs/goal.md
  - apps/web/src/pages/Images/index.tsx
  - docs/reference-match/fhd-reference-informed-closeout-boundaries.md
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - docs/fhd-witness/playback-closeout-matrix.md
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - docs/display-surface-visual-review-checklist.md
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
tests:
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/pages/Solar/layout.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/displayPageIconSourceMode.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/fhdWitnessTooling.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
-->

---
### Requirement: Editor SHALL expose page-supported node alignment and icon treatment controls

The system SHALL let `/display-pages/editor` expose persisted node alignment and icon treatment controls for supported Solar and Factory Circuit flow nodes without replacing page-owned source-like icon vocabulary.

#### Scenario: Solar node alignment remains source-like

- **GIVEN** the operator is editing a `Solar` flow node
- **WHEN** they adjust node geometry, icon scale, icon-to-label spacing, or value alignment
- **THEN** the draft preview SHALL keep the page-owned source-like icon
- **AND** publishing the draft SHALL keep the same node treatment in `/solar`
- **AND** the editor SHALL NOT replace the icon with a generic management glyph

#### Scenario: Factory Circuit node treatment does not create management rows

- **GIVEN** the operator is editing a `FactoryCircuit` circuit node
- **WHEN** they adjust node geometry, icon scale, label alignment, or value spacing
- **THEN** the node SHALL remain a playback flow component
- **AND** the editor SHALL NOT convert the surrounding load panel into a management-style table


<!-- @trace
source: add-display-editor-fhd-flow-connector-controls
updated: 2026-06-05
code:
  - apps/web/src/pages/Images/images.css
  - docs/reference-match/display-launch-witness-matrix.md
  - AGENTS.md
  - data/server-runtime.lock.json
  - apps/web/package.json
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/shared/displayPageFhdRhythmConfig.ts
  - docs/fhd-witness/evidence-template.md
  - CLAUDE.md
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/Solar/solar.css
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - README.md
  - package.json
  - docs/fhd-editor-gap-ledger.md
  - docs/reference-match/fhd-evidence-bundle-template.md
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - scripts/capture-fhd-witness.mjs
  - scripts/fhd-witness-config.mjs
  - docs/goal.md
  - apps/web/src/pages/Images/index.tsx
  - docs/reference-match/fhd-reference-informed-closeout-boundaries.md
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - docs/fhd-witness/playback-closeout-matrix.md
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - docs/display-surface-visual-review-checklist.md
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
tests:
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/pages/Solar/layout.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/displayPageIconSourceMode.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/fhdWitnessTooling.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
-->

---
### Requirement: Unsupported flow treatment controls SHALL stay hidden and seed-backed

The system SHALL hide unsupported FHD flow treatment controls per page and SHALL fall back to seed values when persisted values are missing or invalid.

#### Scenario: Unsupported dash control does not appear

- **GIVEN** a selected connector renderer does not support dash style
- **WHEN** the operator opens the inspector for that connector
- **THEN** dash controls SHALL NOT appear
- **AND** the connector SHALL still render using seed line treatment

#### Scenario: Invalid connector width is rejected without blanking playback

- **GIVEN** the operator enters a connector stroke width outside the allowed FHD range
- **WHEN** validation runs before save or publish
- **THEN** the editor SHALL surface a validation issue for that field
- **AND** preview and playback SHALL continue to use a valid seed or last valid connector width

<!-- @trace
source: add-display-editor-fhd-flow-connector-controls
updated: 2026-06-05
code:
  - apps/web/src/pages/Images/images.css
  - docs/reference-match/display-launch-witness-matrix.md
  - AGENTS.md
  - data/server-runtime.lock.json
  - apps/web/package.json
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/shared/displayPageFhdRhythmConfig.ts
  - docs/fhd-witness/evidence-template.md
  - CLAUDE.md
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/Solar/solar.css
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - README.md
  - package.json
  - docs/fhd-editor-gap-ledger.md
  - docs/reference-match/fhd-evidence-bundle-template.md
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - scripts/capture-fhd-witness.mjs
  - scripts/fhd-witness-config.mjs
  - docs/goal.md
  - apps/web/src/pages/Images/index.tsx
  - docs/reference-match/fhd-reference-informed-closeout-boundaries.md
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - docs/fhd-witness/playback-closeout-matrix.md
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - docs/display-surface-visual-review-checklist.md
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
tests:
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/pages/Solar/layout.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/displayPageIconSourceMode.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/fhdWitnessTooling.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
-->