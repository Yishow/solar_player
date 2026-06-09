## Why

The Images slideshow always plays entries in a fixed display order. For a wall that loops continuously, operators want an optional random (shuffle) playback order so the gallery feels varied across loops without manually reordering entries. There is currently no playlist-level setting and no runtime support for shuffled order.

## What Changes

- Introduce a playlist-level shuffle setting (a single boolean) persisted for the Images playlist, defaulting to off so current behavior is unchanged.
- Expose the shuffle setting through the image-playlist API for read and update, and surface a toggle in the Images management workspace.
- When shuffle is on, the in-page slideshow SHALL traverse enabled, playable entries in a randomized order, covering every enabled entry once per cycle before repeating, and SHALL reshuffle on each new full cycle. When shuffle is off, traversal SHALL remain the existing display-order sequence.
- Ordering SHALL be computed by a pure, testable helper (given entries, shuffle flag, and a seed) so randomization is deterministic under test.
- Out of scope (separate changes): the Images page rotation slot coverage, bulk "set all images to N seconds", per-entry duration/order authoring, broker-failure resilience, page transitions.

## Capabilities

### New Capabilities

- images-playlist-shuffle-playback: an optional playlist-level shuffle setting randomizes the Images slideshow order while still covering every enabled entry once per cycle.

### Modified Capabilities

(none)

## Impact

- Affected specs: images-playlist-shuffle-playback
- Affected code:
  - Modified: apps/server/src/services/imagePlaylistService.ts
  - Modified: apps/server/src/routes/image-playlist.ts
  - Modified: apps/server/src/routes/image-playlist.test.ts
  - Modified: packages/shared/src/imagePlaylist.ts
  - Modified: packages/shared/src/imagePlaylist.test.ts
  - Modified: apps/web/src/hooks/useImagesAutoplay.ts
  - Modified: apps/web/src/hooks/useImagesAutoplay.test.ts
  - Modified: apps/web/src/services/api.ts
  - Modified: apps/web/src/pages/ImageManagement/index.tsx
  - Modified: apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - New: none
  - Removed: none
