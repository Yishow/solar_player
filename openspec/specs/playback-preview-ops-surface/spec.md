# playback-preview-ops-surface Specification

## Purpose

TBD - created by archiving change 'align-playback-settings-and-slideshow-preview-ops-surfaces'. Update Purpose after archive.

## Requirements

### Requirement: Separate configured rotation governance from effective rotation diagnostics

The system SHALL separate configured rotation governance from effective rotation diagnostics across `Playback Settings` and `Slideshow Preview` so operators can distinguish what is configured from what will actually play.

#### Scenario: Operator reviews configured pages and effective playable sequence

- **WHEN** an operator opens `Playback Settings`
- **THEN** the page SHALL show the configured rotation controls separately from the effective playable sequence and skip diagnostics

#### Scenario: Effective sequence differs from configured sequence

- **WHEN** one or more configured pages are skipped or blocked by runtime conditions
- **THEN** the rotation surfaces SHALL identify the configured page instance, its skipped state, and the reason it is not in the effective playable sequence


<!-- @trace
source: align-playback-settings-and-slideshow-preview-ops-surfaces
updated: 2026-05-29
code:
  - apps/web/src/pages/DeviceStatus/layout.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/DisplayPagesEditor/rotationPreview.ts
  - apps/web/src/pages/EnergyTrend/trend.css
  - apps/web/src/components/management/index.tsx
  - apps/web/src/pages/DeviceStatus/device.css
  - apps/web/src/pages/EnergyHistory/layout.ts
  - apps/web/src/styles/management.css
  - apps/web/src/pages/SlideshowPreview/layout.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/EnergyHistory/history.css
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - .agents/skills/spectra-analyze/SKILL.md
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - .agents/skills/spectra-verify/SKILL.md
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/PlaybackSettings/playbackSettings.css
  - apps/web/src/pages/Overview/assets/overview-leaf-reference-crop.png
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - data/server-runtime.lock.json
  - apps/web/src/pages/ImageManagement/index.tsx
  - docs/goal.md
  - apps/web/src/components/management/opsSurfacePrimitives.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/components/management/RemoteSyncBanner.tsx
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/CircuitSettings/circuitSettings.css
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/pages/Overview/assets/overview-leaf-cluster-reference.png
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.ts
  - docs/roadmaps/2026-05-28-settings-status-design-token-alignment-roadmap.md
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/EnergyTrend/layout.ts
  - apps/web/src/components/management/rotationOpsSummary.tsx
  - apps/web/src/pages/CircuitSettings/viewModel.ts
tests:
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/DeviceStatus/layout.test.ts
  - apps/web/src/components/management/rotationOpsSummary.test.tsx
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/ImageManagement/viewModel.test.ts
  - apps/web/src/pages/EnergyTrend/layout.test.ts
  - apps/web/src/components/management/opsSurfacePrimitives.test.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/CircuitSettings/viewModel.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/SlideshowPreview/layout.test.ts
  - apps/web/src/pages/EnergyHistory/layout.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
-->

---
### Requirement: Use one preview status and action language across playback and slideshow surfaces

The system SHALL use one preview status and action language across `Playback Settings` and `Slideshow Preview` while preserving each page's role.

#### Scenario: Operator switches from playback governance to slideshow validation

- **WHEN** the operator moves from `Playback Settings` to `Slideshow Preview`
- **THEN** the preview board, status summaries, and action language SHALL remain visually coherent
- **AND** the page-specific controls SHALL still reflect whether the operator is governing configuration or validating live playback

#### Scenario: Current page and countdown stay readable in both surfaces

- **WHEN** the active page changes or the next-page countdown updates
- **THEN** both playback surfaces SHALL present the active page identity and countdown state using the same semantic status language


<!-- @trace
source: align-playback-settings-and-slideshow-preview-ops-surfaces
updated: 2026-05-29
code:
  - apps/web/src/pages/DeviceStatus/layout.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/DisplayPagesEditor/rotationPreview.ts
  - apps/web/src/pages/EnergyTrend/trend.css
  - apps/web/src/components/management/index.tsx
  - apps/web/src/pages/DeviceStatus/device.css
  - apps/web/src/pages/EnergyHistory/layout.ts
  - apps/web/src/styles/management.css
  - apps/web/src/pages/SlideshowPreview/layout.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/EnergyHistory/history.css
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - .agents/skills/spectra-analyze/SKILL.md
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - .agents/skills/spectra-verify/SKILL.md
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/PlaybackSettings/playbackSettings.css
  - apps/web/src/pages/Overview/assets/overview-leaf-reference-crop.png
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - data/server-runtime.lock.json
  - apps/web/src/pages/ImageManagement/index.tsx
  - docs/goal.md
  - apps/web/src/components/management/opsSurfacePrimitives.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/components/management/RemoteSyncBanner.tsx
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/CircuitSettings/circuitSettings.css
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/pages/Overview/assets/overview-leaf-cluster-reference.png
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.ts
  - docs/roadmaps/2026-05-28-settings-status-design-token-alignment-roadmap.md
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/EnergyTrend/layout.ts
  - apps/web/src/components/management/rotationOpsSummary.tsx
  - apps/web/src/pages/CircuitSettings/viewModel.ts
tests:
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/DeviceStatus/layout.test.ts
  - apps/web/src/components/management/rotationOpsSummary.test.tsx
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/ImageManagement/viewModel.test.ts
  - apps/web/src/pages/EnergyTrend/layout.test.ts
  - apps/web/src/components/management/opsSurfacePrimitives.test.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/CircuitSettings/viewModel.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/SlideshowPreview/layout.test.ts
  - apps/web/src/pages/EnergyHistory/layout.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
-->

---
### Requirement: Preserve page-instance preview identity across configured and effective boards

The system SHALL preserve page-instance preview identity across configured and effective rotation boards.

#### Scenario: Two configured pages share one template key

- **WHEN** the rotation contains two page instances that share the same template key
- **THEN** each instance SHALL render with its own preview state and label identity
- **AND** the surfaces SHALL NOT reuse another instance's preview state only because the template key matches

##### Example: duplicate overview pages remain distinct

- **GIVEN** the configured rotation contains `overview` and `overview-secondary`
- **WHEN** the operator reviews playback governance or slideshow validation
- **THEN** each instance shows its own preview and instance label
- **AND** skip or active state is attached to the correct page instance

<!-- @trace
source: align-playback-settings-and-slideshow-preview-ops-surfaces
updated: 2026-05-29
code:
  - apps/web/src/pages/DeviceStatus/layout.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/DisplayPagesEditor/rotationPreview.ts
  - apps/web/src/pages/EnergyTrend/trend.css
  - apps/web/src/components/management/index.tsx
  - apps/web/src/pages/DeviceStatus/device.css
  - apps/web/src/pages/EnergyHistory/layout.ts
  - apps/web/src/styles/management.css
  - apps/web/src/pages/SlideshowPreview/layout.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/EnergyHistory/history.css
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - .agents/skills/spectra-analyze/SKILL.md
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - .agents/skills/spectra-verify/SKILL.md
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/PlaybackSettings/playbackSettings.css
  - apps/web/src/pages/Overview/assets/overview-leaf-reference-crop.png
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - data/server-runtime.lock.json
  - apps/web/src/pages/ImageManagement/index.tsx
  - docs/goal.md
  - apps/web/src/components/management/opsSurfacePrimitives.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/components/management/RemoteSyncBanner.tsx
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/CircuitSettings/circuitSettings.css
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/pages/Overview/assets/overview-leaf-cluster-reference.png
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.ts
  - docs/roadmaps/2026-05-28-settings-status-design-token-alignment-roadmap.md
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/EnergyTrend/layout.ts
  - apps/web/src/components/management/rotationOpsSummary.tsx
  - apps/web/src/pages/CircuitSettings/viewModel.ts
tests:
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/DeviceStatus/layout.test.ts
  - apps/web/src/components/management/rotationOpsSummary.test.tsx
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/ImageManagement/viewModel.test.ts
  - apps/web/src/pages/EnergyTrend/layout.test.ts
  - apps/web/src/components/management/opsSurfacePrimitives.test.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/CircuitSettings/viewModel.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/SlideshowPreview/layout.test.ts
  - apps/web/src/pages/EnergyHistory/layout.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
-->