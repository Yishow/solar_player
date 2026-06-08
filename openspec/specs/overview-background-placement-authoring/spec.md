# overview-background-placement-authoring Specification

## Purpose

TBD - created by archiving change 'add-overview-pixel-authoring-controls'. Update Purpose after archive.

## Requirements

### Requirement: Author Overview background placement

The system SHALL expose editable Overview background placement through the existing hero media authoring contract. Band height SHALL be authored through `heroContainer.height`, horizontal and vertical object position SHALL be authored through `heroMedia.alignX` and `heroMedia.alignY`, and the bottom fade SHALL be authored through `heroMedia.effects`. These fields SHALL be editable in the `/display-pages/editor` Overview inspector and SHALL persist through the existing draft/live mechanism. This contract SHALL apply to the existing background pool photo and SHALL NOT remove or replace the background candidate pool.

#### Scenario: Inspector exposes hero media placement fields

- **WHEN** an operator selects the Overview background in `/display-pages/editor`
- **THEN** the inspector presents editable fields for `heroContainer.height`, object position X, object position Y, and the bottom fade controls on the media effect surface

#### Scenario: Edited background placement persists to draft

- **WHEN** an operator changes a background placement field and saves the draft
- **THEN** the change is persisted to the draft config and reflected when the Overview draft renders


<!-- @trace
source: add-overview-pixel-authoring-controls
updated: 2026-06-08
code:
  - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/vite.config.ts
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.tsx
  - apps/server/src/app.ts
  - apps/web/src/pages/Overview/OverviewKpiFooter.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/services/socket.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - apps/web/index.html
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/pages/CircuitSettings/circuitSettings.css
  - apps/server/src/plugins/managementAuth.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/shared/displayCardStyleConfig.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
  - apps/web/src/pages/EnergyHistory/history.css
  - apps/web/src/services/api.ts
  - apps/web/src/pages/EnergyTrend/trend.css
  - apps/web/src/components/management/RemoteSyncBanner.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/Overview/widgets/AlertNotificationsWidget.tsx
  - scripts/dev.test.mjs
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/components/management/CustomSelect.tsx
  - apps/web/src/pages/PlaybackSettings/playbackSettings.css
  - apps/web/src/components/displayPageCards.tsx
  - apps/web/src/components/management/index.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/Overview/index.tsx
  - data/server-runtime.lock.json
  - apps/web/src/pages/DeviceStatus/device.css
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - scripts/dev-lib.d.mts
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - scripts/dev.mjs
  - apps/web/src/components/displayPageCards.css
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/styles/management.css
  - .env.example
  - scripts/dev-lib.mjs
tests:
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/components/management/CustomSelect.test.tsx
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/web/src/pages/Overview/widgets/AlertNotificationsWidget.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
  - apps/web/src/pages/Overview/render.test.ts
  - apps/web/src/pages/Overview/backgroundPlacement.test.ts
  - apps/web/src/pages/Overview/kpiFooter.test.tsx
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/web/src/viteProxy.test.ts
  - apps/web/src/pages/shared/displayCardStyleConfig.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/components/management/RemoteSyncBanner.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/Overview/displayPageConfig.test.ts
  - apps/web/src/pages/Overview/widgetStyles.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx
-->

---
### Requirement: Render Overview background from placement config replacing the hardcoded full-bleed rule

The Overview runtime SHALL apply background placement through the existing hero media presentation path, replacing the retired hardcoded full-bleed inset rule. When the authored hero container height is less than the full canvas height, the background SHALL occupy only the upper band and fade toward its bottom edge per the configured media effect, so the KPI cards and density widgets render over the light page background rather than over the photo.

#### Scenario: Reduced band height confines the photo to the top

- **WHEN** the Overview renders with a background band height less than full canvas height
- **THEN** the photo occupies only the upper band and fades out toward its bottom edge, and the cards below render over the light page background

#### Scenario: Seed hero placement preserves the current appearance

- **WHEN** the Overview renders with the seeded `heroContainer` geometry, `heroMedia.alignX`/`alignY`, and seeded bottom fade layer
- **THEN** the background renders with the same band size, object position, and fade treatment as the current Overview appearance


<!-- @trace
source: add-overview-pixel-authoring-controls
updated: 2026-06-08
code:
  - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/vite.config.ts
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.tsx
  - apps/server/src/app.ts
  - apps/web/src/pages/Overview/OverviewKpiFooter.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/services/socket.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - apps/web/index.html
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/pages/CircuitSettings/circuitSettings.css
  - apps/server/src/plugins/managementAuth.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/shared/displayCardStyleConfig.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
  - apps/web/src/pages/EnergyHistory/history.css
  - apps/web/src/services/api.ts
  - apps/web/src/pages/EnergyTrend/trend.css
  - apps/web/src/components/management/RemoteSyncBanner.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/Overview/widgets/AlertNotificationsWidget.tsx
  - scripts/dev.test.mjs
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/components/management/CustomSelect.tsx
  - apps/web/src/pages/PlaybackSettings/playbackSettings.css
  - apps/web/src/components/displayPageCards.tsx
  - apps/web/src/components/management/index.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/Overview/index.tsx
  - data/server-runtime.lock.json
  - apps/web/src/pages/DeviceStatus/device.css
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - scripts/dev-lib.d.mts
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - scripts/dev.mjs
  - apps/web/src/components/displayPageCards.css
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/styles/management.css
  - .env.example
  - scripts/dev-lib.mjs
tests:
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/components/management/CustomSelect.test.tsx
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/web/src/pages/Overview/widgets/AlertNotificationsWidget.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
  - apps/web/src/pages/Overview/render.test.ts
  - apps/web/src/pages/Overview/backgroundPlacement.test.ts
  - apps/web/src/pages/Overview/kpiFooter.test.tsx
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/web/src/viteProxy.test.ts
  - apps/web/src/pages/shared/displayCardStyleConfig.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/components/management/RemoteSyncBanner.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/Overview/displayPageConfig.test.ts
  - apps/web/src/pages/Overview/widgetStyles.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx
-->

---
### Requirement: Seed background placement default preserves current appearance

The seed default for Overview background placement SHALL equal the current hero media appearance so that, before any draft edit, the Overview background is unchanged by introducing these controls.

#### Scenario: No draft edit leaves background unchanged

- **WHEN** the Overview renders with the seed background placement default and no draft edits
- **THEN** the background renders full-bleed exactly as before this capability was added

<!-- @trace
source: add-overview-pixel-authoring-controls
updated: 2026-06-08
code:
  - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/vite.config.ts
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.tsx
  - apps/server/src/app.ts
  - apps/web/src/pages/Overview/OverviewKpiFooter.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/services/socket.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - apps/web/index.html
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/pages/CircuitSettings/circuitSettings.css
  - apps/server/src/plugins/managementAuth.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/shared/displayCardStyleConfig.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
  - apps/web/src/pages/EnergyHistory/history.css
  - apps/web/src/services/api.ts
  - apps/web/src/pages/EnergyTrend/trend.css
  - apps/web/src/components/management/RemoteSyncBanner.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/Overview/widgets/AlertNotificationsWidget.tsx
  - scripts/dev.test.mjs
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/components/management/CustomSelect.tsx
  - apps/web/src/pages/PlaybackSettings/playbackSettings.css
  - apps/web/src/components/displayPageCards.tsx
  - apps/web/src/components/management/index.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/Overview/index.tsx
  - data/server-runtime.lock.json
  - apps/web/src/pages/DeviceStatus/device.css
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - scripts/dev-lib.d.mts
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - scripts/dev.mjs
  - apps/web/src/components/displayPageCards.css
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/styles/management.css
  - .env.example
  - scripts/dev-lib.mjs
tests:
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/components/management/CustomSelect.test.tsx
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/web/src/pages/Overview/widgets/AlertNotificationsWidget.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
  - apps/web/src/pages/Overview/render.test.ts
  - apps/web/src/pages/Overview/backgroundPlacement.test.ts
  - apps/web/src/pages/Overview/kpiFooter.test.tsx
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/web/src/viteProxy.test.ts
  - apps/web/src/pages/shared/displayCardStyleConfig.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/components/management/RemoteSyncBanner.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/Overview/displayPageConfig.test.ts
  - apps/web/src/pages/Overview/widgetStyles.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx
-->