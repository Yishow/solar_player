# circuit-settings-operations-surface Specification

## Purpose

TBD - created by archiving change 'complete-circuit-settings-operations-surface'. Update Purpose after archive.

## Requirements

### Requirement: Show row-level display impact and governance risk in circuit settings

The system SHALL show row-level display impact and governance risk in `Circuit Settings`.

#### Scenario: Operator reviews one circuit row

- **WHEN** the operator inspects one circuit row
- **THEN** the row SHALL identify its display slot impact, validation state, and dirty or save risk in a structured summary
- **AND** the operator SHALL NOT need to infer those outcomes only from scattered captions

#### Scenario: Page summary points to row-level readiness concerns

- **WHEN** readiness findings exist for one or more circuit bindings
- **THEN** the page summary SHALL remain consistent with the corresponding row-level display impact and validation state


<!-- @trace
source: complete-circuit-settings-operations-surface
updated: 2026-05-29
code:
  - apps/web/src/pages/DeviceStatus/layout.ts
  - apps/web/src/pages/EnergyHistory/layout.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/SlideshowPreview/layout.ts
  - apps/web/src/pages/Overview/assets/overview-leaf-reference-crop.png
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/components/management/index.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/rotationPreview.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/DeviceStatus/device.css
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - .agents/skills/spectra-analyze/SKILL.md
  - apps/web/src/pages/SlideshowPreview/viewModel.ts
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/styles/management.css
  - data/server-runtime.lock.json
  - .agents/skills/spectra-verify/SKILL.md
  - apps/web/src/pages/CircuitSettings/circuitSettings.css
  - apps/web/src/pages/PlaybackSettings/playbackSettings.css
  - apps/web/src/pages/EnergyTrend/trend.css
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/components/management/rotationOpsSummary.tsx
  - apps/web/src/pages/Overview/assets/overview-leaf-cluster-reference.png
  - apps/web/src/pages/CircuitSettings/viewModel.ts
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/ImageManagement/index.tsx
  - docs/goal.md
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/components/management/opsSurfacePrimitives.tsx
  - docs/roadmaps/2026-05-28-settings-status-design-token-alignment-roadmap.md
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/EnergyHistory/history.css
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/EnergyTrend/layout.ts
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/components/management/RemoteSyncBanner.tsx
tests:
  - apps/web/src/pages/CircuitSettings/viewModel.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/DeviceStatus/layout.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/ImageManagement/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/EnergyHistory/layout.test.ts
  - apps/web/src/components/management/rotationOpsSummary.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/components/management/opsSurfacePrimitives.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/SlideshowPreview/layout.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/EnergyTrend/layout.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/Overview/configRender.test.tsx
-->

---
### Requirement: Preserve bulk table editing while strengthening bounded presentation authoring

The system SHALL preserve bulk table editing while strengthening bounded presentation authoring for circuit display fields.

#### Scenario: Operator edits many rows in one session

- **WHEN** the operator edits multiple circuit rows in the same table session
- **THEN** the page SHALL keep inline bulk editing as the primary workflow
- **AND** it SHALL NOT require a separate per-row wizard to complete ordinary edits

#### Scenario: Operator edits icon or presentation fields

- **WHEN** the operator edits icon or related presentation fields
- **THEN** the page SHALL constrain or validate those choices with a bounded authoring contract
- **AND** it SHALL NOT treat arbitrary freeform values as equally valid display presentation choices


<!-- @trace
source: complete-circuit-settings-operations-surface
updated: 2026-05-29
code:
  - apps/web/src/pages/DeviceStatus/layout.ts
  - apps/web/src/pages/EnergyHistory/layout.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/SlideshowPreview/layout.ts
  - apps/web/src/pages/Overview/assets/overview-leaf-reference-crop.png
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/components/management/index.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/rotationPreview.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/DeviceStatus/device.css
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - .agents/skills/spectra-analyze/SKILL.md
  - apps/web/src/pages/SlideshowPreview/viewModel.ts
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/styles/management.css
  - data/server-runtime.lock.json
  - .agents/skills/spectra-verify/SKILL.md
  - apps/web/src/pages/CircuitSettings/circuitSettings.css
  - apps/web/src/pages/PlaybackSettings/playbackSettings.css
  - apps/web/src/pages/EnergyTrend/trend.css
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/components/management/rotationOpsSummary.tsx
  - apps/web/src/pages/Overview/assets/overview-leaf-cluster-reference.png
  - apps/web/src/pages/CircuitSettings/viewModel.ts
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/ImageManagement/index.tsx
  - docs/goal.md
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/components/management/opsSurfacePrimitives.tsx
  - docs/roadmaps/2026-05-28-settings-status-design-token-alignment-roadmap.md
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/EnergyHistory/history.css
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/EnergyTrend/layout.ts
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/components/management/RemoteSyncBanner.tsx
tests:
  - apps/web/src/pages/CircuitSettings/viewModel.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/DeviceStatus/layout.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/ImageManagement/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/EnergyHistory/layout.test.ts
  - apps/web/src/components/management/rotationOpsSummary.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/components/management/opsSurfacePrimitives.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/SlideshowPreview/layout.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/EnergyTrend/layout.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/Overview/configRender.test.tsx
-->

---
### Requirement: Keep threshold semantics explicit during governance edits

The system SHALL keep threshold semantics explicit during circuit governance edits.

#### Scenario: Operator adjusts threshold ranges

- **WHEN** the operator changes normal, attention, or warning thresholds for a circuit row
- **THEN** the page SHALL show the resulting threshold semantics in the same governance surface
- **AND** the operator SHALL be able to understand whether the row remains internally consistent and ready for display binding review

<!-- @trace
source: complete-circuit-settings-operations-surface
updated: 2026-05-29
code:
  - apps/web/src/pages/DeviceStatus/layout.ts
  - apps/web/src/pages/EnergyHistory/layout.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/SlideshowPreview/layout.ts
  - apps/web/src/pages/Overview/assets/overview-leaf-reference-crop.png
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/components/management/index.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/rotationPreview.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/DeviceStatus/device.css
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - .agents/skills/spectra-analyze/SKILL.md
  - apps/web/src/pages/SlideshowPreview/viewModel.ts
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/styles/management.css
  - data/server-runtime.lock.json
  - .agents/skills/spectra-verify/SKILL.md
  - apps/web/src/pages/CircuitSettings/circuitSettings.css
  - apps/web/src/pages/PlaybackSettings/playbackSettings.css
  - apps/web/src/pages/EnergyTrend/trend.css
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/components/management/rotationOpsSummary.tsx
  - apps/web/src/pages/Overview/assets/overview-leaf-cluster-reference.png
  - apps/web/src/pages/CircuitSettings/viewModel.ts
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/ImageManagement/index.tsx
  - docs/goal.md
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/components/management/opsSurfacePrimitives.tsx
  - docs/roadmaps/2026-05-28-settings-status-design-token-alignment-roadmap.md
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/EnergyHistory/history.css
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/EnergyTrend/layout.ts
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/components/management/RemoteSyncBanner.tsx
tests:
  - apps/web/src/pages/CircuitSettings/viewModel.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/DeviceStatus/layout.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/ImageManagement/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/EnergyHistory/layout.test.ts
  - apps/web/src/components/management/rotationOpsSummary.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/components/management/opsSurfacePrimitives.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/SlideshowPreview/layout.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/EnergyTrend/layout.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/Overview/configRender.test.tsx
-->