## Why

The Images playback page holds a fixed rotation slot taken from the display page registry duration (currently 5 seconds) that is unrelated to how many images are enabled or how long each is configured to show. The in-page slideshow advances at each entry's own duration, so page rotation moves on before the slideshow has shown every image — uploading or enabling more images does not make them all play. The Images page must stay in rotation long enough to play every enabled image once before advancing.

## What Changes

- The Images page's effective rotation duration SHALL be derived from the enabled, playable image playlist entries: it SHALL equal the sum of those entries' durations (image count multiplied by each per-image second value), with a floor of 1 second.
- When the Images playlist has no enabled, playable entries, the Images page SHALL fall back to its configured registry duration so rotation behavior is unchanged for the empty-playlist case.
- The derived duration SHALL be applied consistently to both the runtime rotation and the management rotation preview so operators see the same Images slot length the wall uses.
- The in-page slideshow timing (per-entry durations via the existing autoplay) and the playlist authoring controls (per-entry duration, order) are unchanged; this change only aligns the page-level rotation slot so a full cycle completes.
- Out of scope (separate changes): shuffle / random order, bulk "set all images to N seconds", per-entry duration authoring, broker-failure resilience, page transitions.

## Capabilities

### New Capabilities

- images-playlist-rotation-coverage: the Images page rotation slot is derived from the enabled image playlist so every enabled image plays once before rotation advances.

### Modified Capabilities

(none)

## Impact

- Affected specs: images-playlist-rotation-coverage
- Affected code:
  - Modified: packages/shared/src/imagePlaylist.ts
  - Modified: apps/server/src/services/displayRotationService.ts
  - Modified: apps/server/src/routes/display-pages.test.ts
  - New: packages/shared/src/imagePlaylist.test.ts
  - Removed: none
