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

---
### Requirement: Device-scoped Sustainability uses the Context Site Scope

For an authenticated Display Client Context, Sustainability aggregation SHALL use the Context Site Scope and SHALL NOT infer factory scope from global Factory Circuit page enablement.

#### Scenario: CL and KN Devices request Sustainability concurrently

- **WHEN** paired CL and KN Devices request Sustainability while both factory pages are globally enabled
- **THEN** the CL response contains only CL source values
- **AND** the KN response contains only KN source values

<!-- @trace
source: device-context-site-scoped-playback
updated: 2026-07-30
code:
  - docs/runbooks/pi-thin-kiosk-deploy.md
  - apps/server/src/services/effectiveRotationCache.ts
  - apps/server/src/db/seed.ts
  - apps/server/src/routes/sustainability-story.ts
  - apps/server/src/routes/device-pairing.ts
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - packages/shared/src/deviceIdentity.ts
  - packages/shared/src/displayReadiness.ts
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - apps/server/src/db/migrations/029_device_group_management.sql
  - apps/web/src/services/api.ts
  - apps/server/src/services/displayReadinessService.ts
  - apps/server/src/routes/playback.ts
  - apps/server/src/testing/deviceContextTestSupport.ts
  - docs/ops/workflow.md
  - apps/server/src/app.ts
  - docs/ops/maintenance.md
  - apps/server/src/routes/display-story.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/server/src/db/migrations/030_device_pairing_credentials.sql
  - packages/shared/src/index.ts
  - apps/server/src/fastify.ts
  - scripts/fhd-witness-config.mjs
  - packages/shared/src/playback.ts
  - apps/server/src/routes/display-readiness.ts
  - docs/agents/issue-tracker.md
  - apps/server/src/services/playbackProfileService.ts
  - packages/shared/src/displayClientContext.ts
  - .env.example
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/server/src/db/migrations/028_global_playback_runtime_policy.sql
  - CLAUDE.md
  - packages/shared/src/displayPageFreshness.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - packages/shared/src/devicePairing.ts
  - apps/server/src/services/deviceCredentialService.ts
  - docs/ops/conventions.md
  - deploy/install-thin-kiosk.sh
  - apps/server/src/services/displayRotationService.ts
  - apps/server/src/services/displayClientContextService.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/server/src/config.ts
  - docs/architecture/default-playback-profile.md
  - scripts/deploy.test.mjs
  - apps/server/src/testing/defaultPlaybackProfileTestSupport.ts
  - deploy/verify-thin-kiosk.sh
  - apps/server/src/services/deviceGroupService.ts
  - apps/server/src/services/playbackRuntimePolicyService.ts
  - docs/ops/delegation.md
  - apps/server/src/routes/device-groups.ts
  - .github/workflows/agent-source-artifact.yml
  - apps/server/src/plugins/deviceContext.ts
  - apps/server/src/routes/devices.ts
  - docs/ops/dispatch.md
  - docs/ops/judgment.md
  - packages/shared/src/deviceIdentity.contract.ts
  - apps/server/src/services/displayStoryService.ts
  - AGENTS.md
  - scripts/capture-fhd-witness.mjs
  - .scratch/device-scoped-multisite-playback/spec.md
tests:
  - apps/server/src/db/defaultPlaybackProfileMigration.test.ts
  - apps/server/src/services/displayPageRegistryService.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/server/src/plugins/deviceContext.test.ts
  - apps/server/src/routes/device-context-playback.test.ts
  - apps/server/src/services/playbackRuntimePolicyService.test.ts
  - apps/server/src/routes/device-pairing.test.ts
  - apps/server/src/logger.test.ts
  - apps/server/src/db/seedPersistence.test.ts
  - apps/web/src/pages/Overview/runtimeIsolation.test.tsx
  - apps/server/src/routes/display-story.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/server/src/routes/device-group-management.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/server/src/routes/defaultPlaybackProfileCompatibility.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/server/src/services/effectiveRotationCache.test.ts
  - apps/server/src/services/playbackProfileService.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
-->