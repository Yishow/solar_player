# display-editor-drag-commit-on-release Specification

## Purpose

TBD - created by archiving change 'optimize-display-editor-drag-render-cost'. Update Purpose after archive.

## Requirements

### Requirement: Canvas drag commits to main state only on pointer release

During a canvas drag interaction in DisplayPagesEditor and ShellDecorationEditor, the editor SHALL present the in-progress rectangle via local visual feedback and SHALL NOT write the dragged geometry to the main config or draft state on each pointermove. The editor SHALL commit the final geometry to the main config/draft state exactly once, on pointer release.

#### Scenario: Drag in progress does not mutate main state per frame

- **WHEN** the user is dragging a region or object across the canvas
- **THEN** the canvas shows the moving rectangle via local feedback and the main config/draft state is not updated on each pointermove frame

#### Scenario: Final geometry commits on pointer release

- **WHEN** the user releases the pointer at the end of a drag
- **THEN** the main config/draft state updates once to the final geometry, identical to the geometry the pre-change implementation would have produced for the same pointer path endpoint


<!-- @trace
source: optimize-display-editor-drag-render-cost
updated: 2026-06-09
code:
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/components/Sparkline.tsx
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/components/displayPageCards.tsx
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/CircuitSettings/CircuitRow.tsx
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - data/server-runtime.lock.json
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
tests:
  - apps/web/src/pages/Solar/cardFamily.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
-->

---
### Requirement: Active object follows the pointer during drag without per-frame main-state writes

Removing per-frame main-state writes SHALL NOT make the dragged object appear frozen until release. During a drag, the actively dragged region/object SHALL render at the live feedback rect so it visually follows the pointer in real time, while non-dragged regions/objects continue to render from committed config/draft state. On pointer release the object SHALL settle at the committed final position without a visible jump from where it was shown mid-drag.

#### Scenario: Dragged object tracks the pointer in real time

- **WHEN** the user drags a region/object across the canvas
- **THEN** that object renders at the live feedback rect and moves with the pointer each frame, even though the main config/draft state is not written per frame

#### Scenario: No jump on release

- **WHEN** the user releases the pointer
- **THEN** the object stays at the position it was shown at the end of the drag, with no visible jump between the mid-drag rendered position and the committed position

#### Scenario: Non-dragged objects are unaffected during drag

- **WHEN** a drag is in progress on one object
- **THEN** all other regions/objects continue to render from committed state and do not move


<!-- @trace
source: optimize-display-editor-drag-render-cost
updated: 2026-06-09
code:
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/components/Sparkline.tsx
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/components/displayPageCards.tsx
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/CircuitSettings/CircuitRow.tsx
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - data/server-runtime.lock.json
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
tests:
  - apps/web/src/pages/Solar/cardFamily.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
-->

---
### Requirement: Drag produces a single undo history entry

A single drag interaction SHALL produce exactly one undo history entry, recorded on pointer release. Undoing once SHALL return the editor to the state immediately before the drag began.

#### Scenario: One drag, one undo step

- **WHEN** the user completes one drag interaction and then triggers undo once
- **THEN** the editor returns to the exact state before that drag, with no intermediate per-frame entries to step through

##### Example: undo entries per drag

| Action                          | Undo entries added |
| ------------------------------- | ------------------ |
| One drag (many pointermove)     | 1                  |
| Undo once                       | reverts that drag  |


<!-- @trace
source: optimize-display-editor-drag-render-cost
updated: 2026-06-09
code:
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/components/Sparkline.tsx
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/components/displayPageCards.tsx
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/CircuitSettings/CircuitRow.tsx
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - data/server-runtime.lock.json
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
tests:
  - apps/web/src/pages/Solar/cardFamily.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
-->

---
### Requirement: Final drag landing matches pre-change behavior

The commit-on-release change SHALL NOT alter the computed landing geometry, snap, or alignment results of a drag. For the same drag start point and release point, the committed geometry SHALL equal the result the pre-change implementation produced.

#### Scenario: Same pointer path yields same landing

- **WHEN** a drag begins and ends at the same canvas coordinates as a reference drag run on the pre-change implementation
- **THEN** the committed geometry (including any snap or alignment adjustment) is identical to the reference result


<!-- @trace
source: optimize-display-editor-drag-render-cost
updated: 2026-06-09
code:
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/components/Sparkline.tsx
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/components/displayPageCards.tsx
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/CircuitSettings/CircuitRow.tsx
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - data/server-runtime.lock.json
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
tests:
  - apps/web/src/pages/Solar/cardFamily.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
-->

---
### Requirement: Non-drag editor interactions remain correct after subtree memoization

Adding `React.memo` to editor subtrees and stabilizing handlers SHALL NOT change the correctness of non-drag interactions. Selection, inspector field editing, alignment/distribution, lock/visibility toggles, add/delete/duplicate, and reordering SHALL behave as before.

#### Scenario: Inspector edit still updates the selected object

- **WHEN** the user edits an inspector field for a selected object
- **THEN** the object updates to the new value as it did before memoization, and only the affected subtree re-renders

#### Scenario: Selection and list actions still work

- **WHEN** the user selects, toggles visibility/lock, duplicates, deletes, or reorders an object in the object list
- **THEN** the action takes effect identically to the pre-change behavior

<!-- @trace
source: optimize-display-editor-drag-render-cost
updated: 2026-06-09
code:
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/components/Sparkline.tsx
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/components/displayPageCards.tsx
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/CircuitSettings/CircuitRow.tsx
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - data/server-runtime.lock.json
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
tests:
  - apps/web/src/pages/Solar/cardFamily.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
-->

---
### Requirement: Drag feedback reuses stable overlay preparation within a session

The editor SHALL prepare unchanged region frames and page guides once for a stable drag session and compose active-object feedback separately. Frame lookup SHALL use a session index instead of a per-region linear scan. Preparation SHALL be invalidated when its region/config, selection/lock, overlay preset, or viewport inputs change.

#### Scenario: Stable fixture avoids repeated static preparation

- **WHEN** a fixture with 100 unchanged regions receives 100 pointermove events in one drag session without invalidating inputs
- **THEN** static frame and page-guide preparation SHALL run once for that session
- **AND** active feedback guides, measurements, and constraints SHALL match the existing geometry rules for each processed pointer position

#### Scenario: Changed inputs do not reuse obsolete geometry

- **WHEN** an input used by the overlay preparation changes during an active session
- **THEN** the editor SHALL recompute the affected preparation or end the session according to existing interaction rules
- **AND** it SHALL NOT publish geometry or feedback from an invalidated generation


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
### Requirement: Animation-frame feedback preserves the latest drag commit

The editor SHALL publish at most one React drag feedback update per scheduled animation callback while retaining the latest valid pointer result independently. Pointer release SHALL commit that latest result exactly once with the existing history base, including when the callback has not yet run. Session teardown SHALL cancel pending callbacks and prevent late feedback.

#### Scenario: Multiple moves are coalesced before release

- **WHEN** 100 pointermove events are distributed over 10 controlled animation callbacks and followed by pointerup
- **THEN** the editor SHALL publish at most 10 feedback updates, excluding terminal feedback clearing
- **AND** it SHALL perform one main-config commit and one undo entry with the last valid pointermove result

#### Scenario: Release precedes the scheduled callback

- **WHEN** the last pointermove computes rectangle R and pointerup occurs before its scheduled animation callback
- **THEN** the saved geometry SHALL equal R under the existing snapping and constraint rules
- **AND** no delayed callback SHALL restore feedback after release

#### Scenario: Release coordinates differ from the last move

- **GIVEN** the same drag start and pointer event sequence are supplied to the baseline and candidate
- **WHEN** the last pointermove is at clientX 100 and pointerup is at clientX 120 before the queued callback runs
- **THEN** candidate committed geometry SHALL equal the baseline result for that complete sequence
- **AND** frame coalescing SHALL NOT introduce a new pointerup coordinate-sampling policy

#### Scenario: Session teardown suppresses queued updates

- **WHEN** locking, page/workspace switching, or unmounting terminates the active interaction before a queued callback executes
- **THEN** the callback SHALL be canceled or rejected by the session generation
- **AND** it SHALL NOT mutate the ended session or the newly active page

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