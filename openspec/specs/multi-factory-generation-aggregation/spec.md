# multi-factory-generation-aggregation Specification

## Purpose

TBD - created by archiving change 'aggregate-cl-kn-total-mwh-for-sustainability'. Update Purpose after archive.

## Requirements

### Requirement: Derive canonical generation from complete CL and KN summaries

Solar Player SHALL subscribe to the CL and KN retained factory summaries and SHALL derive canonical daily, monthly, and cumulative generation only when both factory source values are finite and current.

#### Scenario: Both factory summaries are complete

- **WHEN** CL and KN summaries contain finite `today_mwh`, `month_mwh`, `total_mwh`, and valid source timestamps
- **THEN** Solar Player SHALL add the corresponding CL and KN fields
- **AND** it SHALL update canonical `todayGeneration`, `monthGeneration`, and `totalGeneration`
- **AND** canonical timestamps SHALL use the older factory source timestamp

##### Example: combined cumulative generation

- **GIVEN** CL `total_mwh` is 9986.306 and KN `total_mwh` is 3659.570
- **WHEN** the aggregate is computed
- **THEN** canonical cumulative generation is 13645.876 MWh

#### Scenario: One factory is missing or stale

- **WHEN** either CL or KN source value is missing, non-finite, lacks a valid timestamp, or exceeds the configured MQTT message timeout
- **THEN** Solar Player SHALL NOT publish a partial canonical value
- **AND** it SHALL retain the last complete canonical reading
- **AND** readiness SHALL identify the incomplete factory dependency

##### Example: KN exceeds the message timeout

- **GIVEN** the MQTT message timeout is 60 seconds, CL is 10 seconds old, KN is 61 seconds old, and the last complete canonical total is 13645.876 MWh
- **WHEN** aggregation runs
- **THEN** it retains 13645.876 MWh and readiness identifies KN as stale


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
### Requirement: Prevent direct and derived generation sources from competing

Solar Player SHALL use the CL and KN source mappings as the only inputs to the derived canonical generation path and SHALL prevent legacy direct generation mappings from overwriting the derived canonical values.

#### Scenario: A legacy direct topic publishes after migration

- **WHEN** a disabled legacy direct `todayGeneration` or `totalGeneration` topic receives a message
- **THEN** it SHALL NOT replace the canonical derived value
- **AND** the derived value SHALL remain based on CL and KN factory summaries


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
### Requirement: Reject silent cumulative generation regressions

Solar Player SHALL NOT overwrite canonical cumulative generation or the cumulative generation counter when a newly derived CL plus KN total is lower than the last accepted canonical total.

#### Scenario: Combined total decreases

- **WHEN** a new complete CL plus KN aggregate is lower than the last accepted `totalGeneration`
- **THEN** Solar Player SHALL retain the last accepted canonical cumulative value
- **AND** it SHALL expose a source-regression readiness finding
- **AND** it SHALL require explicit reset handling before accepting the lower baseline

#### Scenario: Operator explicitly accepts the current lower baseline

- **GIVEN** the complete current CL plus KN aggregate is lower than the last accepted total
- **WHEN** a trusted operator submits that exact current total as reset confirmation
- **THEN** Solar Player SHALL atomically accept the CL and KN source baselines and the lower canonical total
- **AND** it SHALL update the generation cumulative counter to the confirmed baseline and increment its reset count

#### Scenario: Reset confirmation is stale or unnecessary

- **WHEN** the submitted total does not equal the complete current aggregate, a source is unavailable, or the aggregate is not currently in regression
- **THEN** Solar Player SHALL reject the reset without changing canonical values, factory baselines, or cumulative counters

##### Example: Operator confirms an older lower value

- **GIVEN** the current complete regression aggregate is 11659.570 MWh and the last accepted total is 13645.876 MWh
- **WHEN** the operator submits 11600.000 MWh as the reset confirmation
- **THEN** Solar Player rejects the reset and retains 13645.876 MWh as the accepted canonical total


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
### Requirement: Expose independently validated factory snapshots

Solar Player SHALL retain independently validated CL and KN generation snapshots for factory-scoped consumers while preserving the complete CL plus KN rule for canonical combined generation.

#### Scenario: CL is current and KN is stale

- **WHEN** CL fields are finite and current but KN exceeds the message timeout
- **THEN** the CL factory snapshot SHALL remain available to a CL-scoped Sustainability story
- **AND** the canonical combined generation SHALL retain its last complete value and report KN stale

##### Example: CL remains usable after the KN timeout

- **GIVEN** the timeout is 60 seconds, CL total is 9986.306 MWh updated 10 seconds ago, and KN was updated 61 seconds ago
- **WHEN** factory snapshots are evaluated
- **THEN** CL remains current at 9986.306 MWh while the combined snapshot reports KN stale

#### Scenario: A factory cumulative total regresses

- **WHEN** one factory `total_mwh` is lower than that factory's last accepted cumulative baseline
- **THEN** that factory snapshot SHALL expose a regression state
- **AND** a Sustainability scope requiring that factory SHALL NOT present the lower value as current

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