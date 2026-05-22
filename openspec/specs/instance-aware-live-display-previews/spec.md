# instance-aware-live-display-previews Specification

## Purpose

TBD - created by archiving change 'key-live-display-previews-by-page-instance'. Update Purpose after archive.

## Requirements

### Requirement: Resolve live display preview state by page instance

The system SHALL resolve live display preview state by page instance identity so duplicate instances of the same template can expose different live preview results.

#### Scenario: Duplicate template instances render different live previews

- **WHEN** two active display page instances share the same template but have different live configurations
- **THEN** the preview catalog SHALL keep separate live preview states for each instance
- **AND** each consumer SHALL read the state that matches the selected page instance

##### Example: Two overview instances show different live hero content

- **GIVEN** `overview` and `overview-2` are both active and published
- **AND** their live region payloads differ
- **WHEN** a management surface requests previews for both instances
- **THEN** the preview catalog returns one state for `overview` and another state for `overview-2`
- **AND** the two preview surfaces do not reuse the same resolved config object


<!-- @trace
source: key-live-display-previews-by-page-instance
updated: 2026-05-22
code:
  - scripts/dev.test.mjs
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/hooks/useImagesAutoplay.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/server/src/server.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/server/src/server-startup.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - scripts/dev-lib.mjs
  - scripts/dev.mjs
  - packages/shared/src/displayPageCardRail.ts
  - packages/shared/src/cloneValue.ts
  - apps/web/src/app/playbackRouteMeta.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
tests:
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - packages/shared/test/displayPageCardRail.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/app/playbackRouteMeta.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
-->

---
### Requirement: Keep template renderers separate from instance state lookup

The system SHALL keep template renderer selection separate from preview state lookup so renderer reuse does not cause instance-level preview aliasing.

#### Scenario: Instance lookup fails without borrowing another instance preview

- **WHEN** a consumer has a template renderer but the requested page instance has no resolved preview state yet
- **THEN** the consumer SHALL render the instance-specific fallback state
- **AND** it SHALL NOT borrow the ready preview state of another instance that shares the same template

<!-- @trace
source: key-live-display-previews-by-page-instance
updated: 2026-05-22
code:
  - scripts/dev.test.mjs
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/hooks/useImagesAutoplay.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/server/src/server.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/server/src/server-startup.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - scripts/dev-lib.mjs
  - scripts/dev.mjs
  - packages/shared/src/displayPageCardRail.ts
  - packages/shared/src/cloneValue.ts
  - apps/web/src/app/playbackRouteMeta.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
tests:
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - packages/shared/test/displayPageCardRail.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/app/playbackRouteMeta.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
-->