# overview-dashboard-widgets Specification

## Purpose

TBD - created by archiving change 'extend-overview-dashboard-widgets'. Update Purpose after archive.

## Requirements

### Requirement: Overview generation trend widget renders from runtime data

The system SHALL provide an optional Overview generation trend widget that renders only from runtime-provided trend data (the existing metrics history / view model trend series). The widget SHALL NOT render trend data from mock fixtures. When no runtime trend data is available, the widget SHALL render an empty state rather than mock content.

#### Scenario: Generation trend widget renders runtime series

- **WHEN** the Overview generation trend widget is enabled and the view model provides a non-empty trend series
- **THEN** the widget renders the trend using that runtime series

##### Example: Widget renders runtime power trend

- **GIVEN** the Overview view model exposes trend series `[82, 95, 101, 108]`
- **WHEN** the generation trend widget is rendered
- **THEN** the widget shows the runtime start and latest values from that series
- **AND** it does not use `apps/web/src/mocks/metrics.ts` trend fixtures

#### Scenario: Generation trend widget shows empty state without data

- **WHEN** the Overview generation trend widget is enabled and no runtime trend data is available
- **THEN** the widget renders an empty state and does not render mock trend content

##### Example: Widget renders empty trend state

- **GIVEN** the Overview view model exposes no trend series
- **WHEN** the generation trend widget is rendered
- **THEN** the widget shows an empty state message
- **AND** it does not render fallback/mock trend values


<!-- @trace
source: extend-overview-dashboard-widgets
updated: 2026-06-07
code:
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
  - apps/web/src/pages/Overview/viewModel.ts
  - uploads/overview_bg-2.png
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - docs/reference/Better/01.Overivew (大).png
  - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
  - apps/web/src/pages/shared/displayCardStyleConfig.ts
  - apps/web/src/pages/Overview/index.tsx
  - data/server-runtime.lock.json
  - uploads/overview_bg-3.png
  - docs/reference-match/overview-density-baseline-2026-06-07.md
  - uploads/overview_bg-1.png
  - docs/reference-match/phase4-visual-witness-2026-06-07.md
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/hooks/useOverviewWeather.ts
  - uploads/overview_bg-4.png
tests:
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/Overview/widgets/GenerationTrendArea.test.tsx
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.test.tsx
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
  - apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/pages/Overview/densityWidgets.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
-->

---
### Requirement: Overview alert notifications widget renders from existing alert sources

The system SHALL provide an optional Overview alert notifications widget that lists recent alerts from existing runtime alert sources (display story alert tone and reason, device readiness findings). The widget SHALL NOT render alert items from mock fixtures. When there are no alerts, the widget SHALL render an empty state indicating no alerts.

#### Scenario: Alert widget lists runtime alerts

- **WHEN** the Overview alert notifications widget is enabled and runtime alert sources report one or more alerts
- **THEN** the widget lists those alerts from the runtime sources

##### Example: Widget lists story and readiness alerts

- **GIVEN** the Overview story reports `todayGeneration` with `fallbackReason` `metric-unavailable`
- **AND** display readiness reports a blocking `realTimePower` finding for Overview
- **WHEN** the alert notifications widget is rendered
- **THEN** the widget lists both runtime-derived alert items
- **AND** it does not render mock alert copy

#### Scenario: Alert widget shows empty state without alerts

- **WHEN** the Overview alert notifications widget is enabled and runtime alert sources report no alerts
- **THEN** the widget renders an empty state indicating no alerts

##### Example: Widget renders no-alert state

- **GIVEN** the Overview story summary is normal
- **AND** display readiness reports no blocking or warning findings for Overview
- **WHEN** the alert notifications widget is rendered
- **THEN** the widget shows `無警示`


<!-- @trace
source: extend-overview-dashboard-widgets
updated: 2026-06-07
code:
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
  - apps/web/src/pages/Overview/viewModel.ts
  - uploads/overview_bg-2.png
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - docs/reference/Better/01.Overivew (大).png
  - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
  - apps/web/src/pages/shared/displayCardStyleConfig.ts
  - apps/web/src/pages/Overview/index.tsx
  - data/server-runtime.lock.json
  - uploads/overview_bg-3.png
  - docs/reference-match/overview-density-baseline-2026-06-07.md
  - uploads/overview_bg-1.png
  - docs/reference-match/phase4-visual-witness-2026-06-07.md
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/hooks/useOverviewWeather.ts
  - uploads/overview_bg-4.png
tests:
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/Overview/widgets/GenerationTrendArea.test.tsx
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.test.tsx
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
  - apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/pages/Overview/densityWidgets.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
-->

---
### Requirement: Dashboard widgets are editable regions that default to hidden

Each Overview dashboard widget SHALL be registered as an editable region exposing geometry and a visibility toggle, and SHALL default to not visible in the seed configuration. When a widget's visibility is not enabled, the playback runtime SHALL NOT render that widget. A widget configuration that omits visibility SHALL be treated as hidden for dashboard widgets.

#### Scenario: Widget hidden by default is not rendered

- **WHEN** the Overview seed configuration is used without enabling a dashboard widget
- **THEN** the playback runtime does not render that widget

##### Example: Seed keeps optional widgets off

- **GIVEN** the Overview seed config has dashboard widget visibility omitted or `false`
- **WHEN** the Overview playback runtime resolves the config
- **THEN** the generation trend widget and alert notifications widget are not rendered

#### Scenario: Enabled widget renders after publish

- **WHEN** an operator enables a dashboard widget's visibility in the editor and publishes the draft
- **THEN** the playback runtime renders that widget

##### Example: Operator enables the generation trend widget

- **GIVEN** the Overview seed has the generation trend widget with visibility defaulting to off
- **WHEN** the operator turns the widget's visibility toggle on and publishes
- **THEN** the Overview playback output includes the generation trend widget
- **AND** turning the toggle back off and publishing removes it from playback

<!-- @trace
source: extend-overview-dashboard-widgets
updated: 2026-06-07
code:
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
  - apps/web/src/pages/Overview/viewModel.ts
  - uploads/overview_bg-2.png
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - docs/reference/Better/01.Overivew (大).png
  - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
  - apps/web/src/pages/shared/displayCardStyleConfig.ts
  - apps/web/src/pages/Overview/index.tsx
  - data/server-runtime.lock.json
  - uploads/overview_bg-3.png
  - docs/reference-match/overview-density-baseline-2026-06-07.md
  - uploads/overview_bg-1.png
  - docs/reference-match/phase4-visual-witness-2026-06-07.md
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/hooks/useOverviewWeather.ts
  - uploads/overview_bg-4.png
tests:
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/Overview/widgets/GenerationTrendArea.test.tsx
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.test.tsx
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
  - apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/pages/Overview/densityWidgets.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
-->

---
### Requirement: Overview generation trend widget renders a full data-visualisation chart

The Overview generation trend widget SHALL render its runtime trend series as a full data-visualisation chart that fills the trend card plot area, matching the Better reference sample. The chart SHALL include: a smooth filled area curve (a smoothed path rather than angular straight segments) with a layered gradient fill; a vertical (value) axis with at least two scale labels and corresponding horizontal gridlines; horizontal (time) axis labels; per-sample data points; and a marked peak. The widget SHALL preserve the existing runtime-only data rule: it SHALL render only from runtime-provided trend data and SHALL render an empty state when no runtime trend data is available.

#### Scenario: Trend widget renders a smooth filled chart for runtime series

- **WHEN** the Overview generation trend widget is enabled and the view model provides a non-empty trend series
- **THEN** the widget renders a smoothed curve with a gradient-filled area that fills the card plot area

##### Example: Runtime series fills the plot area

- **GIVEN** the Overview view model exposes trend series `[0.2, 0.9, 2.6, 4.8, 3.7, 1.4]`
- **WHEN** the generation trend widget renders
- **THEN** the chart shows a smooth filled curve spanning the full plot width
- **AND** the filled area reaches down to the chart baseline rather than rendering as a thin sparkline only

#### Scenario: Trend widget shows value-axis scale and gridlines

- **WHEN** the Overview generation trend widget renders a non-empty runtime trend series
- **THEN** the widget displays at least two value-axis scale labels with corresponding horizontal gridlines, where the top scale label is greater than or equal to the series peak

##### Example: Nice max encloses the peak

- **GIVEN** the runtime series peak is `4.8 kW`
- **WHEN** the chart computes its Y-axis scale
- **THEN** the top tick label is a nice rounded value greater than or equal to `4.8`
- **AND** each rendered tick has a matching horizontal gridline

#### Scenario: Trend widget shows time-axis labels, data points, and peak

- **WHEN** the Overview generation trend widget renders a non-empty runtime trend series
- **THEN** the widget displays time-axis labels along the horizontal axis, a data point per sample, and a marker on the peak value

##### Example: Peak sample is annotated

- **GIVEN** the runtime series covers `06:00`, `09:00`, `12:00`, `15:00`, and `18:00`
- **WHEN** the generation trend widget renders the series
- **THEN** the X-axis shows time labels for the day
- **AND** each sample is drawn with a point marker
- **AND** the `12:00` peak sample renders a distinct peak marker

#### Scenario: Trend widget shows empty state without runtime data

- **WHEN** the Overview generation trend widget is enabled and the view model provides no trend series
- **THEN** the widget renders its empty state rather than a chart

##### Example: No data keeps the widget in empty state

- **GIVEN** the widget is visible but the Overview view model exposes `trendSeries: []`
- **WHEN** the generation trend widget renders
- **THEN** no SVG chart is shown
- **AND** the widget presents its empty-state copy instead

#### Scenario: Shared sparkline default unchanged for other callers

- **WHEN** another surface uses the shared sparkline primitive without enabling the smooth option
- **THEN** that sparkline renders with its existing straight-segment path

##### Example: KPI sparkline caller keeps angular path

- **GIVEN** another Overview KPI footer still renders `Sparkline` without `smooth: true`
- **WHEN** that footer renders its trend line
- **THEN** the path remains the existing straight-segment sparkline
- **AND** the full chart treatment stays scoped to the generation trend widget

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