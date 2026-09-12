# ui-performance-evidence Specification

## Purpose

Provide reproducible evidence for UI loading and rendering optimizations. Separate deterministic work reduction, measured timing, and visual or device acceptance so that performance claims remain auditable.

## Requirements

### Requirement: UI performance comparisons use reproducible isolated baselines

Each optimization report SHALL compare the verified result of fix-ui-draft-and-interaction-consistency with the candidate under the same fixture, browser, hardware, build mode, and cache condition. Reports SHALL record source and worktree identities, lockfile and fixture hashes, raw measurements, request and render counts, and limitations. Execution SHALL use the existing isolated browser smoke runtime without modifying production data.

#### Scenario: Paired runs preserve comparable inputs

- **WHEN** the UI performance suite measures editor/assets/shell navigation, canvas dragging, and asset selection
- **THEN** it SHALL retain five baseline and five candidate runs for each reported cold or warm condition
- **AND** it SHALL report all raw samples and their medians with environment and fixture identities

#### Scenario: Invalid comparisons do not produce a success claim

- **WHEN** a baseline is missing, fixture/environment identities differ, required samples are absent, or rendered/behavioral output differs
- **THEN** the comparison SHALL be marked incomplete or non-comparable with a reason
- **AND** the report SHALL NOT declare a verified performance improvement for that comparison

#### Scenario: Successful evidence remains available

- **WHEN** the suite runs with BROWSER_SMOKE_KEEP_SUCCESS_ARTIFACTS=1 and BROWSER_SMOKE_GREP=ui-performance
- **THEN** its JSON report and Playwright attachments SHALL remain under the browser smoke artifact directory after successful execution


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
### Requirement: UI performance claims require bounded work and preserved behavior

Acceptance SHALL prove the specified workspace wait removal, drag preparation/feedback bounds, and card rerender bounds in addition to preserving existing draft, access, geometry, CRUD, and rendered-output contracts. Timing outcomes SHALL be reported as measured, including unchanged or regressed results. Profiling SHALL remain opt-in and SHALL NOT change production-visible output when disabled.

#### Scenario: Each targeted optimization has an observable result

- **WHEN** the candidate is evaluated against its baseline
- **THEN** the report SHALL demonstrate that usable workspace content no longer waits for the specified unrelated or diagnostic requests, static drag preparation and feedback satisfy their session bounds, and selection-only card updates satisfy their rerender bounds
- **AND** it SHALL report navigation-to-frame, navigation-to-content, overlay, and selection timings without inventing improvement percentages

#### Scenario: Profiling is disabled for normal operation

- **WHEN** profiling flags are absent
- **THEN** the application SHALL NOT emit performance logs, change DOM output, or accumulate instrumentation entries from this change

#### Scenario: Local evidence is distinguished from visual and device acceptance

- **WHEN** local browser and deterministic checks pass
- **THEN** the delivery record SHALL separately identify the fresh FHD witness, intentional differences, user acceptance, and any untested Pi or production conditions
- **AND** local test success SHALL NOT imply deployment or physical-device acceptance

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