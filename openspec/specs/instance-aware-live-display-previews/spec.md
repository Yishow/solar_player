# instance-aware-live-display-previews Specification

## Purpose

TBD - created by archiving change 'key-live-display-previews-by-page-instance'. Update Purpose after archive.

## Requirements

### Requirement: Resolve live display preview state by page instance

The system SHALL resolve live display preview state by page instance identity so duplicate instances of the same template can expose different live preview results.

#### Scenario: Duplicate template instances render different live previews

- **WHEN** two active display page instances share the same template but have different live configurations
- **THEN** the preview catalog SHALL keep separate live preview states for each instance
- **AND** each consumer SHALL read the state that matches the selected page instance

##### Example: Two overview instances show different live hero content

- **GIVEN** `overview` and `overview-2` are both active and published
- **AND** their live region payloads differ
- **WHEN** a management surface requests previews for both instances
- **THEN** the preview catalog returns one state for `overview` and another state for `overview-2`
- **AND** the two preview surfaces do not reuse the same resolved config object


<!-- @trace
source: key-live-display-previews-by-page-instance
updated: 2026-05-22
code:
  - scripts/dev.test.mjs
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/hooks/useImagesAutoplay.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/server/src/server.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/server/src/server-startup.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - scripts/dev-lib.mjs
  - scripts/dev.mjs
  - packages/shared/src/displayPageCardRail.ts
  - packages/shared/src/cloneValue.ts
  - apps/web/src/app/playbackRouteMeta.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
tests:
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - packages/shared/test/displayPageCardRail.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/app/playbackRouteMeta.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
-->

---
### Requirement: Keep template renderers separate from instance state lookup

The system SHALL keep template renderer selection separate from preview state lookup so renderer reuse does not cause instance-level preview aliasing.

#### Scenario: Instance lookup fails without borrowing another instance preview

- **WHEN** a consumer has a template renderer but the requested page instance has no resolved preview state yet
- **THEN** the consumer SHALL render the instance-specific fallback state
- **AND** it SHALL NOT borrow the ready preview state of another instance that shares the same template

<!-- @trace
source: key-live-display-previews-by-page-instance
updated: 2026-05-22
code:
  - scripts/dev.test.mjs
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/hooks/useImagesAutoplay.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/server/src/server.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/server/src/server-startup.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - scripts/dev-lib.mjs
  - scripts/dev.mjs
  - packages/shared/src/displayPageCardRail.ts
  - packages/shared/src/cloneValue.ts
  - apps/web/src/app/playbackRouteMeta.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
tests:
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - packages/shared/test/displayPageCardRail.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/app/playbackRouteMeta.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
-->

---
### Requirement: Preview request windows remain stable under order churn

The live display preview catalog SHALL treat requested page keys as a request set for loading priority. Reordering the same requested page keys or including duplicate entries SHALL NOT create a different request-window identity, while adding or removing a page key MUST create a different identity.

#### Scenario: Same requested pages use one request identity

- **WHEN** a management preview surface requests live previews for the same page keys in a different visual order
- **THEN** the preview catalog request identity remains unchanged
- **AND** the surface avoids treating carousel order churn as a new data request

##### Example: ordered and duplicated keys normalize to the same identity

| Requested Page Keys | Expected Identity Match |
| ----- | ----- |
| `solar, overview, solar` compared with `overview, solar` | same identity |
| `overview, solar` compared with `overview, images` | different identity |

<!-- @trace
source: harden-performance-regression-guards
updated: 2026-06-14
code:
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - apps/web/src/pages/ImageManagement/loadModel.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/shared/displayPageRouteWarmup.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/CircuitSettings/loadModel.ts
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/pages/DeviceStatus/loadModel.ts
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/PlaybackSettings/loadModel.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
tests:
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/DisplayPagesEditor/activeSurfaceRecompute.test.ts
  - apps/web/src/pages/DeviceStatus/index.test.tsx
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/displayRuntimeHookOrder.test.ts
-->

---
### Requirement: Metric-backed preview state is keyed by page instance and Preview Context

When live display previews include resolved metric data, preview identity SHALL distinguish the selected page instance and trusted Preview Context. Cached or shared preview state MUST NOT treat two different data contexts as equivalent merely because they render the same page instance or template.

#### Scenario: One page instance is previewed for CL and KN
- **WHEN** the same Overview instance is previewed in CL context and KN context
- **THEN** the preview catalog keeps distinct resolved data states for the two contexts
- **AND** the KN preview does not reuse CL values, freshness, or provenance

#### Scenario: Two page instances share one Preview Context
- **WHEN** `overview` and `overview-2` are both previewed for the same CL context but have different published widget bindings
- **THEN** each instance resolves and caches its own effective binding plan
- **AND** changing one instance's binding does not mutate the other instance's preview data state

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