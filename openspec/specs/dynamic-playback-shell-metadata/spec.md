# dynamic-playback-shell-metadata Specification

## Purpose

TBD - created by archiving change 'resolve-dynamic-playback-route-shell-metadata'. Update Purpose after archive.

## Requirements

### Requirement: Resolve playback shell metadata from active registry-backed routes

The system SHALL resolve playback shell metadata from the active display page registry when the current pathname matches a registry-backed playback route, including duplicate template instances and custom route slugs.

#### Scenario: Duplicate template instance uses its own shell metadata

- **WHEN** the current playback pathname matches an active registry-backed duplicate instance of a built-in template
- **THEN** the playback shell SHALL use that instance's resolved route metadata instead of falling back to the canonical built-in route metadata
- **AND** the active navigation state SHALL point to the duplicate instance pathname

##### Example: Overview duplicate keeps its own slug and label

- **GIVEN** the active registry contains `overview` at `/overview` and `overview-2` at `/overview-campus`
- **AND** `overview-2` is enabled and ordered after `overview`
- **WHEN** the browser is showing `/overview-campus`
- **THEN** the playback shell resolves `/overview-campus` as the active playback route
- **AND** the footer highlights `/overview-campus` instead of `/overview`


<!-- @trace
source: resolve-dynamic-playback-route-shell-metadata
updated: 2026-05-22
code:
  - apps/web/src/app/playbackRouteMeta.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - scripts/dev-lib.mjs
  - apps/web/src/pages/Images/index.tsx
  - packages/shared/src/cloneValue.ts
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/server/src/server.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - scripts/dev.mjs
  - apps/web/src/hooks/useImagesAutoplay.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - scripts/dev.test.mjs
  - apps/server/src/server-startup.ts
tests:
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - packages/shared/test/displayPageCardRail.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/web/src/app/playbackRouteMeta.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
-->

---
### Requirement: Build playback footer entries from resolved playback route metadata

The system SHALL build playback footer entries from the resolved active playback route metadata so the playback footer reflects current registry order and active instances.

#### Scenario: Archived route disappears from playback footer

- **WHEN** an active registry-backed playback route is archived or disabled and the client reloads the registry snapshot
- **THEN** the playback footer SHALL remove the archived or disabled route entry
- **AND** the shell SHALL stop marking that pathname as an active playback page

##### Example: Archived campus route no longer appears in footer

- **GIVEN** `/overview-campus` is currently listed in the playback footer from the active registry snapshot
- **WHEN** the `overview-2` registry instance is archived and the shell reloads the registry snapshot
- **THEN** `/overview-campus` is no longer present in the footer entry list
- **AND** navigating to `/overview-campus` no longer resolves as an active playback route


<!-- @trace
source: resolve-dynamic-playback-route-shell-metadata
updated: 2026-05-22
code:
  - apps/web/src/app/playbackRouteMeta.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - scripts/dev-lib.mjs
  - apps/web/src/pages/Images/index.tsx
  - packages/shared/src/cloneValue.ts
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/server/src/server.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - scripts/dev.mjs
  - apps/web/src/hooks/useImagesAutoplay.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - scripts/dev.test.mjs
  - apps/server/src/server-startup.ts
tests:
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - packages/shared/test/displayPageCardRail.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/web/src/app/playbackRouteMeta.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
-->

---
### Requirement: Use resolved playback metadata for offline eligibility

The system SHALL evaluate playback offline eligibility from the resolved playback route metadata rather than from an unknown-route fallback.

#### Scenario: Registry-backed playback route keeps playback-specific offline behavior

- **WHEN** the current pathname matches an active registry-backed playback route
- **THEN** offline redirect decisions SHALL use the resolved playback route metadata for that pathname
- **AND** the shell SHALL NOT treat the route as `/overview` solely because the slug is not present in the static route map

<!-- @trace
source: resolve-dynamic-playback-route-shell-metadata
updated: 2026-05-22
code:
  - apps/web/src/app/playbackRouteMeta.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - scripts/dev-lib.mjs
  - apps/web/src/pages/Images/index.tsx
  - packages/shared/src/cloneValue.ts
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/server/src/server.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - scripts/dev.mjs
  - apps/web/src/hooks/useImagesAutoplay.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - scripts/dev.test.mjs
  - apps/server/src/server-startup.ts
tests:
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - packages/shared/test/displayPageCardRail.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/web/src/app/playbackRouteMeta.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
-->