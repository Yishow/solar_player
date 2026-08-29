# display-editor-source-connection-panel Specification

## Purpose

TBD - created by archiving change 'add-display-editor-source-connection-panel'. Update Purpose after archive.

## Requirements

### Requirement: Display editor exposes a right-side source connection tab

The system SHALL expose a `來源連接` tab in the right-side panel of `/display-pages/editor`. The tab SHALL preserve the current selected editor item and SHALL summarize how that item is connected to its visual or content source.

#### Scenario: Operator selects a hero media region

- **WHEN** the operator selects a hero media region and opens `來源連接`
- **THEN** the panel shows the current source mode
- **AND** the panel identifies whether the region uses seed default, managed asset, direct source, or fallback source
- **AND** switching between `屬性` and `來源連接` does not change the selected region

##### Example: Overview hero uses seed default source

- **GIVEN** the Overview hero media is selected
- **AND** its source mode is `seed-default`
- **WHEN** the operator opens `來源連接`
- **THEN** the panel shows that the current source is the seed/default Overview hero asset
- **AND** it offers replacement actions only when a managed asset replacement path is available


<!-- @trace
source: add-display-editor-source-connection-panel
updated: 2026-05-27
code:
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - packages/shared/src/shellDecorations.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - packages/shared/src/types.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/components/workspaceSurface.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/server/src/db/seed.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
tests:
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/server/src/routes/images.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
-->

---
### Requirement: Source connection tab provides replacement and navigation actions

The source connection tab SHALL provide source-oriented actions for eligible selections, including replacing from gallery, opening the integrated asset library workspace, restoring seed/default source, and returning to `屬性` for presentation controls. Actions whose implementation depends on another pending capability SHALL be disabled with an explanation instead of hidden silently.

#### Scenario: Operator opens gallery replacement for a card icon

- **WHEN** a selected card icon supports managed asset replacement
- **THEN** `來源連接` offers a gallery replacement action
- **AND** opening the asset library stays within `/display-pages/editor`
- **AND** returning from the asset library preserves the original editor selection context

##### Example: Unsupported registry icon explains why replacement is unavailable

- **GIVEN** a selected icon still only supports a built-in registry key
- **WHEN** the operator opens `來源連接`
- **THEN** the replacement action is disabled
- **AND** the panel explains that managed visual replacement is not yet available for that source type


<!-- @trace
source: add-display-editor-source-connection-panel
updated: 2026-05-27
code:
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - packages/shared/src/shellDecorations.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - packages/shared/src/types.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/components/workspaceSurface.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/server/src/db/seed.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
tests:
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/server/src/routes/images.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
-->

---
### Requirement: Source connection tab keeps presentation controls in Properties

The source connection tab SHALL NOT duplicate image effect, opacity, fade, blur, geometry, layout, or text controls. It SHALL show read-only summaries of active presentation settings when those settings apply to the selected item and SHALL provide a jump back to `屬性` when the operator needs to edit those settings.

#### Scenario: Operator inspects media with edge fade and blur

- **WHEN** the selected media region has edge fade, blur, opacity, or fit mode settings
- **THEN** `來源連接` shows a concise read-only summary of those presentation settings
- **AND** the editable controls remain in `屬性`
- **AND** the panel provides an action to return to `屬性`

##### Example: Blur summary does not create duplicate controls

- **GIVEN** an Images main stage media region has blur enabled
- **WHEN** the operator opens `來源連接`
- **THEN** the panel summarizes the blur state
- **AND** no editable blur amount input is rendered in `來源連接`

<!-- @trace
source: add-display-editor-source-connection-panel
updated: 2026-05-27
code:
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - packages/shared/src/shellDecorations.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - packages/shared/src/types.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/components/workspaceSurface.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/server/src/db/seed.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
tests:
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/server/src/routes/images.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
-->

---
### Requirement: Source Connection remains a visual/content source surface

The existing `來源連接` / Source Connection panel SHALL continue to describe media, icon, asset, direct-source, seed/default, and fallback content connections. Runtime metric selection SHALL be authored in the dedicated Data inspector instead of overloading Source Connection with MQTT or semantic metric controls.

#### Scenario: Operator selects a hero media region
- **WHEN** the operator opens Source Connection for a hero media region
- **THEN** the panel continues to show the media/content source relationship
- **AND** it does not present a metric picker for that visual source

#### Scenario: Operator selects a metric-backed KPI
- **WHEN** a selected KPI supports both visual/content properties and a runtime metric binding
- **THEN** metric selection is available from the Data inspector
- **AND** any Source Connection content remains limited to the KPI's visual/content source concerns

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