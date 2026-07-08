# display-monitoring-story-model Specification

## Purpose

TBD - created by archiving change 'add-display-monitoring-story-semantic-models'. Update Purpose after archive.

## Requirements

### Requirement: Define a shared monitoring story model across Overview, Solar, and Factory Circuit

The system SHALL define a shared monitoring story model for `Overview`, `Solar`, and `Factory Circuit` that carries freshness, alert tone, fallback reason, and binding state.

#### Scenario: Shared story state is reused across pages

- **WHEN** one of the monitoring display pages receives runtime data and binding metadata
- **THEN** it can resolve freshness, alert tone, and fallback reason through the shared story model
- **AND** each page maps that model into its own presentation layout

##### Example: Overview and Solar both consume the same freshness state shape

- **GIVEN** `Overview` and `Solar` each receive metric bindings plus the same freshness metadata contract
- **WHEN** they build their page-local story outputs
- **THEN** both pages resolve freshness and alert tone from the shared story model
- **AND** each page renders that state in its own layout without redefining the underlying contract


<!-- @trace
source: add-display-monitoring-story-semantic-models
updated: 2026-05-19
code:
  - packages/shared/src/index.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - .hermes/codex_goal4.md
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - apps/web/src/components/PageNumberPill.tsx
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/components/StatusBadge.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/hooks/useDisplayOpsSummary.ts
  - .hermes/codex_goal3.md
  - apps/web/src/hooks/useDisplayReadiness.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
  - packages/shared/src/displayOps.ts
  - apps/web/src/hooks/useImageAssetReferences.ts
  - packages/shared/src/displayReadiness.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - .hermes/codex_goal1_change2.md
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - packages/shared/src/displayEditorSchema.ts
  - AGENTS.md
  - apps/web/src/components/SectionWrapper.tsx
  - .superpowers/brainstorm/4903-1779123645/state/server.pid
  - apps/web/src/components/PageContainer.tsx
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/server/src/routes/circuits.ts
  - apps/web/src/pages/Images/viewModel.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/server/src/routes/images.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
  - apps/server/src/db/seed.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorRegionState.ts
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - .hermes/codex_goal2.md
  - apps/server/src/services/imagePlaylistService.ts
  - apps/web/src/components/PlaybackTitleGroup.tsx
  - apps/server/src/routes/display-pages-asset-governance-placement.test-suite.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - .hermes/codex_goal1_change2_remaining.md
  - .superpowers/brainstorm/4903-1779123645/content/design-3col.html
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/server/src/routes/display-pages-asset-governance-health.test-suite.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - packages/shared/src/imagePlaylist.ts
  - apps/server/src/db/migrations/008_display_readiness_slots.sql
  - .superpowers/brainstorm/4903-1779123645/content/editor-layouts.html
  - apps/server/src/services/displayOpsService.ts
  - apps/server/src/services/displayRotationService.ts
  - apps/server/src/routes/display-pages-asset-governance.test-support.ts
  - apps/server/src/db/migrations/007_display_page_publishing.sql
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/server/src/routes/device.ts
  - apps/server/src/routes/settings-mqtt.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorTools.tsx
  - apps/web/package.json
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/DisplayPagesEditor/history.ts
  - apps/web/src/components/AppHeader.tsx
  - .hermes/plan_publish_safety.md
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/publishing.ts
  - packages/shared/src/displayRotation.ts
  - packages/shared/src/deviceDisplayOps.ts
  - .hermes/codex_goal1_change3.md
  - package.json
  - .superpowers/brainstorm/4903-1779123645/state/server.log
  - .hermes/codex_prompt_goal1_change1.md
  - apps/web/src/layouts/offlineRouting.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorValidation.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - packages/shared/src/sustainabilityStory.ts
  - .hermes/codex_fix_bugs.md
  - apps/server/src/routes/display-ops.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/hooks/usePageRotation.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/rotationPreview.ts
  - apps/server/src/routes/sustainability-story.ts
  - apps/web/src/pages/Solar/viewModel.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/main.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/server/src/routes/display-story.ts
  - docs/superpowers/specs/2026-05-19-editor-three-column-layout-design.md
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
  - apps/server/src/routes/display-pages.ts
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/hooks/useDisplaySyncRefresh.ts
  - .hermes/codex_goal2_remaining.md
  - apps/web/src/hooks/displayPageConfigPaths.ts
  - apps/web/src/pages/shared/PageScaffold.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.tsx
  - apps/web/src/components/LeafOrnament.tsx
  - apps/server/src/routes/device-display-ops.ts
  - apps/server/src/services/displayReadinessService.ts
  - apps/web/src/pages/DisplayPagesEditor/fallbackPageDefinitions.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/services/socket.ts
  - apps/server/src/routes/playback.ts
  - apps/web/src/hooks/displayPageDraftSession.ts
  - .superpowers/brainstorm/4903-1779123645/content/waiting-1.html
  - packages/shared/src/types.ts
  - apps/web/src/services/api.ts
  - apps/web/src/pages/DisplayPagesEditor/publishingStatus.tsx
  - apps/web/src/components/DisplayReadinessPanel.tsx
  - apps/web/src/components/SectionTitle.tsx
  - apps/web/src/components/PanelCard.tsx
  - apps/server/src/app.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - packages/shared/src/displayStory.ts
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/server/src/routes/image-playlist.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/pages/DisplayPagesEditor/pageRegionSchemas.ts
  - .superpowers/brainstorm/4903-1779123645/state/server-stopped
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/hooks/useDisplayEditor.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorPresets.ts
  - apps/server/src/routes/display-readiness.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
tests:
  - apps/web/src/pages/CircuitSettings/viewModel.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/hooks/usePageRotation.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/server/src/routes/display-readiness.test.ts
  - apps/web/src/pages/DisplayPagesEditor/history.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/server/src/services/imagePlaylistService.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorPresets.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/routes/display-pages-asset-governance.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/hooks/useDisplayEditor.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/server/src/routes/display-pages-fallback.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/web/src/hooks/displayPageDraftSession.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
-->

---
### Requirement: Keep shared monitoring story model diagnosable

The system SHALL keep the shared monitoring story model diagnosable to management surfaces and tests.

#### Scenario: Story model exposes a fallback reason

- **WHEN** a story block is rendered using fallback data or missing binding information
- **THEN** the shared monitoring story model preserves the fallback reason
- **AND** tests or management surfaces can inspect that reason

##### Example: Factory Circuit row reports missing slot binding

- **GIVEN** a `Factory Circuit` load row has no explicit slot binding
- **WHEN** the page falls back to an unbound-row story state
- **THEN** the shared model includes a fallback reason such as `missing-slot-binding`
- **AND** tests can assert that reason directly

<!-- @trace
source: add-display-monitoring-story-semantic-models
updated: 2026-05-19
code:
  - packages/shared/src/index.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - .hermes/codex_goal4.md
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - apps/web/src/components/PageNumberPill.tsx
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/components/StatusBadge.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/hooks/useDisplayOpsSummary.ts
  - .hermes/codex_goal3.md
  - apps/web/src/hooks/useDisplayReadiness.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
  - packages/shared/src/displayOps.ts
  - apps/web/src/hooks/useImageAssetReferences.ts
  - packages/shared/src/displayReadiness.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - .hermes/codex_goal1_change2.md
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - packages/shared/src/displayEditorSchema.ts
  - AGENTS.md
  - apps/web/src/components/SectionWrapper.tsx
  - .superpowers/brainstorm/4903-1779123645/state/server.pid
  - apps/web/src/components/PageContainer.tsx
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/server/src/routes/circuits.ts
  - apps/web/src/pages/Images/viewModel.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/server/src/routes/images.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
  - apps/server/src/db/seed.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorRegionState.ts
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - .hermes/codex_goal2.md
  - apps/server/src/services/imagePlaylistService.ts
  - apps/web/src/components/PlaybackTitleGroup.tsx
  - apps/server/src/routes/display-pages-asset-governance-placement.test-suite.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - .hermes/codex_goal1_change2_remaining.md
  - .superpowers/brainstorm/4903-1779123645/content/design-3col.html
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/server/src/routes/display-pages-asset-governance-health.test-suite.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - packages/shared/src/imagePlaylist.ts
  - apps/server/src/db/migrations/008_display_readiness_slots.sql
  - .superpowers/brainstorm/4903-1779123645/content/editor-layouts.html
  - apps/server/src/services/displayOpsService.ts
  - apps/server/src/services/displayRotationService.ts
  - apps/server/src/routes/display-pages-asset-governance.test-support.ts
  - apps/server/src/db/migrations/007_display_page_publishing.sql
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/server/src/routes/device.ts
  - apps/server/src/routes/settings-mqtt.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorTools.tsx
  - apps/web/package.json
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/DisplayPagesEditor/history.ts
  - apps/web/src/components/AppHeader.tsx
  - .hermes/plan_publish_safety.md
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/publishing.ts
  - packages/shared/src/displayRotation.ts
  - packages/shared/src/deviceDisplayOps.ts
  - .hermes/codex_goal1_change3.md
  - package.json
  - .superpowers/brainstorm/4903-1779123645/state/server.log
  - .hermes/codex_prompt_goal1_change1.md
  - apps/web/src/layouts/offlineRouting.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorValidation.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - packages/shared/src/sustainabilityStory.ts
  - .hermes/codex_fix_bugs.md
  - apps/server/src/routes/display-ops.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/hooks/usePageRotation.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/rotationPreview.ts
  - apps/server/src/routes/sustainability-story.ts
  - apps/web/src/pages/Solar/viewModel.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/main.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/server/src/routes/display-story.ts
  - docs/superpowers/specs/2026-05-19-editor-three-column-layout-design.md
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
  - apps/server/src/routes/display-pages.ts
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/hooks/useDisplaySyncRefresh.ts
  - .hermes/codex_goal2_remaining.md
  - apps/web/src/hooks/displayPageConfigPaths.ts
  - apps/web/src/pages/shared/PageScaffold.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.tsx
  - apps/web/src/components/LeafOrnament.tsx
  - apps/server/src/routes/device-display-ops.ts
  - apps/server/src/services/displayReadinessService.ts
  - apps/web/src/pages/DisplayPagesEditor/fallbackPageDefinitions.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/services/socket.ts
  - apps/server/src/routes/playback.ts
  - apps/web/src/hooks/displayPageDraftSession.ts
  - .superpowers/brainstorm/4903-1779123645/content/waiting-1.html
  - packages/shared/src/types.ts
  - apps/web/src/services/api.ts
  - apps/web/src/pages/DisplayPagesEditor/publishingStatus.tsx
  - apps/web/src/components/DisplayReadinessPanel.tsx
  - apps/web/src/components/SectionTitle.tsx
  - apps/web/src/components/PanelCard.tsx
  - apps/server/src/app.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - packages/shared/src/displayStory.ts
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/server/src/routes/image-playlist.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/pages/DisplayPagesEditor/pageRegionSchemas.ts
  - .superpowers/brainstorm/4903-1779123645/state/server-stopped
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/hooks/useDisplayEditor.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorPresets.ts
  - apps/server/src/routes/display-readiness.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
tests:
  - apps/web/src/pages/CircuitSettings/viewModel.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/hooks/usePageRotation.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/server/src/routes/display-readiness.test.ts
  - apps/web/src/pages/DisplayPagesEditor/history.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/server/src/services/imagePlaylistService.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorPresets.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/routes/display-pages-asset-governance.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/hooks/useDisplayEditor.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/server/src/routes/display-pages-fallback.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/web/src/hooks/displayPageDraftSession.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
-->

---
### Requirement: Expose monitoring card source composition in playback tooltips

The system SHALL expose source composition for playback monitoring cards so operators can inspect the metric keys, MQTT topics, and dependencies behind displayed card values.

#### Scenario: Operator inspects a direct MQTT metric card

- **WHEN** an operator hovers or focuses a monitoring card whose value comes from a direct metric mapping
- **THEN** the card tooltip SHALL identify the displayed metric key
- **AND** the tooltip SHALL identify the configured MQTT topic when one exists
- **AND** the tooltip SHALL identify the displayed unit when one exists

#### Scenario: Operator inspects a derived metric card

- **WHEN** an operator hovers or focuses the Solar self-consumption ratio card
- **THEN** the card tooltip SHALL identify `selfConsumptionRatio` as the displayed metric
- **AND** the tooltip SHALL identify `selfConsumptionEnergy` and `consumptionEnergy` as dependency keys for fallback derivation
- **AND** the tooltip SHALL identify configured MQTT topics for `selfConsumptionEnergy` and `consumptionEnergy` when those dependency mappings exist
- **AND** the tooltip SHALL preserve the visible card label `自發自用比例`

#### Scenario: Operator inspects an aggregate or partially mapped card

- **WHEN** a monitoring card has dependency metadata but no direct MQTT topic
- **THEN** the tooltip SHALL show the available source class and dependency keys
- **AND** the tooltip SHALL use a clear empty marker for missing direct topic instead of hiding the source line

#### Scenario: Tooltip does not change playback layout

- **WHEN** source composition tooltip metadata is added to monitoring cards
- **THEN** the card frame size, value row, icon, and visible card copy SHALL remain layout-stable
- **AND** the tooltip SHALL NOT require new page-local hardcoded copy for each card

<!-- @trace
source: carry-mqtt-topics-into-card-tooltips
updated: 2026-07-08
code:
  - deploy/tailscale-hotspot-trigger.sh
  - .env.example
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - packages/shared/src/displayStory.ts
  - apps/web/src/pages/Solar/viewModel.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - scripts/deploy.test.mjs
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - deploy/tailscale-hotspot-trigger.timer
  - deploy/disable-xfce-display-popups.sh
  - deploy/tailscale-hotspot-trigger.service
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/CircuitSettings/CircuitRow.tsx
  - deploy/configure-lightweight-desktop.sh
  - apps/server/src/routes/settings-mqtt.ts
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/Sustainability/viewModel.ts
  - deploy.sh
  - apps/web/src/components/displayPageCards.tsx
  - apps/web/src/pages/Solar/runtimeContent.tsx
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - apps/web/src/pages/FactoryCircuit/runtimeContent.tsx
  - apps/web/src/pages/shared/monitoringSourceTooltip.ts
tests:
  - apps/server/src/routes/display-story.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/components/displayPageCards.test.tsx
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
-->

---
### Requirement: Expose monitoring card diagnostics for management surfaces

The system SHALL expose monitoring card diagnostics from shared monitoring story data for management surfaces.

#### Scenario: Management surface requests monitoring card diagnostics

- **WHEN** a management surface requests diagnostics for Overview, Solar, or Factory Circuit value cards
- **THEN** the shared monitoring story data SHALL expose card target identity, metric identity, current source value, display value, unit, source topics, dependency metrics, fallback reason, freshness state, and last update
- **AND** the diagnostic payload SHALL use stable identifiers rather than page-local display text as the only target identity

##### Example: Overview power card exposes stable diagnostics

- **GIVEN** the Overview real-time power card uses metric `realTimePower`
- **WHEN** diagnostics are generated for Overview
- **THEN** the diagnostic row includes page id `overview`, metric key `realTimePower`, source topic `kuozui/plant/solar/power`, display value, source value, and freshness state

#### Scenario: Card derives from multiple monitoring inputs

- **WHEN** a card display value derives from more than one monitoring metric
- **THEN** the diagnostic payload SHALL list each required input with its metric key, topic mapping state, source topic when mapped, and latest value state
- **AND** the payload SHALL identify which input blocks the computed display value when the card is unavailable

##### Example: Self-consumption ratio reports missing consumption input

- **GIVEN** `selfConsumptionEnergy` is live
- **AND** `consumptionEnergy` has no latest value
- **WHEN** diagnostics are generated for the self-consumption ratio card
- **THEN** the diagnostic row lists both inputs
- **AND** the row identifies `consumptionEnergy` as the blocking input


<!-- @trace
source: add-topic-workspace-card-data-management
updated: 2026-07-08
code:
  - deploy/configure-lightweight-desktop.sh
  - .env.example
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - apps/web/src/pages/Sustainability/viewModel.ts
  - packages/shared/src/displayCardData.ts
  - packages/shared/src/displayStory.ts
  - apps/server/src/db/migrations/018_display_value_overrides.sql
  - deploy/tailscale-hotspot-trigger.timer
  - scripts/deploy.test.mjs
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/web/src/components/displayPageCards.tsx
  - apps/web/src/pages/Solar/viewModel.ts
  - deploy/tailscale-hotspot-trigger.sh
  - apps/web/src/pages/FactoryCircuit/runtimeContent.tsx
  - apps/web/src/pages/shared/monitoringSourceTooltip.ts
  - apps/web/src/pages/CircuitSettings/CircuitRow.tsx
  - deploy.sh
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/routes/display-card-data.ts
  - apps/server/src/app.ts
  - deploy/disable-xfce-display-popups.sh
  - apps/server/src/services/displayCardDataService.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/services/api.ts
  - apps/server/src/routes/settings-mqtt.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - packages/shared/src/index.ts
  - deploy/tailscale-hotspot-trigger.service
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/server/src/services/displayValueOverrideService.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/Solar/runtimeContent.tsx
tests:
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/components/displayPageCards.test.tsx
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
-->

---
### Requirement: Apply display overrides after monitoring source resolution

The system SHALL apply display overrides after monitoring source values and fallback states are resolved.

#### Scenario: Override exists for a monitoring card

- **WHEN** a display override is active for a monitoring card target
- **THEN** the playback story payload SHALL expose the override value as the display value
- **AND** management diagnostics SHALL expose both the original source value and the applied override value
- **AND** freshness and source topic metadata SHALL continue to describe the original monitoring source

##### Example: Monitoring override keeps source metadata

- **GIVEN** `realTimePower` source value is `42 kW`
- **AND** an active override displays `60 kW`
- **WHEN** diagnostics are generated for the Overview power card
- **THEN** the row reports source value `42 kW`, display value `60 kW`, and the original source topic

#### Scenario: Override is inactive or expired

- **WHEN** a display override for a monitoring card target is inactive or expired
- **THEN** the playback story payload SHALL use the real source or fallback-resolved value
- **AND** management diagnostics SHALL mark the override as inactive rather than applying it

##### Example: Expired monitoring override is not applied

- **GIVEN** `realTimePower` source value is `42 kW`
- **AND** an override value `60 kW` expired at `2026-07-08T09:00:00.000Z`
- **WHEN** diagnostics are generated after that expiry
- **THEN** playback receives `42 kW`
- **AND** diagnostics mark the override as inactive

<!-- @trace
source: add-topic-workspace-card-data-management
updated: 2026-07-08
code:
  - deploy/configure-lightweight-desktop.sh
  - .env.example
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - apps/web/src/pages/Sustainability/viewModel.ts
  - packages/shared/src/displayCardData.ts
  - packages/shared/src/displayStory.ts
  - apps/server/src/db/migrations/018_display_value_overrides.sql
  - deploy/tailscale-hotspot-trigger.timer
  - scripts/deploy.test.mjs
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/web/src/components/displayPageCards.tsx
  - apps/web/src/pages/Solar/viewModel.ts
  - deploy/tailscale-hotspot-trigger.sh
  - apps/web/src/pages/FactoryCircuit/runtimeContent.tsx
  - apps/web/src/pages/shared/monitoringSourceTooltip.ts
  - apps/web/src/pages/CircuitSettings/CircuitRow.tsx
  - deploy.sh
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/routes/display-card-data.ts
  - apps/server/src/app.ts
  - deploy/disable-xfce-display-popups.sh
  - apps/server/src/services/displayCardDataService.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/services/api.ts
  - apps/server/src/routes/settings-mqtt.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - packages/shared/src/index.ts
  - deploy/tailscale-hotspot-trigger.service
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/server/src/services/displayValueOverrideService.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/Solar/runtimeContent.tsx
tests:
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/components/displayPageCards.test.tsx
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
-->