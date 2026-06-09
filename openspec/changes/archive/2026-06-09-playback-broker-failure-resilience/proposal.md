## Why

When the MQTT broker fails or stops publishing, the four live-data playback pages (overview, solar, factory-circuit, sustainability) fall outside the freshness window (message_timeout, default 30 seconds) and are removed from rotation with a stale-runtime skip reason. With four of five pages depending on live metrics, any broker outage longer than the window collapses the wall to a single page (images) and effectively freezes the display. The wall must keep cycling through all enabled pages during a broker outage, showing last-known values, instead of hiding the pages.

## What Changes

- Page runtime freshness evaluation SHALL distinguish "stale but previously had data" from "never received a required metric": it SHALL report, in addition to the existing fresh flag and stalest metric, whether every required metric is present in the live snapshot.
- Rotation SHALL keep a live-data page in rotation when its required metrics are all present but at least one is stale (transient broker outage), rendering last-known values, instead of skipping it with stale-runtime.
- Rotation SHALL skip a live-data page for runtime-data reasons only when at least one required metric has never been received (never-had-data / cold start); stale-runtime as a skip reason is reserved for that case.
- The four metric pages keep their existing staleData fallback value (hide); its meaning is refined and documented: hide applies to never-had-data, not to transient staleness. The not-live cue at the wall is provided by the existing playback header live-status badge; no per-page indicator is added in this change.
- Contract tests that simulate stale data and expect a stale-runtime skip SHALL be updated to encode the resilience-first behavior, and new tests SHALL cover "stale-with-prior-data stays playable" versus "never-had-data is skipped".
- Out of scope (no behavior change): the freshness window mechanism (message_timeout), schedule and idle gating, mock-mode handling, readiness (mapping/binding) gating, the staleData enum values, rotation-preview and display-ops payload shapes, page transitions, and image playback modes.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- display-page-per-metric-freshness: the page runtime freshness evaluation additionally reports whether all required metrics are present, and rotation keeps a stale-with-prior-data live page playable (last-known values) rather than skipping it; stale-runtime skip is reserved for never-had-data.

## Impact

- Affected specs: display-page-per-metric-freshness
- Affected code:
  - Modified: packages/shared/src/displayPageFreshness.ts
  - Modified: packages/shared/src/displayPageFreshness.test.ts
  - Modified: apps/server/src/services/displayRotationService.ts
  - Modified: packages/shared/src/displayPageConfig.ts
  - Modified: apps/server/src/routes/display-pages.test.ts
  - Modified: apps/server/src/routes/display-ops.test.ts
  - Modified: apps/server/src/routes/playback.test.ts
  - New: none
  - Removed: none
