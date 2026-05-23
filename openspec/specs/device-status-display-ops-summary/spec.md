# device-status-display-ops-summary Specification

## Purpose

TBD - created by archiving change 'add-device-status-display-ops-observability'. Update Purpose after archive.

## Requirements

### Requirement: Extend Device Status with display operations summary

The system SHALL extend `Device Status` with display operations summary so operators can see current live display state alongside host health, and it SHALL keep configuration readiness summary distinct from operational health summary.

#### Scenario: Device Status shows latest live display state

- **WHEN** the operator opens `Device Status`
- **THEN** the page shows a summary of live display version, recent publish state, or pending draft backlog
- **AND** those display-operation values remain distinct from raw host metrics

#### Scenario: Configuration readiness does not double-count as operational degradation

- **GIVEN** `Device Status` receives configuration readiness findings and operational display faults from separate sources
- **WHEN** a page is blocked by missing readiness prerequisites but there are no live skip, asset, or runtime health faults
- **THEN** the configuration readiness summary reports the blocking readiness findings
- **AND** the operational health summary SHALL NOT mark the display state as degraded only because of those readiness findings

##### Example: Missing MQTT mapping stays in readiness without creating a fake runtime fault

- **GIVEN** `overview` is missing a required MQTT mapping
- **AND** there are no skipped pages and no asset-health faults in live playback
- **WHEN** the operator opens `Device Status`
- **THEN** the readiness summary reports the blocking mapping gap
- **AND** the operational health summary remains non-degraded for that condition alone


<!-- @trace
source: separate-configuration-readiness-from-operational-health
updated: 2026-05-23
code:
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/web/index.html
  - apps/server/src/services/displayRotationService.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/server/src/routes/display-story.ts
  - apps/server/src/services/displayStoryService.ts
  - packages/shared/src/index.ts
  - apps/server/src/config.ts
  - scripts/dev.test.mjs
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/Overview/viewModel.ts
  - packages/shared/src/displayPageCardRail.ts
  - .env.example
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/hooks/useImagesAutoplay.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - AGENTS.md
  - apps/server/src/server-startup.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/server/src/db/migrations/005_brand.sql
  - apps/web/src/services/api.ts
  - packages/shared/src/cloneValue.ts
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/components/DisplayPageLoadingState.tsx
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/server/src/routes/device.ts
  - apps/web/src/app/playbackRouteMeta.ts
  - apps/web/src/main.tsx
  - apps/web/package.json
  - apps/web/src/recovery/installCrashRecovery.ts
  - apps/server/src/realtime/SocketService.ts
  - packages/shared/src/displayClientLiveness.ts
  - scripts/dev.mjs
  - apps/web/src/app/router.tsx
  - apps/web/src/recovery/crashRecovery.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/server/src/server.ts
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/recovery/reloadController.ts
  - apps/server/package.json
  - apps/web/src/components/displayCanvasLayout.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - packages/shared/src/displayStory.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/hooks/useBrandAssets.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - packages/shared/src/displayPageFreshness.ts
  - scripts/dev-lib.mjs
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/server/src/services/MetricHistoryRetentionService.ts
  - .antigravitycli/ec616887-aba6-4235-9194-e467c9582ec4.json
  - apps/web/src/components/headerConnectionMeta.ts
  - apps/web/src/hooks/usePlaybackWatchdog.ts
  - apps/web/src/components/PlaybackErrorBoundary.tsx
  - apps/web/src/hooks/screenWakeLock.ts
  - apps/server/src/services/metricRetentionPlan.ts
  - packages/shared/tsconfig.json
  - apps/web/src/services/socket.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/hooks/useScreenWakeLock.ts
tests:
  - apps/server/src/routes/display-story.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/server/src/services/MetricHistoryRetentionService.test.ts
  - apps/web/src/hooks/usePlaybackWatchdog.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/services/api.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/components/DisplayCanvas.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - packages/shared/src/displayClientLiveness.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/web/src/components/DisplayPageLoadingState.test.tsx
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/web/src/recovery/crashRecovery.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/hooks/useBrandAssets.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/hooks/screenWakeLock.test.ts
  - apps/web/src/app/playbackRouteMeta.test.ts
  - apps/server/src/config.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/web/src/components/PlaybackErrorBoundary.test.tsx
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/components/headerConnectionMeta.test.ts
  - apps/web/src/recovery/installCrashRecovery.test.ts
  - apps/web/src/hooks/useScreenWakeLock.test.ts
  - packages/shared/test/displayPageCardRail.test.ts
  - apps/server/src/routes/brand.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/FactoryCircuit/index.source.test.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/server/src/services/metricRetentionPlan.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/web/src/components/displayCanvasLayout.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
-->

---
### Requirement: Show degraded display summary without hiding host health

The system SHALL show degraded display summary without hiding the existing host-health information.

#### Scenario: Display summary service is degraded

- **WHEN** display summary data is unavailable or degraded
- **THEN** `Device Status` still shows host-health cards
- **AND** it marks display summary as unavailable or degraded

<!-- @trace
source: add-device-status-display-ops-observability
updated: 2026-05-19
code:
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/components/StatusBadge.tsx
  - apps/server/src/routes/display-pages-asset-governance-health.test-suite.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/hooks/useDisplayEditor.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
  - apps/server/src/routes/image-playlist.ts
  - apps/server/src/routes/display-story.ts
  - apps/server/src/services/imagePlaylistService.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/components/PageNumberPill.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - .hermes/codex_goal2.md
  - apps/web/src/layouts/offlineRouting.ts
  - apps/server/src/routes/imagesSupport.ts
  - .hermes/codex_goal2_remaining.md
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/pages/DisplayPagesEditor/publishingStatus.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - packages/shared/src/displayEditorSchema.ts
  - AGENTS.md
  - apps/server/src/routes/device.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.tsx
  - .superpowers/brainstorm/4903-1779123645/content/design-3col.html
  - .superpowers/brainstorm/4903-1779123645/state/server.log
  - apps/web/src/hooks/useDisplayReadiness.ts
  - apps/server/src/routes/circuits.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - packages/shared/src/index.ts
  - apps/web/src/components/LeafOrnament.tsx
  - .hermes/codex_goal4.md
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - .superpowers/brainstorm/4903-1779123645/state/server.pid
  - .hermes/codex_goal1_change2.md
  - apps/web/src/hooks/useDisplayOpsSummary.ts
  - apps/web/src/pages/Images/viewModel.ts
  - apps/server/src/routes/playback.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/server/src/services/displayPageAssetService.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/components/SectionTitle.tsx
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/displayRotationService.ts
  - apps/web/src/components/DisplayReadinessPanel.tsx
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/hooks/displayPageConfigPaths.ts
  - apps/web/src/hooks/displayPageDraftSession.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorPresets.ts
  - apps/web/src/components/SectionWrapper.tsx
  - apps/server/src/services/deviceDisplayOpsService.ts
  - packages/shared/src/displayStory.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - .hermes/codex_goal1_change2_remaining.md
  - apps/server/src/routes/display-readiness.ts
  - apps/server/src/routes/display-ops.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - packages/shared/src/imagePlaylist.ts
  - .hermes/plan_publish_safety.md
  - apps/web/src/components/PanelCard.tsx
  - .hermes/codex_goal1_change3.md
  - apps/server/src/services/displayReadinessService.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/shared/PageScaffold.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - .hermes/codex_goal3.md
  - apps/web/src/pages/DisplayPagesEditor/inspectorTools.tsx
  - apps/web/src/pages/DisplayPagesEditor/fallbackPageDefinitions.ts
  - apps/server/src/db/migrations/007_display_page_publishing.sql
  - apps/server/src/routes/display-pages-asset-governance-placement.test-suite.ts
  - apps/web/src/main.tsx
  - packages/shared/src/displayRotation.ts
  - apps/server/src/routes/display-pages.ts
  - apps/web/src/components/AppFooterNav.tsx
  - docs/superpowers/specs/2026-05-19-editor-three-column-layout-design.md
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - packages/shared/src/types.ts
  - apps/server/src/services/displayOpsService.ts
  - apps/web/src/hooks/usePageRotation.ts
  - packages/shared/src/deviceDisplayOps.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/web/src/hooks/useDisplaySyncRefresh.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/server/src/routes/display-pages-asset-governance.test-support.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorRegionState.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorValidation.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - packages/shared/src/displayReadiness.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - package.json
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - apps/web/src/pages/DisplayPagesEditor/pageRegionSchemas.ts
  - apps/server/src/db/migrations/008_display_readiness_slots.sql
  - apps/server/src/db/seed.ts
  - apps/web/src/hooks/useImageAssetReferences.ts
  - apps/web/src/pages/DisplayPagesEditor/history.ts
  - .hermes/codex_fix_bugs.md
  - apps/web/src/pages/DisplayPagesEditor/rotationPreview.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
  - .superpowers/brainstorm/4903-1779123645/state/server-stopped
  - apps/web/src/services/socket.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeFieldBuilders.ts
  - apps/web/src/services/api.ts
  - apps/server/src/app.ts
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - .superpowers/brainstorm/4903-1779123645/content/editor-layouts.html
  - apps/web/src/pages/Solar/viewModel.ts
  - apps/server/src/routes/device-display-ops.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/server/src/routes/images.ts
  - apps/server/src/routes/sustainability-story.ts
  - .superpowers/brainstorm/4903-1779123645/content/waiting-1.html
  - apps/web/src/pages/DisplayPagesEditor/publishing.ts
  - packages/shared/src/displayOps.ts
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - apps/web/src/components/DisplayCanvas.tsx
  - .hermes/codex_prompt_goal1_change1.md
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/package.json
  - packages/shared/src/sustainabilityStory.ts
  - apps/web/src/components/PlaybackTitleGroup.tsx
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
tests:
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/server/src/routes/display-pages-asset-governance.test.ts
  - apps/web/src/pages/DisplayPagesEditor/history.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/hooks/usePageRotation.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/web/src/hooks/useDisplayEditor.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/CircuitSettings/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/server/src/routes/display-pages-fallback.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/server/src/services/imagePlaylistService.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorPresets.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/server/src/routes/display-readiness.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/hooks/displayPageDraftSession.test.ts
-->