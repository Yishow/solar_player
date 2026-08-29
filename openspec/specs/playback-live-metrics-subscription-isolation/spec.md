# playback-live-metrics-subscription-isolation Specification

## Purpose

TBD - created by archiving change 'optimize-playback-live-metrics-subscriptions'. Update Purpose after archive.

## Requirements

### Requirement: Playback live metrics consumers subscribe through selector-scoped shared state

The system SHALL expose shared playback live metrics state that lets web runtime consumers subscribe to selected live metric readings or socket connection state without depending on whole-snapshot object identity. A consumer bound to one selected metric SHALL update when that selected value changes, and SHALL NOT rebuild solely because an unrelated metric in the shared snapshot changed.

#### Scenario: Selected metric update refreshes the subscribing consumer

- **WHEN** a playback consumer subscribes to `todayGeneration` and the next `liveMetrics:update` changes only `todayGeneration`
- **THEN** the subscribing consumer updates to the new `todayGeneration` value
- **AND** the update uses the same shared live metrics state written from the socket event

##### Example: one selected metric changes

| Selected metric | Previous value | Next value | Unrelated metric change | Expected consumer update |
| --------------- | -------------- | ---------- | ----------------------- | ------------------------ |
| `todayGeneration` | `812.4` | `813.0` | none | update |
| `todayGeneration` | `812.4` | `812.4` | `phaseRPower` changed | no update |

#### Scenario: Connection-state selector updates independently from metrics

- **WHEN** the shared live metrics state receives a socket connection-state change while the selected metric readings stay the same
- **THEN** a consumer subscribed only to connection state updates to the new connection status
- **AND** a consumer subscribed only to unchanged metric readings remains stable

<!-- @trace
source: optimize-playback-live-metrics-subscriptions
updated: 2026-07-05
code:
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/services/socket.ts
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - apps/web/src/pages/Solar/runtimeContent.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/FactoryCircuit/runtimeContent.tsx
  - apps/web/src/hooks/liveMetricsStore.ts
  - apps/web/src/hooks/useLiveMetrics.ts
tests:
  - apps/web/src/pages/Solar/cardFamily.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/hooks/liveMetricsStore.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/displayPageIconRendering.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/Overview/runtimeIsolation.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/pages/Overview/cardVisibility.test.ts
  - apps/web/src/pages/FactoryCircuit/runtimeIsolation.test.tsx
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/Overview/render.test.ts
  - apps/server/src/services/displayStoryTopicNames.test.ts
  - apps/web/src/pages/Solar/runtimeIsolation.test.tsx
-->

---
### Requirement: Legacy full-snapshot consumers remain supported during selector rollout

The system SHALL preserve the existing full-snapshot playback consumer contract while selector-scoped subscriptions are introduced. Callers that still use `useLiveMetrics()` SHALL continue to receive the latest snapshot, connection state, derived `isSocketConnected`, and `lastUpdatedAt` values from the same shared runtime source.

#### Scenario: Existing full-snapshot hook reads the latest shared state

- **WHEN** the shared live metrics state receives a newer `liveMetrics:update` snapshot and a caller uses `useLiveMetrics()`
- **THEN** the caller receives the latest snapshot and derived connection fields without needing to opt into selector-scoped hooks
- **AND** no additional socket client is created for that caller

#### Scenario: Existing full-snapshot hook reflects connection degradation

- **WHEN** the socket connection moves from `connected` to `disconnected` while the last snapshot remains cached
- **THEN** `useLiveMetrics()` continues to expose the last known snapshot
- **AND** it reports the degraded connection state through the existing connection-related fields

<!-- @trace
source: optimize-playback-live-metrics-subscriptions
updated: 2026-07-05
code:
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/services/socket.ts
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - apps/web/src/pages/Solar/runtimeContent.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/FactoryCircuit/runtimeContent.tsx
  - apps/web/src/hooks/liveMetricsStore.ts
  - apps/web/src/hooks/useLiveMetrics.ts
tests:
  - apps/web/src/pages/Solar/cardFamily.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/hooks/liveMetricsStore.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/displayPageIconRendering.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/Overview/runtimeIsolation.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/pages/Overview/cardVisibility.test.ts
  - apps/web/src/pages/FactoryCircuit/runtimeIsolation.test.tsx
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/Overview/render.test.ts
  - apps/server/src/services/displayStoryTopicNames.test.ts
  - apps/web/src/pages/Solar/runtimeIsolation.test.tsx
-->

---
### Requirement: Playback live metrics state is site-scoped before selector isolation

The shared playback live metrics state SHALL be initialized and updated from a snapshot that has already been filtered to the authenticated playback context's effective site plus permitted global metrics. Selector-level render isolation MUST NOT be used as a security or site-isolation boundary.

#### Scenario: CL and KN share the same semantic metric key
- **WHEN** both sites have a `realTimePower` reading and a CL playback client connects
- **THEN** the CL client's shared live metrics state contains the CL `realTimePower` reading
- **AND** it does not retain or expose the KN `realTimePower` reading under the same semantic key

#### Scenario: Reconnect performs a fresh scoped bootstrap
- **WHEN** a playback socket reconnects after device context or metric updates
- **THEN** the client refreshes from the server-authoritative scoped snapshot before applying subsequent live updates
- **AND** stale readings from another site SHALL NOT survive the reconnect merge

---
### Requirement: Live metric subscriptions derive from effective widget bindings

Playback live metric subscription requirements SHALL be derived from the page's effective widget binding plan and each selected metric's registered live dependencies. The runtime MUST NOT subscribe to a fixed page-wide metric list that ignores published binding changes.

#### Scenario: Widget binding changes to a different metric
- **WHEN** a published widget changes from metric A to compatible metric B
- **THEN** the next effective subscription plan includes B and B's live dependencies
- **AND** A is no longer retained as a required subscription solely because it was the widget's previous default


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
### Requirement: Cross-site binding delivery is least-data

When a trusted published binding explicitly selects a metric from a site different from the Device Context Site Scope, the server SHALL deliver only the foreign-scope metric identities required by that session's effective bindings and dependencies. The session MUST NOT receive the foreign site's complete live snapshot or join a broad foreign-site stream solely because one binding crosses scope.

#### Scenario: CL display has one KN widget
- **WHEN** a CL playback session contains one explicit KN `realTimePower` binding and all other bindings inherit CL
- **THEN** the session receives the authorized KN `realTimePower` updates required by that binding
- **AND** unrelated KN circuit, solar-zone, and KPI metrics are not added to the session snapshot or update stream

#### Scenario: Cross-site binding is removed
- **WHEN** the published page no longer contains the KN binding and the playback context refreshes
- **THEN** the session's effective subscription plan drops the KN dependency
- **AND** subsequent KN updates are no longer delivered to that session

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