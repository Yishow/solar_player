# images-playlist-bulk-duration-authoring Specification

## Purpose

TBD - created by archiving change 'image-playlist-bulk-duration'. Update Purpose after archive.

## Requirements

### Requirement: Set every Images playlist entry duration in one action

The system SHALL provide a bulk operation that sets the per-entry playback duration of every Images playlist entry to one provided value, applying a floor of 1 second. The operation SHALL leave every other entry field (display order, enabled state, title, and metadata) unchanged, and SHALL emit the existing images-updated and display-sync notifications.

#### Scenario: Bulk duration applies to all entries

- **WHEN** an operator sets all Images playlist durations to a provided value of at least 1 second
- **THEN** every Images playlist entry's duration SHALL equal that value
- **AND** each entry's display order, enabled state, and metadata SHALL be unchanged
- **AND** the system SHALL emit the images-updated and display-sync notifications

##### Example: setting all to 8 seconds

- **GIVEN** three Images playlist entries with durations 10, 15, and 5 seconds
- **WHEN** all durations are set to 8 seconds
- **THEN** all three entries SHALL have a duration of 8 seconds

#### Scenario: Bulk duration is floored at 1 second

- **WHEN** an operator sets all Images playlist durations to a value below 1 second
- **THEN** every entry's duration SHALL be set to 1 second

<!-- @trace
source: image-playlist-bulk-duration
updated: 2026-06-09
code:
  - data/server-runtime.lock.json
  - apps/server/src/routes/image-playlist.ts
  - apps/server/src/services/displayRotationService.ts
  - apps/server/src/services/imagePlaylistService.ts
  - apps/web/src/hooks/useImagesAutoplay.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - packages/shared/src/displayPageFreshness.ts
  - apps/web/src/services/api.ts
  - packages/shared/src/displayPageConfig.ts
  - packages/shared/src/imagePlaylist.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/Images/index.tsx
tests:
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - packages/shared/src/imagePlaylist.test.ts
  - apps/web/src/services/api.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/server/src/routes/playback.test.ts
-->