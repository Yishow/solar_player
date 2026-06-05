# display-editor-fhd-ornament-media-controls Specification

## Purpose

Define editor-backed media and ornament treatment controls that preserve existing playback media sources during FHD closeout.

## Requirements

### Requirement: Editor SHALL expose FHD media treatment controls without changing media sources

The system SHALL let `/display-pages/editor` expose persisted media treatment controls for supported playback media regions without changing the selected media source, playlist item, or managed asset reference.

#### Scenario: Overview photo fade is editor-backed

- **GIVEN** the operator is editing the `Overview` hero media region
- **WHEN** they change photo fade opacity, fade stop, or mask softness from the inspector
- **THEN** the draft preview SHALL update the media treatment
- **AND** publishing the draft SHALL make `/overview` render the same treatment
- **AND** the resolved hero image source SHALL remain unchanged

#### Scenario: Images media crop does not override playlist active media

- **GIVEN** the `Images` page has an active playlist image
- **WHEN** the operator changes media-stage crop, focus, or framing treatment from the editor
- **THEN** the active playlist image SHALL remain the source of the main stage
- **AND** the treatment SHALL apply around that active media in preview and playback


<!-- @trace
source: add-display-editor-fhd-ornament-media-controls
updated: 2026-06-05
code:
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - apps/web/src/pages/Images/index.tsx
  - README.md
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - docs/fhd-editor-gap-ledger.md
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - docs/display-surface-visual-review-checklist.md
  - AGENTS.md
  - apps/server/src/services/displayPagePublishingService.ts
  - scripts/fhd-witness-config.mjs
  - data/server-runtime.lock.json
  - docs/fhd-witness/playback-closeout-matrix.md
  - docs/reference-match/display-launch-witness-matrix.md
  - package.json
  - docs/fhd-witness/evidence-template.md
  - apps/web/package.json
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
  - docs/reference-match/fhd-reference-informed-closeout-boundaries.md
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/Solar/solar.css
  - docs/goal.md
  - apps/web/src/pages/shared/displayPageFhdRhythmConfig.ts
  - scripts/capture-fhd-witness.mjs
  - CLAUDE.md
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/Images/images.css
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - docs/reference-match/fhd-evidence-bundle-template.md
tests:
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/fhdWitnessTooling.test.ts
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/displayPageIconSourceMode.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/Solar/layout.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
-->

---
### Requirement: Editor SHALL expose page-supported ornament treatment controls

The system SHALL let `/display-pages/editor` expose persisted ornament treatment controls for supported page ornaments such as leaves, gold lines, rings, and glow overlays.

#### Scenario: Factory leaf watermark opacity is editor-backed

- **GIVEN** the operator is editing `FactoryCircuit`
- **WHEN** they change the leaf watermark opacity or scale from the inspector
- **THEN** the draft preview SHALL show the updated watermark treatment
- **AND** published playback SHALL keep load values readable

#### Scenario: Sustainability ring overlap is editor-backed

- **GIVEN** the operator is editing the `Sustainability` hero ornament
- **WHEN** they change ring overlap, opacity, or scale from the inspector
- **THEN** the hero media and ring SHALL keep their layered relationship in preview
- **AND** published playback SHALL use the same persisted ring treatment


<!-- @trace
source: add-display-editor-fhd-ornament-media-controls
updated: 2026-06-05
code:
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - apps/web/src/pages/Images/index.tsx
  - README.md
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - docs/fhd-editor-gap-ledger.md
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - docs/display-surface-visual-review-checklist.md
  - AGENTS.md
  - apps/server/src/services/displayPagePublishingService.ts
  - scripts/fhd-witness-config.mjs
  - data/server-runtime.lock.json
  - docs/fhd-witness/playback-closeout-matrix.md
  - docs/reference-match/display-launch-witness-matrix.md
  - package.json
  - docs/fhd-witness/evidence-template.md
  - apps/web/package.json
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
  - docs/reference-match/fhd-reference-informed-closeout-boundaries.md
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/Solar/solar.css
  - docs/goal.md
  - apps/web/src/pages/shared/displayPageFhdRhythmConfig.ts
  - scripts/capture-fhd-witness.mjs
  - CLAUDE.md
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/Images/images.css
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - docs/reference-match/fhd-evidence-bundle-template.md
tests:
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/fhdWitnessTooling.test.ts
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/displayPageIconSourceMode.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/Solar/layout.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
-->

---
### Requirement: Invalid treatment values SHALL fall back safely

The system SHALL validate FHD ornament and media treatment values and SHALL fall back to seed baseline when persisted values are missing or invalid.

#### Scenario: Invalid opacity is rejected

- **GIVEN** a persisted ornament opacity is outside the allowed range
- **WHEN** the editor loads or publish validation runs
- **THEN** the editor SHALL surface a validation issue for that ornament
- **AND** preview and playback SHALL use a valid seed or last valid opacity

#### Scenario: Unsupported ornament controls stay hidden

- **GIVEN** a selected page region does not define a ring ornament
- **WHEN** the operator opens the inspector
- **THEN** ring ornament controls SHALL NOT appear
- **AND** the page SHALL continue to render from its seed appearance

<!-- @trace
source: add-display-editor-fhd-ornament-media-controls
updated: 2026-06-05
code:
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - apps/web/src/pages/Images/index.tsx
  - README.md
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - docs/fhd-editor-gap-ledger.md
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - docs/display-surface-visual-review-checklist.md
  - AGENTS.md
  - apps/server/src/services/displayPagePublishingService.ts
  - scripts/fhd-witness-config.mjs
  - data/server-runtime.lock.json
  - docs/fhd-witness/playback-closeout-matrix.md
  - docs/reference-match/display-launch-witness-matrix.md
  - package.json
  - docs/fhd-witness/evidence-template.md
  - apps/web/package.json
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
  - docs/reference-match/fhd-reference-informed-closeout-boundaries.md
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/Solar/solar.css
  - docs/goal.md
  - apps/web/src/pages/shared/displayPageFhdRhythmConfig.ts
  - scripts/capture-fhd-witness.mjs
  - CLAUDE.md
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/Images/images.css
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - docs/reference-match/fhd-evidence-bundle-template.md
tests:
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/fhdWitnessTooling.test.ts
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/displayPageIconSourceMode.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/Solar/layout.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
-->