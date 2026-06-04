# image-management-governance-surface Specification

## Purpose

TBD - created by archiving change 'complete-image-management-governance-surface'. Update Purpose after archive.

## Requirements

### Requirement: Support structured governance for one asset to many playlist entries

The system SHALL support structured governance for one selected asset to many playlist entries in `Image Management`.

#### Scenario: Selected asset is used by multiple playlist rows

- **WHEN** an operator selects an asset that is referenced by multiple playlist rows
- **THEN** the page SHALL identify that one-to-many relationship explicitly
- **AND** the operator SHALL be able to review and govern each relevant playlist row without relying on an implicit first-row default only

#### Scenario: Operator edits playlist runtime fields for one selected row

- **WHEN** the operator chooses a specific playlist row for the selected asset
- **THEN** the page SHALL scope runtime fields such as title, fallback mode, duration, order, and enabled state to that chosen row


<!-- @trace
source: complete-image-management-governance-surface
updated: 2026-05-29
code:
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - data/server-runtime.lock.json
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - docs/goal.md
  - apps/web/src/pages/Overview/assets/overview-leaf-reference-crop.png
  - apps/web/src/components/management/opsSurfacePrimitives.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/Overview/assets/overview-leaf-cluster-reference.png
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/CircuitSettings/circuitSettings.css
  - apps/web/src/pages/CircuitSettings/viewModel.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/components/management/rotationOpsSummary.tsx
  - apps/web/src/pages/SlideshowPreview/viewModel.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/EnergyTrend/layout.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/EnergyHistory/layout.ts
  - apps/web/src/pages/PlaybackSettings/playbackSettings.css
  - apps/web/src/pages/DeviceStatus/layout.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/rotationPreview.ts
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/styles/management.css
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/components/management/RemoteSyncBanner.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/EnergyHistory/history.css
  - apps/web/src/components/management/index.tsx
  - apps/web/src/pages/EnergyTrend/trend.css
  - .agents/skills/spectra-analyze/SKILL.md
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/SlideshowPreview/layout.ts
  - .agents/skills/spectra-verify/SKILL.md
  - apps/web/src/styles/tokens.css
  - docs/roadmaps/2026-05-28-settings-status-design-token-alignment-roadmap.md
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/DeviceStatus/device.css
tests:
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/CircuitSettings/viewModel.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/DeviceStatus/layout.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/components/management/rotationOpsSummary.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/components/management/opsSurfacePrimitives.test.tsx
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/pages/EnergyTrend/layout.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/SlideshowPreview/layout.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/EnergyHistory/layout.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/ImageManagement/viewModel.test.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
-->

---
### Requirement: Provide actionable editor handoff for focal editing instead of disabled placeholders

The system SHALL provide an actionable editor handoff for focal editing from `Image Management`.

#### Scenario: Operator wants to adjust focus or crop for a selected asset

- **WHEN** the operator triggers focal editing from the selected asset panel
- **THEN** the page SHALL launch a real workflow with selected-asset context
- **AND** it SHALL NOT leave the action as a disabled placeholder-only control

#### Scenario: Editor handoff keeps governance and authoring responsibilities distinct

- **WHEN** the operator follows the focal-editing handoff
- **THEN** the target workflow SHALL continue asset authoring in the editor workspace
- **AND** `Image Management` SHALL remain the governance surface for references and playlist runtime controls


<!-- @trace
source: complete-image-management-governance-surface
updated: 2026-05-29
code:
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - data/server-runtime.lock.json
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - docs/goal.md
  - apps/web/src/pages/Overview/assets/overview-leaf-reference-crop.png
  - apps/web/src/components/management/opsSurfacePrimitives.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/Overview/assets/overview-leaf-cluster-reference.png
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/CircuitSettings/circuitSettings.css
  - apps/web/src/pages/CircuitSettings/viewModel.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/components/management/rotationOpsSummary.tsx
  - apps/web/src/pages/SlideshowPreview/viewModel.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/EnergyTrend/layout.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/EnergyHistory/layout.ts
  - apps/web/src/pages/PlaybackSettings/playbackSettings.css
  - apps/web/src/pages/DeviceStatus/layout.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/rotationPreview.ts
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/styles/management.css
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/components/management/RemoteSyncBanner.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/EnergyHistory/history.css
  - apps/web/src/components/management/index.tsx
  - apps/web/src/pages/EnergyTrend/trend.css
  - .agents/skills/spectra-analyze/SKILL.md
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/SlideshowPreview/layout.ts
  - .agents/skills/spectra-verify/SKILL.md
  - apps/web/src/styles/tokens.css
  - docs/roadmaps/2026-05-28-settings-status-design-token-alignment-roadmap.md
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/DeviceStatus/device.css
tests:
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/CircuitSettings/viewModel.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/DeviceStatus/layout.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/components/management/rotationOpsSummary.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/components/management/opsSurfacePrimitives.test.tsx
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/pages/EnergyTrend/layout.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/SlideshowPreview/layout.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/EnergyHistory/layout.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/ImageManagement/viewModel.test.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
-->

---
### Requirement: Present references and delete blockers as structured triage surfaces

The system SHALL present references and delete blockers as structured triage surfaces in `Image Management`.

#### Scenario: Selected asset has live and draft references

- **WHEN** the selected asset is referenced by display pages or slideshow entries
- **THEN** the page SHALL distinguish stage, target, and reference kind in a structured surface
- **AND** the operator SHALL be able to tell whether the blocker comes from live runtime, draft configuration, or slideshow governance

#### Scenario: Selected asset cannot be deleted safely

- **WHEN** deletion is blocked by existing references or runtime usage
- **THEN** the page SHALL identify the blocking reason and the next governance step
- **AND** it SHALL NOT rely only on a generic refusal message

<!-- @trace
source: complete-image-management-governance-surface
updated: 2026-05-29
code:
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - data/server-runtime.lock.json
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - docs/goal.md
  - apps/web/src/pages/Overview/assets/overview-leaf-reference-crop.png
  - apps/web/src/components/management/opsSurfacePrimitives.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/Overview/assets/overview-leaf-cluster-reference.png
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/CircuitSettings/circuitSettings.css
  - apps/web/src/pages/CircuitSettings/viewModel.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/components/management/rotationOpsSummary.tsx
  - apps/web/src/pages/SlideshowPreview/viewModel.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/EnergyTrend/layout.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/EnergyHistory/layout.ts
  - apps/web/src/pages/PlaybackSettings/playbackSettings.css
  - apps/web/src/pages/DeviceStatus/layout.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/rotationPreview.ts
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/styles/management.css
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/components/management/RemoteSyncBanner.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/EnergyHistory/history.css
  - apps/web/src/components/management/index.tsx
  - apps/web/src/pages/EnergyTrend/trend.css
  - .agents/skills/spectra-analyze/SKILL.md
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/SlideshowPreview/layout.ts
  - .agents/skills/spectra-verify/SKILL.md
  - apps/web/src/styles/tokens.css
  - docs/roadmaps/2026-05-28-settings-status-design-token-alignment-roadmap.md
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/DeviceStatus/device.css
tests:
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/CircuitSettings/viewModel.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/DeviceStatus/layout.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/components/management/rotationOpsSummary.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/components/management/opsSurfacePrimitives.test.tsx
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/pages/EnergyTrend/layout.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/SlideshowPreview/layout.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/EnergyHistory/layout.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/ImageManagement/viewModel.test.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
-->