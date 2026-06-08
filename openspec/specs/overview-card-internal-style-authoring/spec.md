# overview-card-internal-style-authoring Specification

## Purpose

TBD - created by archiving change 'add-overview-pixel-authoring-controls'. Update Purpose after archive.

## Requirements

### Requirement: Author internal card style per Overview card and widget

The system SHALL expose, for each Overview KPI card and each Overview density widget, editable internal-style configuration covering at least: icon size, label font size, English subtitle font size, value font size, horizontal padding, vertical padding, trend/sparkline height, and content alignment (start, center, or end). These fields SHALL be editable in the `/display-pages/editor` Overview inspector and SHALL persist through the existing draft/live mechanism.

#### Scenario: Inspector exposes internal-style fields

- **WHEN** an operator selects an Overview KPI card or density widget in `/display-pages/editor`
- **THEN** the inspector presents editable fields for icon size, label font size, subtitle font size, value font size, padding, trend/sparkline height, and content alignment

#### Scenario: Edited internal style persists to draft

- **WHEN** an operator changes an internal-style field and saves the draft
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
### Requirement: Render Overview cards from internal-style config without stylesheet hardcoding

The Overview runtime SHALL apply each card's and widget's internal-style configuration via inline style or inline CSS custom properties on the rendered element. The Overview and shared card stylesheets SHALL NOT hardcode pixel values for these authored properties; where a stylesheet references an authored value it SHALL read it from the inline-provided custom property with the current value as fallback.

#### Scenario: Authored value applied to rendered card

- **WHEN** the Overview renders a KPI card whose config sets a value font size
- **THEN** the rendered card's value uses that font size applied via inline style or an inline custom property

#### Scenario: Missing config falls back to seed equivalent

- **WHEN** a card's internal-style config field is absent or invalid
- **THEN** the runtime applies the seed default that equals the pre-change appearance, without throwing or rendering a blank card


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
### Requirement: Seed internal-style defaults preserve current appearance

The seed defaults for the Overview internal-style fields SHALL equal the current rendered values so that, before any draft edit, the Overview appearance is unchanged by introducing these controls.

#### Scenario: No draft edit leaves appearance unchanged

- **WHEN** the Overview renders with seed defaults and no internal-style draft edits
- **THEN** the cards and widgets render with the same icon size, font sizes, padding, and trend height as before this capability was added

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