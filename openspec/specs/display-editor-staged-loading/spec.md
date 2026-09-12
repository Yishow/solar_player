# display-editor-staged-loading Specification

## Purpose

TBD — created by syncing change 'optimize-display-editor-staged-loading'. Update Purpose after archival.

## Requirements

### Requirement: Display editor route entry renders before deferred editor data

The system SHALL keep /display-pages/editor route entry responsive by separating editor frame rendering from deferred registry, draft config, asset list, asset health, publishing state, preview, and inspector calculations. The route SHALL expose pending and retryable error states without bypassing existing access and unlock gates.

#### Scenario: Editor frame appears before deferred data completes

- **WHEN** an operator navigates to /display-pages/editor and deferred editor data is still loading
- **THEN** the editor route SHALL render the management-scale editor frame, workspace/page controls, and an explicit loading or degraded state
- **AND** it SHALL NOT wait for image assets, asset health, publishing state, preview rendering, and inspector validation to all finish before showing the route

#### Scenario: Registry snapshot is reused during editor entry

- **WHEN** a display page registry snapshot is already available from shared cache or route initialization
- **THEN** DisplayPagesEditorRoute SHALL build page definitions from that snapshot without starting from an empty registry state

#### Scenario: Cold entry and failed route expose a recoverable state

- **WHEN** route code or required workspace data is pending or fails
- **THEN** the operator SHALL see a named loading state or error with a retry action instead of an empty route
- **AND** retry SHALL retain any existing dirty session and preserve the existing lazy chunk recovery policy

#### Scenario: Existing access boundaries remain effective

- **WHEN** the existing gate requires unlock or the configured route is hidden
- **THEN** the route SHALL retain its unlock or redirect behavior without rendering the protected workspace
- **AND** route fallback SHALL NOT initiate registry, draft, image, health, or shell-workspace data requests
- **AND** resource clients SHALL retain the existing management access-denied handling and server authorization boundary


<!-- @trace
source: optimize-ui-loading-and-render-work
updated: 2026-09-13
code:
  - artifacts/ui-performance/candidate-runs.json
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasPane.tsx
  - solar_mqtt_go/internal/zoneidentity/prepare.go
  - apps/web/src/pages/DisplayPagesEditor/EditorToolbar.tsx
  - solar_mqtt_go/internal/service/service.go
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/server/src/plugins/inputValidationSupport.ts
  - apps/web/src/pages/DisplayPagesEditor/draftInteractionState.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - scripts/deploy.test.mjs
  - apps/server/src/plugins/runtimeInputValidation.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/DisplayPagesEditor/workspaceLoadPlan.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorProfiler.tsx
  - apps/web/vite.config.ts
  - apps/web/src/pages/DeviceFleet/DeviceFleetContent.tsx
  - apps/web/src/pages/DeviceFleet/PairingDialog.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlaySession.ts
  - apps/web/src/pages/CircuitSettings/CircuitRow.tsx
  - tests/browser/fixtures/runtime.ts
  - apps/web/src/pages/MqttSettings/MqttWeatherPanel.tsx
  - scripts/run-browser-smoke.mjs
  - apps/web/src/pages/DataHub/WeatherCards.tsx
  - apps/web/src/pages/DisplayPagesEditor/uiPerformanceFixtures.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - solar_mqtt_go/zone_identity.go
  - apps/web/src/pages/EnergyTrend/chartModel.ts
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/components/management/CustomSelect.tsx
  - apps/web/src/pages/DisplayPagesEditor/shellWorkspaceState.ts
  - solar_mqtt_go/internal/service/zone_identity.go
  - apps/web/src/components/management/ManagementRouteState.tsx
  - artifacts/ui-performance/baseline-runs.json
  - apps/web/src/pages/DisplayPagesEditor/publishing.ts
  - apps/web/src/components/management/useModalFocus.ts
  - solar_mqtt_go/commands.go
  - artifacts/ui-performance/fixture-identity.json
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/AssetLibrary/assetLibraryTypes.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - tests/browser/fixtures/ui-performance.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/EnergyTrend/trend.css
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/styles/management.css
  - apps/server/src/plugins/managementInputValidation.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayComposition.ts
  - apps/web/src/pages/AssetLibrary/AssetLibraryCard.tsx
  - solar_mqtt_go/internal/zoneidentity/store.go
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayHelpers.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasKeyboard.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasWorkflowConstraints.ts
  - apps/web/src/pages/DeviceFleet/GroupEditDialog.tsx
tests:
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/EditorToolbar.test.tsx
  - apps/web/src/pages/DataHub/Weather.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/workspaceReturnContract.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/activeSurfaceRecompute.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/DisplayPagesEditor/draftInteraction.test.tsx
  - solar_mqtt_go/internal/service/zone_identity_test.go
  - apps/server/src/routes/display-pages.test.ts
  - solar_mqtt_go/internal/zoneidentity/prepare_test.go
  - tests/browser/ui-interactions.spec.ts
  - apps/server/src/routes/site-energy-readiness-publishing.test.ts
  - apps/web/src/components/management/ManagementRouteState.interaction.test.tsx
  - apps/server/src/routes/management-input-validation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx
  - apps/web/src/components/management/CustomSelect.useSites.test.ts
  - apps/web/src/pages/EnergyTrend/chartRendering.test.tsx
  - apps/web/src/pages/EnergyTrend/chartModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/shellWorkspaceState.test.ts
  - apps/web/src/components/management/ManagementRouteState.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/workspaceLoading.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/workspaceLoadPlan.test.ts
  - apps/server/src/routes/energy-authoring-consumers.test.ts
  - apps/web/src/pages/AssetLibrary/AssetLibraryCard.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/uiPerformanceFixtures.test.ts
  - solar_mqtt_go/internal/zoneidentity/store_test.go
  - apps/web/src/components/management/CustomSelect.interaction.test.tsx
  - tests/browser/ui-performance.spec.ts
  - apps/web/src/pages/ShellDecorationEditor/shellWorkspaceState.interaction.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/draftInteractionState.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorProfiler.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasDragLifecycle.test.tsx
  - apps/web/src/pages/PlaybackSettings/interaction.test.tsx
  - apps/web/src/pages/DeviceFleet/dialogFocus.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlaySession.test.ts
-->

---
### Requirement: Display editor draft config hydration avoids repeated full-object work

The system SHALL hydrate draft display page config without requiring full config stringify comparison on every render. Dirty tracking, save, undo, redo, reset paths, fallback policy, conflict handling, and validation state SHALL remain correct. A visible seed fallback without an authoritative server envelope SHALL be read-only until successful retry establishes the active draft baseline.

#### Scenario: Draft dirty state updates through editor actions

- **WHEN** an operator edits a field, resets a field, saves a draft, receives a save conflict, undoes, or redoes an editor change after its baseline is ready
- **THEN** the editor SHALL update dirty state according to the applicable draft-governance contract
- **AND** it SHALL NOT require a full JSON serialization of the current and last-loaded config on every render to decide that state

#### Scenario: Draft config failure keeps seed fallback visible

- **WHEN** draft config hydration fails for the selected page
- **THEN** the editor SHALL keep the seed fallback visible for inspection with its fallback policy and error message
- **AND** draft mutation and save SHALL remain disabled until retry supplies an authoritative envelope
- **AND** the operator SHALL have a retry action without losing an already existing valid local draft


<!-- @trace
source: fix-ui-draft-and-interaction-consistency
updated: 2026-09-12
code:
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/draftInteractionState.ts
  - apps/web/src/pages/DisplayPagesEditor/EditorToolbar.tsx
tests:
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/DisplayPagesEditor/draftInteraction.test.tsx
  - tests/browser/ui-interactions.spec.ts
-->

---
### Requirement: Display editor heavy work is staged by active workspace and tab

The system SHALL defer editor work that is not needed for the active workspace, active tab, selected page, or selected region. Image asset loading, asset options, asset health, publishing state, source panel data, health panel data, preview rendering, and inspector validation SHALL run only when their corresponding surface is active or explicitly required. Workspace content SHALL NOT wait for an unrelated page draft or independent diagnostic request.

#### Scenario: Asset workspace loads image assets on demand

- **WHEN** an operator opens the editor but has not selected the asset workspace or a field requiring asset selection
- **THEN** the editor SHALL NOT block route entry on the full image asset list
- **AND** the asset workspace SHALL load and render the image list when activated

#### Scenario: Preview and inspector outputs remain equivalent

- **WHEN** preview rendering and inspector calculations run for the same selected page, config, workspace, tab, and region as before the optimization
- **THEN** the resulting authorable region ids, labels, geometry, field values, dirty indicators, validation issues, selection behavior, and canvas overlays SHALL match the pre-optimization output

#### Scenario: Workspace state owns deferred failures and retries

- **WHEN** workspace data is pending or rejected after the lightweight route entry completes
- **THEN** the mounted workspace SHALL own the resource loading, error, and retry state
- **AND** resource failure SHALL NOT be swallowed as success or remount an unrelated dirty workspace through the route error boundary
- **AND** retry SHALL request only the failed resource through the existing client/cache boundary

#### Scenario: Assets remain usable while health is pending or failed

- **WHEN** the assets workspace has received its image model and asset health is pending or failed
- **THEN** the image list and permitted selection actions SHALL be usable with an independent health pending or error state
- **AND** opening that workspace without an editor return context SHALL NOT require an unrelated selected-page draft response

#### Scenario: Shell entry avoids unrelated page hydration

- **WHEN** an operator enters the shell workspace directly
- **THEN** shell content readiness SHALL depend on its shell draft and existing access requirements
- **AND** it SHALL NOT depend on receiving a selected-page draft that the shell workspace does not use

#### Scenario: Workspace return preserves an existing draft

- **WHEN** an operator enters assets from a dirty editor field and returns, or switches between editor and shell
- **THEN** the original draft, dirty baseline, undo history, return target, and owner isolation SHALL remain intact
- **AND** a cold editor draft SHALL remain non-editable until its authoritative initial baseline is available

#### Scenario: Shared loading remains deduplicated and generation aware

- **WHEN** route preload and mounted workspace request the same resource generation, or an older workspace request resolves after switching
- **THEN** the existing shared in-flight request SHALL be reused
- **AND** an obsolete owner or generation response SHALL NOT overwrite the active workspace


<!-- @trace
source: optimize-ui-loading-and-render-work
updated: 2026-09-13
code:
  - artifacts/ui-performance/candidate-runs.json
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasPane.tsx
  - solar_mqtt_go/internal/zoneidentity/prepare.go
  - apps/web/src/pages/DisplayPagesEditor/EditorToolbar.tsx
  - solar_mqtt_go/internal/service/service.go
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/server/src/plugins/inputValidationSupport.ts
  - apps/web/src/pages/DisplayPagesEditor/draftInteractionState.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - scripts/deploy.test.mjs
  - apps/server/src/plugins/runtimeInputValidation.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/DisplayPagesEditor/workspaceLoadPlan.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorProfiler.tsx
  - apps/web/vite.config.ts
  - apps/web/src/pages/DeviceFleet/DeviceFleetContent.tsx
  - apps/web/src/pages/DeviceFleet/PairingDialog.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlaySession.ts
  - apps/web/src/pages/CircuitSettings/CircuitRow.tsx
  - tests/browser/fixtures/runtime.ts
  - apps/web/src/pages/MqttSettings/MqttWeatherPanel.tsx
  - scripts/run-browser-smoke.mjs
  - apps/web/src/pages/DataHub/WeatherCards.tsx
  - apps/web/src/pages/DisplayPagesEditor/uiPerformanceFixtures.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - solar_mqtt_go/zone_identity.go
  - apps/web/src/pages/EnergyTrend/chartModel.ts
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/components/management/CustomSelect.tsx
  - apps/web/src/pages/DisplayPagesEditor/shellWorkspaceState.ts
  - solar_mqtt_go/internal/service/zone_identity.go
  - apps/web/src/components/management/ManagementRouteState.tsx
  - artifacts/ui-performance/baseline-runs.json
  - apps/web/src/pages/DisplayPagesEditor/publishing.ts
  - apps/web/src/components/management/useModalFocus.ts
  - solar_mqtt_go/commands.go
  - artifacts/ui-performance/fixture-identity.json
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/AssetLibrary/assetLibraryTypes.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - tests/browser/fixtures/ui-performance.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/EnergyTrend/trend.css
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/styles/management.css
  - apps/server/src/plugins/managementInputValidation.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayComposition.ts
  - apps/web/src/pages/AssetLibrary/AssetLibraryCard.tsx
  - solar_mqtt_go/internal/zoneidentity/store.go
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayHelpers.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasKeyboard.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasWorkflowConstraints.ts
  - apps/web/src/pages/DeviceFleet/GroupEditDialog.tsx
tests:
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/EditorToolbar.test.tsx
  - apps/web/src/pages/DataHub/Weather.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/workspaceReturnContract.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/activeSurfaceRecompute.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/DisplayPagesEditor/draftInteraction.test.tsx
  - solar_mqtt_go/internal/service/zone_identity_test.go
  - apps/server/src/routes/display-pages.test.ts
  - solar_mqtt_go/internal/zoneidentity/prepare_test.go
  - tests/browser/ui-interactions.spec.ts
  - apps/server/src/routes/site-energy-readiness-publishing.test.ts
  - apps/web/src/components/management/ManagementRouteState.interaction.test.tsx
  - apps/server/src/routes/management-input-validation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx
  - apps/web/src/components/management/CustomSelect.useSites.test.ts
  - apps/web/src/pages/EnergyTrend/chartRendering.test.tsx
  - apps/web/src/pages/EnergyTrend/chartModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/shellWorkspaceState.test.ts
  - apps/web/src/components/management/ManagementRouteState.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/workspaceLoading.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/workspaceLoadPlan.test.ts
  - apps/server/src/routes/energy-authoring-consumers.test.ts
  - apps/web/src/pages/AssetLibrary/AssetLibraryCard.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/uiPerformanceFixtures.test.ts
  - solar_mqtt_go/internal/zoneidentity/store_test.go
  - apps/web/src/components/management/CustomSelect.interaction.test.tsx
  - tests/browser/ui-performance.spec.ts
  - apps/web/src/pages/ShellDecorationEditor/shellWorkspaceState.interaction.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/draftInteractionState.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorProfiler.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasDragLifecycle.test.tsx
  - apps/web/src/pages/PlaybackSettings/interaction.test.tsx
  - apps/web/src/pages/DeviceFleet/dialogFocus.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlaySession.test.ts
-->

---
### Requirement: Display editor optimization preserves authoring functionality and errors

The system SHALL preserve all DisplayPagesEditor authoring behavior while optimizing loading. Page switching, typed inspector controls, canvas drag/resize/nudge/measure, geometry clipboard, asset selection return, shell workspace hydration, save, publish, conflict handling, display sync refresh, and diagnostics SHALL remain observable.

#### Scenario: Deferred editor load fails without losing authoring state

- **WHEN** a deferred image, asset health, publishing, source, preview, or shell workspace request fails
- **THEN** the editor SHALL keep the current editable draft state usable
- **AND** it SHALL expose the existing error or degraded state for that deferred surface
- **AND** it SHALL NOT treat the failure as a successful load

#### Scenario: Existing editor workflows remain available

- **WHEN** an operator edits a region, moves or resizes a canvas object, copies geometry, selects an asset and returns, switches to shell workspace, saves, publishes, or handles a conflict
- **THEN** the workflow SHALL remain available with the same persisted result, selection behavior, success feedback, and error feedback as before the optimization

<!-- @trace
source: optimize-display-editor-staged-loading
updated: 2026-06-11
code:
  - apps/web/src/pages/DisplayPagesEditor/publishing.ts
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - deploy.sh
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/BrandAssets/loadModel.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/hooks/useDisplayReadiness.ts
  - apps/web/src/pages/OfflineError/index.tsx
  - deploy/reset-db-settings.sh
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/hooks/useRuntimeRefreshLifecycle.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - scripts/deploy.test.mjs
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/hooks/useLiveMetrics.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/hooks/useImageAssetReferences.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/hooks/useDisplayPageRegistry.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - deploy/export-runtime-state.sh
  - apps/web/src/pages/ImageManagement/loadModel.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewCatalogLoader.ts
  - apps/web/src/hooks/useDisplayOpsSummary.ts
  - apps/web/src/pages/PlaybackSettings/loadModel.ts
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/hooks/displayPageDraftSession.ts
  - apps/web/src/hooks/useMqttStatus.ts
tests:
  - apps/web/src/pages/ImageManagement/loadModel.test.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/web/src/pages/BrandAssets/loadModel.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/hooks/useMqttStatus.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/OfflineError/index.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.tsx
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/hooks/useDisplayPageRegistry.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/hooks/useRuntimeRefreshLifecycle.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/PlaybackSettings/loadModel.test.ts
  - apps/web/src/pages/DeviceStatus/index.test.tsx
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
-->

---
### Requirement: Editor check and publish action automatically persists pending draft changes

The display editor toolbar SHALL allow the operator to invoke "檢查並發布" even when local draft changes are unsaved (`dirty === true`). Invoking the action SHALL automatically persist the current draft before opening the publishing review drawer, eliminating manual two-step save friction and preventing false unsaved-binding blockers during review.

#### Scenario: Check and publish with unsaved changes
- **WHEN** an operator modifies display page properties resulting in unsaved changes and clicks "檢查並發布"
- **THEN** the system SHALL automatically save the draft to the server
- **AND** upon successful save it SHALL open the publish review drawer without reporting unsaved binding blockers

#### Scenario: Check and publish when clean
- **WHEN** an operator clicks "檢查並發布" with no unsaved changes (`dirty === false`)
- **THEN** the system SHALL directly open the publish review drawer and run preflight verification

<!-- @trace
source: simplify-display-editor-publishing
updated: 2026-09-12
code:
  - artifacts/ui-performance/fixture-identity.json
  - scripts/run-browser-smoke.mjs
  - tests/browser/fixtures/runtime.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/EditorToolbar.tsx
  - apps/web/vite.config.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/publishing.ts
  - tests/browser/fixtures/ui-performance.ts
  - apps/web/src/pages/Overview/overview.css
  - scripts/deploy.test.mjs
  - apps/server/src/services/displayPagePublishingService.ts
tests:
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/DisplayPagesEditor/uiPerformanceFixtures.test.ts
  - apps/server/src/routes/energy-authoring-consumers.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/server/src/routes/site-energy-readiness-publishing.test.ts
  - apps/web/src/pages/DisplayPagesEditor/EditorToolbar.test.tsx
  - apps/web/src/pages/Overview/displayPageConfig.test.ts
-->