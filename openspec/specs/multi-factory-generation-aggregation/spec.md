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

---
### Requirement: Canonical multi-factory generation is explicitly global

The canonical generation values derived from complete CL and KN factory sources SHALL use `metricScope = global`. CL and KN source generation SHALL remain independently addressable under their own scopes and MUST NOT be overwritten when the global aggregate is updated.

#### Scenario: Both factory summaries are current
- **WHEN** current CL and KN generation inputs satisfy the existing completeness rules
- **THEN** the system updates the canonical aggregate under `global`
- **AND** the CL and KN source metrics remain available under `cl` and `kn` respectively

#### Scenario: A site playback page requests generation
- **WHEN** a CL playback binding targets site-scoped generation
- **THEN** it resolves the CL value rather than the global CL+KN aggregate
- **AND** the global aggregate is used only by a contract that explicitly requests global scope

---
### Requirement: Aggregate completeness is evaluated across scoped source identities

The existing complete-both-sites and last-complete-value rules SHALL evaluate CL and KN as two explicit scoped inputs. A reading from one site MUST NOT satisfy the other site's dependency merely because both inputs share the same semantic metric key.

#### Scenario: KN source is stale while CL is current
- **WHEN** the CL source identity is current and the KN source identity is stale
- **THEN** the global aggregate is not recomputed from CL alone
- **AND** the last complete global value is retained according to the existing aggregation contract

---
### Requirement: Multi-factory aggregation consumes adapter-managed factory source metrics

The multi-factory generation aggregate SHALL use the Solar adapter's scoped `factoryGeneration.todayMwh`, `factoryGeneration.monthMwh`, and `factoryGeneration.totalMwh` readings as its CL and KN upstream inputs. Generic direct mappings and scalar compatibility topics MUST NOT compete as alternate inputs to the canonical aggregate.

#### Scenario: Both adapter-managed site summaries are current
- **WHEN** the CL and KN adapter source metrics are finite, current, and sourced from valid factory summaries
- **THEN** the existing complete-both-sites aggregation rules evaluate those scoped inputs
- **AND** the global canonical generation is updated using the older of the two source timestamps as already required

#### Scenario: Legacy generic factory-generation mapping is still present
- **WHEN** a legacy or custom mapping attempts to write an adapter-owned CL or KN factory-generation source identity
- **THEN** that mapping cannot become an enabled competing source
- **AND** aggregate evaluation continues to use the adapter-managed scoped reading

---
### Requirement: Aggregate units remain MWh at the factory-source boundary

The Solar adapter and multi-factory aggregation boundary SHALL preserve `today_mwh`, `month_mwh`, and `total_mwh` as `MWh` values. Player-facing conversions such as displaying daily generation in `kWh` SHALL occur downstream and MUST NOT alter or relabel the adapter source values.

#### Scenario: CL summary reports 3.49 MWh today
- **WHEN** the adapter projects the CL summary for aggregation
- **THEN** `cl/factoryGeneration.todayMwh` has value `3.49` and unit `MWh`
- **AND** downstream presentation MAY derive `3490 kWh` without rewriting the source metric as if it had arrived in kWh

---
### Requirement: Canonical CL+KN generation is registry-defined global derivation

The canonical CL+KN daily, monthly, and cumulative generation calculations SHALL be represented by global Derived Metric Registry definitions whose inputs explicitly select the CL and KN factory-generation source metrics. The registry-backed definitions SHALL preserve the existing requirement that both site inputs are finite and current before a new canonical result is accepted.

#### Scenario: Both factory source metrics are current
- **WHEN** the registry evaluates the global canonical generation definition with valid current CL and KN MWh inputs
- **THEN** the result equals the existing CL+KN sum
- **AND** its effective timestamp uses the older contributing source timestamp
- **AND** provenance names both scoped site inputs

#### Scenario: One factory source becomes stale
- **WHEN** KN is stale while CL remains current
- **THEN** the definition does not publish a partial CL-only global generation value
- **AND** the existing last-complete global result is retained through `retain-last-good`
- **AND** diagnostics identify the KN dependency as stale


<!-- @trace
source: add-derived-metric-registry
updated: 2026-08-31
code:
  - apps/server/src/metrics/liveMetrics.ts
  - start.ps1
  - apps/server/src/routes/display-card-data.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/pages/DeviceStatus/device.css
  - packages/shared/src/displayCardData.ts
  - solar_mqtt_go/internal/tray/app.go
  - solar_mqtt_go/assets/assets.go
  - apps/web/src/pages/FactoryCircuit/runtimeContent.tsx
  - .agents/skills/openspec-apply-change/SKILL.md
  - .env.example
  - apps/server/src/app.ts
  - apps/server/src/db/seed.ts
  - solar_mqtt_go/internal/service/control.go
  - solar_mqtt_go/internal/service/service.go
  - solar_mqtt_go/internal/webui/web/js/local-config-view.js
  - apps/server/src/services/SnapshotWriterService.ts
  - solar_mqtt_go/internal/display/display.go
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/server/src/services/MetricsAccumulatorService.ts
  - apps/server/src/services/displayReadinessService.ts
  - solar_mqtt_go/internal/tray/instance_windows.go
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - solar_mqtt_go/internal/discovery/discovery.go
  - apps/web/src/services/api.ts
  - solar_mqtt_go/internal/config/config.go
  - solar_mqtt_go/internal/tray/run_nocgo.go
  - solar_mqtt_go/internal/webui/webui.go
  - apps/server/src/services/displayOpsService.ts
  - .agents/skills/openspec-propose/SKILL.md
  - apps/server/src/routes/metrics-history.ts
  - apps/server/src/server-startup.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - solar_mqtt_go/commands.go
  - solar_mqtt_go/internal/tray/run.go
  - solar_mqtt_go/internal/storage/storage.go
  - apps/web/src/pages/Solar/viewModel.ts
  - solar_mqtt_go/go.mod
  - apps/server/src/services/derivedMetricCatalogService.ts
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - solar_mqtt_go/internal/webui/web/vendor/mqtt.min.js
  - apps/web/src/services/socket.ts
  - packages/shared/src/displayEditorSchema.ts
  - solar_mqtt_go/internal/webui/web/styles/layout.css
  - solar_mqtt_go/build.sh
  - solar_mqtt_go/internal/mosquitto/proc_windows.go
  - apps/server/src/services/MetricResolver.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - .agents/skills/.openspec-target
  - apps/server/src/services/displayPagePublishingService.ts
  - solar_mqtt_go/internal/webui/web/js/app.js
  - packages/shared/src/derivedMetric.ts
  - apps/server/src/mqtt/ManagedSourceAdapter.ts
  - solar_mqtt_go/internal/mosquitto/mosquitto.go
  - apps/web/src/pages/DeviceStatus/layout.ts
  - solar_mqtt_go/internal/webui/web/styles/components.css
  - apps/server/src/services/MockMetricsFeedService.ts
  - apps/web/src/hooks/liveMetricsStore.ts
  - apps/server/src/routes/derived-metrics.ts
  - solar_mqtt_go/internal/webui/web/styles.css
  - apps/server/src/services/playbackMetricAuthorizationService.ts
  - .agents/skills/openspec-explore/SKILL.md
  - apps/server/src/routes/calculation-settings.ts
  - apps/server/src/mqtt/SolarSourceAdapter.ts
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - apps/web/src/hooks/useLiveMetrics.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - solar_mqtt_go/internal/heartbeat/heartbeat.go
  - packages/shared/src/metricScope.ts
  - solar_mqtt_go/internal/webui/web/js/mqtt-manager.js
  - solar_mqtt_go/main.go
  - apps/server/src/db/migrations/036_remove_managed_solar_topic_mappings.sql
  - solar_mqtt_go/internal/mqttbus/bus.go
  - packages/shared/src/widgetDataBinding.ts
  - solar_mqtt_go/start.ps1
  - apps/server/src/services/displayPreviewContextService.ts
  - solar_mqtt_go/build.ps1
  - start.sh
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - apps/server/src/services/calculationSettingsService.ts
  - apps/server/src/services/displayCardDataService.ts
  - solar_mqtt_go/go.sum
  - apps/server/src/realtime/SocketService.ts
  - .agents/skills/openspec-sync-specs/SKILL.md
  - solar_mqtt_go/internal/scraper/scraper.go
  - docs/runbooks/pc-server-deploy.md
  - solar_mqtt_go/internal/schedule/schedule.go
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - solar_mqtt_go/internal/webui/web/styles/forms.css
  - apps/server/src/routes/metrics.ts
  - apps/server/src/routes/display-pages.ts
  - packages/shared/src/displayStory.ts
  - solar_mqtt_go/internal/webui/web/js/factory-view.js
  - apps/server/src/services/displayDataPreviewService.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - packages/shared/src/displayPageFreshness.ts
  - solar_mqtt_go/internal/anomaly/anomaly.go
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/pages/DataSourceSettings/index.tsx
  - apps/web/src/pages/DataSourceSettings/DerivedMetricRegistryPanel.tsx
  - apps/server/src/testing/deviceContextTestSupport.ts
  - apps/server/src/db/migrate.ts
  - apps/server/src/services/derivedMetricExpression.ts
  - apps/server/src/routes/data-source.ts
  - solar_mqtt_go/internal/webui/web/styles/theme.css
  - apps/server/src/db/migrations/037_derived_metric_registry.sql
  - packages/shared/src/playbackMetricContract.ts
  - apps/server/src/db/migrations/035_scoped_metric_identity.sql
  - apps/server/src/routes/settings-mqtt.ts
  - apps/web/src/pages/MqttSettings/factoryTopicSites.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/server/src/db/scopedMetricMigration.ts
  - solar_mqtt_go/internal/mosquitto/proc_unix.go
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - packages/shared/src/displayReadiness.ts
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - solar_mqtt_go/internal/tray/instance_unix.go
  - scripts/deploy.test.mjs
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/Solar/runtimeContent.tsx
  - apps/server/src/services/displayRotationService.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - .agents/skills/openspec-archive-change/SKILL.md
  - apps/web/src/pages/Overview/viewModel.ts
  - solar_mqtt_go/assets/tray.ico
  - packages/shared/src/index.ts
  - apps/server/src/services/MetricHistoryRetentionService.ts
  - packages/shared/src/displayOps.ts
  - apps/server/src/db/migrations/038_derived_metric_site_scopes.sql
  - apps/server/src/services/derivedMetricRegistryService.ts
  - apps/server/src/services/displayStoryService.ts
  - solar_mqtt_go/internal/webui/web/index.html
  - apps/server/src/services/displayValueOverrideService.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - solar_mqtt_go/internal/tray/logfile.go
  - solar_mqtt_go/start.sh
  - solar_mqtt_go/internal/webui/web/js/config-view.js
  - apps/server/src/services/DailySummaryService.ts
tests:
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/Overview/render.test.ts
  - apps/server/src/services/SnapshotWriterService.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - solar_mqtt_go/internal/mqttbus/bus_test.go
  - apps/server/src/services/factoryGenerationAggregateService.test.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.test.ts
  - apps/server/src/routes/metrics-history.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - packages/shared/src/displayStory.test.ts
  - apps/server/src/routes/derived-metrics.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - solar_mqtt_go/internal/tray/instance_windows_test.go
  - apps/server/src/db/migrations/calculationSettings.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - apps/server/src/routes/device-context-playback.test.ts
  - apps/server/src/mqtt/SolarSourceAdapter.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/web/src/pages/Overview/runtimeIsolation.test.tsx
  - apps/web/src/pages/FactoryCircuit/runtimeIsolation.test.tsx
  - apps/web/src/pages/shared/widgetDataBinding.test.ts
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.test.tsx
  - apps/server/src/services/managementSessionService.test.ts
  - solar_mqtt_go/internal/heartbeat/heartbeat_test.go
  - solar_mqtt_go/internal/service/service_test.go
  - solar_mqtt_go/internal/config/config_test.go
  - apps/server/src/services/MetricHistoryRetentionService.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/server/src/services/derivedMetricRegistryService.test.ts
  - apps/server/src/app.test.ts
  - apps/web/src/pages/DataSourceSettings/viewModel.test.ts
  - solar_mqtt_go/internal/mqttbus/control_contract_test.go
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/pages/shared/playbackMetricContract.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - apps/server/src/services/carbonReductionConsistency.test.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/server/src/routes/calculation-settings.test.ts
  - solar_mqtt_go/internal/tray/app_test.go
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/loadModel.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/server/src/services/MockMetricsFeedService.test.ts
  - solar_mqtt_go/internal/anomaly/anomaly_test.go
  - apps/server/src/services/derivedMetricExpression.test.ts
  - apps/web/src/pages/CircuitSettings/viewModel.test.ts
  - apps/server/src/services/managementPasswordService.test.ts
  - solar_mqtt_go/internal/service/control_contract_test.go
  - apps/web/src/hooks/displayPageDraftSession.test.ts
  - apps/server/src/routes/display-preview-context.test.ts
  - solar_mqtt_go/internal/discovery/discovery_test.go
  - apps/web/src/hooks/liveMetricsStore.test.ts
  - solar_mqtt_go/internal/scraper/scraper_test.go
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - solar_mqtt_go/internal/schedule/schedule_test.go
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - solar_mqtt_go/internal/storage/storage_test.go
  - solar_mqtt_go/main_test.go
  - apps/server/src/services/displayReadinessService.test.ts
  - apps/web/src/pages/DeviceStatus/layout.test.ts
  - apps/server/src/db/migrations/derivedMetricRegistry.test.ts
  - packages/shared/src/derivedMetric.test.ts
  - apps/server/src/services/MetricResolver.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - solar_mqtt_go/build_test.go
  - apps/web/src/pages/DataSourceSettings/DerivedMetricRegistryPanel.test.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/services/MetricsAccumulatorService.test.ts
  - apps/server/src/routes/display-readiness.test.ts
  - apps/server/src/routes/display-data-preview.test.ts
  - apps/server/src/services/DailySummaryService.test.ts
  - apps/server/src/db/migrations/clKnGenerationSummaryTopics.test.ts
  - solar_mqtt_go/assets/assets_test.go
  - apps/web/src/pages/Overview/configRender.test.tsx
  - solar_mqtt_go/internal/webui/webui_test.go
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/Solar/runtimeIsolation.test.tsx
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - solar_mqtt_go/internal/display/display_test.go
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/server/src/routes/management-auth.test.ts
  - solar_mqtt_go/internal/config/applyset_test.go
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/services/playbackMetricAuthorizationService.test.ts
  - apps/server/src/db/migrations/scopeLiveMetricsMigration.test.ts
  - solar_mqtt_go/internal/mosquitto/mosquitto_test.go
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/DisplayPagesEditor/dataBindingCapability.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/server/src/services/displayStoryTopicNames.test.ts
  - packages/shared/src/metricScope.test.ts
  - solar_mqtt_go/internal/tray/logfile_test.go
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/server/src/routes/data-source.test.ts
-->

---
### Requirement: Existing cumulative regression protection survives registry migration

Moving canonical generation into the Derived Metric Registry SHALL NOT remove the existing protection against silent cumulative generation regressions. A newly evaluated cumulative result that violates the existing accepted regression/reset rules MUST NOT replace the last accepted canonical cumulative value.

#### Scenario: Valid inputs produce a regressed cumulative total
- **WHEN** current CL and KN cumulative source inputs sum to a value rejected by the existing cumulative regression policy
- **THEN** the global derived cumulative metric does not accept the regressed result
- **AND** diagnostics expose the regression reason separately from expression syntax/availability failures

<!-- @trace
source: add-derived-metric-registry
updated: 2026-08-31
code:
  - apps/server/src/metrics/liveMetrics.ts
  - start.ps1
  - apps/server/src/routes/display-card-data.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/pages/DeviceStatus/device.css
  - packages/shared/src/displayCardData.ts
  - solar_mqtt_go/internal/tray/app.go
  - solar_mqtt_go/assets/assets.go
  - apps/web/src/pages/FactoryCircuit/runtimeContent.tsx
  - .agents/skills/openspec-apply-change/SKILL.md
  - .env.example
  - apps/server/src/app.ts
  - apps/server/src/db/seed.ts
  - solar_mqtt_go/internal/service/control.go
  - solar_mqtt_go/internal/service/service.go
  - solar_mqtt_go/internal/webui/web/js/local-config-view.js
  - apps/server/src/services/SnapshotWriterService.ts
  - solar_mqtt_go/internal/display/display.go
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/server/src/services/MetricsAccumulatorService.ts
  - apps/server/src/services/displayReadinessService.ts
  - solar_mqtt_go/internal/tray/instance_windows.go
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - solar_mqtt_go/internal/discovery/discovery.go
  - apps/web/src/services/api.ts
  - solar_mqtt_go/internal/config/config.go
  - solar_mqtt_go/internal/tray/run_nocgo.go
  - solar_mqtt_go/internal/webui/webui.go
  - apps/server/src/services/displayOpsService.ts
  - .agents/skills/openspec-propose/SKILL.md
  - apps/server/src/routes/metrics-history.ts
  - apps/server/src/server-startup.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - solar_mqtt_go/commands.go
  - solar_mqtt_go/internal/tray/run.go
  - solar_mqtt_go/internal/storage/storage.go
  - apps/web/src/pages/Solar/viewModel.ts
  - solar_mqtt_go/go.mod
  - apps/server/src/services/derivedMetricCatalogService.ts
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - solar_mqtt_go/internal/webui/web/vendor/mqtt.min.js
  - apps/web/src/services/socket.ts
  - packages/shared/src/displayEditorSchema.ts
  - solar_mqtt_go/internal/webui/web/styles/layout.css
  - solar_mqtt_go/build.sh
  - solar_mqtt_go/internal/mosquitto/proc_windows.go
  - apps/server/src/services/MetricResolver.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - .agents/skills/.openspec-target
  - apps/server/src/services/displayPagePublishingService.ts
  - solar_mqtt_go/internal/webui/web/js/app.js
  - packages/shared/src/derivedMetric.ts
  - apps/server/src/mqtt/ManagedSourceAdapter.ts
  - solar_mqtt_go/internal/mosquitto/mosquitto.go
  - apps/web/src/pages/DeviceStatus/layout.ts
  - solar_mqtt_go/internal/webui/web/styles/components.css
  - apps/server/src/services/MockMetricsFeedService.ts
  - apps/web/src/hooks/liveMetricsStore.ts
  - apps/server/src/routes/derived-metrics.ts
  - solar_mqtt_go/internal/webui/web/styles.css
  - apps/server/src/services/playbackMetricAuthorizationService.ts
  - .agents/skills/openspec-explore/SKILL.md
  - apps/server/src/routes/calculation-settings.ts
  - apps/server/src/mqtt/SolarSourceAdapter.ts
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - apps/web/src/hooks/useLiveMetrics.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - solar_mqtt_go/internal/heartbeat/heartbeat.go
  - packages/shared/src/metricScope.ts
  - solar_mqtt_go/internal/webui/web/js/mqtt-manager.js
  - solar_mqtt_go/main.go
  - apps/server/src/db/migrations/036_remove_managed_solar_topic_mappings.sql
  - solar_mqtt_go/internal/mqttbus/bus.go
  - packages/shared/src/widgetDataBinding.ts
  - solar_mqtt_go/start.ps1
  - apps/server/src/services/displayPreviewContextService.ts
  - solar_mqtt_go/build.ps1
  - start.sh
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - apps/server/src/services/calculationSettingsService.ts
  - apps/server/src/services/displayCardDataService.ts
  - solar_mqtt_go/go.sum
  - apps/server/src/realtime/SocketService.ts
  - .agents/skills/openspec-sync-specs/SKILL.md
  - solar_mqtt_go/internal/scraper/scraper.go
  - docs/runbooks/pc-server-deploy.md
  - solar_mqtt_go/internal/schedule/schedule.go
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - solar_mqtt_go/internal/webui/web/styles/forms.css
  - apps/server/src/routes/metrics.ts
  - apps/server/src/routes/display-pages.ts
  - packages/shared/src/displayStory.ts
  - solar_mqtt_go/internal/webui/web/js/factory-view.js
  - apps/server/src/services/displayDataPreviewService.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - packages/shared/src/displayPageFreshness.ts
  - solar_mqtt_go/internal/anomaly/anomaly.go
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/pages/DataSourceSettings/index.tsx
  - apps/web/src/pages/DataSourceSettings/DerivedMetricRegistryPanel.tsx
  - apps/server/src/testing/deviceContextTestSupport.ts
  - apps/server/src/db/migrate.ts
  - apps/server/src/services/derivedMetricExpression.ts
  - apps/server/src/routes/data-source.ts
  - solar_mqtt_go/internal/webui/web/styles/theme.css
  - apps/server/src/db/migrations/037_derived_metric_registry.sql
  - packages/shared/src/playbackMetricContract.ts
  - apps/server/src/db/migrations/035_scoped_metric_identity.sql
  - apps/server/src/routes/settings-mqtt.ts
  - apps/web/src/pages/MqttSettings/factoryTopicSites.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/server/src/db/scopedMetricMigration.ts
  - solar_mqtt_go/internal/mosquitto/proc_unix.go
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - packages/shared/src/displayReadiness.ts
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - solar_mqtt_go/internal/tray/instance_unix.go
  - scripts/deploy.test.mjs
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/Solar/runtimeContent.tsx
  - apps/server/src/services/displayRotationService.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - .agents/skills/openspec-archive-change/SKILL.md
  - apps/web/src/pages/Overview/viewModel.ts
  - solar_mqtt_go/assets/tray.ico
  - packages/shared/src/index.ts
  - apps/server/src/services/MetricHistoryRetentionService.ts
  - packages/shared/src/displayOps.ts
  - apps/server/src/db/migrations/038_derived_metric_site_scopes.sql
  - apps/server/src/services/derivedMetricRegistryService.ts
  - apps/server/src/services/displayStoryService.ts
  - solar_mqtt_go/internal/webui/web/index.html
  - apps/server/src/services/displayValueOverrideService.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - solar_mqtt_go/internal/tray/logfile.go
  - solar_mqtt_go/start.sh
  - solar_mqtt_go/internal/webui/web/js/config-view.js
  - apps/server/src/services/DailySummaryService.ts
tests:
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/Overview/render.test.ts
  - apps/server/src/services/SnapshotWriterService.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - solar_mqtt_go/internal/mqttbus/bus_test.go
  - apps/server/src/services/factoryGenerationAggregateService.test.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.test.ts
  - apps/server/src/routes/metrics-history.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - packages/shared/src/displayStory.test.ts
  - apps/server/src/routes/derived-metrics.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - solar_mqtt_go/internal/tray/instance_windows_test.go
  - apps/server/src/db/migrations/calculationSettings.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - apps/server/src/routes/device-context-playback.test.ts
  - apps/server/src/mqtt/SolarSourceAdapter.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/web/src/pages/Overview/runtimeIsolation.test.tsx
  - apps/web/src/pages/FactoryCircuit/runtimeIsolation.test.tsx
  - apps/web/src/pages/shared/widgetDataBinding.test.ts
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.test.tsx
  - apps/server/src/services/managementSessionService.test.ts
  - solar_mqtt_go/internal/heartbeat/heartbeat_test.go
  - solar_mqtt_go/internal/service/service_test.go
  - solar_mqtt_go/internal/config/config_test.go
  - apps/server/src/services/MetricHistoryRetentionService.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/server/src/services/derivedMetricRegistryService.test.ts
  - apps/server/src/app.test.ts
  - apps/web/src/pages/DataSourceSettings/viewModel.test.ts
  - solar_mqtt_go/internal/mqttbus/control_contract_test.go
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/pages/shared/playbackMetricContract.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - apps/server/src/services/carbonReductionConsistency.test.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/server/src/routes/calculation-settings.test.ts
  - solar_mqtt_go/internal/tray/app_test.go
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/loadModel.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/server/src/services/MockMetricsFeedService.test.ts
  - solar_mqtt_go/internal/anomaly/anomaly_test.go
  - apps/server/src/services/derivedMetricExpression.test.ts
  - apps/web/src/pages/CircuitSettings/viewModel.test.ts
  - apps/server/src/services/managementPasswordService.test.ts
  - solar_mqtt_go/internal/service/control_contract_test.go
  - apps/web/src/hooks/displayPageDraftSession.test.ts
  - apps/server/src/routes/display-preview-context.test.ts
  - solar_mqtt_go/internal/discovery/discovery_test.go
  - apps/web/src/hooks/liveMetricsStore.test.ts
  - solar_mqtt_go/internal/scraper/scraper_test.go
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - solar_mqtt_go/internal/schedule/schedule_test.go
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - solar_mqtt_go/internal/storage/storage_test.go
  - solar_mqtt_go/main_test.go
  - apps/server/src/services/displayReadinessService.test.ts
  - apps/web/src/pages/DeviceStatus/layout.test.ts
  - apps/server/src/db/migrations/derivedMetricRegistry.test.ts
  - packages/shared/src/derivedMetric.test.ts
  - apps/server/src/services/MetricResolver.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - solar_mqtt_go/build_test.go
  - apps/web/src/pages/DataSourceSettings/DerivedMetricRegistryPanel.test.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/services/MetricsAccumulatorService.test.ts
  - apps/server/src/routes/display-readiness.test.ts
  - apps/server/src/routes/display-data-preview.test.ts
  - apps/server/src/services/DailySummaryService.test.ts
  - apps/server/src/db/migrations/clKnGenerationSummaryTopics.test.ts
  - solar_mqtt_go/assets/assets_test.go
  - apps/web/src/pages/Overview/configRender.test.tsx
  - solar_mqtt_go/internal/webui/webui_test.go
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/Solar/runtimeIsolation.test.tsx
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - solar_mqtt_go/internal/display/display_test.go
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/server/src/routes/management-auth.test.ts
  - solar_mqtt_go/internal/config/applyset_test.go
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/services/playbackMetricAuthorizationService.test.ts
  - apps/server/src/db/migrations/scopeLiveMetricsMigration.test.ts
  - solar_mqtt_go/internal/mosquitto/mosquitto_test.go
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/DisplayPagesEditor/dataBindingCapability.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/server/src/services/displayStoryTopicNames.test.ts
  - packages/shared/src/metricScope.test.ts
  - solar_mqtt_go/internal/tray/logfile_test.go
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/server/src/routes/data-source.test.ts
-->