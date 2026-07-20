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

---
### Requirement: Factory Circuit monitoring story supports page instances
The system SHALL support Factory Circuit monitoring story payloads for each registered Factory Circuit page instance.

#### Scenario: Page-scoped Factory Circuit story payload is requested
- **WHEN** a caller requests a Factory Circuit page instance story by page key
- **THEN** the story payload SHALL preserve the shared monitoring story model fields
- **AND** the story payload SHALL resolve slots, KPIs, fallback reasons, source topics, and labels from the requested page instance

##### Example: Aggregate dependency keys match the requested page
- **GIVEN** `factory-circuit` has 6 scoped slots
- **AND** `factory-circuit-guanyin` has 8 scoped slots
- **WHEN** each page instance story is resolved
- **THEN** the `totalPower` dependency keys for `factory-circuit` SHALL contain 6 slot keys
- **AND** the `totalPower` dependency keys for `factory-circuit-guanyin` SHALL contain 8 slot keys

<!-- @trace
source: scope-factory-circuit-data-by-page-key
updated: 2026-07-08
code:
  - packages/shared/src/index.ts
  - apps/server/src/db/migrations/019_circuit_page_scope.sql
  - apps/server/src/db/migrations/020_fix_factory_circuit_site_counts.sql
  - packages/shared/src/displayCardData.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/server/src/db/migrations/018_display_value_overrides.sql
  - apps/server/src/services/sustainabilityStoryService.ts
  - packages/shared/src/displayStory.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - apps/server/src/db/seed.ts
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/server/src/services/displayValueOverrideService.ts
  - apps/server/src/services/displayRotationService.ts
  - apps/web/src/services/api.ts
  - apps/server/src/routes/circuits.ts
  - apps/server/src/routes/display-story.ts
  - packages/shared/src/types.ts
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/server/src/app.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/server/src/services/displayReadinessService.ts
  - packages/shared/src/displayReadiness.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/services/displayCardDataService.ts
  - apps/server/src/routes/display-card-data.ts
  - apps/web/src/pages/MqttSettings/index.tsx
tests:
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/server/src/routes/circuits.test.ts
  - apps/server/src/services/displayStoryService.test.ts
-->

---
### Requirement: Shared monitoring story can apply a display-only sub-ton CO2 unit preference

The system SHALL allow the shared monitoring story output for CO2 metrics to apply a display-only unit preference without changing the underlying carbon reduction calculation basis. When the global CO2 display preference is enabled and a CO2 metric's computed base unit is `t`, any non-zero value whose absolute magnitude is less than 1 SHALL be rendered for display as `kg` using `t * 1000`. Values equal to 0 SHALL remain displayed as `t`, values whose absolute magnitude is 1 or greater SHALL remain displayed as `t`, and unavailable values SHALL keep their existing fallback display.

#### Scenario: Enabled preference converts sub-ton CO2 displays to kilograms

- **WHEN** the global CO2 display preference is enabled
- **AND** a shared monitoring story CO2 metric resolves to a non-zero value smaller than 1 ton in magnitude
- **THEN** the story display output renders that metric in kilograms
- **AND** the converted value equals the ton value multiplied by 1000

##### Example: Overview and Solar share the same converted display

| Base tons | Preference | Display value | Display unit |
| --------- | ---------- | ------------- | ------------ |
| 0.011781  | true       | 11.8          | kg           |
| 0.495     | true       | 495           | kg           |

#### Scenario: Disabled preference keeps ton display

- **WHEN** the global CO2 display preference is disabled
- **AND** a shared monitoring story CO2 metric resolves to a value smaller than 1 ton in magnitude
- **THEN** the story display output keeps the metric displayed in tons

##### Example: Disabled preference preserves ton output

| Base tons | Preference | Display value | Display unit |
| --------- | ---------- | ------------- | ------------ |
| 0.011781  | false      | 0.01          | t            |
| 0.495     | false      | 0.5           | t            |

#### Scenario: Zero, fallback, and full-ton values do not switch units

- **WHEN** the global CO2 display preference is enabled
- **THEN** zero-ton values stay displayed in tons, unavailable values keep their existing fallback display, and values whose absolute magnitude is 1 ton or greater stay displayed in tons

##### Example: Non-converted cases

| Base value | Base unit | Preference | Display value | Display unit |
| ---------- | --------- | ---------- | ------------- | ------------ |
| 0          | t         | true       | 0             | t            |
| 1          | t         | true       | 1             | t            |
| --         | t         | true       | --            | t            |

<!-- @trace
source: add-global-small-co2-display-toggle
updated: 2026-07-21
code:
  - apps/server/src/services/displayValueOverrideService.ts
  - apps/web/src/pages/Overview/layout.ts
  - apps/server/src/db/seed.ts
  - tests/browser/fixtures/runtime.ts
  - deploy/configure-pi5-fan-control.sh
  - apps/server/src/routes/data-source.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/CircuitSettings/CircuitRow.tsx
  - apps/server/src/env.ts
  - scripts/fhd-witness-config.mjs
  - solar_mqtt/web/app.js
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/server/src/db/migrations/022_factory_peak_multiplier.sql
  - apps/web/src/components/AppHeader.tsx
  - apps/server/src/db/migrations/020_fix_factory_circuit_site_counts.sql
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/hooks/useHeaderWeatherMeta.ts
  - deploy/start-solar-kiosk.sh
  - packages/shared/src/householdEquivalence.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/pages/shared/monitoringSourceTooltip.ts
  - apps/server/src/db/migrations/024_fix_factory_circuit_jungli_region_rows.sql
  - .agents/skills/pi5-deployment/agents/openai.yaml
  - package.json
  - apps/server/src/services/weatherService.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasPane.tsx
  - apps/web/src/hooks/displayTransition.ts
  - deploy/verify-kiosk-install.sh
  - apps/web/src/pages/CircuitSettings/viewModel.ts
  - docs/ops/fhd-closeout.md
  - docs/ops/judgment.md
  - apps/web/src/hooks/weatherPolling.ts
  - deploy/install-tailscale.sh
  - apps/web/package.json
  - solar_mqtt/solar/mosquitto.py
  - deploy/configure-lightweight-desktop.sh
  - deploy/disable-xfce-display-popups.sh
  - apps/web/src/pages/Images/index.tsx
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/MockMetricsFeedService.ts
  - deploy/configure-hotspot-priority.sh
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - apps/web/src/styles/global.css
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - docs/ops/maintenance.md
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/vite.config.ts
  - apps/web/src/pages/managementDisplaySyncScopes.ts
  - apps/server/src/routes/device.ts
  - apps/web/src/pages/FactoryCircuit/layout.ts
  - packages/shared/src/sustainabilityStory.ts
  - apps/server/src/db/migrations/021_playback_runtime_freshness_policy.sql
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - apps/server/src/services/displayReadinessService.ts
  - apps/server/src/services/imageContentValidation.ts
  - apps/web/src/pages/shared/displayPageTemplateLoaders.ts
  - apps/web/src/services/api.ts
  - solar_mqtt/solar/scraper.py
  - apps/server/src/services/weatherSettingsService.ts
  - deploy/disable-display-sleep.sh
  - apps/server/src/services/DailySummaryService.ts
  - docs/roadmaps/2026-07-13-project-improvement-roadmap.md
  - apps/web/src/pages/Solar/viewModel.ts
  - deploy/raspi-bootstrap.sh
  - scripts/generate-release-manifest.mjs
  - scripts/verify.mjs
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - docs/ops/dispatch.md
  - deploy.sh
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/styles/management.css
  - deploy/tailscale-hotspot-trigger.sh
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/server/src/db/migrations/025_cl_kn_generation_summary_topics.sql
  - apps/web/src/pages/Overview/OverviewKpiFooter.tsx
  - apps/server/src/routes/images.ts
  - packages/shared/src/displayReadiness.ts
  - packages/shared/src/playback.ts
  - apps/server/src/services/calculationSettingsService.ts
  - apps/web/src/pages/Images/images.css
  - apps/web/src/pages/MqttSettings/factoryTopicSites.ts
  - .env.example
  - apps/server/src/services/displayCardDataService.ts
  - CLAUDE.md
  - packages/shared/src/types.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
  - apps/web/src/components/StatusBadge.tsx
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/DataSourceSettings/viewModel.ts
  - docs/ops/diagnosis.md
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - solar_mqtt/web/styles.css
  - apps/web/src/pages/shared/displayPageRouteHostFrame.tsx
  - scripts/check-web-bundle-budget.mjs
  - apps/web/src/pages/CircuitSettings/loadModel.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/server/src/db/migrations/019_circuit_page_scope.sql
  - apps/server/src/services/cwaWeatherClient.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - apps/web/src/pages/FactoryCircuit/runtimeContent.tsx
  - deploy/tailscale-hotspot-trigger.timer
  - docs/ops/conventions.md
  - apps/web/src/pages/Images/viewModel.ts
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/server/scripts/run-tests.test.mjs
  - packages/shared/src/index.ts
  - packages/shared/src/displayCardData.ts
  - apps/server/src/routes/circuits.ts
  - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
  - apps/web/src/components/headerWeatherMeta.ts
  - apps/server/src/db/migrations/023_normalize_factory_circuit_jungli_rows.sql
  - apps/server/scripts/run-tests.mjs
  - .agents/skills/pi5-deployment/SKILL.md
  - packages/shared/src/weather.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/server/src/db/migrations/018_display_value_overrides.sql
  - apps/web/src/pages/PlaybackSettings/playbackSettings.css
  - deploy/export-runtime-state.sh
  - docs/runbooks/raspi-onekey-kiosk-deploy.md
  - apps/server/src/services/deviceLogService.ts
  - apps/server/src/config.ts
  - apps/web/src/pages/DeviceStatus/loadModel.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - solar_mqtt/solar/anomaly.py
  - solar_mqtt/solar_config.single.example.json
  - docs/openapi.yaml
  - apps/web/src/pages/Sustainability/viewModel.ts
  - scripts/verify.test.mjs
  - docs/ops/letter.md
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/server/src/app.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/pages/DeviceStatus/index.tsx
  - packages/shared/src/displayStory.ts
  - solar_mqtt/solar_config.kn_cl.example.json
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/server/src/db/migrations/017_weather_update_interval.sql
  - apps/server/src/routes/display-card-data.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - apps/server/src/routes/display-story.ts
  - solar_mqtt/solar_config.json
  - docs/ops/delegation.md
  - solar_mqtt/solar/config.py
  - solar_mqtt/solar_config.mosquitto.example.json
  - apps/web/src/hooks/useOverviewWeather.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - deploy/tailscale-hotspot-trigger.service
  - scripts/raspi-onekey-deploy.sh
  - apps/web/src/hooks/usePageRotation.ts
  - solar_mqtt/web/vendor/mqtt.min.js
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - deploy/read-solar-display-journal.sh
  - apps/server/src/routes/weather.ts
  - scripts/verify-weather-connectivity.test.mjs
  - apps/server/src/routes/metrics-history.ts
  - apps/web/src/pages/Overview/overview.css
  - deploy/apply-desktop-theme.sh
  - deploy.md
  - apps/web/src/hooks/liveMetricsStore.ts
  - apps/web/src/pages/DataSourceSettings/index.tsx
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/server/src/serverRuntimeGuard.ts
  - apps/server/src/db/migrations/001_init.sql
  - apps/web/src/pages/Solar/runtimeContent.tsx
  - apps/web/src/pages/Sustainability/householdEquivalentRuntime.ts
  - AGENTS.md
  - playwright.config.ts
  - scripts/verify-weather-connectivity.mjs
  - solar_mqtt/solar/__init__.py
  - solar_mqtt/solar/storage.py
  - apps/web/src/pages/Solar/solar.css
  - solar_mqtt/solar/heartbeat.py
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - deploy/restore-runtime-state.sh
  - apps/web/src/styles/tokens.css
  - apps/server/package.json
  - apps/web/src/pages/CircuitSettings/circuitSettings.css
  - deploy/deploy.sh
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/server/src/mqtt/MqttClientService.ts
  - packages/shared/src/displayPageFreshness.ts
  - scripts/deploy.test.mjs
  - solar_mqtt/solar/winsvc.py
  - apps/server/src/services/displayRotationService.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/server/src/services/releaseIdentityService.ts
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/server/src/services/MetricsAccumulatorService.ts
  - scripts/run-browser-smoke.mjs
  - README.md
  - apps/web/src/pages/Sustainability/index.tsx
  - solar_mqtt/web/index.html
  - solar_mqtt/solar/schedule.py
  - apps/server/src/services/displayStoryService.ts
  - apps/web/src/components/displayPageCards.tsx
  - apps/web/src/pages/CircuitSettings/index.tsx
  - solar_mqtt/solar/discovery.py
  - solar_mqtt/solar/service.py
  - solar_mqtt/scrape_solar.py
  - deploy/install-kiosk.sh
  - apps/web/src/pages/Overview/assets.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorProfiler.tsx
  - apps/server/src/services/displayPageRegistryService.ts
  - solar_mqtt/solar/mqtt_bus.py
  - apps/server/src/db/migrations/004_playback.sql
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/services/socket.ts
  - solar_mqtt/solar/display.py
  - apps/web/src/pages/AssetLibrary/assetLibrary.css
  - apps/web/src/hooks/useLiveMetrics.ts
tests:
  - apps/server/src/routes/display-card-data.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/Overview/widgetStyles.test.ts
  - apps/server/src/routes/circuits.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/fhdWitnessTooling.test.ts
  - apps/web/src/pages/shared/displayPageTemplateLoaders.test.ts
  - apps/web/src/pages/MqttSettings/loadModel.test.ts
  - apps/web/src/app/router.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/Overview/displayPageConfig.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/Solar/cardFamily.test.ts
  - apps/server/src/services/MockMetricsFeedService.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/hooks/usePageRotation.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/server/src/services/imageContentValidation.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/web/src/pages/CircuitSettings/viewModel.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/services/cwaWeatherClient.test.ts
  - apps/web/src/pages/DataSourceSettings/index.test.tsx
  - apps/web/src/pages/SlideshowPreview/viewModel.test.ts
  - apps/server/src/services/weatherSettingsService.test.ts
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/web/src/pages/DisplayPagesEditor/activeSurfaceRecompute.test.ts
  - apps/server/src/routes/weather.test.ts
  - apps/server/src/db/seedPersistence.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/components/displayPageCards.test.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/hooks/liveMetricsStore.test.ts
  - apps/server/src/services/displayStoryTopicNames.test.ts
  - apps/server/src/services/releaseIdentityService.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/web/src/pages/Overview/kpiFooter.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorProfiler.test.tsx
  - apps/server/src/serverRuntimeGuard.test.ts
  - apps/web/src/pages/DeviceStatus/index.test.tsx
  - solar_mqtt/test_config_path.py
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/pages/displayPageFreeformObjectRuntime.test.tsx
  - apps/server/src/services/displayPageRegistryService.test.ts
  - apps/server/src/services/displayReadinessService.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/web/src/pages/Overview/cardVisibility.test.ts
  - apps/web/src/pages/PlaybackSettings/loadModel.test.ts
  - apps/web/src/hooks/weatherHooks.test.ts
  - apps/web/src/pages/Solar/layout.test.ts
  - apps/web/src/components/headerWeatherMeta.test.ts
  - apps/server/src/services/weatherService.test.ts
  - apps/web/src/pages/FactoryCircuit/runtimeIsolation.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx
  - apps/web/src/pages/Solar/runtimeIsolation.test.tsx
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/hooks/displayTransition.test.ts
  - apps/server/src/services/DailySummaryService.test.ts
  - apps/web/src/pages/FactoryCircuit/layout.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/server/src/routes/images.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/server/src/db/migrations/factoryCircuitJungliRows.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - apps/server/src/db/migrations/clKnGenerationSummaryTopics.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - solar_mqtt/test_mqtt_retain.py
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/CircuitSettings/loadModel.test.ts
  - apps/server/src/services/factoryGenerationAggregateService.test.ts
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.test.tsx
  - apps/web/src/pages/shared/displayPageRouteHost.test.tsx
  - apps/server/src/services/MetricsAccumulatorService.test.ts
  - apps/web/src/pages/MqttSettings/weatherFieldPresets.test.ts
  - apps/server/src/appOpenapiDocs.test.ts
  - apps/web/src/pages/Overview/runtimeIsolation.test.tsx
  - tests/browser/critical-journeys.spec.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/server/src/db/displayPageRegistrySeed.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/db/factoryCircuitPageScopeMigration.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/server/src/env.test.ts
  - apps/server/src/routes/display-readiness.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
  - solar_mqtt/test_web_assets.py
  - apps/server/src/routes/metrics-history.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/server/src/routes/data-source.test.ts
  - apps/server/src/db/migrations/weatherUpdateInterval.test.ts
  - apps/web/src/hooks/playbackRuntimeRefresh.test.ts
  - apps/server/src/routes/openapi-contract.test.ts
  - apps/web/src/pages/Overview/render.test.ts
  - apps/web/src/pages/DataSourceSettings/viewModel.test.ts
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
  - apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx
  - apps/server/src/services/carbonReductionConsistency.test.ts
  - apps/server/src/services/deviceLogService.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/web/src/pages/displayPageIconRendering.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
-->