# mqtt-settings-weather-management Specification

## Purpose

TBD - created by archiving change 'reorganize-mqtt-settings-topic-and-weather-management'. Update Purpose after archive.

## Requirements

### Requirement: Configure weather settings from MQTT Settings

The system SHALL allow operators to configure header weather behavior and update interval directly from `MQTT Settings`.

#### Scenario: Operator edits weather behavior in the management page

- **WHEN** an operator opens `MQTT Settings`
- **THEN** the page SHALL provide controls for enabling weather, selecting a location mode, choosing a county or station, selecting a preset, choosing an update interval (10 minutes, 30 minutes, 1 hour, 3 hours, 6 hours, 12 hours, or manual), and editing custom field choices
- **AND** the operator SHALL NOT need to navigate to a separate management route to perform those weather-setting tasks


<!-- @trace
source: optimize-mqtt-weather-interval-and-caching
updated: 2026-07-05
code:
  - apps/server/src/app.ts
  - apps/server/src/services/weatherService.ts
  - apps/web/src/hooks/useHeaderWeatherMeta.ts
  - packages/shared/src/weather.ts
  - apps/web/src/components/headerWeatherMeta.ts
  - apps/server/src/services/weatherSettingsService.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/hooks/weatherPolling.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/DataSourceSettings/index.tsx
  - apps/web/src/hooks/useOverviewWeather.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/styles/management.css
  - apps/server/src/routes/weather.ts
  - apps/server/src/db/migrations/017_weather_update_interval.sql
tests:
  - apps/server/src/services/weatherService.test.ts
  - apps/server/src/db/migrations/weatherUpdateInterval.test.ts
  - apps/web/src/hooks/weatherHooks.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/server/src/routes/weather.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/components/headerWeatherMeta.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/MqttSettings/weatherFieldPresets.test.ts
-->

---
### Requirement: Support presets with a custom-field fallback

The system SHALL support weather field presets and a custom-field mode in `MQTT Settings`.

#### Scenario: Operator selects a preset

- **WHEN** the operator switches to a named preset such as compact, standard, or complete
- **THEN** the page SHALL apply the preset's field list to the weather preview and pending settings
- **AND** it SHALL NOT require the operator to re-check every field manually

#### Scenario: Operator selects custom mode

- **WHEN** the operator switches to custom mode
- **THEN** the page SHALL expose explicit field selection controls
- **AND** the resulting field list SHALL drive the weather preview and saved settings


<!-- @trace
source: reorganize-mqtt-settings-topic-and-weather-management
updated: 2026-05-24
code:
  - apps/web/src/pages/managementDisplaySyncScopes.ts
  - apps/server/src/services/weatherService.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/server/src/services/cwaWeatherClient.ts
  - apps/server/src/routes/weather.ts
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - packages/shared/src/displayOps.ts
  - apps/web/src/components/AppHeader.tsx
  - .env.example
  - packages/shared/src/weather.ts
  - apps/server/src/db/migrations/010_weather_settings.sql
  - apps/web/src/components/headerWeatherMeta.ts
  - apps/web/src/services/api.ts
  - apps/web/src/pages/MqttSettings/weatherFieldPresets.ts
  - apps/web/src/pages/MqttSettings/layout.ts
  - apps/server/src/services/weatherSettingsService.ts
  - packages/shared/src/index.ts
  - apps/web/src/hooks/useHeaderWeatherMeta.ts
  - apps/server/src/config.ts
  - apps/server/src/app.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - AGENTS.md
tests:
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/components/headerWeatherMeta.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/services/weatherService.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/server/src/services/cwaWeatherClient.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - apps/server/src/routes/weather.test.ts
  - apps/web/src/pages/MqttSettings/weatherFieldPresets.test.ts
  - apps/server/src/services/weatherSettingsService.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
-->

---
### Requirement: Preview header weather composition before saving

The system SHALL preview the configured header weather summary inside the weather card before the operator saves the settings.

#### Scenario: Preview reacts to pending field changes

- **WHEN** the operator changes the selected station, preset, or field list in the weather card
- **THEN** the preview SHALL update from the pending form state
- **AND** the operator SHALL be able to inspect the resulting header composition before saving

<!-- @trace
source: reorganize-mqtt-settings-topic-and-weather-management
updated: 2026-05-24
code:
  - apps/web/src/pages/managementDisplaySyncScopes.ts
  - apps/server/src/services/weatherService.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/server/src/services/cwaWeatherClient.ts
  - apps/server/src/routes/weather.ts
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - packages/shared/src/displayOps.ts
  - apps/web/src/components/AppHeader.tsx
  - .env.example
  - packages/shared/src/weather.ts
  - apps/server/src/db/migrations/010_weather_settings.sql
  - apps/web/src/components/headerWeatherMeta.ts
  - apps/web/src/services/api.ts
  - apps/web/src/pages/MqttSettings/weatherFieldPresets.ts
  - apps/web/src/pages/MqttSettings/layout.ts
  - apps/server/src/services/weatherSettingsService.ts
  - packages/shared/src/index.ts
  - apps/web/src/hooks/useHeaderWeatherMeta.ts
  - apps/server/src/config.ts
  - apps/server/src/app.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - AGENTS.md
tests:
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/components/headerWeatherMeta.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/services/weatherService.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/server/src/services/cwaWeatherClient.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - apps/server/src/routes/weather.test.ts
  - apps/web/src/pages/MqttSettings/weatherFieldPresets.test.ts
  - apps/server/src/services/weatherSettingsService.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
-->

---
### Requirement: Persist MQTT and weather settings before broker reconnect outcome
The system SHALL persist MQTT broker settings and weather settings before any reconnect attempt determines the API result.

#### Scenario: Reconnect fails after settings are saved
- **WHEN** an operator saves MQTT or weather settings
- **AND** the background broker reconnect attempt fails
- **THEN** the save request SHALL still succeed with the persisted settings payload
- **AND** a later settings read SHALL return the saved values

#### Scenario: Save contract stays narrow to persistence
- **WHEN** an operator saves MQTT or weather settings while the broker is unhealthy
- **THEN** the system SHALL NOT discard the saved settings because of the reconnect failure
- **AND** broker-health feedback SHALL remain visible through existing diagnostics rather than the save response itself

<!-- @trace
source: fix-mqtt-save-and-overview-trend-ops
updated: 2026-06-29
code:
  - apps/server/src/plugins/managementAuth.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/routes/data-source.ts
  - apps/server/src/services/generationTrendSeries.ts
  - apps/server/src/routes/settings-mqtt.ts
tests:
  - apps/server/src/routes/data-source.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/services/generationTrendSeries.test.ts
-->

---
### Requirement: Support manual weather refresh

The system SHALL allow trusted operators to manually trigger a live weather refresh from MQTT Settings and SHALL distinguish the result of that upstream attempt from cached or stale playback data.

#### Scenario: Operator triggers manual refresh successfully

- **WHEN** the operator clicks the "Refresh Now" button and CWA returns valid current weather
- **THEN** the system SHALL clear the server cache and complete one fresh CWA request
- **AND** the page SHALL display an upstream-success result for that attempt immediately

#### Scenario: Manual refresh cannot reach CWA

- **WHEN** the operator clicks the "Refresh Now" button and the upstream request fails
- **THEN** the page SHALL display the bounded diagnostic code, failure stage, retryability, and stale-data availability for that attempt
- **AND** it SHALL NOT replace the failure with a generic delayed-data message
- **AND** if existing stale weather data remains visible, it SHALL be explicitly labelled as stale


<!-- @trace
source: diagnose-and-restore-site-weather-connectivity
updated: 2026-07-21
code:
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - packages/shared/src/displayReadiness.ts
  - apps/server/src/routes/weather.ts
  - solar_mqtt/web/index.html
  - solar_mqtt/solar/winsvc.py
  - apps/server/src/routes/settings-mqtt.ts
  - solar_mqtt/solar/heartbeat.py
  - solar_mqtt/web/app.js
  - solar_mqtt/solar/schedule.py
  - solar_mqtt/solar_config.single.example.json
  - packages/shared/src/weather.ts
  - solar_mqtt/solar_config.kn_cl.example.json
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - solar_mqtt/solar/config.py
  - packages/shared/src/displayPageFreshness.ts
  - apps/server/src/db/migrations/025_cl_kn_generation_summary_topics.sql
  - apps/web/src/services/api.ts
  - solar_mqtt/solar/scraper.py
  - solar_mqtt/solar/service.py
  - apps/server/src/services/cwaWeatherClient.ts
  - apps/server/src/services/weatherService.ts
  - solar_mqtt/solar/__init__.py
  - solar_mqtt/solar/display.py
  - solar_mqtt/web/vendor/mqtt.min.js
  - solar_mqtt/solar_config.mosquitto.example.json
  - solar_mqtt/solar/anomaly.py
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/server/src/db/seed.ts
  - apps/server/src/services/MetricsAccumulatorService.ts
  - solar_mqtt/solar/mosquitto.py
  - solar_mqtt/solar/discovery.py
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - solar_mqtt/solar/storage.py
  - apps/server/src/services/displayReadinessService.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - scripts/verify-weather-connectivity.test.mjs
  - solar_mqtt/solar_config.json
  - scripts/verify-weather-connectivity.mjs
  - solar_mqtt/solar/mqtt_bus.py
  - solar_mqtt/web/styles.css
  - apps/server/src/services/sustainabilityStoryService.ts
  - solar_mqtt/scrape_solar.py
  - apps/server/src/mqtt/MqttClientService.ts
tests:
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - solar_mqtt/test_web_assets.py
  - apps/server/src/services/cwaWeatherClient.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/server/src/routes/weather.test.ts
  - apps/server/src/db/migrations/clKnGenerationSummaryTopics.test.ts
  - apps/server/src/services/displayStoryTopicNames.test.ts
  - solar_mqtt/test_config_path.py
  - apps/server/src/routes/display-readiness.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/server/src/services/factoryGenerationAggregateService.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/server/src/services/MetricsAccumulatorService.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - solar_mqtt/test_mqtt_retain.py
  - apps/server/src/services/displayReadinessService.test.ts
  - apps/server/src/services/weatherService.test.ts
-->

---
### Requirement: Support server-side weather caching and MQTT broadcast

The server SHALL cache CWA weather data based on the configured update interval and broadcast successfully fetched weather to the local MQTT broker.

#### Scenario: Server returns cached weather data

- **WHEN** a client requests current weather data within the configured update interval
- **THEN** the server SHALL return the cached weather snapshot
- **AND** it SHALL NOT send a new API request to the CWA service

#### Scenario: Server broadcasts weather to local broker

- **WHEN** the server successfully fetches new weather data from the CWA API
- **THEN** the server SHALL publish the weather snapshot JSON to the local MQTT broker on the topic `solar/weather/current`
- **AND** the payload SHALL conform to the standard WeatherCurrentSnapshot schema

<!-- @trace
source: optimize-mqtt-weather-interval-and-caching
updated: 2026-07-05
code:
  - apps/server/src/app.ts
  - apps/server/src/services/weatherService.ts
  - apps/web/src/hooks/useHeaderWeatherMeta.ts
  - packages/shared/src/weather.ts
  - apps/web/src/components/headerWeatherMeta.ts
  - apps/server/src/services/weatherSettingsService.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/hooks/weatherPolling.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/DataSourceSettings/index.tsx
  - apps/web/src/hooks/useOverviewWeather.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/styles/management.css
  - apps/server/src/routes/weather.ts
  - apps/server/src/db/migrations/017_weather_update_interval.sql
tests:
  - apps/server/src/services/weatherService.test.ts
  - apps/server/src/db/migrations/weatherUpdateInterval.test.ts
  - apps/web/src/hooks/weatherHooks.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/server/src/routes/weather.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/components/headerWeatherMeta.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/MqttSettings/weatherFieldPresets.test.ts
-->

---
### Requirement: Display the latest weather fetch diagnostic in MQTT Settings

The MQTT Settings weather section SHALL display a persistent, operator-readable diagnostic panel for the latest server-side weather operation and SHALL allow an error code to be copied without exposing sensitive configuration.

#### Scenario: Latest weather request failed

- **WHEN** the trusted diagnostics endpoint reports state `error`
- **THEN** the weather settings panel SHALL display the diagnostic code, operation, occurrence time, safe summary, retryable state, optional HTTP status, and last success time when present
- **AND** it SHALL visually distinguish the error from an `ok` state

#### Scenario: Operator copies the error code

- **WHEN** an operator activates the copy action for an error diagnostic
- **THEN** the copied value SHALL include the diagnostic code and bounded safe context
- **AND** it SHALL NOT include CWA authorization, full URL, broker credentials, internal address, hostname, stack trace, or raw exception text

#### Scenario: Weather request succeeds

- **WHEN** the trusted diagnostics endpoint reports state `ok`
- **THEN** the panel SHALL display the latest successful operation and `lastSuccessAt`
- **AND** it SHALL NOT display a stale error code as current

#### Scenario: Weather has not run or is unconfigured

- **WHEN** the diagnostic state is `never-attempted` or `unconfigured`
- **THEN** the panel SHALL display an explicit neutral or configuration-required message
- **AND** the panel SHALL remain present instead of showing an empty area

---
### Requirement: Refresh the diagnostic panel after weather operations

The MQTT Settings weather section SHALL reload the trusted weather diagnostic after page load and after manual weather refresh or weather-options requests complete.

#### Scenario: Manual refresh returns an upstream failure

- **WHEN** an operator triggers manual weather refresh and the CWA request fails
- **THEN** the page SHALL reload the diagnostic endpoint after the refresh request settles
- **AND** the panel SHALL display the latest server diagnostic without requiring a full page reload

#### Scenario: Loading county or station options fails

- **WHEN** a county or station options request fails
- **THEN** the page SHALL reload the diagnostic endpoint after the request settles
- **AND** the panel SHALL identify the latest operation as `options`