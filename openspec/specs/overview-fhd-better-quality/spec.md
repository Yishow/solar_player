# overview-fhd-better-quality Specification

## Purpose

TBD - created by archiving change 'polish-overview-fhd-better-quality'. Update Purpose after archive.

## Requirements

### Requirement: Render Overview surfaces with frosted-glass quality scoped to Overview

The Overview display page SHALL render its KPI cards and density widgets with a frosted-glass treatment (translucent background, backdrop blur, thin border, soft shadow, consistent corner radius), and this treatment SHALL be scoped to Overview-only classes so the shared card component base and the other playback pages remain unchanged.

#### Scenario: Overview cards use frosted-glass treatment

- **WHEN** `/overview` renders its KPI cards and density widgets
- **THEN** each card uses a translucent background with backdrop blur, a thin border, and a soft shadow rather than a flat opaque fill

#### Scenario: Shared card base is not altered

- **WHEN** the frosted-glass treatment is applied
- **THEN** the shared card component stylesheet remains unchanged and the other playback pages keep their existing card appearance


<!-- @trace
source: polish-overview-fhd-better-quality
updated: 2026-06-07
code:
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
  - docs/reference-match/overview-density-baseline-2026-06-07.md
  - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/pages/shared/displayCardStyleConfig.ts
  - apps/web/src/hooks/useOverviewWeather.ts
  - docs/reference/Better/01.Overivew (大).png
  - data/server-runtime.lock.json
  - docs/reference-match/phase4-visual-witness-2026-06-07.md
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
tests:
  - apps/web/src/pages/Overview/densityWidgets.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.test.tsx
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/Overview/widgets/GenerationTrendArea.test.tsx
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx
-->

---
### Requirement: Compose Overview hero, density row, and KPI row without overlap

The Overview layout SHALL position the hero media, the KPI card row, and the density widget row as three non-overlapping vertical bands that fill the canvas with even rhythm, arranged top-to-bottom as hero band, then KPI card row, then density widget row, matching the Better reference (`docs/reference/Better/01.Overivew (大).png`). The density widget row SHALL present four widgets — weather, three-phase power, generation trend, and alert notifications — so the alert notifications widget SHALL be visible by default rather than hidden.

#### Scenario: Three bands do not overlap

- **WHEN** the Overview layout is resolved at 1920x1080
- **THEN** the vertical extent of the KPI card row does not overlap the hero media band or the density widget row band

#### Scenario: KPI row sits above the density widget row

- **WHEN** the Overview layout is resolved at 1920x1080
- **THEN** the top of the density widget row band is greater than or equal to the bottom of the KPI card row band

#### Scenario: Density row presents four widgets including alert notifications

- **WHEN** `/overview` renders the density widget row with default configuration
- **THEN** the weather, three-phase power, generation trend, and alert notifications widgets are all visible

#### Scenario: Hero remains the primary visual

- **WHEN** the hero band renders
- **THEN** the hero media occupies the right-side primary visual area and the bilingual title group reads as the left-side secondary anchor


<!-- @trace
source: align-overview-better-dashboard-closeout
updated: 2026-06-08
code:
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/pages/Overview/widgets/AlertNotificationsWidget.tsx
  - apps/web/vite.config.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/components/displayPageCards.css
  - .env.example
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/components/management/index.tsx
  - scripts/dev.mjs
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - data/server-runtime.lock.json
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/server/src/app.ts
  - apps/web/src/components/management/CustomSelect.tsx
  - apps/web/src/pages/PlaybackSettings/playbackSettings.css
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/server/src/plugins/managementAuth.ts
  - packages/shared/src/types.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/shared/displayCardStyleConfig.ts
  - apps/web/src/pages/EnergyHistory/history.css
  - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
  - apps/web/src/pages/Overview/backgroundPool.ts
  - apps/web/src/services/api.ts
  - scripts/dev-lib.mjs
  - apps/web/src/components/management/RemoteSyncBanner.tsx
  - apps/web/src/pages/Overview/OverviewKpiFooter.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/styles/management.css
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/services/socket.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/DeviceStatus/device.css
  - apps/web/src/pages/Overview/assets.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/CircuitSettings/circuitSettings.css
  - apps/web/src/styles/tokens.css
  - scripts/dev-lib.d.mts
  - scripts/dev.test.mjs
  - apps/web/src/components/displayPageCards.tsx
  - apps/web/index.html
  - apps/web/src/pages/EnergyTrend/trend.css
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.tsx
tests:
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/components/management/RemoteSyncBanner.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/Overview/widgetStyles.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/Overview/backgroundPlacement.test.ts
  - apps/web/src/viteProxy.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/web/src/pages/Overview/displayPageConfig.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/components/management/CustomSelect.test.tsx
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/Overview/widgets/AlertNotificationsWidget.test.tsx
  - apps/web/src/services/socket.test.ts
  - apps/web/src/pages/Overview/backgroundPoolConfig.test.ts
  - apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx
  - apps/web/src/pages/shared/displayCardStyleConfig.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Overview/backgroundPool.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/Overview/kpiFooter.test.tsx
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.test.ts
  - apps/web/src/pages/Overview/render.test.ts
-->

---
### Requirement: Preserve light FHD canon and Overview-only scope

The change SHALL keep the existing light FHD color canon and SHALL NOT modify navigation, routing, server APIs, the SQLite schema, the MQTT architecture, or introduce a dark theme.

#### Scenario: No architectural or theme change

- **WHEN** the polish is applied
- **THEN** the color canon stays light, and navigation, routing, server APIs, and the database schema remain unchanged

#### Scenario: Configuration still expressed through editor-backed config

- **WHEN** layout coordinates or visibility change
- **THEN** they are expressed through the existing Overview config and seed, not a page-local hardcode that bypasses the editor

<!-- @trace
source: polish-overview-fhd-better-quality
updated: 2026-06-07
code:
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
  - docs/reference-match/overview-density-baseline-2026-06-07.md
  - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/pages/shared/displayCardStyleConfig.ts
  - apps/web/src/hooks/useOverviewWeather.ts
  - docs/reference/Better/01.Overivew (大).png
  - data/server-runtime.lock.json
  - docs/reference-match/phase4-visual-witness-2026-06-07.md
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
tests:
  - apps/web/src/pages/Overview/densityWidgets.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.test.tsx
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/Overview/widgets/GenerationTrendArea.test.tsx
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx
-->

---
### Requirement: Render the Overview hero photo as a faded top band, not a full-page background

When the Overview background pool provides a photo, the Overview SHALL render that photo as a top band that occupies only the upper portion of the canvas and fades into the light page background toward its bottom edge, with a proportion approximating the Better reference (`docs/reference/Better/01.Overivew (大).png`). The photo SHALL NOT fill the entire page behind the KPI card row and the density widget row, so those cards sit on the light page background rather than on top of the photo.

#### Scenario: Hero photo does not bleed behind the cards

- **WHEN** `/overview` renders with a background-pool photo at 1920x1080
- **THEN** the photo is confined to an upper band that fades out before the KPI card row and density widget row, and those cards render over the light page background rather than over the photo

#### Scenario: Bilingual title reads against the hero band

- **WHEN** the hero band renders with the photo
- **THEN** the bilingual title and subtitle remain within the photo band and stay legible

<!-- @trace
source: align-overview-better-dashboard-closeout
updated: 2026-06-08
code:
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/pages/Overview/widgets/AlertNotificationsWidget.tsx
  - apps/web/vite.config.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/components/displayPageCards.css
  - .env.example
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/components/management/index.tsx
  - scripts/dev.mjs
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - data/server-runtime.lock.json
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/server/src/app.ts
  - apps/web/src/components/management/CustomSelect.tsx
  - apps/web/src/pages/PlaybackSettings/playbackSettings.css
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/server/src/plugins/managementAuth.ts
  - packages/shared/src/types.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/shared/displayCardStyleConfig.ts
  - apps/web/src/pages/EnergyHistory/history.css
  - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
  - apps/web/src/pages/Overview/backgroundPool.ts
  - apps/web/src/services/api.ts
  - scripts/dev-lib.mjs
  - apps/web/src/components/management/RemoteSyncBanner.tsx
  - apps/web/src/pages/Overview/OverviewKpiFooter.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/styles/management.css
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/services/socket.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/DeviceStatus/device.css
  - apps/web/src/pages/Overview/assets.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/CircuitSettings/circuitSettings.css
  - apps/web/src/styles/tokens.css
  - scripts/dev-lib.d.mts
  - scripts/dev.test.mjs
  - apps/web/src/components/displayPageCards.tsx
  - apps/web/index.html
  - apps/web/src/pages/EnergyTrend/trend.css
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.tsx
tests:
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/components/management/RemoteSyncBanner.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/Overview/widgetStyles.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/Overview/backgroundPlacement.test.ts
  - apps/web/src/viteProxy.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/web/src/pages/Overview/displayPageConfig.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/components/management/CustomSelect.test.tsx
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/Overview/widgets/AlertNotificationsWidget.test.tsx
  - apps/web/src/services/socket.test.ts
  - apps/web/src/pages/Overview/backgroundPoolConfig.test.ts
  - apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx
  - apps/web/src/pages/shared/displayCardStyleConfig.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Overview/backgroundPool.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/Overview/kpiFooter.test.tsx
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.test.ts
  - apps/web/src/pages/Overview/render.test.ts
-->