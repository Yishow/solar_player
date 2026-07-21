# sustainability-factory-scope-by-playback-settings Specification

## Purpose

TBD - created by archiving change 'aggregate-cl-kn-total-mwh-for-sustainability'. Update Purpose after archive.

## Requirements

### Requirement: Resolve Sustainability factory scope from playback page enablement

The system SHALL keep one Sustainability playback page and SHALL resolve its factory scope from the enabled state of the existing CL and KN Factory Circuit playback pages. The system SHALL NOT add a separate Sustainability factory selector.

#### Scenario: Only the CL factory page is enabled

- **WHEN** `factory-circuit` is enabled and `factory-circuit-guanyin` is disabled in playback settings
- **THEN** Sustainability SHALL use the CL factory scope
- **AND** every generation-derived Sustainability value and source state SHALL exclude KN

#### Scenario: Only the KN factory page is enabled

- **WHEN** `factory-circuit` is disabled and `factory-circuit-guanyin` is enabled in playback settings
- **THEN** Sustainability SHALL use the KN factory scope
- **AND** every generation-derived Sustainability value and source state SHALL exclude CL

#### Scenario: Both factory pages are enabled

- **WHEN** `factory-circuit` and `factory-circuit-guanyin` are both enabled in playback settings
- **THEN** Sustainability SHALL use the CL plus KN scope
- **AND** every generation-derived Sustainability value SHALL use the complete two-factory aggregate

#### Scenario: Neither factory page is enabled

- **WHEN** `factory-circuit` and `factory-circuit-guanyin` are both disabled in playback settings
- **THEN** Sustainability SHALL expose an explicit no-factory-selected state
- **AND** generation-derived values SHALL use the existing unavailable/`--` presentation
- **AND** the system SHALL NOT silently fall back to CL, KN, or CL plus KN


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
### Requirement: Refresh Sustainability when playback factory enablement changes

The system SHALL apply the current playback factory enablement whenever it builds or refreshes the Sustainability story so that factory scope does not require a second persisted setting.

#### Scenario: Operator changes from CL-only to both factories

- **WHEN** the operator enables `factory-circuit-guanyin` while `factory-circuit` remains enabled and saves playback settings
- **THEN** the next Sustainability refresh SHALL change its scope from CL to CL plus KN
- **AND** the route SHALL remain the single `/sustainability` page

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