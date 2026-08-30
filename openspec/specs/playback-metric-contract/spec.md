# playback-metric-contract Specification

## Purpose

TBD - created by archiving change 'playback-metric-contract-single-source'. Update Purpose after archive.

## Requirements

### Requirement: Shared package owns Overview and Solar playback metric contract

The system SHALL define a single shared playback metric contract for the `overview` and `solar` pages that is the authoritative source for (1) metric vocabulary and default bindings used to normalize legacy pages, (2) gate/dependency requirements used by readiness and freshness, and (3) display `sourceClass` metadata for registered metric keys. For a page that has explicit saved widget data bindings, those bindings SHALL be authoritative for which registered metric each widget actually displays, and runtime subscription keys SHALL be derived from the effective bindings plus their registered dependencies rather than from a parallel page-local metric-key list. Page modules and server story builders SHALL consume the shared contract and binding resolver instead of maintaining their own authoritative lists.

#### Scenario: Contract exposes three layers for Overview

- **WHEN** a caller resolves the playback metric contract for page key `overview`
- **THEN** the contract includes gate requirements drawn from the shared display metric requirements for `overview`
- **AND** it includes default metric bindings suitable for normalizing a legacy Overview configuration
- **AND** it includes display sourceClass metadata for registered Overview metric keys
- **AND** an explicit saved widget binding can select a different compatible registered metric without creating a page-local static contract

#### Scenario: Contract exposes three layers for Solar

- **WHEN** a caller resolves the playback metric contract for page key `solar`
- **THEN** the contract includes gate requirements drawn from the shared display metric requirements for `solar`
- **AND** it includes default metric bindings suitable for normalizing a legacy Solar configuration
- **AND** it includes display sourceClass metadata for registered Solar metric keys

##### Example: Solar effective subscription follows the saved binding

- **GIVEN** Solar registers `selfConsumptionRatio` as a derived metric with dependency keys
- **AND** a saved Solar widget binding selects `selfConsumptionRatio`
- **WHEN** runtime subscription requirements are resolved for that page
- **THEN** the effective subscription includes the live dependency keys required by `selfConsumptionRatio`
- **AND** display sourceClass for `selfConsumptionRatio` remains `derived-metric`
- **AND** a different compatible saved widget binding would produce its own effective subscription requirements without editing a page-local key array


<!-- @trace
source: add-widget-data-bindings
updated: 2026-08-30
code:
  - apps/server/src/routes/display-card-data.ts
  - solar_mqtt_go/internal/discovery/discovery.go
  - solar_mqtt_go/internal/mosquitto/proc_windows.go
  - solar_mqtt_go/internal/tray/run.go
  - solar_mqtt_go/internal/tray/instance_windows.go
  - start.sh
  - packages/shared/src/displayCardData.ts
  - solar_mqtt_go/internal/webui/web/js/config-view.js
  - apps/server/src/services/MetricHistoryRetentionService.ts
  - solar_mqtt_go/build.ps1
  - solar_mqtt_go/internal/display/display.go
  - apps/web/src/hooks/liveMetricsStore.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - solar_mqtt_go/internal/mosquitto/mosquitto.go
  - .agents/skills/openspec-apply-change/SKILL.md
  - packages/shared/src/metricScope.ts
  - packages/shared/src/playbackMetricContract.ts
  - .agents/skills/openspec-explore/SKILL.md
  - solar_mqtt_go/commands.go
  - apps/server/src/services/displayReadinessService.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - solar_mqtt_go/internal/tray/app.go
  - packages/shared/src/displayOps.ts
  - solar_mqtt_go/assets/tray.ico
  - apps/server/src/server-startup.ts
  - solar_mqtt_go/internal/webui/web/js/factory-view.js
  - .agents/skills/openspec-propose/SKILL.md
  - apps/server/src/routes/metrics.ts
  - apps/server/src/realtime/SocketService.ts
  - solar_mqtt_go/internal/webui/web/styles/layout.css
  - packages/shared/src/index.ts
  - apps/server/src/services/MetricsAccumulatorService.ts
  - apps/server/src/services/SnapshotWriterService.ts
  - apps/web/src/pages/DataSourceSettings/index.tsx
  - solar_mqtt_go/internal/anomaly/anomaly.go
  - apps/server/src/db/migrations/035_scoped_metric_identity.sql
  - solar_mqtt_go/internal/webui/web/styles/theme.css
  - solar_mqtt_go/internal/webui/web/styles/forms.css
  - solar_mqtt_go/go.sum
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - .agents/skills/openspec-archive-change/SKILL.md
  - apps/server/src/services/displayDataPreviewService.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - solar_mqtt_go/internal/mosquitto/proc_unix.go
  - apps/web/src/services/socket.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/server/src/testing/deviceContextTestSupport.ts
  - apps/server/src/services/displayValueOverrideService.ts
  - solar_mqtt_go/internal/webui/web/vendor/mqtt.min.js
  - apps/server/src/services/displayPreviewContextService.ts
  - apps/web/src/hooks/useLiveMetrics.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/server/src/services/displayRotationService.ts
  - solar_mqtt_go/internal/config/config.go
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - solar_mqtt_go/go.mod
  - solar_mqtt_go/internal/mqttbus/bus.go
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - solar_mqtt_go/internal/service/service.go
  - .agents/skills/openspec-sync-specs/SKILL.md
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.tsx
  - solar_mqtt_go/build.sh
  - solar_mqtt_go/internal/heartbeat/heartbeat.go
  - apps/web/src/pages/FactoryCircuit/runtimeContent.tsx
  - scripts/deploy.test.mjs
  - apps/web/src/pages/Solar/viewModel.ts
  - apps/web/src/pages/MqttSettings/factoryTopicSites.ts
  - apps/server/src/app.ts
  - apps/web/src/pages/Solar/runtimeContent.tsx
  - apps/server/src/db/migrations/036_remove_managed_solar_topic_mappings.sql
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - apps/server/src/db/scopedMetricMigration.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - apps/server/src/db/seed.ts
  - packages/shared/src/displayReadiness.ts
  - solar_mqtt_go/internal/tray/instance_unix.go
  - apps/server/src/services/displayOpsService.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - solar_mqtt_go/internal/webui/web/styles/components.css
  - solar_mqtt_go/internal/webui/web/index.html
  - packages/shared/src/displayStory.ts
  - solar_mqtt_go/internal/tray/run_nocgo.go
  - solar_mqtt_go/start.ps1
  - solar_mqtt_go/internal/storage/storage.go
  - apps/server/src/services/displayCardDataService.ts
  - apps/server/src/routes/data-source.ts
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/metrics/liveMetrics.ts
  - apps/server/src/routes/metrics-history.ts
  - solar_mqtt_go/internal/webui/web/js/local-config-view.js
  - solar_mqtt_go/internal/webui/webui.go
  - start.ps1
  - apps/server/src/services/MockMetricsFeedService.ts
  - docs/runbooks/pc-server-deploy.md
  - solar_mqtt_go/internal/schedule/schedule.go
  - solar_mqtt_go/internal/webui/web/styles.css
  - apps/server/src/services/displayStoryService.ts
  - .agents/skills/.openspec-target
  - packages/shared/src/displayPageFreshness.ts
  - apps/server/src/mqtt/ManagedSourceAdapter.ts
  - solar_mqtt_go/main.go
  - apps/server/src/mqtt/SolarSourceAdapter.ts
  - apps/server/src/services/DailySummaryService.ts
  - apps/server/src/services/MetricResolver.ts
  - apps/server/src/services/playbackMetricAuthorizationService.ts
  - solar_mqtt_go/start.sh
  - solar_mqtt_go/internal/scraper/scraper.go
  - apps/web/src/services/api.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - solar_mqtt_go/internal/webui/web/js/app.js
  - solar_mqtt_go/assets/assets.go
  - apps/server/src/routes/display-pages.ts
  - .env.example
  - solar_mqtt_go/internal/service/control.go
  - apps/server/src/db/migrate.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - packages/shared/src/widgetDataBinding.ts
  - solar_mqtt_go/internal/tray/logfile.go
  - solar_mqtt_go/internal/webui/web/js/mqtt-manager.js
tests:
  - packages/shared/src/displayPageFreshness.test.ts
  - solar_mqtt_go/internal/storage/storage_test.go
  - apps/server/src/routes/management-auth.test.ts
  - apps/web/src/pages/DataSourceSettings/viewModel.test.ts
  - apps/web/src/pages/Solar/runtimeIsolation.test.tsx
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - solar_mqtt_go/internal/tray/instance_windows_test.go
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/hooks/displayPageDraftSession.test.ts
  - apps/server/src/services/carbonReductionConsistency.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - solar_mqtt_go/main_test.go
  - solar_mqtt_go/internal/tray/logfile_test.go
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/web/src/pages/shared/widgetDataBinding.test.ts
  - apps/web/src/pages/shared/playbackMetricContract.test.ts
  - solar_mqtt_go/internal/tray/app_test.go
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/server/src/routes/metrics-history.test.ts
  - apps/server/src/services/MetricResolver.test.ts
  - apps/server/src/db/migrations/clKnGenerationSummaryTopics.test.ts
  - apps/server/src/services/MockMetricsFeedService.test.ts
  - apps/web/src/pages/MqttSettings/loadModel.test.ts
  - solar_mqtt_go/internal/scraper/scraper_test.go
  - apps/server/src/services/MetricHistoryRetentionService.test.ts
  - packages/shared/src/displayStory.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/Overview/runtimeIsolation.test.tsx
  - apps/server/src/routes/display-preview-context.test.ts
  - solar_mqtt_go/assets/assets_test.go
  - apps/web/src/pages/CircuitSettings/viewModel.test.ts
  - apps/server/src/app.test.ts
  - solar_mqtt_go/internal/webui/webui_test.go
  - apps/server/src/services/displayStoryTopicNames.test.ts
  - solar_mqtt_go/internal/heartbeat/heartbeat_test.go
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/server/src/services/DailySummaryService.test.ts
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.test.tsx
  - apps/server/src/services/factoryGenerationAggregateService.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.test.ts
  - solar_mqtt_go/internal/mqttbus/control_contract_test.go
  - apps/server/src/routes/display-card-data.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - solar_mqtt_go/internal/display/display_test.go
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - solar_mqtt_go/internal/service/control_contract_test.go
  - apps/web/src/hooks/liveMetricsStore.test.ts
  - apps/server/src/routes/display-data-preview.test.ts
  - apps/web/src/pages/Overview/render.test.ts
  - solar_mqtt_go/internal/mosquitto/mosquitto_test.go
  - apps/server/src/routes/display-readiness.test.ts
  - solar_mqtt_go/internal/config/config_test.go
  - apps/web/src/pages/FactoryCircuit/runtimeIsolation.test.tsx
  - packages/shared/src/metricScope.test.ts
  - apps/server/src/db/migrations/scopeLiveMetricsMigration.test.ts
  - solar_mqtt_go/internal/schedule/schedule_test.go
  - apps/web/src/pages/DisplayPagesEditor/dataBindingCapability.test.ts
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - solar_mqtt_go/internal/config/applyset_test.go
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/web/src/services/api.test.ts
  - solar_mqtt_go/build_test.go
  - apps/server/src/services/displayReadinessService.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/server/src/services/displayStoryService.test.ts
  - solar_mqtt_go/internal/mqttbus/bus_test.go
  - solar_mqtt_go/internal/service/service_test.go
  - apps/server/src/realtime/SocketService.test.ts
  - solar_mqtt_go/internal/discovery/discovery_test.go
  - apps/server/src/services/playbackMetricAuthorizationService.test.ts
  - apps/server/src/mqtt/SolarSourceAdapter.test.ts
  - apps/server/src/services/SnapshotWriterService.test.ts
  - apps/server/src/services/managementSessionService.test.ts
  - apps/server/src/services/MetricsAccumulatorService.test.ts
  - solar_mqtt_go/internal/anomaly/anomaly_test.go
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/server/src/routes/device-context-playback.test.ts
  - apps/server/src/routes/data-source.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/server/src/services/managementPasswordService.test.ts
-->

---
### Requirement: Derived and aggregate metrics MUST NOT be labeled mqtt-live

For Overview and Solar display bindings covered by the playback metric contract, the system SHALL assign `sourceClass` values that match the real resolution path. Metrics that are derived, aggregated from factory summaries, or cumulative counters SHALL NOT use `sourceClass` `mqtt-live`.

#### Scenario: todayGeneration is not mqtt-live

- **WHEN** Overview or Solar resolves display metadata for metric key `todayGeneration`
- **THEN** the sourceClass is `derived-metric`
- **AND** the sourceClass is not `mqtt-live`

#### Scenario: todayCo2Reduction is not mqtt-live

- **WHEN** Overview or Solar resolves display metadata for metric key `todayCo2Reduction`
- **THEN** the sourceClass is `derived-metric`
- **AND** the sourceClass is not `mqtt-live`

#### Scenario: Direct MQTT metrics remain mqtt-live

- **WHEN** Overview or Solar resolves display metadata for metric key `realTimePower` or Solar resolves `systemEfficiency`
- **THEN** the sourceClass is `mqtt-live`

##### Example: Overview KPI sourceClass map

| metricKey | sourceClass |
| --------- | ----------- |
| realTimePower | mqtt-live |
| todayGeneration | derived-metric |
| totalGeneration | cumulative-counter |
| todayCo2Reduction | derived-metric |
| totalCo2Reduction | cumulative-counter |

##### Example: Solar KPI sourceClass map

| metricKey | sourceClass |
| --------- | ----------- |
| realTimePower | mqtt-live |
| todayGeneration | derived-metric |
| selfConsumptionRatio | derived-metric |
| todayCo2Reduction | derived-metric |
| totalCo2Reduction | cumulative-counter |
| systemEfficiency | mqtt-live |

<!-- @trace
source: playback-metric-contract-single-source
updated: 2026-07-23
code:
  - apps/web/src/pages/Solar/viewModel.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - packages/shared/src/playbackMetricContract.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - packages/shared/src/index.ts
  - apps/web/src/pages/Solar/runtimeContent.tsx
tests:
  - apps/server/src/services/displayStoryService.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/web/src/pages/shared/playbackMetricContract.test.ts
-->

---
### Requirement: Runtime subscription keys are exported for Overview and Solar consumers

The shared package SHALL export a stable resolver for Overview and Solar runtime subscription metric keys. Unknown page keys SHALL yield an empty key list without throwing.

#### Scenario: Overview runtime keys cover KPI and phase bindings

- **WHEN** the runtime key resolver is called with `overview`
- **THEN** the result includes `realTimePower`, `todayGeneration`, `totalGeneration`, `todayCo2Reduction`, and `totalCo2Reduction`
- **AND** the result includes the Overview phase metric keys required by the Overview value subtree (`phaseRCurrent`, `phaseRPower`, `phaseRVoltage`, `phaseSCurrent`, `phaseSPower`, `phaseSVoltage`, `phaseTCurrent`, `phaseTPower`, `phaseTVoltage`)

#### Scenario: Solar runtime keys cover Solar value subtree reads

- **WHEN** the runtime key resolver is called with `solar`
- **THEN** the result includes `realTimePower`, `systemEfficiency`, `selfConsumptionRatio`, `todayGeneration`, `todayCo2Reduction`, and `totalCo2Reduction`
- **AND** if the Solar client value path reads `selfConsumptionEnergy` or `consumptionEnergy` from the live snapshot, those keys are included
- **AND** if the Solar client value path never reads those energy keys, the contract documents them as server-only dependencies and the runtime list omits them

#### Scenario: Unknown page key is empty and safe

- **WHEN** the runtime key resolver is called with a page key that is not `overview` or `solar` under this contract scope
- **THEN** the resolver returns an empty list
- **AND** the resolver does not throw

<!-- @trace
source: playback-metric-contract-single-source
updated: 2026-07-23
code:
  - apps/web/src/pages/Solar/viewModel.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - packages/shared/src/playbackMetricContract.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - packages/shared/src/index.ts
  - apps/web/src/pages/Solar/runtimeContent.tsx
tests:
  - apps/server/src/services/displayStoryService.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/web/src/pages/shared/playbackMetricContract.test.ts
-->

---
### Requirement: Materialized upstream dependencies remain explicit in the contract

When Overview or Solar gate requirements depend on upstream factory generation keys that the server materializes into canonical live metrics before browser consumption, the shared contract SHALL still expose those upstream dependency keys on the gate requirement layer even when the runtime subscription layer only lists the canonical materialized keys.

#### Scenario: todayGeneration gate keeps factory generation dependencies

- **WHEN** the gate requirement layer is resolved for Overview or Solar `todayGeneration`
- **THEN** dependency keys include the factory generation summary keys used to derive canonical generation
- **AND** the runtime subscription layer SHALL list only `todayGeneration` for that KPI when the browser reads only the materialized canonical metric

##### Example: Gate vs runtime for todayGeneration

- **GIVEN** server aggregate materializes CL and KN summaries into `todayGeneration`
- **WHEN** Overview runtime subscribes for value rendering
- **THEN** runtime keys include `todayGeneration`
- **AND** gate requirements for `todayGeneration` still list factory generation dependency keys for readiness evaluation

<!-- @trace
source: playback-metric-contract-single-source
updated: 2026-07-23
code:
  - apps/web/src/pages/Solar/viewModel.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - packages/shared/src/playbackMetricContract.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - packages/shared/src/index.ts
  - apps/web/src/pages/Solar/runtimeContent.tsx
tests:
  - apps/server/src/services/displayStoryService.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/web/src/pages/shared/playbackMetricContract.test.ts
-->

---
### Requirement: Playback metric keys are semantic and site-independent

The shared playback metric contract SHALL describe semantic metric keys independently from factory identity. CL and KN versions of the same measurement SHALL use the same semantic `metricKey` and SHALL be distinguished by resolved metric scope instead of site names embedded in the key.

#### Scenario: Same KPI is rendered at both sites
- **WHEN** Overview at CL and Overview at KN both render real-time power
- **THEN** both page contracts use the semantic metric key `realTimePower`
- **AND** runtime resolution distinguishes the readings by `cl` and `kn` scope

#### Scenario: Factory Circuit slot exists at both sites
- **WHEN** CL and KN both expose a stamping power slot
- **THEN** the shared metric vocabulary uses one stamping semantic metric key for that measurement family
- **AND** the contract SHALL NOT require a `guanyin`, `jungli`, `cl`, or `kn` suffix inside that semantic key to prevent collisions

---
### Requirement: Runtime subscription contracts carry semantic keys, not raw topics

Runtime subscription key lists SHALL remain lists of semantic metric keys. MQTT topic selection and site routing SHALL occur upstream of the playback contract.

#### Scenario: MQTT topic changes without a page contract change
- **WHEN** the MQTT topic that supplies a semantic metric is changed while the metric identity and meaning remain the same
- **THEN** the playback metric contract remains unchanged
- **AND** playback consumers continue to subscribe by semantic metric key

---
### Requirement: Derived metric dependencies and source classification come from the registry

For a metric registered as derived, the shared playback metric contract SHALL obtain its derived source classification, dependency graph, output unit/precision metadata, and runtime dependency keys from the active Derived Metric Registry definition instead of duplicating those details in page-local or static parallel lists.

#### Scenario: Registered derived metric is selected by a widget
- **WHEN** an effective widget binding selects a registered derived metric
- **THEN** the playback contract identifies it as `derived-metric`
- **AND** readiness/live subscription dependency resolution uses the active registry dependencies
- **AND** the page does not need a second hardcoded dependency array for that metric

#### Scenario: Derived definition dependencies change after valid management update
- **WHEN** an authorized registry edit changes the dependencies of a derived metric and the new definition is activated
- **THEN** subsequent effective playback contracts use the new dependency set
- **AND** stale page-local dependency metadata cannot remain authoritative

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