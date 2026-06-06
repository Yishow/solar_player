# playback-display-runtime-controls Specification

## Purpose

TBD - created by archiving change 'apply-playback-brightness-orientation-runtime'. Update Purpose after archive.

## Requirements

### Requirement: Apply persisted brightness to the playback display surface

The playback display surface SHALL apply the persisted `PlaybackSettings.brightness` value as a surface-level brightness so operators see the configured brightness on the live display. A brightness of 100 SHALL render with no change (identity).

#### Scenario: Brightness below 100 darkens the surface

- **WHEN** playback settings resolve to `brightness = 60`
- **THEN** the display surface renders with a CSS brightness filter equivalent to 0.6
- **AND** page content coordinates are unchanged

#### Scenario: Missing or default brightness is identity

- **WHEN** settings are not yet loaded or `brightness = 100`
- **THEN** the display surface renders without a brightness filter

##### Example: Brightness mapping

| brightness | Applied filter |
| ----- | ----- |
| 100 | (none) |
| 60 | `brightness(0.6)` |
| 150 | `brightness(1.5)` |


<!-- @trace
source: apply-playback-brightness-orientation-runtime
updated: 2026-06-07
code:
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - apps/web/src/components/displayCanvasSurfaceStyle.ts
  - apps/server/src/services/displaySeedAssetManifest.ts
  - data/server-runtime.lock.json
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/hooks/displayTransition.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
tests:
  - apps/web/src/components/displayCanvasSurfaceStyle.test.ts
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.test.ts
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/FactoryCircuit/svgRouting.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
-->

---
### Requirement: Apply persisted orientation to the playback display surface

The playback display surface SHALL apply the persisted `PlaybackSettings.orientation`. `portrait` SHALL rotate the surface 90 degrees for an upright physical screen; `landscape` (and missing values) SHALL render with no rotation.

#### Scenario: Portrait rotates the surface

- **WHEN** playback settings resolve to `orientation = "portrait"`
- **THEN** the display surface applies a 90-degree rotation transform
- **AND** the FHD 1920×1080 content layout is not re-coordinated

#### Scenario: Landscape is identity

- **WHEN** `orientation = "landscape"` or settings are not loaded
- **THEN** the display surface applies no rotation transform


<!-- @trace
source: apply-playback-brightness-orientation-runtime
updated: 2026-06-07
code:
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - apps/web/src/components/displayCanvasSurfaceStyle.ts
  - apps/server/src/services/displaySeedAssetManifest.ts
  - data/server-runtime.lock.json
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/hooks/displayTransition.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
tests:
  - apps/web/src/components/displayCanvasSurfaceStyle.test.ts
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.test.ts
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/FactoryCircuit/svgRouting.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
-->

---
### Requirement: Seed image playlist content for the 4-up thumbnail strip

The seed data SHALL provide at least four image playlist entries so the `/images` playback page can render its 4-up thumbnail strip for witness review.

#### Scenario: Images page renders four thumbnails after seed

- **WHEN** the database is seeded
- **THEN** the image playlist exposes at least four ordered entries
- **AND** `/images` renders the 4-up thumbnail strip rather than a single centered thumbnail


<!-- @trace
source: apply-playback-brightness-orientation-runtime
updated: 2026-06-07
code:
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - apps/web/src/components/displayCanvasSurfaceStyle.ts
  - apps/server/src/services/displaySeedAssetManifest.ts
  - data/server-runtime.lock.json
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/hooks/displayTransition.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
tests:
  - apps/web/src/components/displayCanvasSurfaceStyle.test.ts
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.test.ts
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/FactoryCircuit/svgRouting.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
-->

---
### Requirement: Project build stays green

The repository SHALL build without TypeScript errors via `pnpm run build`.

#### Scenario: Build passes after runtime controls land

- **WHEN** `pnpm run build` runs
- **THEN** it completes with no TypeScript errors

<!-- @trace
source: apply-playback-brightness-orientation-runtime
updated: 2026-06-07
code:
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - apps/web/src/components/displayCanvasSurfaceStyle.ts
  - apps/server/src/services/displaySeedAssetManifest.ts
  - data/server-runtime.lock.json
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/hooks/displayTransition.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
tests:
  - apps/web/src/components/displayCanvasSurfaceStyle.test.ts
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.test.ts
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/FactoryCircuit/svgRouting.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
-->