# images-playlist-rotation-coverage Specification

## Purpose

TBD - created by archiving change 'image-slideshow-playback-coverage'. Update Purpose after archive.

## Requirements

### Requirement: Derive the Images page rotation slot from the enabled playlist

The system SHALL derive the Images playback page's effective rotation duration from its enabled, playable image playlist entries so that every enabled image plays once before page rotation advances. The effective duration SHALL equal the sum of the durations of entries that are both enabled and playable, with a floor of 1 second. When the playlist has no enabled, playable entry, the Images page SHALL use its configured registry duration unchanged. The derived duration SHALL be applied identically to the runtime rotation and the management rotation preview.

#### Scenario: Images slot covers the whole enabled playlist

- **WHEN** the Images playlist has enabled, playable entries with per-entry durations
- **THEN** the Images page's effective rotation duration SHALL equal the sum of those entries' durations
- **AND** the same duration SHALL appear in the management rotation preview and in the runtime rotation

##### Example: three enabled images sum to the slot duration

- **GIVEN** the Images playlist has three enabled, playable entries with durations 10, 15, and 5 seconds
- **AND** one additional entry is disabled with duration 20 seconds
- **WHEN** the Images page rotation duration is derived
- **THEN** the effective rotation duration SHALL be 30 seconds

#### Scenario: Empty playlist falls back to the registry duration

- **WHEN** the Images playlist has no enabled, playable entry
- **THEN** the Images page SHALL use its configured registry duration
- **AND** the rotation behavior for the Images page SHALL be unchanged from the configured value

##### Example: disabled-only playlist keeps the registry duration

- **GIVEN** every Images playlist entry is disabled
- **AND** the Images page registry duration is 5 seconds
- **WHEN** the Images page rotation duration is derived
- **THEN** the effective rotation duration SHALL be 5 seconds

<!-- @trace
source: image-slideshow-playback-coverage
updated: 2026-06-09
code:
  - packages/shared/src/displayPageFreshness.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/ImageManagement/index.tsx
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/server/src/services/displayRotationService.ts
  - packages/shared/src/imagePlaylist.ts
  - apps/web/src/hooks/useImagesAutoplay.ts
  - apps/server/src/services/imagePlaylistService.ts
  - apps/web/src/services/api.ts
  - apps/server/src/routes/image-playlist.ts
  - data/server-runtime.lock.json
tests:
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/server/src/routes/display-pages.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - packages/shared/src/imagePlaylist.test.ts
-->