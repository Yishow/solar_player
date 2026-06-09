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

---
### Requirement: Author Overview card icon chip style

The system SHALL expose, for each Overview KPI card and each Overview density widget, editable icon chip style configuration covering at least: icon chip background color, icon chip foreground (glyph) color, and icon chip shape (`circle` or `rounded-square`). These fields SHALL be editable in the `/display-pages/editor` Overview inspector, SHALL persist through the existing draft/live mechanism, and SHALL fall back to the seed default when missing or invalid. The icon chip appearance SHALL be driven by runtime CSS variables consumed by Overview-only classes, and SHALL NOT depend on a fixed two-value green/gold accent.

#### Scenario: Inspector exposes icon chip fields

- **WHEN** an operator selects an Overview KPI card or density widget in `/display-pages/editor`
- **THEN** the inspector presents editable fields for icon chip background color, icon chip foreground color, and icon chip shape

#### Scenario: Per-card icon chip color persists to live

- **WHEN** an operator sets a distinct icon chip background color on each of the five Overview KPI cards and saves
- **THEN** the live `/overview` renders each card icon chip with its configured background color

#### Scenario: Rounded-square shape renders

- **WHEN** an operator sets a card icon chip shape to `rounded-square`
- **THEN** that card renders its icon chip as a rounded square rather than a circle

#### Scenario: Invalid icon chip config falls back to seed default

- **WHEN** a card icon chip background or shape value is missing or invalid
- **THEN** the card renders the seed default icon chip (circle with the seed background color) without raising an error

##### Example: Invalid shape falls back to seeded circle chip

- **GIVEN** the `todayGeneration` KPI card omits `iconChipBackground` and stores `iconChipShape: "hexagon"`
- **WHEN** `/overview` resolves the card-style config for playback
- **THEN** the icon chip uses the seeded fallback background and renders as a circle
- **AND** the page continues rendering without an exception

<!-- @trace
source: align-overview-cards-to-better-reference
updated: 2026-06-10
code:
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/server/src/services/SnapshotWriterService.ts
  - apps/server/src/routes/image-playlist.ts
  - scripts/dev-lib.mjs
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - apps/server/src/metrics/solarGenerationProfile.ts
  - apps/web/src/services/api.ts
  - apps/server/src/services/generationTrendSeries.ts
  - docs/reference-match/settings-images-layout-refactor-plan.md
  - apps/web/src/hooks/useImagesAutoplay.ts
  - .env.example
  - packages/shared/src/imagePlaylist.ts
  - apps/web/src/services/socket.ts
  - apps/web/src/pages/shared/runtimeMediaUrl.ts
  - apps/web/vite.config.ts
  - apps/server/src/server-startup.ts
  - apps/server/src/services/displayRotationService.ts
  - apps/server/src/services/imagePlaylistService.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/PlaybackSettings/playbackSettings.css
  - apps/web/src/components/management/CustomSelect.tsx
  - apps/server/src/routes/metrics-history.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - packages/shared/src/displayPageFreshness.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/styles/management.css
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/services/runtimeOrigin.ts
  - apps/web/src/pages/Overview/widgets/generationTrendChart.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/server/src/services/MockMetricsFeedService.ts
  - apps/web/src/components/Sparkline.tsx
  - scripts/dev.test.mjs
  - apps/web/src/pages/shared/displayCardStyleConfig.ts
  - apps/server/src/services/MetricHistoryRetentionService.ts
  - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
  - apps/server/src/db/seed.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/server/src/db/migrations/013_generation_power.sql
  - apps/server/src/services/displayStoryService.ts
  - packages/shared/src/displayStory.ts
  - apps/server/src/db/normalizeMetricSnapshotCapturedAt.ts
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/Overview/widgets/GenerationTrendChartView.tsx
tests:
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/web/src/pages/Overview/widgets/generationTrendChart.test.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/server/src/routes/metrics-history.test.ts
  - apps/web/src/components/management/CustomSelect.test.tsx
  - apps/server/src/plugins/managementAuth.test.ts
  - packages/shared/src/imagePlaylist.test.ts
  - apps/web/src/services/socket.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/server/src/services/SnapshotWriterService.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/viteProxy.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/server/src/services/MockMetricsFeedService.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/server/src/metrics/solarGenerationProfile.test.ts
  - apps/server/src/db/metricSnapshotsSeed.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/components/Sparkline.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/shared/runtimeMediaUrl.test.ts
  - apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/server/src/services/generationTrendSeries.test.ts
  - apps/server/src/services/MetricHistoryRetentionService.test.ts
-->