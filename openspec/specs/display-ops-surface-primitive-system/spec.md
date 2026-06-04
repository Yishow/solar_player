# display-ops-surface-primitive-system Specification

## Purpose

TBD - created by archiving change 'establish-display-ops-surface-token-primitives'. Update Purpose after archive.

## Requirements

### Requirement: Provide semantic surface primitives for display operations settings and status pages

The system SHALL provide semantic surface primitives for display-operations settings and status pages so shared management surfaces can reuse one token language for boards, banners, summary strips, table shells, preview surfaces, and dashboard summaries.

#### Scenario: Operations settings page consumes shared surface primitives

- **WHEN** a display-operations settings page renders a title area, action area, summary board, and status feedback surface
- **THEN** those surfaces SHALL consume shared semantic primitives instead of route-local hardcoded appearance rules

#### Scenario: Status dashboard consumes shared token language without collapsing into settings density

- **WHEN** `Device Status` renders dashboard summaries, diagnostics actions, and telemetry panels
- **THEN** it SHALL use the same semantic token language for color, border, shadow, and state tones
- **AND** it SHALL NOT be forced into the same form-density contract as settings pages


<!-- @trace
source: establish-display-ops-surface-token-primitives
updated: 2026-05-29
code:
  - .agents/skills/spectra-analyze/SKILL.md
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/CircuitSettings/viewModel.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/EnergyTrend/layout.ts
  - apps/web/src/pages/EnergyTrend/trend.css
  - apps/web/src/pages/Overview/assets/overview-leaf-cluster-reference.png
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/rotationPreview.ts
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/components/management/rotationOpsSummary.tsx
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/Overview/assets/overview-leaf-reference-crop.png
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/components/management/opsSurfacePrimitives.tsx
  - apps/web/src/pages/DeviceStatus/layout.ts
  - apps/web/src/pages/EnergyHistory/history.css
  - apps/web/src/pages/SlideshowPreview/layout.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/components/management/index.tsx
  - docs/roadmaps/2026-05-28-settings-status-design-token-alignment-roadmap.md
  - apps/web/src/styles/management.css
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/PlaybackSettings/playbackSettings.css
  - apps/web/src/styles/tokens.css
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/SlideshowPreview/viewModel.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/EnergyHistory/layout.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/DeviceStatus/device.css
  - docs/goal.md
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/CircuitSettings/circuitSettings.css
  - apps/web/src/pages/MqttSettings/index.tsx
  - data/server-runtime.lock.json
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/web/src/components/management/RemoteSyncBanner.tsx
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - .agents/skills/spectra-verify/SKILL.md
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
tests:
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/components/management/rotationOpsSummary.test.tsx
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/pages/SlideshowPreview/layout.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/EnergyHistory/layout.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/EnergyTrend/layout.test.ts
  - apps/web/src/components/management/opsSurfacePrimitives.test.tsx
  - apps/web/src/pages/CircuitSettings/viewModel.test.ts
  - apps/web/src/pages/DeviceStatus/layout.test.ts
  - apps/web/src/pages/ImageManagement/viewModel.test.ts
-->

---
### Requirement: Distinguish operations, preview, and status-dashboard surface families

The system SHALL distinguish operations, preview, and status-dashboard surface families so settings workspaces, rotation preview surfaces, and observability dashboards can stay visually related without becoming interchangeable.

#### Scenario: Playback preview surface differs from edit workspace surface

- **WHEN** an operator moves from `Playback Settings` or `Slideshow Preview` to a settings workspace such as `MQTT Settings`
- **THEN** the preview-oriented surfaces SHALL remain identifiable as preview family surfaces
- **AND** the settings workspace SHALL remain identifiable as an operations family surface
- **AND** both SHALL still read as part of one display-operations product language

#### Scenario: Status dashboard remains distinct from settings workspace

- **WHEN** an operator moves from `Circuit Settings` to `Device Status`
- **THEN** the dashboard surface SHALL keep its own summary-first information rhythm
- **AND** it SHALL still reuse the same semantic state tones and shell-compatible surface language


<!-- @trace
source: establish-display-ops-surface-token-primitives
updated: 2026-05-29
code:
  - .agents/skills/spectra-analyze/SKILL.md
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/CircuitSettings/viewModel.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/EnergyTrend/layout.ts
  - apps/web/src/pages/EnergyTrend/trend.css
  - apps/web/src/pages/Overview/assets/overview-leaf-cluster-reference.png
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/rotationPreview.ts
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/components/management/rotationOpsSummary.tsx
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/Overview/assets/overview-leaf-reference-crop.png
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/components/management/opsSurfacePrimitives.tsx
  - apps/web/src/pages/DeviceStatus/layout.ts
  - apps/web/src/pages/EnergyHistory/history.css
  - apps/web/src/pages/SlideshowPreview/layout.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/components/management/index.tsx
  - docs/roadmaps/2026-05-28-settings-status-design-token-alignment-roadmap.md
  - apps/web/src/styles/management.css
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/PlaybackSettings/playbackSettings.css
  - apps/web/src/styles/tokens.css
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/SlideshowPreview/viewModel.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/EnergyHistory/layout.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/DeviceStatus/device.css
  - docs/goal.md
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/CircuitSettings/circuitSettings.css
  - apps/web/src/pages/MqttSettings/index.tsx
  - data/server-runtime.lock.json
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/web/src/components/management/RemoteSyncBanner.tsx
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - .agents/skills/spectra-verify/SKILL.md
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
tests:
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/components/management/rotationOpsSummary.test.tsx
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/pages/SlideshowPreview/layout.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/EnergyHistory/layout.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/EnergyTrend/layout.test.ts
  - apps/web/src/components/management/opsSurfacePrimitives.test.tsx
  - apps/web/src/pages/CircuitSettings/viewModel.test.ts
  - apps/web/src/pages/DeviceStatus/layout.test.ts
  - apps/web/src/pages/ImageManagement/viewModel.test.ts
-->

---
### Requirement: Allow page-local geometry while centralizing appearance semantics

The system SHALL allow page-local geometry and information architecture while centralizing appearance semantics in shared tokens and primitives.

#### Scenario: Page keeps custom layout while adopting shared appearance tokens

- **WHEN** a page retains page-specific layout geometry for its role
- **THEN** its cards, banners, tables, and action surfaces SHALL still derive appearance from shared semantic tokens
- **AND** page-local CSS SHALL only specialize role-specific layout or interaction details

##### Example: playback and device pages keep different geometry

- **GIVEN** `Playback Settings` uses a preview-first composition and `Device Status` uses a dashboard summary composition
- **WHEN** both pages adopt the shared primitive system
- **THEN** the two pages keep different geometry
- **AND** they reuse the same tokenized appearance contract for state tones, borders, shadows, and surface hierarchy

<!-- @trace
source: establish-display-ops-surface-token-primitives
updated: 2026-05-29
code:
  - .agents/skills/spectra-analyze/SKILL.md
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/CircuitSettings/viewModel.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/EnergyTrend/layout.ts
  - apps/web/src/pages/EnergyTrend/trend.css
  - apps/web/src/pages/Overview/assets/overview-leaf-cluster-reference.png
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/rotationPreview.ts
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/components/management/rotationOpsSummary.tsx
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/Overview/assets/overview-leaf-reference-crop.png
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/components/management/opsSurfacePrimitives.tsx
  - apps/web/src/pages/DeviceStatus/layout.ts
  - apps/web/src/pages/EnergyHistory/history.css
  - apps/web/src/pages/SlideshowPreview/layout.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/components/management/index.tsx
  - docs/roadmaps/2026-05-28-settings-status-design-token-alignment-roadmap.md
  - apps/web/src/styles/management.css
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/PlaybackSettings/playbackSettings.css
  - apps/web/src/styles/tokens.css
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/SlideshowPreview/viewModel.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/EnergyHistory/layout.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/DeviceStatus/device.css
  - docs/goal.md
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/CircuitSettings/circuitSettings.css
  - apps/web/src/pages/MqttSettings/index.tsx
  - data/server-runtime.lock.json
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/web/src/components/management/RemoteSyncBanner.tsx
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - .agents/skills/spectra-verify/SKILL.md
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
tests:
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/components/management/rotationOpsSummary.test.tsx
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/pages/SlideshowPreview/layout.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/EnergyHistory/layout.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/EnergyTrend/layout.test.ts
  - apps/web/src/components/management/opsSurfacePrimitives.test.tsx
  - apps/web/src/pages/CircuitSettings/viewModel.test.ts
  - apps/web/src/pages/DeviceStatus/layout.test.ts
  - apps/web/src/pages/ImageManagement/viewModel.test.ts
-->