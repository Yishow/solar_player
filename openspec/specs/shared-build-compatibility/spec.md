# shared-build-compatibility Specification

## Purpose

TBD - created by archiving change 'restore-shared-build-compatibility-without-structuredclone'. Update Purpose after archive.

## Requirements

### Requirement: Shared package builds without structuredClone-only globals

The system SHALL allow `@solar-display/shared` to build under its declared `ES2022` TypeScript/runtime contract without depending on globals that are absent from that contract, including `structuredClone`.

#### Scenario: Shared package build succeeds under its declared contract

- **WHEN** the repository runs `pnpm --filter @solar-display/shared build`
- **THEN** the package build succeeds
- **AND** the compiler does not fail on `displayPageCardRail` because of `structuredClone`

##### Example: Root build no longer stops in the shared package

- **GIVEN** the root build starts with `pnpm run build:shared`
- **WHEN** the shared package compiles `src/displayPageCardRail.ts`
- **THEN** the build proceeds past the shared package stage without `Cannot find name 'structuredClone'`

#### Scenario: Card rail helpers preserve detached clone semantics

- **GIVEN** a caller passes a frame or legacy metric item into the shared card rail helpers
- **WHEN** the helper returns the normalized card rail payload
- **THEN** later mutations to the original input SHALL NOT mutate the returned helper output
- **AND** the helper return shape remains compatible with the existing card rail schema

<!-- @trace
source: restore-shared-build-compatibility-without-structuredclone
updated: 2026-05-22
code:
  - scripts/dev.mjs
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/app/playbackRouteMeta.ts
  - scripts/dev.test.mjs
  - apps/server/src/server.ts
  - scripts/dev-lib.mjs
  - apps/server/src/server-startup.ts
  - packages/shared/src/cloneValue.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/hooks/useImagesAutoplay.ts
tests:
  - apps/server/src/server-startup.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - packages/shared/test/displayPageCardRail.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/app/playbackRouteMeta.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
-->