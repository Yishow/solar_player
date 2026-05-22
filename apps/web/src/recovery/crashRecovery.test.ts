import assert from "node:assert/strict";
import test from "node:test";
import {
  PLAYBACK_ERROR_RELOAD_DELAY_MS,
  PLAYBACK_RELOAD_MAX,
  PLAYBACK_RELOAD_WINDOW_MS,
  PLAYBACK_STALL_GRACE_MS,
  PLAYBACK_WATCHDOG_INTERVAL_MS,
  decidePlaybackStall,
  evaluateReloadBudget,
  isChunkLoadError
} from "./crashRecovery";

test("evaluateReloadBudget allows reloads below the limit and prunes timestamps outside the window", () => {
  const now = 1_000_000;
  const staleTimestamp = now - PLAYBACK_RELOAD_WINDOW_MS - 1;
  const recentA = now - 20_000;
  const recentB = now - 5_000;

  assert.deepEqual(
    evaluateReloadBudget(
      {
        reloadTimestamps: []
      },
      now,
      {
        maxReloads: PLAYBACK_RELOAD_MAX,
        windowMs: PLAYBACK_RELOAD_WINDOW_MS
      }
    ),
    {
      allowed: true,
      nextState: {
        reloadTimestamps: [now]
      }
    }
  );

  assert.deepEqual(
    evaluateReloadBudget(
      {
        reloadTimestamps: [staleTimestamp, recentA, recentB]
      },
      now,
      {
        maxReloads: PLAYBACK_RELOAD_MAX,
        windowMs: PLAYBACK_RELOAD_WINDOW_MS
      }
    ),
    {
      allowed: true,
      nextState: {
        reloadTimestamps: [recentA, recentB, now]
      }
    }
  );
});

test("evaluateReloadBudget suppresses reloads once the limit is reached within the window", () => {
  const now = 1_000_000;
  const timestamps = [now - 30_000, now - 20_000, now - 10_000];

  assert.deepEqual(
    evaluateReloadBudget(
      {
        reloadTimestamps: timestamps
      },
      now,
      {
        maxReloads: PLAYBACK_RELOAD_MAX,
        windowMs: PLAYBACK_RELOAD_WINDOW_MS
      }
    ),
    {
      allowed: false,
      nextState: {
        reloadTimestamps: timestamps
      }
    }
  );
});

test("isChunkLoadError recognizes known dynamic import failure messages and ignores unrelated reasons", () => {
  assert.equal(
    isChunkLoadError("Failed to fetch dynamically imported module: /assets/x.js"),
    true
  );
  assert.equal(isChunkLoadError("error loading dynamically imported module"), true);
  assert.equal(isChunkLoadError("Importing a module script failed"), true);
  assert.equal(
    isChunkLoadError(new TypeError("TypeError: cannot read properties of undefined")),
    false
  );
  assert.equal(isChunkLoadError({ message: "error loading dynamically imported module" }), true);
  assert.equal(isChunkLoadError({ reason: "Failed to fetch dynamically imported module" }), true);
  assert.equal(isChunkLoadError({}), false);
});

test("decidePlaybackStall only reports stalls for active multi-page playback after the grace threshold", () => {
  assert.equal(
    decidePlaybackStall({
      expectedDurationMs: 15_000,
      graceMs: PLAYBACK_STALL_GRACE_MS,
      isPlaying: true,
      msSinceLastPageChange: 40_000,
      playablePageCount: 3
    }),
    true
  );
  assert.equal(
    decidePlaybackStall({
      expectedDurationMs: 15_000,
      graceMs: PLAYBACK_STALL_GRACE_MS,
      isPlaying: true,
      msSinceLastPageChange: 20_000,
      playablePageCount: 3
    }),
    false
  );
  assert.equal(
    decidePlaybackStall({
      expectedDurationMs: 15_000,
      graceMs: PLAYBACK_STALL_GRACE_MS,
      isPlaying: true,
      msSinceLastPageChange: 99_000,
      playablePageCount: 1
    }),
    false
  );
  assert.equal(
    decidePlaybackStall({
      expectedDurationMs: 15_000,
      graceMs: PLAYBACK_STALL_GRACE_MS,
      isPlaying: false,
      msSinceLastPageChange: 99_000,
      playablePageCount: 3
    }),
    false
  );
  assert.equal(PLAYBACK_WATCHDOG_INTERVAL_MS, 5_000);
  assert.equal(PLAYBACK_ERROR_RELOAD_DELAY_MS, 5_000);
});
