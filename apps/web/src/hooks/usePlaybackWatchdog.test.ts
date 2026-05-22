import assert from "node:assert/strict";
import test from "node:test";
import {
  PLAYBACK_STALL_GRACE_MS,
  PLAYBACK_WATCHDOG_INTERVAL_MS,
  startPlaybackWatchdogLoop,
  type PlaybackWatchdogLoopOptions
} from "./usePlaybackWatchdog";

type ScheduledTimer = {
  callback: () => void;
  ms: number;
};

function createOptions(
  overrides: Partial<PlaybackWatchdogLoopOptions> = {}
): PlaybackWatchdogLoopOptions {
  return {
    allowReload() {
      return true;
    },
    clearScheduledInterval() {},
    currentPageKey: "overview",
    expectedDurationMs: 15_000,
    isPlaying: true,
    lastPageChangeAt: 0,
    now: () => 40_000,
    onReload() {},
    playablePageCount: 3,
    scheduleInterval() {
      return 1;
    },
    ...overrides
  };
}

test("startPlaybackWatchdogLoop reloads when active multi-page playback stalls past the grace window", () => {
  const scheduled: ScheduledTimer[] = [];
  let reloadCount = 0;

  const cleanup = startPlaybackWatchdogLoop(
    createOptions({
      onReload() {
        reloadCount += 1;
      },
      scheduleInterval(callback, ms) {
        scheduled.push({ callback, ms });
        return 1;
      }
    })
  );

  assert.equal(scheduled[0]?.ms, PLAYBACK_WATCHDOG_INTERVAL_MS);
  scheduled[0]?.callback();

  assert.equal(reloadCount, 1);
  cleanup();
});

test("startPlaybackWatchdogLoop does not reload when only one playable page exists", () => {
  let reloadCount = 0;

  const cleanup = startPlaybackWatchdogLoop(
    createOptions({
      onReload() {
        reloadCount += 1;
      },
      playablePageCount: 1
    })
  );

  assert.equal(reloadCount, 0);
  cleanup();
});

test("startPlaybackWatchdogLoop does not reload while playback is paused", () => {
  let reloadCount = 0;

  const cleanup = startPlaybackWatchdogLoop(
    createOptions({
      isPlaying: false,
      onReload() {
        reloadCount += 1;
      }
    })
  );

  assert.equal(reloadCount, 0);
  cleanup();
});

test("startPlaybackWatchdogLoop respects the configured grace window", () => {
  let reloadCount = 0;

  const cleanup = startPlaybackWatchdogLoop(
    createOptions({
      graceMs: PLAYBACK_STALL_GRACE_MS,
      now: () => 20_000,
      onReload() {
        reloadCount += 1;
      }
    })
  );

  assert.equal(reloadCount, 0);
  cleanup();
});
