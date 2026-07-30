# management-surface-render-invariance Specification

## Purpose

TBD - created by archiving change 'optimize-management-surface-render-cost'. Update Purpose after archive.

## Requirements

### Requirement: Management render output unchanged after optimization

Memoization, card componentization, native lazy loading, and traversal folding applied to ImageManagement, SlideshowPreview, EnergyTrend, EnergyHistory, and AssetLibrary SHALL NOT change the rendered output. The post-change DOM structure, CSS class names, computed inline style values, text content, chart values, and chart curves SHALL match the pre-change output for equivalent state. AssetLibrary thumbnail `<img>` elements MAY add only `loading` and `decoding` attributes without other DOM changes.

#### Scenario: Same state produces same rendered output

- **WHEN** a management page renders for a given state before and after the change
- **THEN** the DOM structure, class names, style values, text content, and chart values/curves are identical, aside from added `loading`/`decoding` attributes on AssetLibrary thumbnails


<!-- @trace
source: optimize-management-surface-render-cost
updated: 2026-06-09
code:
  - apps/web/src/pages/CircuitSettings/CircuitRow.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/components/Sparkline.tsx
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - apps/web/src/components/displayPageCards.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - data/server-runtime.lock.json
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
tests:
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/Solar/cardFamily.test.ts
-->

---
### Requirement: Energy chart values unchanged after traversal folding

Folding the multiple snapshot traversals in EnergyTrend and EnergyHistory into a single pass SHALL NOT change the computed chart points, sums, or averages. For an identical snapshots/summaries input, every chart vector value and aggregate SHALL equal the pre-change result.

#### Scenario: Folded traversal yields identical chart vectors

- **WHEN** the Energy viewModel computes chart points, sums, and averages for a given snapshots input after the change
- **THEN** each computed value equals the value the pre-change multi-traversal implementation produced

##### Example: aggregate equivalence over a range

| Range  | Snapshots | Chart vectors / sums / averages |
| ------ | --------- | ------------------------------- |
| day    | small     | identical to pre-change         |
| year   | hundreds  | identical to pre-change         |


<!-- @trace
source: optimize-management-surface-render-cost
updated: 2026-06-09
code:
  - apps/web/src/pages/CircuitSettings/CircuitRow.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/components/Sparkline.tsx
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - apps/web/src/components/displayPageCards.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - data/server-runtime.lock.json
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
tests:
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/Solar/cardFamily.test.ts
-->

---
### Requirement: Management edit, save, and CRUD behavior preserved

The change SHALL preserve all existing management behavior. ImageManagement editing, saving, and draft dirty indication; SlideshowPreview rotation; EnergyTrend/EnergyHistory range switching; and AssetLibrary selection and category counts SHALL behave identically to the pre-change implementation.

#### Scenario: ImageManagement edit and save still work

- **WHEN** the user edits an asset field, observes the draft dirty indicator, and saves after the change
- **THEN** the dirty indicator and saved data match the pre-change behavior

#### Scenario: AssetLibrary selection and lazy thumbnails

- **WHEN** the asset library renders a large set of assets and the user selects one
- **THEN** selection and category counts behave as before, and thumbnails load lazily as they scroll into view while their final rendered appearance is unchanged


<!-- @trace
source: optimize-management-surface-render-cost
updated: 2026-06-09
code:
  - apps/web/src/pages/CircuitSettings/CircuitRow.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/components/Sparkline.tsx
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - apps/web/src/components/displayPageCards.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - data/server-runtime.lock.json
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
tests:
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/Solar/cardFamily.test.ts
-->

---
### Requirement: Existing management tests pass without modification

Existing management web tests SHALL pass without modification and serve as the invariance gate. A required edit to an existing assertion SHALL be treated as a signal of an unintended behavior or render change and SHALL halt the change for review.

#### Scenario: Management test suite stays green without editing assertions

- **WHEN** `pnpm --filter @solar-display/web test` runs after the change
- **THEN** the suite passes and no existing management assertion required editing to make it pass

<!-- @trace
source: optimize-management-surface-render-cost
updated: 2026-06-09
code:
  - apps/web/src/pages/CircuitSettings/CircuitRow.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/components/Sparkline.tsx
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - apps/web/src/components/displayPageCards.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - data/server-runtime.lock.json
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
tests:
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/Solar/cardFamily.test.ts
-->

---
### Requirement: Preserve Device Fleet CRUD and status behavior across rendering changes

Rendering optimization or component reuse on the Device Fleet surface SHALL preserve Device and Group mutations, pairing confirmation, explicit operational states, and management access gating.

#### Scenario: Fleet row rendering is optimized

- **WHEN** the Device Fleet table implementation changes without a product requirement change
- **THEN** existing component tests for CRUD actions, pairing state, duplicate warnings, and access gating remain unchanged and pass

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