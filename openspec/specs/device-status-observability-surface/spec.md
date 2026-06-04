# device-status-observability-surface Specification

## Purpose

TBD - created by archiving change 'complete-device-status-observability-surface'. Update Purpose after archive.

## Requirements

### Requirement: Present device status as a summary-first observability dashboard

The system SHALL present `Device Status` as a summary-first observability dashboard.

#### Scenario: Operator opens device status during an incident

- **WHEN** the operator opens `Device Status` during a degraded runtime incident
- **THEN** the page SHALL surface host health, display-operations health, and next-action guidance before deep detail sections

#### Scenario: Dashboard remains distinct from settings workspaces

- **WHEN** the operator navigates from a settings workspace to `Device Status`
- **THEN** the page SHALL remain visually and structurally identifiable as an observability dashboard
- **AND** it SHALL still share the same semantic state language as the settings family


<!-- @trace
source: complete-device-status-observability-surface
updated: 2026-05-29
code:
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/SlideshowPreview/preview.css
  - docs/goal.md
  - data/server-runtime.lock.json
  - apps/web/src/pages/DisplayPagesEditor/rotationPreview.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/Overview/assets/overview-leaf-reference-crop.png
  - apps/web/src/pages/EnergyHistory/history.css
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/components/management/opsSurfacePrimitives.tsx
  - .agents/skills/spectra-verify/SKILL.md
  - apps/web/src/components/management/index.tsx
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/EnergyHistory/layout.ts
  - docs/roadmaps/2026-05-28-settings-status-design-token-alignment-roadmap.md
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/PlaybackSettings/playbackSettings.css
  - apps/web/src/pages/EnergyTrend/layout.ts
  - .agents/skills/spectra-analyze/SKILL.md
  - apps/web/src/pages/DeviceStatus/device.css
  - apps/web/src/pages/EnergyTrend/trend.css
  - apps/web/src/pages/CircuitSettings/circuitSettings.css
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/CircuitSettings/viewModel.ts
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/web/src/components/management/RemoteSyncBanner.tsx
  - apps/web/src/pages/DeviceStatus/layout.ts
  - apps/web/src/styles/management.css
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/SlideshowPreview/viewModel.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/components/management/rotationOpsSummary.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/SlideshowPreview/layout.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/Overview/assets/overview-leaf-cluster-reference.png
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/components/TitleBlock.tsx
tests:
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/components/management/rotationOpsSummary.test.tsx
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/ImageManagement/viewModel.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/pages/EnergyHistory/layout.test.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.test.ts
  - apps/web/src/pages/SlideshowPreview/layout.test.ts
  - apps/web/src/pages/CircuitSettings/viewModel.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DeviceStatus/layout.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/components/management/opsSurfacePrimitives.test.tsx
  - apps/web/src/pages/EnergyTrend/layout.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
-->

---
### Requirement: Show safe diagnostics results and host-level escalation guidance together

The system SHALL show safe diagnostics results and host-level escalation guidance together in `Device Status`.

#### Scenario: Operator triggers a safe diagnostics action

- **WHEN** the operator triggers a safe diagnostics action from `Device Status`
- **THEN** the page SHALL show the action's safe scope, result context, and truthful outcome in a first-class result surface

#### Scenario: Operator reaches an unsupported in-app control path

- **WHEN** the requested action requires host-level intervention instead of in-app execution
- **THEN** the page SHALL show explicit host-level escalation guidance
- **AND** it SHALL NOT imply that the application executed the unsupported control


<!-- @trace
source: complete-device-status-observability-surface
updated: 2026-05-29
code:
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/SlideshowPreview/preview.css
  - docs/goal.md
  - data/server-runtime.lock.json
  - apps/web/src/pages/DisplayPagesEditor/rotationPreview.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/Overview/assets/overview-leaf-reference-crop.png
  - apps/web/src/pages/EnergyHistory/history.css
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/components/management/opsSurfacePrimitives.tsx
  - .agents/skills/spectra-verify/SKILL.md
  - apps/web/src/components/management/index.tsx
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/EnergyHistory/layout.ts
  - docs/roadmaps/2026-05-28-settings-status-design-token-alignment-roadmap.md
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/PlaybackSettings/playbackSettings.css
  - apps/web/src/pages/EnergyTrend/layout.ts
  - .agents/skills/spectra-analyze/SKILL.md
  - apps/web/src/pages/DeviceStatus/device.css
  - apps/web/src/pages/EnergyTrend/trend.css
  - apps/web/src/pages/CircuitSettings/circuitSettings.css
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/CircuitSettings/viewModel.ts
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/web/src/components/management/RemoteSyncBanner.tsx
  - apps/web/src/pages/DeviceStatus/layout.ts
  - apps/web/src/styles/management.css
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/SlideshowPreview/viewModel.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/components/management/rotationOpsSummary.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/SlideshowPreview/layout.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/Overview/assets/overview-leaf-cluster-reference.png
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/components/TitleBlock.tsx
tests:
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/components/management/rotationOpsSummary.test.tsx
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/ImageManagement/viewModel.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/pages/EnergyHistory/layout.test.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.test.ts
  - apps/web/src/pages/SlideshowPreview/layout.test.ts
  - apps/web/src/pages/CircuitSettings/viewModel.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DeviceStatus/layout.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/components/management/opsSurfacePrimitives.test.tsx
  - apps/web/src/pages/EnergyTrend/layout.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
-->

---
### Requirement: Present alerts, liveness, and logs as triage surfaces instead of generic status stacks

The system SHALL present display alerts, client liveness, and log summaries as triage surfaces instead of generic status stacks.

#### Scenario: Page shows mixed display alerts and client heartbeat state

- **WHEN** display readiness or operational alerts exist alongside client heartbeat data
- **THEN** the page SHALL group those signals into readable triage surfaces with clear purpose and priority

#### Scenario: Operator reviews recent logs for the current incident

- **WHEN** recent log metadata is available
- **THEN** the page SHALL present the log summary as part of the observability triage flow
- **AND** it SHALL help the operator understand whether deeper host-level investigation is required

<!-- @trace
source: complete-device-status-observability-surface
updated: 2026-05-29
code:
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/SlideshowPreview/preview.css
  - docs/goal.md
  - data/server-runtime.lock.json
  - apps/web/src/pages/DisplayPagesEditor/rotationPreview.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/Overview/assets/overview-leaf-reference-crop.png
  - apps/web/src/pages/EnergyHistory/history.css
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/components/management/opsSurfacePrimitives.tsx
  - .agents/skills/spectra-verify/SKILL.md
  - apps/web/src/components/management/index.tsx
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/EnergyHistory/layout.ts
  - docs/roadmaps/2026-05-28-settings-status-design-token-alignment-roadmap.md
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/PlaybackSettings/playbackSettings.css
  - apps/web/src/pages/EnergyTrend/layout.ts
  - .agents/skills/spectra-analyze/SKILL.md
  - apps/web/src/pages/DeviceStatus/device.css
  - apps/web/src/pages/EnergyTrend/trend.css
  - apps/web/src/pages/CircuitSettings/circuitSettings.css
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/CircuitSettings/viewModel.ts
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/web/src/components/management/RemoteSyncBanner.tsx
  - apps/web/src/pages/DeviceStatus/layout.ts
  - apps/web/src/styles/management.css
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/SlideshowPreview/viewModel.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/components/management/rotationOpsSummary.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/SlideshowPreview/layout.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/Overview/assets/overview-leaf-cluster-reference.png
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/components/TitleBlock.tsx
tests:
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/components/management/rotationOpsSummary.test.tsx
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/ImageManagement/viewModel.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/pages/EnergyHistory/layout.test.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.test.ts
  - apps/web/src/pages/SlideshowPreview/layout.test.ts
  - apps/web/src/pages/CircuitSettings/viewModel.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DeviceStatus/layout.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/components/management/opsSurfacePrimitives.test.tsx
  - apps/web/src/pages/EnergyTrend/layout.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
-->