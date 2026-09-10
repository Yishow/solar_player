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
