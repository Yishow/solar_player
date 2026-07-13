# playback-route-bundle-loading Specification

## Purpose

TBD - created by archiving change 'split-web-route-bundles-with-playback-prefetch'. Update Purpose after archive.

## Requirements

### Requirement: Management routes load outside the playback entry bundle

Management-only page modules SHALL load through lazy route boundaries while preserving hidden-route redirects, route loaders, and shell behavior.

#### Scenario: Kiosk opens a playback route

- **WHEN** the production browser opens /overview
- **THEN** management page modules are absent from the initial JavaScript entry
- **AND** playback shell bootstrap and route rendering continue normally


<!-- @trace
source: split-web-route-bundles-with-playback-prefetch
updated: 2026-07-14
code:
  - apps/web/src/pages/shared/displayPageTemplateLoaders.ts
  - apps/web/src/app/router.tsx
  - apps/web/vite.config.ts
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - scripts/check-web-bundle-budget.mjs
  - apps/web/src/hooks/usePlaybackController.ts
tests:
  - apps/web/src/pages/shared/displayPageRouteHost.test.tsx
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/shared/displayPageTemplateLoaders.test.ts
  - apps/web/src/app/router.test.ts
-->

---
### Requirement: Playback templates load by template key

The playback route host SHALL load only the template chunk required by the resolved display page instance and SHALL NOT import editor runtime definitions into the initial playback bundle.

#### Scenario: Overview route resolves

- **WHEN** the display page registry resolves /overview to the overview template
- **THEN** the overview template chunk loads
- **AND** Solar, FactoryCircuit, Images, and Sustainability template chunks are not required before the first Overview render


<!-- @trace
source: split-web-route-bundles-with-playback-prefetch
updated: 2026-07-14
code:
  - apps/web/src/pages/shared/displayPageTemplateLoaders.ts
  - apps/web/src/app/router.tsx
  - apps/web/vite.config.ts
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - scripts/check-web-bundle-budget.mjs
  - apps/web/src/hooks/usePlaybackController.ts
tests:
  - apps/web/src/pages/shared/displayPageRouteHost.test.tsx
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/shared/displayPageTemplateLoaders.test.ts
  - apps/web/src/app/router.test.ts
-->

---
### Requirement: Next effective playback template is prefetched

The playback controller SHALL prefetch the template chunk for the next effective playable page after the rotation plan and current page are known. Prefetch SHALL follow enabled-page, schedule, and fallback decisions from the existing rotation contract.

#### Scenario: Rotation plans Solar after Overview

- **WHEN** Overview is current and Solar is the next effective playable page
- **THEN** the Solar template chunk request starts before the rotation boundary
- **AND** existing peer-config warmup remains active


<!-- @trace
source: split-web-route-bundles-with-playback-prefetch
updated: 2026-07-14
code:
  - apps/web/src/pages/shared/displayPageTemplateLoaders.ts
  - apps/web/src/app/router.tsx
  - apps/web/vite.config.ts
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - scripts/check-web-bundle-budget.mjs
  - apps/web/src/hooks/usePlaybackController.ts
tests:
  - apps/web/src/pages/shared/displayPageRouteHost.test.tsx
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/shared/displayPageTemplateLoaders.test.ts
  - apps/web/src/app/router.test.ts
-->

---
### Requirement: Chunk failure uses existing recovery boundaries

A failed lazy chunk request SHALL surface through the existing playback crash-recovery or fallback boundary and SHALL NOT leave an unbounded blank stage.

#### Scenario: Prefetched chunk fails

- **WHEN** the next template chunk request fails
- **THEN** the failure is recorded by the existing recovery path
- **AND** the current playable page remains visible until recovery or fallback navigation


<!-- @trace
source: split-web-route-bundles-with-playback-prefetch
updated: 2026-07-14
code:
  - apps/web/src/pages/shared/displayPageTemplateLoaders.ts
  - apps/web/src/app/router.tsx
  - apps/web/vite.config.ts
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - scripts/check-web-bundle-budget.mjs
  - apps/web/src/hooks/usePlaybackController.ts
tests:
  - apps/web/src/pages/shared/displayPageRouteHost.test.tsx
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/shared/displayPageTemplateLoaders.test.ts
  - apps/web/src/app/router.test.ts
-->

---
### Requirement: Production bundle meets the entry budget

The production build SHALL emit identifiable management and playback template chunks, and the initial entry gzip size SHALL be at least 25 percent smaller than the 388.56 kB baseline recorded on 2026-07-13.

#### Scenario: Bundle budget check runs

- **WHEN** the production web build and bundle budget checker run
- **THEN** the initial entry gzip size is no greater than 291.42 kB
- **AND** the output contains separate lazy route or template chunks


<!-- @trace
source: split-web-route-bundles-with-playback-prefetch
updated: 2026-07-14
code:
  - apps/web/src/pages/shared/displayPageTemplateLoaders.ts
  - apps/web/src/app/router.tsx
  - apps/web/vite.config.ts
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - scripts/check-web-bundle-budget.mjs
  - apps/web/src/hooks/usePlaybackController.ts
tests:
  - apps/web/src/pages/shared/displayPageRouteHost.test.tsx
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/shared/displayPageTemplateLoaders.test.ts
  - apps/web/src/app/router.test.ts
-->

---
### Requirement: Bundle splitting preserves playback output and continuity

For identical config and live data, route splitting SHALL preserve DOM structure, CSS classes, text, card order, FHD geometry, and rotation continuity.

#### Scenario: Cold and warm rotations are witnessed

- **WHEN** all five playback pages rotate under cold-cache and warm-cache runs
- **THEN** no transition contains a blank frame
- **AND** fresh FHD witness comparison records no geometry or asset-quality regression

<!-- @trace
source: split-web-route-bundles-with-playback-prefetch
updated: 2026-07-14
code:
  - apps/web/src/pages/shared/displayPageTemplateLoaders.ts
  - apps/web/src/app/router.tsx
  - apps/web/vite.config.ts
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - scripts/check-web-bundle-budget.mjs
  - apps/web/src/hooks/usePlaybackController.ts
tests:
  - apps/web/src/pages/shared/displayPageRouteHost.test.tsx
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/shared/displayPageTemplateLoaders.test.ts
  - apps/web/src/app/router.test.ts
-->