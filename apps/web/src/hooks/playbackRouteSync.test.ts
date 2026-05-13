import assert from "node:assert/strict";
import test from "node:test";
import type { PlaybackPage, PlaybackRuntime } from "@solar-display/shared";
import { resolveRouteRuntimeSync } from "./playbackRouteSync";

const pages: PlaybackPage[] = [
  {
    id: 1,
    pageKey: "overview",
    route: "/overview",
    labelZh: "總覽",
    labelEn: "Overview",
    enabled: true,
    displayOrder: 1,
    durationSeconds: 15
  },
  {
    id: 2,
    pageKey: "solar",
    route: "/solar",
    labelZh: "太陽能",
    labelEn: "Solar",
    enabled: true,
    displayOrder: 2,
    durationSeconds: 15
  }
];

test("does not sync runtime back to the same path during autoplay ticks", () => {
  const runtime: PlaybackRuntime = {
    currentIndex: 1,
    countdownMs: 14_500,
    isIdle: false,
    isPlaying: true,
    lastInteractionAt: 123
  };

  assert.equal(
    resolveRouteRuntimeSync({
      currentPath: "/overview",
      lastSyncedPath: "/overview",
      pages,
      runtime
    }),
    null
  );
});

test("syncs runtime to the new route when pathname actually changes", () => {
  const runtime: PlaybackRuntime = {
    currentIndex: 0,
    countdownMs: 5_000,
    isIdle: false,
    isPlaying: true,
    lastInteractionAt: 123
  };

  const nextRuntime = resolveRouteRuntimeSync({
    currentPath: "/solar",
    lastSyncedPath: "/overview",
    pages,
    runtime
  });

  assert.ok(nextRuntime);
  assert.equal(nextRuntime.countdownMs, 15_000);
  assert.equal(nextRuntime.currentIndex, 1);
  assert.equal(nextRuntime.isIdle, false);
  assert.equal(nextRuntime.isPlaying, true);
  assert.ok(nextRuntime.lastInteractionAt >= runtime.lastInteractionAt);
});
