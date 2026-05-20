# mqtt-settings-display-coverage Specification

## Purpose

TBD - created by archiving change 'connect-mqtt-and-circuit-settings-to-display-readiness'. Update Purpose after archive.

## Requirements

### Requirement: Evaluate MQTT settings coverage against display metric requirements

The system SHALL evaluate `MQTT Settings` coverage against display metric requirements so operators can see which required metrics are mapped, missing, or invalid, and the management surface SHALL keep that feedback aligned with the latest available runtime topic state.

#### Scenario: Required display metric mapping is missing

- **WHEN** a display metric required by `Overview` or `Solar` has no valid topic mapping
- **THEN** `MQTT Settings` shows that missing or invalid mapping as a readiness finding
- **AND** the finding identifies which display story is affected
- **AND** the operator can distinguish between a static mapping gap and a mapped topic that is currently idle or not receiving runtime values


<!-- @trace
source: stream-mqtt-runtime-previews-and-readiness-feedback
updated: 2026-05-20
code:
  - apps/web/src/pages/OfflineError/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.tsx
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - package.json
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - scripts/dev.mjs
  - apps/web/src/pages/OfflineError/index.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/hooks/displaySyncDraftGuard.ts
  - apps/web/src/hooks/useDisplayPageRegistry.ts
  - apps/web/src/hooks/useDisplaySyncRefresh.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/managementDisplaySyncScopes.ts
  - apps/server/src/routes/device.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/server/src/routes/metrics-history.ts
  - apps/web/src/services/api.ts
  - apps/server/src/routes/settings-mqtt.ts
  - packages/shared/src/displayOps.ts
  - AGENTS.md
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/web/src/pages/SlideshowPreview/viewModel.ts
  - CLAUDE.md
  - apps/web/src/pages/energyMonitoringState.ts
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/server/src/logger.ts
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - apps/server/src/services/displayOpsService.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/pages/DisplayPagesEditor/pageRegionSchemas.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
tests:
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/pages/EnergyTrend/viewModel.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/server/src/logger.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/OfflineError/viewModel.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/server/src/routes/device.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/server/src/routes/metrics-history.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/EnergyHistory/viewModel.test.ts
  - apps/web/src/hooks/displaySyncDraftGuard.test.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.test.ts
  - apps/web/src/pages/ImageManagement/viewModel.test.ts
  - apps/web/src/hooks/useDisplaySyncRefresh.test.ts
-->

---
### Requirement: Surface MQTT coverage findings inside MQTT Settings

The system SHALL surface display coverage findings inside `MQTT Settings` rather than only in a backend-only diagnostic response.

#### Scenario: Operator reviews broker and mapping page

- **WHEN** the operator opens `MQTT Settings`
- **THEN** the page can show current mapping coverage for display requirements
- **AND** blocking findings remain distinguishable from warnings

<!-- @trace
source: connect-mqtt-and-circuit-settings-to-display-readiness
updated: 2026-05-19
code:
  - apps/web/src/pages/DisplayPagesEditor/inspectorTools.tsx
  - apps/server/src/routes/sustainability-story.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - .superpowers/brainstorm/4903-1779123645/content/design-3col.html
  - docs/superpowers/specs/2026-05-19-editor-three-column-layout-design.md
  - apps/web/src/components/DisplayReadinessPanel.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/components/PageNumberPill.tsx
  - packages/shared/src/displayEditorSchema.ts
  - apps/server/src/services/displayReadinessService.ts
  - apps/server/src/services/imagePlaylistService.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/components/StatusBadge.tsx
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/server/src/routes/image-playlist.ts
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/pages/DisplayPagesEditor/history.ts
  - apps/server/src/routes/display-story.ts
  - apps/server/src/db/seed.ts
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/hooks/usePageRotation.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorPresets.ts
  - apps/server/src/routes/display-pages.ts
  - packages/shared/src/displayReadiness.ts
  - apps/web/src/pages/CircuitSettings/index.tsx
  - packages/shared/src/index.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/pageRegionSchemas.ts
  - package.json
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/server/src/realtime/SocketService.ts
  - apps/server/src/routes/device-display-ops.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - packages/shared/src/displayRotation.ts
  - apps/server/src/routes/display-pages-asset-governance.test-support.ts
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/pages/Images/viewModel.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/shared/PageScaffold.tsx
  - .hermes/codex_goal1_change2_remaining.md
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - apps/server/src/services/deviceDisplayOpsService.ts
  - .hermes/codex_fix_bugs.md
  - apps/web/src/components/SectionTitle.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/pages/displayPageMediaStyle.ts
  - .hermes/codex_goal2_remaining.md
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - .hermes/codex_goal2.md
  - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorValidation.ts
  - apps/web/src/components/PlaybackTitleGroup.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/server/src/routes/device.ts
  - apps/web/src/hooks/useDisplayEditor.ts
  - apps/web/src/pages/DisplayPagesEditor/rotationPreview.ts
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/Solar/viewModel.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/services/socket.ts
  - apps/web/src/pages/DisplayPagesEditor/publishingStatus.tsx
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorRegionState.ts
  - apps/server/src/routes/settings-mqtt.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/components/SectionWrapper.tsx
  - apps/server/src/services/displayRotationService.ts
  - apps/web/src/hooks/useDisplayOpsSummary.ts
  - apps/web/src/hooks/useDisplaySyncRefresh.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/web/src/hooks/useDisplayReadiness.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/main.tsx
  - .hermes/codex_goal3.md
  - apps/server/src/routes/playback.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - .superpowers/brainstorm/4903-1779123645/state/server.pid
  - apps/web/src/services/api.ts
  - packages/shared/src/displayStory.ts
  - apps/web/package.json
  - packages/shared/src/sustainabilityStory.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - .hermes/codex_prompt_goal1_change1.md
  - apps/server/src/services/displayStoryService.ts
  - apps/web/src/hooks/displayPageDraftSession.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - .superpowers/brainstorm/4903-1779123645/content/waiting-1.html
  - .superpowers/brainstorm/4903-1779123645/state/server-stopped
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/components/PanelCard.tsx
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/server/src/services/displayOpsService.ts
  - apps/web/src/layouts/offlineRouting.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - AGENTS.md
  - apps/web/src/components/TitleBlock.tsx
  - .hermes/codex_goal4.md
  - apps/server/src/routes/images.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - .hermes/codex_goal1_change2.md
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/server/src/routes/display-pages-asset-governance-health.test-suite.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeFieldBuilders.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
  - .hermes/plan_publish_safety.md
  - apps/server/src/routes/display-ops.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/server/src/db/migrations/007_display_page_publishing.sql
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - .superpowers/brainstorm/4903-1779123645/state/server.log
  - apps/web/src/hooks/displayPageConfigPaths.ts
  - apps/server/src/routes/display-readiness.ts
  - apps/web/src/hooks/useImageAssetReferences.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/server/src/app.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/components/LeafOrnament.tsx
  - apps/server/src/routes/circuits.ts
  - apps/server/src/routes/display-pages-asset-governance-placement.test-suite.ts
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - packages/shared/src/displayOps.ts
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - apps/web/src/pages/DisplayPagesEditor/publishing.ts
  - packages/shared/src/imagePlaylist.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - packages/shared/src/types.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/server/src/db/migrations/008_display_readiness_slots.sql
  - .hermes/codex_goal1_change3.md
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/fallbackPageDefinitions.ts
  - .superpowers/brainstorm/4903-1779123645/content/editor-layouts.html
tests:
  - apps/web/src/pages/DisplayPagesEditor/history.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/hooks/displayPageDraftSession.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/hooks/useDisplayEditor.test.ts
  - apps/web/src/hooks/usePageRotation.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/server/src/routes/display-pages-asset-governance.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/server/src/routes/display-readiness.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/server/src/services/imagePlaylistService.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/routes/display-pages-fallback.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorPresets.test.ts
  - apps/web/src/pages/CircuitSettings/viewModel.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/server/src/routes/device-display-ops.test.ts
-->