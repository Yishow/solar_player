# solar-mqtt-factory-total-publishing Specification

## Purpose

TBD - created by archiving change 'aggregate-cl-kn-total-mwh-for-sustainability'. Update Purpose after archive.

## Requirements

### Requirement: Publish factory cumulative generation from a complete zone snapshot

The field MQTT publisher SHALL calculate each factory's cumulative generation as the sum of every zone's finite `total_mwh` from the same scrape cycle and SHALL publish the result in both the factory summary and a retained scalar topic.

#### Scenario: All zone totals are valid

- **WHEN** a factory scrape returns a non-empty zone list and every zone has a finite `total_mwh`
- **THEN** the publisher SHALL set `summary.total_mwh` to the rounded sum of those zone values
- **AND** it SHALL publish retained `solar/{factory}/total_mwh` with JSON payload `{ "value": <sum> }`
- **AND** the existing per-zone topics SHALL remain unchanged

##### Example: CL and KN factory sums

| Factory | Zone totals in MWh | Factory total in MWh |
| --- | --- | --- |
| CL | 5587.416, 4398.890, 0, 0, 0 | 9986.306 |
| KN | 628.070, 3031.500 | 3659.570 |


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
### Requirement: Preserve the last retained factory total when zone data is incomplete

The field MQTT publisher SHALL NOT publish a new factory scalar `total_mwh` when any current zone total is missing or non-finite, and it SHALL emit a bounded alert identifying the incomplete factory and zone ids.

#### Scenario: One zone total is missing

- **WHEN** at least one current zone has `total_mwh` equal to null, NaN, Infinity, or a missing value
- **THEN** the publisher SHALL omit `total_mwh` from that cycle's factory summary
- **AND** it SHALL skip publishing the factory scalar `total_mwh`
- **AND** the broker SHALL retain the previous valid scalar value
- **AND** the publisher SHALL emit a bounded incomplete-total alert

#### Scenario: A previously known zone disappears

- **WHEN** a factory's current scrape omits a zone id that was present in its last successful complete zone set
- **THEN** the publisher SHALL treat the current factory total as incomplete
- **AND** it SHALL preserve the previous retained scalar total

##### Example: CL zone 2 disappears

- **GIVEN** the last complete CL zone set is `1, 2, 3, 4, 5` and retained factory total is 9986.306 MWh
- **WHEN** the next scrape contains only zones `1, 3, 4, 5`
- **THEN** the publisher omits factory `total_mwh`, skips the scalar publish, and identifies missing zone `2`

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