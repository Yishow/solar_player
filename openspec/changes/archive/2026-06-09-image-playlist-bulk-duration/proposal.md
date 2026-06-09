## Why

ImageManagement lets operators set each Images playlist entry's playback duration one at a time via a per-entry stepper. Giving every image the same number of seconds (the common "count multiplied by N seconds" slideshow) is tedious for large playlists. A single bulk action that sets all entries to one duration makes uniform slideshow timing trivial to author, and pairs with the Images rotation coverage so the page slot becomes count multiplied by N.

## What Changes

- Add a bulk operation that sets the per-entry playback duration of every Images playlist entry to one provided value, with a floor of 1 second.
- Expose the bulk operation through the image-playlist API, reusing the existing success response shape and emitting the existing images-updated and display-sync notifications.
- Add a "set all to N seconds" control in the Images management workspace that applies the value to all entries.
- The per-entry stepper, order, enable/disable, and other authoring controls are unchanged; this only adds a bulk convenience over the same per-entry duration field.
- Out of scope (separate changes): Images rotation slot coverage, shuffle / random order, per-entry single-edit authoring, broker-failure resilience, page transitions.

## Capabilities

### New Capabilities

- images-playlist-bulk-duration-authoring: operators can set every Images playlist entry's playback duration to one value in a single action.

### Modified Capabilities

(none)

## Impact

- Affected specs: images-playlist-bulk-duration-authoring
- Affected code:
  - Modified: apps/server/src/services/imagePlaylistService.ts
  - Modified: apps/server/src/routes/image-playlist.ts
  - Modified: apps/server/src/routes/image-playlist.test.ts
  - Modified: apps/web/src/services/api.ts
  - Modified: apps/web/src/pages/ImageManagement/index.tsx
  - Modified: apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - New: none
  - Removed: none
