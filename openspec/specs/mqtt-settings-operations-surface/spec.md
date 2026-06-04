# mqtt-settings-operations-surface Specification

## Purpose

TBD - created by archiving change 'complete-mqtt-settings-operations-surface'. Update Purpose after archive.

## Requirements

### Requirement: Present MQTT topic governance with display-impact-aware workspace summaries

The system SHALL present MQTT topic governance with display-impact-aware workspace summaries in `MQTT Settings`.

#### Scenario: Operator reviews mappings for affected display stories

- **WHEN** the operator opens the topic workspace
- **THEN** the page SHALL show which mappings or gaps affect which display stories or metric families
- **AND** the operator SHALL NOT need to infer impact only from a flat list of topic rows

#### Scenario: Topic row remains editable while workspace summary highlights priority

- **WHEN** the operator edits one topic row inside the workspace
- **THEN** the row SHALL remain directly editable
- **AND** the surrounding workspace SHALL still communicate whether the issue is an idle runtime, a mapping gap, or a healthy mapping


<!-- @trace
source: complete-mqtt-settings-operations-surface
updated: 2026-05-29
code:
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/components/management/RemoteSyncBanner.tsx
  - docs/goal.md
  - apps/web/src/pages/CircuitSettings/circuitSettings.css
  - apps/web/src/pages/CircuitSettings/viewModel.ts
  - apps/web/src/pages/DeviceStatus/layout.ts
  - .agents/skills/spectra-verify/SKILL.md
  - apps/web/src/pages/EnergyTrend/layout.ts
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - .agents/skills/spectra-analyze/SKILL.md
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - docs/roadmaps/2026-05-28-settings-status-design-token-alignment-roadmap.md
  - apps/web/src/components/management/index.tsx
  - apps/web/src/styles/management.css
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/EnergyTrend/trend.css
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/DeviceStatus/device.css
  - apps/web/src/pages/SlideshowPreview/viewModel.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/Overview/assets/overview-leaf-cluster-reference.png
  - apps/web/src/pages/Overview/assets/overview-leaf-reference-crop.png
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - data/server-runtime.lock.json
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/components/management/rotationOpsSummary.tsx
  - apps/web/src/pages/PlaybackSettings/playbackSettings.css
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/components/management/opsSurfacePrimitives.tsx
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/EnergyHistory/history.css
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/DisplayPagesEditor/rotationPreview.ts
  - apps/web/src/pages/EnergyHistory/layout.ts
  - apps/web/src/pages/SlideshowPreview/layout.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
tests:
  - apps/web/src/components/management/rotationOpsSummary.test.tsx
  - apps/web/src/pages/EnergyHistory/layout.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/ImageManagement/viewModel.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/CircuitSettings/viewModel.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/components/management/opsSurfacePrimitives.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.test.ts
  - apps/web/src/pages/EnergyTrend/layout.test.ts
  - apps/web/src/pages/SlideshowPreview/layout.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DeviceStatus/layout.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
-->

---
### Requirement: Show section-level draft and runtime guidance across broker, topic, and weather areas

The system SHALL show section-level draft and runtime guidance across broker, topic, and weather areas.

#### Scenario: One section has unsaved changes while another section is runtime-healthy

- **WHEN** an operator changes weather or topic settings without saving
- **THEN** the page SHALL identify which section carries the unsaved scope
- **AND** it SHALL keep unrelated runtime-healthy sections readable without implying they are also dirty

#### Scenario: Broker and topic runtime remain explicit during token alignment

- **WHEN** the broker disconnects or a mapped topic becomes idle
- **THEN** the page SHALL preserve explicit broker and runtime feedback hierarchy
- **AND** the aligned surface SHALL NOT collapse those states into ambiguous neutral panels


<!-- @trace
source: complete-mqtt-settings-operations-surface
updated: 2026-05-29
code:
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/components/management/RemoteSyncBanner.tsx
  - docs/goal.md
  - apps/web/src/pages/CircuitSettings/circuitSettings.css
  - apps/web/src/pages/CircuitSettings/viewModel.ts
  - apps/web/src/pages/DeviceStatus/layout.ts
  - .agents/skills/spectra-verify/SKILL.md
  - apps/web/src/pages/EnergyTrend/layout.ts
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - .agents/skills/spectra-analyze/SKILL.md
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - docs/roadmaps/2026-05-28-settings-status-design-token-alignment-roadmap.md
  - apps/web/src/components/management/index.tsx
  - apps/web/src/styles/management.css
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/EnergyTrend/trend.css
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/DeviceStatus/device.css
  - apps/web/src/pages/SlideshowPreview/viewModel.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/Overview/assets/overview-leaf-cluster-reference.png
  - apps/web/src/pages/Overview/assets/overview-leaf-reference-crop.png
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - data/server-runtime.lock.json
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/components/management/rotationOpsSummary.tsx
  - apps/web/src/pages/PlaybackSettings/playbackSettings.css
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/components/management/opsSurfacePrimitives.tsx
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/EnergyHistory/history.css
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/DisplayPagesEditor/rotationPreview.ts
  - apps/web/src/pages/EnergyHistory/layout.ts
  - apps/web/src/pages/SlideshowPreview/layout.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
tests:
  - apps/web/src/components/management/rotationOpsSummary.test.tsx
  - apps/web/src/pages/EnergyHistory/layout.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/ImageManagement/viewModel.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/CircuitSettings/viewModel.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/components/management/opsSurfacePrimitives.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.test.ts
  - apps/web/src/pages/EnergyTrend/layout.test.ts
  - apps/web/src/pages/SlideshowPreview/layout.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DeviceStatus/layout.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
-->

---
### Requirement: Treat weather configuration as an effective header contract

The system SHALL treat weather configuration as an effective header contract in `MQTT Settings`.

#### Scenario: Operator changes preset or location inputs

- **WHEN** the operator changes weather preset, county, station, or custom field selection
- **THEN** the page SHALL show the resulting effective header preview and any validation feedback in the same weather workspace

#### Scenario: Invalid or incomplete weather selection is visible before save

- **WHEN** the selected county, station, or preset configuration is invalid or incomplete
- **THEN** the weather workspace SHALL show explicit validation feedback
- **AND** the operator SHALL be able to understand how the current draft differs from a valid effective header outcome

<!-- @trace
source: complete-mqtt-settings-operations-surface
updated: 2026-05-29
code:
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/components/management/RemoteSyncBanner.tsx
  - docs/goal.md
  - apps/web/src/pages/CircuitSettings/circuitSettings.css
  - apps/web/src/pages/CircuitSettings/viewModel.ts
  - apps/web/src/pages/DeviceStatus/layout.ts
  - .agents/skills/spectra-verify/SKILL.md
  - apps/web/src/pages/EnergyTrend/layout.ts
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - .agents/skills/spectra-analyze/SKILL.md
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - docs/roadmaps/2026-05-28-settings-status-design-token-alignment-roadmap.md
  - apps/web/src/components/management/index.tsx
  - apps/web/src/styles/management.css
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/EnergyTrend/trend.css
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/DeviceStatus/device.css
  - apps/web/src/pages/SlideshowPreview/viewModel.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/Overview/assets/overview-leaf-cluster-reference.png
  - apps/web/src/pages/Overview/assets/overview-leaf-reference-crop.png
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - data/server-runtime.lock.json
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/components/management/rotationOpsSummary.tsx
  - apps/web/src/pages/PlaybackSettings/playbackSettings.css
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/components/management/opsSurfacePrimitives.tsx
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/EnergyHistory/history.css
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/DisplayPagesEditor/rotationPreview.ts
  - apps/web/src/pages/EnergyHistory/layout.ts
  - apps/web/src/pages/SlideshowPreview/layout.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
tests:
  - apps/web/src/components/management/rotationOpsSummary.test.tsx
  - apps/web/src/pages/EnergyHistory/layout.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/ImageManagement/viewModel.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/CircuitSettings/viewModel.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/components/management/opsSurfacePrimitives.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.test.ts
  - apps/web/src/pages/EnergyTrend/layout.test.ts
  - apps/web/src/pages/SlideshowPreview/layout.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DeviceStatus/layout.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
-->