# mqtt-settings-display-coverage Specification

## Purpose

TBD - created by archiving change 'connect-mqtt-and-circuit-settings-to-display-readiness'. Update Purpose after archive.

## Requirements

### Requirement: Evaluate MQTT settings coverage against display metric requirements

The system SHALL evaluate `MQTT Settings` coverage against display metric requirements so operators can see which required metrics are mapped, missing, or invalid, and the management surface SHALL keep that feedback aligned with the latest available runtime topic state.

#### Scenario: Required display metric mapping is missing

- **WHEN** a display metric required by `Overview` or `Solar` has no valid topic mapping
- **THEN** `MQTT Settings` shows that missing or invalid mapping as a readiness finding
- **AND** the finding identifies which display story is affected
- **AND** the operator can distinguish between a static mapping gap and a mapped topic that is currently idle or not receiving runtime values


<!-- @trace
source: stream-mqtt-runtime-previews-and-readiness-feedback
updated: 2026-05-20
code:
  - apps/web/src/pages/OfflineError/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.tsx
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - package.json
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - scripts/dev.mjs
  - apps/web/src/pages/OfflineError/index.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/hooks/displaySyncDraftGuard.ts
  - apps/web/src/hooks/useDisplayPageRegistry.ts
  - apps/web/src/hooks/useDisplaySyncRefresh.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/managementDisplaySyncScopes.ts
  - apps/server/src/routes/device.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/server/src/routes/metrics-history.ts
  - apps/web/src/services/api.ts
  - apps/server/src/routes/settings-mqtt.ts
  - packages/shared/src/displayOps.ts
  - AGENTS.md
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/web/src/pages/SlideshowPreview/viewModel.ts
  - CLAUDE.md
  - apps/web/src/pages/energyMonitoringState.ts
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/server/src/logger.ts
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - apps/server/src/services/displayOpsService.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/pages/DisplayPagesEditor/pageRegionSchemas.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
tests:
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/pages/EnergyTrend/viewModel.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/server/src/logger.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/OfflineError/viewModel.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/server/src/routes/device.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/server/src/routes/metrics-history.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/EnergyHistory/viewModel.test.ts
  - apps/web/src/hooks/displaySyncDraftGuard.test.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.test.ts
  - apps/web/src/pages/ImageManagement/viewModel.test.ts
  - apps/web/src/hooks/useDisplaySyncRefresh.test.ts
-->

---
### Requirement: Surface MQTT coverage findings inside MQTT Settings

The system SHALL surface display coverage findings inside `MQTT Settings` rather than only in a backend-only diagnostic response, and it SHALL keep those findings inside the editable topic overview workspace.

#### Scenario: Operator reviews broker and mapping page

- **WHEN** the operator opens `MQTT Settings`
- **THEN** the page can show current mapping coverage for display requirements
- **AND** blocking findings remain distinguishable from warnings
- **AND** the operator can inspect and fix the affected topic rows without leaving that same topic overview workspace

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
### Requirement: Evaluate derived generation coverage from CL and KN dependencies

MQTT Settings SHALL evaluate canonical generation coverage as a derived dependency group backed by the CL and KN factory summary mappings rather than requiring a direct topic mapping for each canonical metric.

#### Scenario: Both factory mappings have current values

- **WHEN** CL and KN summary mappings are enabled and each has current finite daily, monthly, and cumulative values
- **THEN** canonical generation coverage SHALL be ready
- **AND** the operator SHALL be able to inspect both source mappings from the same MQTT workspace

##### Example: CL and KN mappings are healthy

- **GIVEN** enabled CL and KN summary mappings each expose finite `today_mwh`, `month_mwh`, and `total_mwh` within the timeout
- **WHEN** MQTT Settings evaluates generation coverage
- **THEN** it reports ready and lists both CL and KN source mappings

#### Scenario: One factory dependency is incomplete

- **WHEN** either factory summary mapping is missing, disabled, stale, invalid, or reports a cumulative regression
- **THEN** MQTT Settings SHALL show canonical generation as degraded or blocked
- **AND** the finding SHALL identify the affected factory and source field
- **AND** it SHALL NOT report the absence of a direct canonical topic as the root cause

##### Example: KN cumulative field is absent

- **GIVEN** CL is complete and KN summary has no `total_mwh`
- **WHEN** MQTT Settings evaluates cumulative generation coverage
- **THEN** it reports blocked with KN `total_mwh` as the dependency failure and does not request a direct `totalGeneration` topic


<!-- @trace
source: aggregate-cl-kn-total-mwh-for-sustainability
updated: 2026-07-21
code:
  - solar_mqtt/web/index.html
  - apps/server/src/services/displayReadinessService.ts
  - scripts/verify-weather-connectivity.mjs
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/server/src/mqtt/MqttClientService.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/server/src/db/seed.ts
  - solar_mqtt/solar/mosquitto.py
  - solar_mqtt/solar_config.mosquitto.example.json
  - apps/server/src/services/weatherService.ts
  - solar_mqtt/web/app.js
  - solar_mqtt/solar/storage.py
  - solar_mqtt/solar_config.single.example.json
  - apps/web/src/services/api.ts
  - solar_mqtt/solar/service.py
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/server/src/db/migrations/025_cl_kn_generation_summary_topics.sql
  - solar_mqtt/solar/__init__.py
  - solar_mqtt/solar/heartbeat.py
  - solar_mqtt/web/styles.css
  - apps/server/src/services/cwaWeatherClient.ts
  - solar_mqtt/solar_config.kn_cl.example.json
  - solar_mqtt/solar/anomaly.py
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - solar_mqtt/web/vendor/mqtt.min.js
  - solar_mqtt/solar/display.py
  - solar_mqtt/scrape_solar.py
  - solar_mqtt/solar/winsvc.py
  - packages/shared/src/displayReadiness.ts
  - solar_mqtt/solar/mqtt_bus.py
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - solar_mqtt/solar/scraper.py
  - solar_mqtt/solar/discovery.py
  - apps/server/src/services/sustainabilityStoryService.ts
  - solar_mqtt/solar/config.py
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - scripts/verify-weather-connectivity.test.mjs
  - apps/server/src/routes/weather.ts
  - solar_mqtt/solar/schedule.py
  - apps/server/src/services/MetricsAccumulatorService.ts
  - packages/shared/src/weather.ts
  - solar_mqtt/solar_config.json
  - apps/server/src/routes/settings-mqtt.ts
tests:
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - solar_mqtt/test_mqtt_retain.py
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/db/migrations/clKnGenerationSummaryTopics.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/routes/weather.test.ts
  - apps/server/src/services/displayStoryTopicNames.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/server/src/services/weatherService.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - solar_mqtt/test_web_assets.py
  - apps/server/src/services/displayReadinessService.test.ts
  - apps/server/src/services/cwaWeatherClient.test.ts
  - apps/server/src/services/MetricsAccumulatorService.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/server/src/routes/display-readiness.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - solar_mqtt/test_config_path.py
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/server/src/services/factoryGenerationAggregateService.test.ts
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
-->

---
### Requirement: Evaluate Sustainability coverage for the playback factory scope

MQTT Settings and display readiness SHALL evaluate Sustainability generation coverage against only the factory dependencies enabled by playback settings, while retaining the two-factory dependency rule for canonical combined generation.

#### Scenario: CL-only Sustainability scope is healthy while KN is stale

- **WHEN** only `factory-circuit` is enabled, CL summary fields are current, and KN is stale
- **THEN** Sustainability coverage SHALL be ready for the CL scope
- **AND** canonical combined generation coverage SHALL remain degraded because KN is stale

#### Scenario: Both factories are enabled

- **WHEN** both factory pages are enabled
- **THEN** Sustainability coverage SHALL require current CL and KN source fields

##### Example: KN is stale in the combined scope

- **GIVEN** both factory pages are enabled, CL is current, and KN exceeds the MQTT timeout
- **WHEN** Sustainability coverage is evaluated
- **THEN** it reports the CL plus KN scope as degraded and identifies KN as stale

#### Scenario: Both factories are disabled

- **WHEN** both factory pages are disabled
- **THEN** Sustainability coverage SHALL report no factory selected rather than an MQTT mapping failure

##### Example: Healthy mappings with no enabled factory

- **GIVEN** CL and KN mappings are both healthy but both factory pages are disabled
- **WHEN** Sustainability coverage is evaluated
- **THEN** it reports no factory selected and does not report either mapping as failed

<!-- @trace
source: aggregate-cl-kn-total-mwh-for-sustainability
updated: 2026-07-21
code:
  - solar_mqtt/web/index.html
  - apps/server/src/services/displayReadinessService.ts
  - scripts/verify-weather-connectivity.mjs
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/server/src/mqtt/MqttClientService.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/server/src/db/seed.ts
  - solar_mqtt/solar/mosquitto.py
  - solar_mqtt/solar_config.mosquitto.example.json
  - apps/server/src/services/weatherService.ts
  - solar_mqtt/web/app.js
  - solar_mqtt/solar/storage.py
  - solar_mqtt/solar_config.single.example.json
  - apps/web/src/services/api.ts
  - solar_mqtt/solar/service.py
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/server/src/db/migrations/025_cl_kn_generation_summary_topics.sql
  - solar_mqtt/solar/__init__.py
  - solar_mqtt/solar/heartbeat.py
  - solar_mqtt/web/styles.css
  - apps/server/src/services/cwaWeatherClient.ts
  - solar_mqtt/solar_config.kn_cl.example.json
  - solar_mqtt/solar/anomaly.py
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - solar_mqtt/web/vendor/mqtt.min.js
  - solar_mqtt/solar/display.py
  - solar_mqtt/scrape_solar.py
  - solar_mqtt/solar/winsvc.py
  - packages/shared/src/displayReadiness.ts
  - solar_mqtt/solar/mqtt_bus.py
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - solar_mqtt/solar/scraper.py
  - solar_mqtt/solar/discovery.py
  - apps/server/src/services/sustainabilityStoryService.ts
  - solar_mqtt/solar/config.py
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - scripts/verify-weather-connectivity.test.mjs
  - apps/server/src/routes/weather.ts
  - solar_mqtt/solar/schedule.py
  - apps/server/src/services/MetricsAccumulatorService.ts
  - packages/shared/src/weather.ts
  - solar_mqtt/solar_config.json
  - apps/server/src/routes/settings-mqtt.ts
tests:
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - solar_mqtt/test_mqtt_retain.py
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/db/migrations/clKnGenerationSummaryTopics.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/routes/weather.test.ts
  - apps/server/src/services/displayStoryTopicNames.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/server/src/services/weatherService.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - solar_mqtt/test_web_assets.py
  - apps/server/src/services/displayReadinessService.test.ts
  - apps/server/src/services/cwaWeatherClient.test.ts
  - apps/server/src/services/MetricsAccumulatorService.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/server/src/routes/display-readiness.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - solar_mqtt/test_config_path.py
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/server/src/services/factoryGenerationAggregateService.test.ts
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
-->