# management-draft-save-concurrency Specification

## Purpose

TBD - created by archiving change 'add-optimistic-concurrency-to-management-draft-saves'. Update Purpose after archive.

## Requirements

### Requirement: Reject stale management draft saves with an explicit optimistic-concurrency conflict
The system SHALL reject stale management draft saves with an explicit optimistic-concurrency conflict instead of silently overwriting newer server state.

#### Scenario: A second session saves an older draft baseline
- **GIVEN** one session has already saved a newer draft version for a management draft resource
- **AND** another session is still editing an older baseline
- **WHEN** the older session tries to save using that stale baseline
- **THEN** the server SHALL return a conflict response
- **AND** it SHALL NOT overwrite the newer draft version on the server

##### Example: Stale display page draft save returns conflict
- **GIVEN** `overview` draft version `5` has already been saved by another operator
- **AND** the current editor is still based on draft version `4`
- **WHEN** the older editor saves its draft changes
- **THEN** the server returns a 409 conflict response
- **AND** the response includes the current server draft baseline for `overview`


<!-- @trace
source: add-optimistic-concurrency-to-management-draft-saves
updated: 2026-05-22
code:
  - docs/runbooks/device-diagnostics-safe-ops.md
  - apps/web/src/hooks/useMqttStatus.ts
  - apps/server/src/routes/sustainability-story.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/web/src/hooks/useImagesAutoplay.ts
  - apps/web/src/app/router.tsx
  - apps/server/src/routes/display-ops.ts
  - packages/shared/src/sustainabilityStory.ts
  - apps/server/src/routes/display-readiness.ts
  - apps/server/src/services/imagePlaylistService.ts
  - apps/web/src/pages/Sustainability/householdEquivalentRuntime.ts
  - apps/server/src/fastify.ts
  - apps/server/src/services/MetricsAccumulatorService.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/shared/displayPageCardRailRenderer.tsx
  - apps/server/src/routes/brand.ts
  - packages/shared/src/brandRuntime.ts
  - scripts/dev-lib.mjs
  - apps/server/src/routes/device-display-ops.ts
  - packages/shared/src/deviceDisplayOps.ts
  - packages/shared/src/managementAccess.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/server/src/server.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - docs/README.md
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/web/src/pages/EnergyHistory/index.tsx
  - packages/shared/src/householdEquivalence.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/hooks/useDisplayReadiness.ts
  - apps/server/src/services/SnapshotWriterService.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/server/src/routes/device.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/server/src/server-startup.ts
  - scripts/dev.test.mjs
  - packages/shared/src/index.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/app/playbackRouteMeta.ts
  - apps/server/src/app.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/services/socket.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - README.md
  - packages/shared/src/displayEditorSchema.ts
  - packages/shared/src/managementDraftSave.ts
  - apps/server/src/routes/display-pages-asset-governance-health.test-suite.ts
  - apps/server/src/routes/display-pages.ts
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - packages/shared/src/cloneValue.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/server/src/services/displayOpsService.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/server/src/plugins/managementAuth.ts
  - apps/server/src/routes/image-playlist.ts
  - apps/web/src/hooks/useBrandAssets.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailInspectorActions.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/server/src/services/DailySummaryService.ts
  - scripts/dev.mjs
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/services/api.ts
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - packages/shared/src/displayOps.ts
  - apps/server/src/services/householdEquivalenceService.ts
tests:
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/server/src/services/DailySummaryService.test.ts
  - apps/server/src/routes/brand.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - packages/shared/test/displayPageCardRail.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/web/src/hooks/useMqttStatus.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/server/src/routes/device.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/server/src/routes/images.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/server/src/services/MetricsAccumulatorService.test.ts
  - apps/web/src/app/playbackRouteMeta.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/server/src/routes/display-readiness.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/server/src/services/SnapshotWriterService.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/hooks/useBrandAssets.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
-->

---
### Requirement: Preserve local draft edits when a save conflict occurs
The system SHALL preserve local draft edits when an optimistic-concurrency conflict occurs so the operator can review or reapply them.

#### Scenario: Editor receives a draft-save conflict
- **WHEN** the display page editor receives a conflict from the server
- **THEN** the editor SHALL keep the local unsaved edits available in the client session
- **AND** it SHALL present guidance to reload or reconcile against the newer server draft

##### Example: Conflict does not clear the local session
- **GIVEN** an operator has unsaved layout edits in the editor
- **WHEN** the save request returns a stale-baseline conflict
- **THEN** the editor keeps those local edits in memory
- **AND** the operator can choose to reload the newest server draft before saving again

<!-- @trace
source: add-optimistic-concurrency-to-management-draft-saves
updated: 2026-05-22
code:
  - docs/runbooks/device-diagnostics-safe-ops.md
  - apps/web/src/hooks/useMqttStatus.ts
  - apps/server/src/routes/sustainability-story.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/web/src/hooks/useImagesAutoplay.ts
  - apps/web/src/app/router.tsx
  - apps/server/src/routes/display-ops.ts
  - packages/shared/src/sustainabilityStory.ts
  - apps/server/src/routes/display-readiness.ts
  - apps/server/src/services/imagePlaylistService.ts
  - apps/web/src/pages/Sustainability/householdEquivalentRuntime.ts
  - apps/server/src/fastify.ts
  - apps/server/src/services/MetricsAccumulatorService.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/shared/displayPageCardRailRenderer.tsx
  - apps/server/src/routes/brand.ts
  - packages/shared/src/brandRuntime.ts
  - scripts/dev-lib.mjs
  - apps/server/src/routes/device-display-ops.ts
  - packages/shared/src/deviceDisplayOps.ts
  - packages/shared/src/managementAccess.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/server/src/server.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - docs/README.md
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/web/src/pages/EnergyHistory/index.tsx
  - packages/shared/src/householdEquivalence.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/hooks/useDisplayReadiness.ts
  - apps/server/src/services/SnapshotWriterService.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/server/src/routes/device.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/server/src/server-startup.ts
  - scripts/dev.test.mjs
  - packages/shared/src/index.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/app/playbackRouteMeta.ts
  - apps/server/src/app.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/services/socket.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - README.md
  - packages/shared/src/displayEditorSchema.ts
  - packages/shared/src/managementDraftSave.ts
  - apps/server/src/routes/display-pages-asset-governance-health.test-suite.ts
  - apps/server/src/routes/display-pages.ts
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - packages/shared/src/cloneValue.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/server/src/services/displayOpsService.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/server/src/plugins/managementAuth.ts
  - apps/server/src/routes/image-playlist.ts
  - apps/web/src/hooks/useBrandAssets.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailInspectorActions.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/server/src/services/DailySummaryService.ts
  - scripts/dev.mjs
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/services/api.ts
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - packages/shared/src/displayOps.ts
  - apps/server/src/services/householdEquivalenceService.ts
tests:
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/server/src/services/DailySummaryService.test.ts
  - apps/server/src/routes/brand.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - packages/shared/test/displayPageCardRail.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/web/src/hooks/useMqttStatus.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/server/src/routes/device.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/server/src/routes/images.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/server/src/services/MetricsAccumulatorService.test.ts
  - apps/web/src/app/playbackRouteMeta.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/server/src/routes/display-readiness.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/server/src/services/SnapshotWriterService.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/hooks/useBrandAssets.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
-->

---
### Requirement: Synchronize successful display-page draft saves with the stage-page cache

The client SHALL commit the DisplayPageConfigEnvelope returned by a successful display-page draft save to the matching stage-page cache before or together with updating the active React draft session. A later remount for the same page and stage MUST initialize from that returned envelope, including its newest version and baseVersion.

#### Scenario: A saved draft envelope survives remount

- **GIVEN** the overview draft session and stage-page cache are at version 4
- **WHEN** a draft save succeeds and the server returns the overview draft envelope at version 5
- **THEN** the active session MUST use the returned version 5 envelope as its lastLoadedEnvelope
- **AND** the matching stage-page cache MUST contain version 5
- **AND** a later remount of overview draft MUST initialize at version 5
- **AND** the next save from that remounted session MUST use baseVersion 5

#### Scenario: A failed save does not publish an unconfirmed cache snapshot

- **GIVEN** a stage-page cache and active session are at version 4
- **WHEN** the draft save fails without a successful server envelope or an authoritative 409 latestEnvelope
- **THEN** the cache MUST remain at version 4
- **AND** the active local draft and its baseline MUST remain available for retry


<!-- @trace
source: fix-display-page-save-cache-coherence
updated: 2026-09-10
code:
  - apps/web/src/hooks/useDisplayPageConfig.ts
tests:
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
-->

---
### Requirement: Invalidate older display-page reads when a newer envelope is committed

The client SHALL maintain read generations independently for each stage-page cache key. Every external cache prime, successful save, or authoritative conflict-envelope commit MUST advance the generation and detach older pending requests before publishing its envelope. A current read publication SHALL retain a valid current token rather than invalidate itself. An older read response or error MUST NOT replace a newer cache envelope or be delivered to a consumer as its current result. Public loader compatibility SHALL be preserved by resolving superseded reads from the newer committed cache or current pending outcome, never from an obsolete payload or error.

Mounted hydration and reload consumers MUST check both module currentness and owner request/page/stage/lifecycle before changing session, baseline, error, message, or loading. A save commit MUST invalidate the owner's earlier load and settle the loading it takes over. Obsolete success, error, or finally handlers MUST NOT downgrade any active session or clear newer loading. Obsolete loading MUST NOT remain stuck; only a current commit or reconciliation SHALL settle it. A pending finalizer MUST delete its entry only when that entry still identifies the same Promise. Other sessions' local drafts MUST NOT be discarded merely because the cache was primed.

#### Scenario: A late pre-save read cannot overwrite a saved envelope

- **GIVEN** a draft read for overview returns version 4 but remains in flight
- **WHEN** a draft save commits version 5 before that read resolves
- **AND** the read later resolves with version 4
- **THEN** the overview draft cache MUST remain at version 5
- **AND** the late version 4 response MUST NOT replace or downgrade the cache
- **AND** an active reload or hydration awaiting that read MUST NOT replace its session or baseline with version 4
- **AND** a public loader caller MUST receive the newer current outcome rather than the obsolete version 4 envelope

#### Scenario: An obsolete rejection and finalizer cannot change a newer operation

- **GIVEN** R1 is in flight when a save commits version 5 and a newer R2 is then started
- **WHEN** R1 rejects or runs its finally handler while R2 is pending
- **THEN** R1 MUST NOT change the version 5 session, baseline, error, or message
- **AND** R1 MUST NOT clear R2 loading or remove R2 from the pending map
- **AND** a consumer allowed to join pending MUST join R2 rather than R1
- **AND** current completion MUST settle loading without waiting for obsolete cleanup

#### Scenario: A normal current read and external prime preserve currentness

- **GIVEN** the newest read completes with version 4 and no intervening commit exists
- **WHEN** its result is published
- **THEN** the read MUST remain a valid current result for its consumer
- **WHEN** an external prime subsequently commits version 5 while an older read is pending
- **THEN** version 5 MUST invalidate that older pending result without invalidating unrelated page-stage keys

#### Scenario: Stage and page cache entries remain isolated

- **GIVEN** the cache contains overview draft version 5, overview live version 2, and solar draft version 3
- **WHEN** overview draft commits version 6
- **THEN** only the overview draft cache entry MUST change to version 6
- **AND** overview live version 2 MUST remain unchanged
- **AND** solar draft version 3 MUST remain unchanged


<!-- @trace
source: fix-display-page-save-cache-coherence
updated: 2026-09-10
code:
  - apps/web/src/hooks/useDisplayPageConfig.ts
tests:
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
-->

---
### Requirement: Preserve conflict drafts while advancing the newest display-page baseVersion

When a display-page draft save returns an optimistic-concurrency conflict, the client SHALL publish latestEnvelope to the matching cache through the same generation barrier, preserve the active local draft, rebase its server baseline to that envelope, and use that latest version as the baseVersion for a subsequent save. The conflict handling MUST NOT silently overwrite the server, report save success, or discard local edits. This authoritative conflict publication SHALL be distinct from ordinary failed saves without an envelope.

#### Scenario: A conflict retains local edits and prepares the newest retry baseline

- **GIVEN** an active overview draft contains a local title edit based on version 4
- **WHEN** the save returns a 409 conflict with latest overview draft version 6
- **THEN** the active session MUST retain the local title edit and remain dirty
- **AND** the session baseline MUST become the latest server envelope at version 6
- **AND** the matching cache MUST become version 6 and older reads MUST be invalidated
- **AND** cache publication MUST NOT replace the active local title edit
- **AND** the next save request MUST use baseVersion 6
- **AND** the client MUST NOT report the stale save as successful

<!-- @trace
source: fix-display-page-save-cache-coherence
updated: 2026-09-10
code:
  - apps/web/src/hooks/useDisplayPageConfig.ts
tests:
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
-->

---
### Requirement: Authoritative display save responses preserve confirmed version order

For each display page and stage cache key, the display configuration client SHALL admit save-success and conflict-latest envelopes against the already confirmed server version before publishing cache state or invalidating in-flight reads. A lower version SHALL NOT replace confirmed cache or session baseline state. An equal version SHALL be idempotent and SHALL NOT create a new publication barrier. A higher version SHALL remain eligible for matching-key cache publication after the initiating owner unmounts. Owner lifecycle checks SHALL independently protect drafts, messages, and loading state.

#### Scenario: Older save success arrives after a newer owner saves

- **GIVEN** overview draft version 4 has save R1 pending, the user leaves and returns, and the new owner receives conflict version 5 then saves version 6
- **WHEN** R1 returns version 5 after version 6 is confirmed
- **THEN** the cache and subsequent remount SHALL retain version 6 and its content
- **AND** the next save SHALL use baseVersion 6
- **AND** R1 SHALL NOT alter the new owner's draft, message, or loading state

#### Scenario: Older conflict latest envelope cannot downgrade state

- **GIVEN** the matching cache has confirmed version 6 and a local unsaved draft exists
- **WHEN** an earlier save returns a conflict containing latestEnvelope version 5
- **THEN** the client SHALL preserve version 6 as the confirmed baseline and retain the local draft
- **AND** the rejected envelope SHALL NOT invalidate a newer in-flight read

#### Scenario: Repeated same-version response is idempotent

- **GIVEN** version 6 is already confirmed for a page and stage
- **WHEN** another authoritative response supplies version 6
- **THEN** the client SHALL reuse the confirmed envelope without a new cache publication barrier
- **AND** the response SHALL be able to settle only its still-current owner's operation
- **AND** it SHALL NOT cancel or obsolete a newer read merely by repeating version 6

#### Scenario: Newer response remains usable after unmount

- **GIVEN** overview draft version 4 is confirmed and its owner starts a save then unmounts
- **WHEN** that save returns version 5 before any newer version is confirmed
- **THEN** the matching cache SHALL publish version 5 for a later remount
- **AND** unrelated pages, the live stage, and the next owner's draft state SHALL remain unchanged

#### Scenario: Existing failure and read fences remain intact

- **WHEN** an ordinary save fails or a read begun before an accepted newer publication completes
- **THEN** the save failure SHALL preserve the owner's unsaved draft under the existing error contract
- **AND** the stale read SHALL NOT overwrite the accepted publication

<!-- @trace
source: fix-display-page-save-response-ordering
updated: 2026-09-11
code:
  - scripts/deploy.test.mjs
  - scripts/raspi-onekey-deploy.sh
  - apps/web/src/hooks/useDisplayPageConfig.ts
tests:
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
-->

---
### Requirement: Draft editing requires an authoritative initial baseline

The display-page editor SHALL permit draft mutation only after the active page and stage have an authoritative server envelope and no initial load or confirmed discard reload is pending. The hook mutation entry points and rendered controls SHALL enforce the same readiness state. Live runtime hydration SHALL retain its existing contract.

#### Scenario: Editing is attempted before a cold draft read completes

- **GIVEN** the active draft GET is pending without a server envelope
- **WHEN** a canvas, inspector, reset, undo, redo, or direct draft-update action is attempted
- **THEN** no baseline-free edited session SHALL be created
- **AND** the pending read SHALL remain eligible to hydrate the active owner
- **AND** the editor SHALL expose loading state and disabled editing controls

#### Scenario: Failed initial load can recover

- **WHEN** the initial draft read fails and the operator retries
- **THEN** the editor SHALL expose the failure without claiming the seed is a saved draft
- **AND** editing SHALL become available after the retry supplies a valid envelope
- **AND** a subsequent save SHALL use that envelope as its baseline

#### Scenario: A page switch isolates readiness

- **WHEN** the operator changes the active page or stage during an unresolved initial load
- **THEN** the old response SHALL NOT enable editing or replace the new owner's draft
- **AND** each page and stage SHALL retain the existing cache and version isolation


<!-- @trace
source: fix-ui-draft-and-interaction-consistency
updated: 2026-09-12
code:
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/draftInteractionState.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/EditorToolbar.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasPane.tsx
tests:
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/DisplayPagesEditor/draftInteraction.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/draftInteractionState.test.ts
  - tests/browser/ui-interactions.spec.ts
-->

---
### Requirement: Discarding a dirty draft requires explicit confirmation

The display-page editor SHALL describe remote reload as discarding local draft changes whenever that is its effect. A dirty draft reload SHALL require an explicit discard choice before replacing local content or history. Cancelling or failing that operation SHALL preserve the local draft. Conflict handling SHALL continue to preserve local edits and advance the authoritative baseline under the existing version contract.

#### Scenario: Conflict reload is cancelled

- **GIVEN** a save conflict preserved a local title edit
- **WHEN** the operator invokes remote reload and cancels the discard confirmation
- **THEN** the title, dirty state, undo history, and active page/stage SHALL remain unchanged
- **AND** no discard read or mutation SHALL start

#### Scenario: Confirmed reload succeeds

- **WHEN** the operator confirms discarding a dirty draft and the remote read succeeds
- **THEN** editing SHALL be locked while replacement is pending
- **AND** only the intended page/stage SHALL adopt the returned current envelope as content and baseline
- **AND** the replaced draft SHALL become clean

#### Scenario: Confirmed reload fails

- **WHEN** a confirmed discard read fails
- **THEN** the local content and history SHALL remain available
- **AND** the editor SHALL display the read failure and allow retry without reporting successful synchronization

<!-- @trace
source: fix-ui-draft-and-interaction-consistency
updated: 2026-09-12
code:
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
tests:
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/DisplayPagesEditor/draftInteraction.test.tsx
  - tests/browser/ui-interactions.spec.ts
-->
