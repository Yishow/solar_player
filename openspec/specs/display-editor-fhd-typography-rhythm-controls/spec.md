# display-editor-fhd-typography-rhythm-controls Specification

## Purpose

Define editor-backed typography and rhythm controls for playback hero and caption regions across the five FHD pages.

## Requirements

### Requirement: Editor SHALL expose FHD typography controls for playback hero and caption regions

The system SHALL let `/display-pages/editor` expose persisted FHD typography controls for supported playback hero and caption regions on `Overview`, `Solar`, `FactoryCircuit`, `Images`, and `Sustainability`.

#### Scenario: Operator adjusts hero line-height from the editor

- **GIVEN** the operator is editing a playback page with a supported hero region
- **WHEN** they change hero title line-height, eyebrow spacing, or lead copy font size from the inspector
- **THEN** the draft preview SHALL update using the persisted typography values
- **AND** publishing the draft SHALL make the playback route use the same values
- **AND** the underlying hero text content SHALL remain unchanged

#### Scenario: Images caption typography is editor-backed

- **GIVEN** the operator is editing the `Images` page caption card
- **WHEN** they change caption title size, body line-height, or metadata spacing from the inspector
- **THEN** the preview SHALL show the changed caption rhythm
- **AND** the live `/images` route SHALL show the same caption rhythm after publish


<!-- @trace
source: add-display-editor-fhd-typography-rhythm-controls
updated: 2026-06-05
code:
  - docs/reference-match/fhd-reference-informed-closeout-boundaries.md
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/pages/Images/displayPageConfig.ts
  - docs/fhd-witness/evidence-template.md
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
  - apps/web/package.json
  - AGENTS.md
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - README.md
  - docs/display-surface-visual-review-checklist.md
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Solar/index.tsx
  - package.json
  - docs/reference-match/display-launch-witness-matrix.md
  - docs/reference-match/fhd-evidence-bundle-template.md
  - docs/goal.md
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - scripts/fhd-witness-config.mjs
  - apps/web/src/pages/shared/displayPageFhdRhythmConfig.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - data/server-runtime.lock.json
  - apps/web/src/pages/Solar/solar.css
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - docs/fhd-editor-gap-ledger.md
  - docs/fhd-witness/playback-closeout-matrix.md
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - CLAUDE.md
  - apps/web/src/pages/Images/images.css
  - scripts/capture-fhd-witness.mjs
tests:
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/displayPageIconSourceMode.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/Solar/layout.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/fhdWitnessTooling.test.ts
-->

---
### Requirement: Editor SHALL expose FHD rhythm controls for playback cards and dense display rows

The system SHALL let `/display-pages/editor` expose persisted FHD rhythm controls for supported KPI cards, stat cards, highlight cards, and dense display rows without changing their data bindings.

#### Scenario: Overview KPI card rhythm survives publish

- **GIVEN** the operator is editing `Overview` KPI cards
- **WHEN** they adjust card height, padding, value-row gap, or footer spacing from the inspector
- **THEN** the draft preview SHALL update all affected KPI cards
- **AND** the published `/overview` route SHALL keep the same rhythm
- **AND** live metric values SHALL continue to come from the existing runtime model

#### Scenario: Factory load rows stay display-first

- **GIVEN** the operator is editing `FactoryCircuit` load rows
- **WHEN** they adjust row title size, value alignment, row gap, or icon/title spacing from the inspector
- **THEN** the load panel SHALL remain a playback display surface
- **AND** the editor SHALL NOT replace the load panel with a management-style table editor


<!-- @trace
source: add-display-editor-fhd-typography-rhythm-controls
updated: 2026-06-05
code:
  - docs/reference-match/fhd-reference-informed-closeout-boundaries.md
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/pages/Images/displayPageConfig.ts
  - docs/fhd-witness/evidence-template.md
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
  - apps/web/package.json
  - AGENTS.md
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - README.md
  - docs/display-surface-visual-review-checklist.md
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Solar/index.tsx
  - package.json
  - docs/reference-match/display-launch-witness-matrix.md
  - docs/reference-match/fhd-evidence-bundle-template.md
  - docs/goal.md
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - scripts/fhd-witness-config.mjs
  - apps/web/src/pages/shared/displayPageFhdRhythmConfig.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - data/server-runtime.lock.json
  - apps/web/src/pages/Solar/solar.css
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - docs/fhd-editor-gap-ledger.md
  - docs/fhd-witness/playback-closeout-matrix.md
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - CLAUDE.md
  - apps/web/src/pages/Images/images.css
  - scripts/capture-fhd-witness.mjs
tests:
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/displayPageIconSourceMode.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/Solar/layout.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/fhdWitnessTooling.test.ts
-->

---
### Requirement: Unsupported FHD rhythm controls SHALL stay hidden and seed-backed

The system SHALL hide unsupported FHD typography/rhythm controls per page and SHALL fall back to seed values when persisted values are missing or invalid.

#### Scenario: Unsupported control does not appear

- **GIVEN** a selected region does not support caption typography controls
- **WHEN** the operator opens the inspector for that region
- **THEN** caption typography fields SHALL NOT appear
- **AND** the region SHALL still render using its seed typography and rhythm values

#### Scenario: Invalid rhythm value is rejected without blanking the page

- **GIVEN** the operator enters a card height outside the allowed FHD range
- **WHEN** validation runs before save or publish
- **THEN** the editor SHALL surface a validation issue for that field
- **AND** preview and playback SHALL continue to fall back to a valid seed or last valid value

<!-- @trace
source: add-display-editor-fhd-typography-rhythm-controls
updated: 2026-06-05
code:
  - docs/reference-match/fhd-reference-informed-closeout-boundaries.md
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/pages/Images/displayPageConfig.ts
  - docs/fhd-witness/evidence-template.md
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
  - apps/web/package.json
  - AGENTS.md
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - README.md
  - docs/display-surface-visual-review-checklist.md
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Solar/index.tsx
  - package.json
  - docs/reference-match/display-launch-witness-matrix.md
  - docs/reference-match/fhd-evidence-bundle-template.md
  - docs/goal.md
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - scripts/fhd-witness-config.mjs
  - apps/web/src/pages/shared/displayPageFhdRhythmConfig.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - data/server-runtime.lock.json
  - apps/web/src/pages/Solar/solar.css
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - docs/fhd-editor-gap-ledger.md
  - docs/fhd-witness/playback-closeout-matrix.md
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - CLAUDE.md
  - apps/web/src/pages/Images/images.css
  - scripts/capture-fhd-witness.mjs
tests:
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/displayPageIconSourceMode.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/Solar/layout.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/fhdWitnessTooling.test.ts
-->