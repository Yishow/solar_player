# settings-surface-render-invariance Specification

## Purpose

TBD - created by archiving change 'optimize-settings-surface-render-cost'. Update Purpose after archive.

## Requirements

### Requirement: Settings render output unchanged after memoization

Memoization, row componentization, and handler stabilization applied to PlaybackSettings, MqttSettings, and CircuitSettings SHALL NOT change the rendered output. The post-change DOM structure, CSS class names, computed inline style values, text content, and field ordering SHALL match the pre-change output for equivalent state.

#### Scenario: Same state produces same rendered output

- **WHEN** a settings page renders for a given settings/topics/circuits state before and after the change
- **THEN** the DOM structure, class names, style values, text content, and field order are identical


<!-- @trace
source: optimize-settings-surface-render-cost
updated: 2026-06-09
code:
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/components/Sparkline.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - data/server-runtime.lock.json
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/CircuitSettings/CircuitRow.tsx
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - apps/web/src/components/displayPageCards.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
tests:
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/Solar/cardFamily.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
-->

---
### Requirement: Settings save, test, and CRUD behavior preserved

The change SHALL preserve all existing settings behavior. Saving settings, testing the MQTT connection, adding/removing/saving topic mappings, adding/editing/deleting/saving circuits, and the draft dirty indicator SHALL behave identically to the pre-change implementation. The MQTT password SHALL continue to be returned to the client masked as `****`.

#### Scenario: MQTT save and test connection still work

- **WHEN** the user edits MQTT settings, runs test connection, and saves topic mappings after the change
- **THEN** each action produces the same result and feedback as before, and any returned password is masked as `****`

#### Scenario: Circuit edit triggers a single-row re-render and saves correctly

- **WHEN** the user edits one field of one circuit row
- **THEN** only that circuit row re-renders, the dirty count updates as before, and saving persists the same data as the pre-change implementation

##### Example: re-render scope when editing one circuit field

| Action                         | Rows re-rendered (post-change) |
| ------------------------------ | ------------------------------ |
| Edit one field in one row      | 1 (the edited row)             |
| Pre-change behavior            | all rows                       |


<!-- @trace
source: optimize-settings-surface-render-cost
updated: 2026-06-09
code:
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/components/Sparkline.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - data/server-runtime.lock.json
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/CircuitSettings/CircuitRow.tsx
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - apps/web/src/components/displayPageCards.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
tests:
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/Solar/cardFamily.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
-->

---
### Requirement: Polling and per-second tick update only affected subtrees

After the change, MqttSettings 5-second topic polling and PlaybackSettings per-second rotation tick SHALL update only the subtrees whose data changed, not force a full-page recompute and re-render. Live updates SHALL remain visible.

#### Scenario: MQTT polling updates topic rows without full-form rebuild

- **WHEN** a 5-second topic polling cycle delivers updated topic status
- **THEN** the changed topic rows reflect the new status, and rows whose data did not change do not re-render

#### Scenario: Playback rotation preview keeps updating each second

- **WHEN** the playback rotation runtime ticks each second
- **THEN** the live rotation preview reflects the new countdown/progress while the surrounding form sections do not re-render on the tick


<!-- @trace
source: optimize-settings-surface-render-cost
updated: 2026-06-09
code:
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/components/Sparkline.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - data/server-runtime.lock.json
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/CircuitSettings/CircuitRow.tsx
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - apps/web/src/components/displayPageCards.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
tests:
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/Solar/cardFamily.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
-->

---
### Requirement: Existing settings tests pass without modification

Existing settings web tests SHALL pass without modification and serve as the invariance gate. A required edit to an existing assertion SHALL be treated as a signal of an unintended behavior or render change and SHALL halt the change for review.

#### Scenario: Settings test suite stays green without editing assertions

- **WHEN** `pnpm --filter @solar-display/web test` runs after the change
- **THEN** the suite passes and no existing settings assertion required editing to make it pass

<!-- @trace
source: optimize-settings-surface-render-cost
updated: 2026-06-09
code:
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/components/Sparkline.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - data/server-runtime.lock.json
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/CircuitSettings/CircuitRow.tsx
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - apps/web/src/components/displayPageCards.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
tests:
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/Solar/cardFamily.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
-->