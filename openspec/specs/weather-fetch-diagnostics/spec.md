# weather-fetch-diagnostics Specification

## Purpose

Provide stable, bounded weather-fetch diagnostics for trusted management operators without exposing sensitive request details through public weather contracts.

## Requirements

### Requirement: Classify CWA request failures with stable diagnostic codes

The server SHALL classify failures from current-weather and weather-options requests into stable, bounded weather diagnostic codes without exposing credentials, full request URLs, internal addresses, stack traces, or raw exception text.

#### Scenario: DNS lookup fails

- **WHEN** a CWA request fails because the dataset hostname cannot be resolved
- **THEN** the server SHALL record `WEATHER_DNS_LOOKUP_FAILED`
- **AND** the diagnostic SHALL identify the operation as `current` or `options`
- **AND** the diagnostic SHALL be marked retryable

#### Scenario: HTTP request is rejected

- **WHEN** CWA responds with a non-success HTTP status
- **THEN** the server SHALL record `WEATHER_HTTP_ERROR`
- **AND** it SHALL include the numeric HTTP status
- **AND** it SHALL NOT include the Authorization value or full request URL

#### Scenario: Failure does not match a known category

- **WHEN** a CWA request fails with an unrecognized error shape
- **THEN** the server SHALL record `WEATHER_UNKNOWN_ERROR`
- **AND** the public diagnostic summary SHALL remain bounded and free of raw exception text

##### Example: diagnostic classification table

| Failure | Code | Retryable |
| --- | --- | --- |
| Missing CWA authorization | `WEATHER_UNCONFIGURED` | false |
| DNS lookup failure | `WEATHER_DNS_LOOKUP_FAILED` | true |
| Connection timeout | `WEATHER_CONNECTION_TIMEOUT` | true |
| Request abort timeout | `WEATHER_REQUEST_TIMEOUT` | true |
| TLS handshake or certificate failure | `WEATHER_TLS_FAILED` | true |
| Non-success HTTP response | `WEATHER_HTTP_ERROR` | status-dependent |
| Invalid CWA payload | `WEATHER_INVALID_PAYLOAD` | true |
| Unknown failure | `WEATHER_UNKNOWN_ERROR` | true |

---
### Requirement: Retain the latest bounded weather operation diagnostic

The weather service SHALL retain the latest current-weather or weather-options operation result in memory, including its state, operation, occurrence time, last successful operation time, safe code, safe summary, optional HTTP status, and retryable flag.

#### Scenario: A request succeeds

- **WHEN** a current-weather or weather-options request succeeds
- **THEN** the diagnostic state SHALL become `ok`
- **AND** `lastSuccessAt` SHALL equal the successful completion time
- **AND** error code and HTTP status SHALL be null

#### Scenario: A request fails after a previous success

- **WHEN** a weather operation fails after at least one successful weather operation
- **THEN** the diagnostic state SHALL become `error`
- **AND** `occurredAt` SHALL identify the failure time
- **AND** the previous `lastSuccessAt` SHALL be preserved

#### Scenario: Service has not attempted a weather request

- **WHEN** the server starts and no weather operation has run
- **THEN** the diagnostic state SHALL be `never-attempted`
- **AND** operation, code, occurrence time, and last success time SHALL be null

---
### Requirement: Expose diagnostics only through a trusted management endpoint

The server SHALL expose the latest bounded weather diagnostic through `GET /api/weather/diagnostics` only to trusted management readers, while keeping public playback weather contracts free of diagnostic details.

#### Scenario: Trusted operator reads the latest error

- **WHEN** a trusted management reader requests `GET /api/weather/diagnostics`
- **THEN** the server SHALL return HTTP 200 with `{ diagnostic }`
- **AND** the diagnostic SHALL match the latest weather operation result

#### Scenario: Untrusted client requests diagnostics

- **WHEN** an untrusted client requests `GET /api/weather/diagnostics`
- **THEN** the server SHALL apply the existing management-read denial response
- **AND** the response SHALL NOT contain the latest diagnostic

#### Scenario: Playback client reads current weather

- **WHEN** any client requests the public current-weather contract
- **THEN** the response SHALL NOT include diagnostic code, raw error, request URL, token, credentials, stack trace, or internal hostname fields

---
### Requirement: Identify the source of each weather operation result

The trusted weather diagnostic SHALL identify whether the latest operation result came from a live upstream response, cache, stale fallback, or no available snapshot while keeping public weather contracts free of diagnostic details.

#### Scenario: Upstream returns a structurally invalid success document

- **WHEN** CWA responds with HTTP 200 but `records.Station` is missing or is not an array
- **THEN** the operation SHALL fail with `WEATHER_INVALID_PAYLOAD`
- **AND** it SHALL NOT expose a fresh empty station/options result

#### Scenario: Manual refresh reaches CWA

- **WHEN** a trusted manual refresh completes with a valid CWA response
- **THEN** the latest diagnostic SHALL report `state: ok` and `source: upstream`
- **AND** the diagnostic occurrence time SHALL describe that refresh attempt

#### Scenario: Upstream fails while a stale snapshot is available

- **WHEN** a weather request fails and the service returns its last successful snapshot
- **THEN** the latest diagnostic SHALL retain the bounded transport failure and report `source: stale`
- **AND** the diagnostic SHALL preserve `lastSuccessAt`

#### Scenario: A normal read is served from cache

- **WHEN** a non-refresh weather read returns an unexpired cached snapshot without contacting CWA
- **THEN** the operation result SHALL be distinguishable as `source: cache`
- **AND** it SHALL NOT replace the occurrence time of the latest upstream attempt

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