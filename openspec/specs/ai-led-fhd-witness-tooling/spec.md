# ai-led-fhd-witness-tooling Specification

## Purpose

Define the local AI-led workflow for capturing, pairing, and handing off FHD playback witness evidence against reference images.

## Requirements

### Requirement: FHD witness tooling SHALL capture playback route evidence

The system SHALL provide a documented local workflow for capturing FHD witness screenshots of the five playback pages against `docs/reference/FHD/`.

#### Scenario: AI captures all five playback routes

- **GIVEN** the local web app is running with the playback routes available
- **WHEN** the contributor runs the FHD witness capture command
- **THEN** the workflow SHALL capture 1920x1080 screenshots for `/overview`, `/solar`, `/factory-circuit`, `/images`, and `/sustainability`
- **AND** each screenshot SHALL be associated with its matching reference image under `docs/reference/FHD/`
- **AND** the workflow SHALL NOT depend on `docs/reference-match/`

#### Scenario: Missing browser dependency fails loudly

- **GIVEN** Playwright or a required browser dependency is unavailable
- **WHEN** the contributor runs the FHD witness capture command
- **THEN** the command SHALL fail with an actionable message
- **AND** the evidence bundle SHALL NOT mark the route witness as complete


<!-- @trace
source: add-ai-led-fhd-witness-tooling
updated: 2026-06-05
code:
  - package.json
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - docs/display-surface-visual-review-checklist.md
  - scripts/fhd-witness-config.mjs
  - apps/web/src/pages/Images/images.css
  - docs/reference-match/fhd-evidence-bundle-template.md
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - docs/reference-match/display-launch-witness-matrix.md
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
  - AGENTS.md
  - apps/server/src/services/displayPagePublishingService.ts
  - docs/reference-match/fhd-reference-informed-closeout-boundaries.md
  - apps/web/src/pages/shared/displayPageFhdRhythmConfig.ts
  - docs/goal.md
  - scripts/capture-fhd-witness.mjs
  - apps/web/src/pages/Solar/solar.css
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - docs/fhd-editor-gap-ledger.md
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - README.md
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - data/server-runtime.lock.json
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - docs/fhd-witness/playback-closeout-matrix.md
  - apps/web/package.json
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Solar/index.tsx
  - docs/fhd-witness/evidence-template.md
  - CLAUDE.md
tests:
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/Solar/layout.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/fhdWitnessTooling.test.ts
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.test.ts
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/displayPageIconSourceMode.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
-->

---
### Requirement: FHD evidence bundle SHALL classify editor capability coverage

The system SHALL provide an evidence bundle format that classifies every recorded FHD gap by the implementation path needed to resolve it.

#### Scenario: Gap is solvable by an existing editor control

- **GIVEN** a screenshot review finds a caption line-height difference on `Images`
- **WHEN** the evidence bundle records the gap
- **THEN** the entry SHALL identify the existing `/display-pages/editor` control used or expected to resolve it
- **AND** the entry SHALL include the route, reference image path, current screenshot path, viewport, and notes

#### Scenario: Gap requires a new editor capability

- **GIVEN** a screenshot review finds a connector thickness difference that cannot be represented by existing controls
- **WHEN** the evidence bundle records the gap
- **THEN** the entry SHALL mark it as requiring a new editor capability
- **AND** the entry SHALL NOT recommend a page-local CSS-only fix as the final implementation path


<!-- @trace
source: add-ai-led-fhd-witness-tooling
updated: 2026-06-05
code:
  - package.json
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - docs/display-surface-visual-review-checklist.md
  - scripts/fhd-witness-config.mjs
  - apps/web/src/pages/Images/images.css
  - docs/reference-match/fhd-evidence-bundle-template.md
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - docs/reference-match/display-launch-witness-matrix.md
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
  - AGENTS.md
  - apps/server/src/services/displayPagePublishingService.ts
  - docs/reference-match/fhd-reference-informed-closeout-boundaries.md
  - apps/web/src/pages/shared/displayPageFhdRhythmConfig.ts
  - docs/goal.md
  - scripts/capture-fhd-witness.mjs
  - apps/web/src/pages/Solar/solar.css
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - docs/fhd-editor-gap-ledger.md
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - README.md
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - data/server-runtime.lock.json
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - docs/fhd-witness/playback-closeout-matrix.md
  - apps/web/package.json
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Solar/index.tsx
  - docs/fhd-witness/evidence-template.md
  - CLAUDE.md
tests:
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/Solar/layout.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/fhdWitnessTooling.test.ts
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.test.ts
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/displayPageIconSourceMode.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
-->

---
### Requirement: AI-led FHD closeout SHALL keep human acceptance explicit

The system SHALL document that AI leads FHD implementation, screenshot capture, evidence collation, and Spectra task hygiene while the user owns product intent and final visual acceptance.

#### Scenario: AI completes a witness run

- **GIVEN** AI has captured route screenshots and filled the evidence bundle
- **WHEN** the evidence is ready for acceptance
- **THEN** the bundle SHALL identify unresolved visual gaps and intentional differences separately
- **AND** the final closeout state SHALL require human acceptance for intentional differences or launch readiness

#### Scenario: Prototype material is not treated as active source of truth

- **GIVEN** a contributor reviews FHD closeout instructions
- **WHEN** they choose reference material for implementation
- **THEN** the instructions SHALL point to `docs/reference/FHD/` as the active visual reference
- **AND** prototype-stage files SHALL remain historical context only

<!-- @trace
source: add-ai-led-fhd-witness-tooling
updated: 2026-06-05
code:
  - package.json
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - docs/display-surface-visual-review-checklist.md
  - scripts/fhd-witness-config.mjs
  - apps/web/src/pages/Images/images.css
  - docs/reference-match/fhd-evidence-bundle-template.md
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - docs/reference-match/display-launch-witness-matrix.md
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
  - AGENTS.md
  - apps/server/src/services/displayPagePublishingService.ts
  - docs/reference-match/fhd-reference-informed-closeout-boundaries.md
  - apps/web/src/pages/shared/displayPageFhdRhythmConfig.ts
  - docs/goal.md
  - scripts/capture-fhd-witness.mjs
  - apps/web/src/pages/Solar/solar.css
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - docs/fhd-editor-gap-ledger.md
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - README.md
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - data/server-runtime.lock.json
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - docs/fhd-witness/playback-closeout-matrix.md
  - apps/web/package.json
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Solar/index.tsx
  - docs/fhd-witness/evidence-template.md
  - CLAUDE.md
tests:
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/Solar/layout.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/fhdWitnessTooling.test.ts
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.test.ts
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/displayPageIconSourceMode.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
-->