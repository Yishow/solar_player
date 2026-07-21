# site-weather-connectivity Specification

## Purpose

TBD - created by archiving change 'diagnose-and-restore-site-weather-connectivity'. Update Purpose after archive.

## Requirements

### Requirement: Verify weather connectivity through the application transport path

The installed Solar Player MUST provide an operator-runnable verifier that exercises the same weather configuration and transport path used by the server and returns a bounded stage result.

#### Scenario: Verifier runs outside the repository working directory

- **WHEN** an operator invokes the installed verifier from any working directory
- **THEN** it SHALL resolve the same explicit `SOLAR_DISPLAY_ENV_FILE` or install-root `.env` used by the server
- **AND** it SHALL NOT silently fall back to the operator working directory

#### Scenario: Restricted site network reaches CWA successfully

- **WHEN** the verifier runs on the installed Pi while connected to the information-department-approved site network
- **THEN** it SHALL exit with status 0
- **AND** it SHALL report `state: ok` and a successful application refresh stage
- **AND** the refreshed weather diagnostic SHALL identify the result source as `upstream`

#### Scenario: A required connectivity stage fails

- **WHEN** configuration, DNS, connect/TLS, HTTP/payload, or application refresh fails
- **THEN** the verifier SHALL exit with status 1
- **AND** it SHALL identify exactly one bounded `failedStage`, stable code, duration, optional HTTP status, and safe summary
- **AND** it SHALL NOT output authorization, a full dataset URL, proxy credentials, hostname, certificate content, stack, or raw exception

##### Example: bounded stage results

| Failure boundary | failedStage | Expected code family |
| --- | --- | --- |
| Dataset hostname cannot resolve | `dns` | `WEATHER_DNS_LOOKUP_FAILED` |
| TCP connection cannot complete | `connect` | `WEATHER_CONNECTION_TIMEOUT` |
| TLS negotiation fails | `tls` | `WEATHER_TLS_FAILED` |
| CWA rejects the request | `http` | `WEATHER_HTTP_ERROR` |
| CWA returns an invalid document | `payload` | `WEATHER_INVALID_PAYLOAD` |
| Refresh route does not preserve the attempt result | `application` | bounded application probe code |


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
### Requirement: Use only an explicitly approved weather egress path

The server SHALL use direct CWA HTTPS transport by default and SHALL use proxy or custom CA configuration only when that configuration is explicitly present in the installed application environment.

#### Scenario: Approved proxy or CA is configured

- **WHEN** live differential evidence identifies proxy or custom CA as required and the corresponding deployment environment is configured
- **THEN** the CWA client SHALL use that explicit transport configuration for current-weather and options requests
- **AND** all weather requests SHALL retain the existing timeout and bounded diagnostic behavior

##### Example: proxy requirement proven by differential evidence

- **GIVEN** direct transport fails at `connect`, the approved proxy transport succeeds, and the installed environment contains an approved proxy setting
- **WHEN** the server requests current weather or station options
- **THEN** both requests use the approved proxy while retaining certificate verification and the configured request timeout

#### Scenario: No alternate egress is configured

- **WHEN** direct CWA transport fails and no approved proxy or CA setting is present
- **THEN** the server SHALL return the matching bounded transport diagnostic
- **AND** it SHALL NOT switch Wi-Fi, use an unapproved endpoint, disable TLS verification, or fall back to a third-party weather source

##### Example: direct transport remains fail closed

- **GIVEN** direct transport fails with `WEATHER_CONNECTION_TIMEOUT` and no approved proxy or custom CA setting exists
- **WHEN** the server completes the weather attempt
- **THEN** it returns `WEATHER_CONNECTION_TIMEOUT` without changing the active network or weather provider

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