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