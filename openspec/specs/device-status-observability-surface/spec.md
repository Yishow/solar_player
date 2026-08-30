# device-status-observability-surface Specification

## Purpose

TBD - created by archiving change 'complete-device-status-observability-surface'. Update Purpose after archive.

## Requirements

### Requirement: Present device status as a summary-first observability dashboard

The system SHALL present `Device Status` as a summary-first observability dashboard. It SHALL align with standard management surface positioning without overlapping the page title, SHALL support internal vertical scrolling within the info region, and SHALL expose Server Authoritative App Time and Time Sync Status within the Device Information section.

#### Scenario: Operator opens device status during an incident

- **WHEN** the operator opens `Device Status` during a degraded runtime incident
- **THEN** the page SHALL surface host health, display-operations health, and next-action guidance before deep detail sections
- **AND** the top of main content panels SHALL NOT overlap the page title

#### Scenario: Operator inspects server time and sync status

- **WHEN** the operator views the Device Information section in `Device Status`
- **THEN** it SHALL display the formatted Server Authoritative Time
- **AND** it SHALL display the current Time Sync Status indicator


<!-- @trace
source: remove-header-sync-status-indicator
updated: 2026-08-31
code:
  - apps/web/src/pages/DeviceStatus/device.css
  - packages/shared/src/derivedMetric.ts
  - apps/web/src/services/api.ts
  - apps/server/src/services/calculationSettingsService.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - apps/server/src/db/migrations/038_derived_metric_site_scopes.sql
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - packages/shared/src/displayStory.ts
  - apps/web/src/pages/DeviceStatus/layout.ts
  - apps/web/src/pages/DataSourceSettings/index.tsx
  - apps/server/src/services/derivedMetricExpression.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/server/src/services/displayDataPreviewService.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/server/src/services/playbackMetricAuthorizationService.ts
  - apps/server/src/services/derivedMetricRegistryService.ts
  - packages/shared/src/index.ts
  - packages/shared/src/displayCardData.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/server/src/app.ts
  - apps/server/src/db/migrations/037_derived_metric_registry.sql
  - apps/web/src/pages/DataSourceSettings/DerivedMetricRegistryPanel.tsx
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/routes/calculation-settings.ts
  - apps/server/src/services/MockMetricsFeedService.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/server/src/services/displayCardDataService.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/server/src/services/derivedMetricCatalogService.ts
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.tsx
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/server/src/routes/derived-metrics.ts
tests:
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - apps/server/src/services/factoryGenerationAggregateService.test.ts
  - apps/server/src/services/carbonReductionConsistency.test.ts
  - apps/server/src/routes/derived-metrics.test.ts
  - apps/server/src/services/playbackMetricAuthorizationService.test.ts
  - apps/server/src/services/MockMetricsFeedService.test.ts
  - apps/web/src/pages/DeviceStatus/layout.test.ts
  - apps/server/src/services/derivedMetricExpression.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/server/src/mqtt/SolarSourceAdapter.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - apps/server/src/services/derivedMetricRegistryService.test.ts
  - apps/server/src/routes/display-story.test.ts
  - packages/shared/src/derivedMetric.test.ts
  - apps/server/src/routes/calculation-settings.test.ts
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/routes/data-source.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/server/src/db/migrations/derivedMetricRegistry.test.ts
  - apps/server/src/db/migrations/calculationSettings.test.ts
  - apps/web/src/pages/DataSourceSettings/DerivedMetricRegistryPanel.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.test.tsx
  - apps/server/src/services/sustainabilityStoryService.test.ts
-->

---
### Requirement: Show safe diagnostics results and host-level escalation guidance together

The system SHALL show safe diagnostics results and host-level escalation guidance together in `Device Status`.

#### Scenario: Operator triggers a safe diagnostics action

- **WHEN** the operator triggers a safe diagnostics action from `Device Status`
- **THEN** the page SHALL show the action's safe scope, result context, and truthful outcome in a first-class result surface

#### Scenario: Operator reaches an unsupported in-app control path

- **WHEN** the requested action requires host-level intervention instead of in-app execution
- **THEN** the page SHALL show explicit host-level escalation guidance
- **AND** it SHALL NOT imply that the application executed the unsupported control


<!-- @trace
source: complete-device-status-observability-surface
updated: 2026-05-29
code:
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/SlideshowPreview/preview.css
  - docs/goal.md
  - data/server-runtime.lock.json
  - apps/web/src/pages/DisplayPagesEditor/rotationPreview.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/Overview/assets/overview-leaf-reference-crop.png
  - apps/web/src/pages/EnergyHistory/history.css
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/components/management/opsSurfacePrimitives.tsx
  - .agents/skills/spectra-verify/SKILL.md
  - apps/web/src/components/management/index.tsx
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/EnergyHistory/layout.ts
  - docs/roadmaps/2026-05-28-settings-status-design-token-alignment-roadmap.md
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/PlaybackSettings/playbackSettings.css
  - apps/web/src/pages/EnergyTrend/layout.ts
  - .agents/skills/spectra-analyze/SKILL.md
  - apps/web/src/pages/DeviceStatus/device.css
  - apps/web/src/pages/EnergyTrend/trend.css
  - apps/web/src/pages/CircuitSettings/circuitSettings.css
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/CircuitSettings/viewModel.ts
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/web/src/components/management/RemoteSyncBanner.tsx
  - apps/web/src/pages/DeviceStatus/layout.ts
  - apps/web/src/styles/management.css
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/SlideshowPreview/viewModel.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/components/management/rotationOpsSummary.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/SlideshowPreview/layout.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/Overview/assets/overview-leaf-cluster-reference.png
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/components/TitleBlock.tsx
tests:
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/components/management/rotationOpsSummary.test.tsx
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/ImageManagement/viewModel.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/pages/EnergyHistory/layout.test.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.test.ts
  - apps/web/src/pages/SlideshowPreview/layout.test.ts
  - apps/web/src/pages/CircuitSettings/viewModel.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DeviceStatus/layout.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/components/management/opsSurfacePrimitives.test.tsx
  - apps/web/src/pages/EnergyTrend/layout.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
-->

---
### Requirement: Present alerts, liveness, and logs as triage surfaces instead of generic status stacks

The system SHALL present display alerts, client liveness, and log summaries as triage surfaces instead of generic status stacks.

#### Scenario: Page shows mixed display alerts and client heartbeat state

- **WHEN** display readiness or operational alerts exist alongside client heartbeat data
- **THEN** the page SHALL group those signals into readable triage surfaces with clear purpose and priority

#### Scenario: Operator reviews recent logs for the current incident

- **WHEN** recent log metadata is available
- **THEN** the page SHALL present the log summary as part of the observability triage flow
- **AND** it SHALL help the operator understand whether deeper host-level investigation is required

<!-- @trace
source: complete-device-status-observability-surface
updated: 2026-05-29
code:
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/SlideshowPreview/preview.css
  - docs/goal.md
  - data/server-runtime.lock.json
  - apps/web/src/pages/DisplayPagesEditor/rotationPreview.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/Overview/assets/overview-leaf-reference-crop.png
  - apps/web/src/pages/EnergyHistory/history.css
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/components/management/opsSurfacePrimitives.tsx
  - .agents/skills/spectra-verify/SKILL.md
  - apps/web/src/components/management/index.tsx
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/EnergyHistory/layout.ts
  - docs/roadmaps/2026-05-28-settings-status-design-token-alignment-roadmap.md
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/PlaybackSettings/playbackSettings.css
  - apps/web/src/pages/EnergyTrend/layout.ts
  - .agents/skills/spectra-analyze/SKILL.md
  - apps/web/src/pages/DeviceStatus/device.css
  - apps/web/src/pages/EnergyTrend/trend.css
  - apps/web/src/pages/CircuitSettings/circuitSettings.css
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/CircuitSettings/viewModel.ts
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/web/src/components/management/RemoteSyncBanner.tsx
  - apps/web/src/pages/DeviceStatus/layout.ts
  - apps/web/src/styles/management.css
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/SlideshowPreview/viewModel.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/components/management/rotationOpsSummary.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/SlideshowPreview/layout.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/Overview/assets/overview-leaf-cluster-reference.png
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/components/TitleBlock.tsx
tests:
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/components/management/rotationOpsSummary.test.tsx
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/ImageManagement/viewModel.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/pages/EnergyHistory/layout.test.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.test.ts
  - apps/web/src/pages/SlideshowPreview/layout.test.ts
  - apps/web/src/pages/CircuitSettings/viewModel.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DeviceStatus/layout.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/components/management/opsSurfacePrimitives.test.tsx
  - apps/web/src/pages/EnergyTrend/layout.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
-->

---
### Requirement: Present kiosk exit and re-entry guidance on Device Status

The system SHALL present a first-class kiosk exit action on `Device Status`, and the same surface SHALL explain how the operator re-enters the system after leaving the kiosk browser.

#### Scenario: Operator prepares to leave the kiosk

- **WHEN** the operator opens `Device Status`
- **THEN** the page shows an explicit `離開系統` action in the device action area
- **AND** the page shows re-entry guidance telling the operator to return from the desktop by clicking `Solar Display Kiosk`

#### Scenario: Exit action is unavailable to an untrusted reader

- **WHEN** the request context is not trusted for management access
- **THEN** the page SHALL NOT claim that kiosk exit is available
- **AND** it SHALL preserve the existing trusted-access boundary semantics for device operations

<!-- @trace
source: add-overview-group-style-controls-and-kiosk-exit
updated: 2026-06-10
code:
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/vite.config.ts
  - apps/web/src/devtools/reactGrabBootstrapTarget.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - deploy/reset-db-settings.sh
  - deploy/start-solar-kiosk.sh
  - apps/web/package.json
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - scripts/deploy.test.mjs
  - deploy/stop-solar-kiosk.sh
  - apps/server/src/services/deviceKioskExitService.ts
  - deploy/firefox-kiosk.desktop
  - apps/web/src/main.tsx
  - apps/server/src/routes/device.ts
  - apps/web/src/devtools/reactGrabNoop.ts
  - deploy.sh
  - deploy/export-runtime-state.sh
  - apps/web/tsconfig.json
  - deploy/solar-display.service
  - apps/web/src/devtools/reactGrabBootstrap.ts
  - apps/web/src/services/api.ts
  - deploy/install-kiosk.sh
tests:
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/services/api.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/devtools/reactGrabBootstrapTarget.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/Overview/widgetStyles.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
-->

---
### Requirement: Show stable Device identity and duplicate connection diagnostics

Device Status SHALL present Device Identity, Group, Site Scope, connection count, and duplicate identity state alongside route, page, playback, and last seen diagnostics.

#### Scenario: Device has a sustained different-source duplicate

- **WHEN** the liveness snapshot reports duplicateIdentity=true
- **THEN** Device Status displays a warning tied to the stable clientId
- **AND** it does not expose the Device Credential or raw source address

<!-- @trace
source: device-fleet-management-surface
updated: 2026-07-30
code:
  - .github/workflows/agent-source-artifact.yml
  - .scratch/device-scoped-multisite-playback/spec.md
  - apps/server/src/routes/devices.ts
  - packages/shared/src/deviceIdentity.ts
  - apps/server/src/services/effectiveRotationCache.ts
  - CLAUDE.md
  - docs/ops/maintenance.md
  - packages/shared/src/displayReadiness.ts
  - apps/server/src/services/playbackRuntimePolicyService.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - apps/server/src/fastify.ts
  - docs/agents/issue-tracker.md
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - apps/server/src/services/deviceGroupService.ts
  - apps/server/src/routes/device-pairing.ts
  - docs/ops/judgment.md
  - apps/server/src/plugins/deviceContext.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - packages/shared/src/displayClientContext.ts
  - apps/server/src/services/deviceLivenessRegistry.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/server/src/services/displayReadinessService.ts
  - apps/server/src/app.ts
  - apps/server/src/routes/playback.ts
  - apps/web/src/pages/DeviceFleet/deviceFleet.css
  - apps/server/src/routes/device-groups.ts
  - docs/ops/conventions.md
  - apps/server/src/services/displayClientContextService.ts
  - apps/web/src/pages/Overview/index.tsx
  - docs/runbooks/pi-thin-kiosk-deploy.md
  - apps/server/src/services/playbackProfileService.ts
  - apps/web/src/pages/DeviceFleet/DeviceFleetContent.tsx
  - apps/server/src/db/migrations/028_global_playback_runtime_policy.sql
  - packages/shared/src/devicePairing.ts
  - apps/web/src/pages/DeviceFleet/index.tsx
  - apps/server/src/routes/display-story.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/app/routeMeta.ts
  - docs/ops/dispatch.md
  - apps/web/src/pages/DeviceFleet/route.ts
  - docs/ops/delegation.md
  - apps/server/src/services/deviceCredentialService.ts
  - deploy/install-thin-kiosk.sh
  - apps/web/src/pages/DeviceFleet/viewModel.ts
  - apps/server/src/routes/display-readiness.ts
  - apps/server/src/services/displayStoryService.ts
  - deploy/verify-thin-kiosk.sh
  - apps/server/src/testing/defaultPlaybackProfileTestSupport.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - packages/shared/src/index.ts
  - docs/ops/workflow.md
  - apps/web/src/pages/DeviceFleet/loadModel.ts
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - scripts/deploy.test.mjs
  - apps/server/src/db/migrations/030_device_pairing_credentials.sql
  - apps/server/src/services/displayRotationService.ts
  - packages/shared/src/displayClientLiveness.ts
  - scripts/capture-fhd-witness.mjs
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/server/src/realtime/SocketService.ts
  - .env.example
  - scripts/fhd-witness-config.mjs
  - apps/web/src/services/api.ts
  - apps/web/src/services/socket.ts
  - apps/web/src/pages/DeviceFleet/mutationError.ts
  - apps/server/src/routes/sustainability-story.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - packages/shared/src/deviceIdentity.contract.ts
  - docs/architecture/default-playback-profile.md
  - apps/server/src/testing/deviceContextTestSupport.ts
  - apps/server/src/db/migrations/029_device_group_management.sql
  - packages/shared/src/playback.ts
  - AGENTS.md
  - apps/server/src/db/seed.ts
  - apps/server/src/config.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
tests:
  - apps/server/src/routes/display-story.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/web/src/pages/DeviceFleet/index.test.tsx
  - apps/server/src/routes/device.test.ts
  - apps/server/src/plugins/deviceContext.test.ts
  - apps/server/src/routes/device-group-management.test.ts
  - apps/web/src/pages/Overview/runtimeIsolation.test.tsx
  - apps/web/src/pages/DeviceFleet/viewModel.test.ts
  - apps/server/src/routes/defaultPlaybackProfileCompatibility.test.ts
  - apps/server/src/routes/device-pairing.test.ts
  - apps/server/src/logger.test.ts
  - apps/web/src/pages/DeviceFleet/contracts.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/server/src/services/displayPageRegistryService.test.ts
  - apps/server/src/services/deviceLivenessRegistry.test.ts
  - apps/web/src/pages/DeviceFleet/route.test.ts
  - apps/server/src/db/seedPersistence.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - packages/shared/src/displayClientLiveness.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/web/src/pages/DeviceFleet/mutationError.test.ts
  - apps/server/src/services/effectiveRotationCache.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/server/src/services/playbackProfileService.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/routes/device-context-playback.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/server/src/services/playbackRuntimePolicyService.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/web/src/pages/DeviceFleet/loadModel.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/server/src/db/defaultPlaybackProfileMigration.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/services/deviceFleetApi.test.ts
-->