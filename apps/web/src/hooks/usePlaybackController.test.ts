import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  resolveSafePlaybackBoundaryRuntime,
  type PlaybackPage,
  type PlaybackRuntime,
  type PlaybackSettings
} from "@solar-display/shared";
import { ApiRequestError } from "../services/api";
import {
  failClosedFormalPlaybackAccess,
  createInitialPlaybackScheduleGate,
  isDisplayContextAccessError,
  isLatestPlaybackLoadRequest,
  preparePendingScheduleBoundaryCurrent,
  resolveNextEffectivePlaybackTemplateKey,
  resolvePendingRuntimeAtTrustedBoundary,
  resolveDisplayRuntimeRefreshDelay,
  resolvePendingSchedulePausedMarker,
  resolvePlaybackScheduleGate,
  resolvePlaybackPageTemplateKey,
  resolvePlaybackRuntimeTick,
  shouldMarkSchedulePaused
} from "./usePlaybackController";

test("runtime refresh delay spreads clients across a bounded jitter window", () => {
  assert.equal(resolveDisplayRuntimeRefreshDelay(-1), 5_000);
  assert.equal(resolveDisplayRuntimeRefreshDelay(0.5), 6_000);
  assert.equal(resolveDisplayRuntimeRefreshDelay(2), 7_000);
});

const hookDir = path.resolve(import.meta.dirname);
const controllerSource = fs.readFileSync(path.join(hookDir, "usePlaybackController.ts"), "utf8");

test("usePlaybackController uses the authenticated Server runtime as the only formal page selection", () => {
  assert.match(controllerSource, /await getPlaybackRuntime\(\)/);
  assert.match(
    controllerSource,
    /runtimeResponse!\.settings, runtimeResponse!\.preview/
  );
  assert.match(controllerSource, /const runtimePages = rotationPreview\.playablePages;/);
  assert.match(controllerSource, /setFallbackRoute\(rotationPreview\.fallbackRoute\)/);
  assert.match(controllerSource, /setPages\(runtimePages\)/);
  assert.doesNotMatch(controllerSource, /getDisplayRotationPreview\(\)/);
  assert.doesNotMatch(
    controllerSource,
    /playablePages\.filter\([\s\S]{0,200}siteScope/
  );
});

test("usePlaybackController can defer management diagnostics with injected settings and preview", () => {
  assert.match(controllerSource, /enabled = options\.enabled \?\? true/);
  assert.match(
    controllerSource,
    /providedSettings !== null && providedRotationPreview !== null/
  );
  assert.match(controllerSource, /Promise\.resolve\(providedSettings\)/);
  assert.match(controllerSource, /Promise\.resolve\(providedRotationPreview\)/);
  assert.match(controllerSource, /\[enabled, options\.rotationPreview, options\.settings\]/);
});

test("usePlaybackController applies changed context through the shared safe boundary", () => {
  assert.match(controllerSource, /createSafePlaybackBoundaryPlan\(/);
  assert.match(controllerSource, /resolveSafePlaybackBoundaryRuntime\(/);
  assert.match(
    controllerSource,
    /runtimeResponse\.context\.contextRevision[\s\S]*runtimeResponse\.effectiveRotationRevision/
  );
  assert.match(controllerSource, /pendingRuntimeUpdateRef\.current\?\.identity !== identity/);
  assert.match(
    controllerSource,
    /window\.setTimeout\(async \(\) => \{[\s\S]*await loadPlayback\(\);[\s\S]*resolveDisplayRuntimeRefreshDelay\(Math\.random\(\)\)/
  );
  assert.doesNotMatch(controllerSource, /window\.location\.reload|location\.reload/);
});

test("a newer invalid Desired Version cancels an older pending rollout", () => {
  assert.match(
    controllerSource,
    /if \(runtimeResponse && rolloutValidationError\) \{\s*pendingRuntimeUpdateRef\.current = null;/
  );
});

test("usePlaybackController fails closed when Device context access is rejected", () => {
  assert.equal(
    isDisplayContextAccessError(
      new ApiRequestError("credential revoked", 403, {
        code: "credential_revoked"
      })
    ),
    true
  );
  assert.equal(
    isDisplayContextAccessError(new ApiRequestError("server error", 500, null)),
    false
  );
  const failedClosed = failClosedFormalPlaybackAccess();
  assert.deepEqual(failedClosed, {
    appliedRuntimeIdentity: null,
    displayClientContext: null,
    effectiveRotationRevision: null,
    fallbackRoute: null,
    pages: [],
    pendingRuntimeUpdate: null,
    rotationPreview: null,
    runtime: null,
    settings: null
  });
});

test("usePlaybackController ignores a response that resolves after a newer request", async () => {
  let latestRequestId = 0;
  let applied = "";
  let resolveFirst!: (value: string) => void;
  const first = new Promise<string>((resolve) => {
    resolveFirst = resolve;
  });
  const apply = async (requestId: number, response: Promise<string>) => {
    const value = await response;
    if (isLatestPlaybackLoadRequest(requestId, latestRequestId)) {
      applied = value;
    }
  };

  const firstRequestId = ++latestRequestId;
  const firstApply = apply(firstRequestId, first);
  const secondRequestId = ++latestRequestId;
  await apply(secondRequestId, Promise.resolve("new"));
  resolveFirst("old");
  await firstApply;

  assert.equal(applied, "new");
});

test("usePlaybackController prefetches the next effective playback template after rotation is known", () => {
  assert.match(controllerSource, /prefetchDisplayPageTemplate\(nextTemplateKey\)/);
  assert.match(controllerSource, /resolveNextEffectivePlaybackTemplateKey\(/);
  assert.match(controllerSource, /\[enabled, pages, runtime\?\.currentIndex, settings\?\.loop\]/);
});

test("usePlaybackController does not prefetch the next template when the playback schedule blocks it", () => {
  assert.match(
    controllerSource,
    /playbackScheduleGateRef\.current\.activeAllowed[\s\S]*?prefetchDisplayPageTemplate\(nextTemplateKey\)/
  );
});

const playbackSettings: PlaybackSettings = {
  autoplay: true,
  brightness: 80,
  enforceFreshRuntimeData: true,
  idleMode: "disabled",
  idleTimeout: 60,
  loop: true,
  orientation: "landscape",
  repeatDays: [],
  scheduleEnabled: false,
  scheduleEnd: null,
  scheduleStart: null,
  startPage: 1,
  transitionSpeed: 600,
  transitionType: "fade",
  updatedAt: null
};

const playbackPages: PlaybackPage[] = [
  {
    displayOrder: 1,
    durationSeconds: 15,
    enabled: true,
    id: 1,
    labelEn: "Overview",
    labelZh: "總覽",
    pageKey: "overview",
    route: "/overview"
  },
  {
    displayOrder: 2,
    durationSeconds: 20,
    enabled: true,
    id: 2,
    labelEn: "Solar",
    labelZh: "太陽能",
    pageKey: "solar",
    route: "/solar"
  }
];

const runtime: PlaybackRuntime = {
  countdownMs: 15_000,
  currentIndex: 0,
  isIdle: false,
  isPlaying: true,
  lastInteractionAt: 1_000
};

test("boundary playback ticks keep the same runtime until a page boundary is reached", () => {
  const nextRuntime = resolvePlaybackRuntimeTick({
    current: runtime,
    elapsedMs: 14_000,
    pages: playbackPages,
    settings: playbackSettings,
    tickMode: "boundary",
    tickMs: 250,
    nowMs: 15_000
  });

  assert.equal(nextRuntime, runtime);
});

test("boundary playback ticks advance only when the page boundary is reached", () => {
  const nextRuntime = resolvePlaybackRuntimeTick({
    current: runtime,
    elapsedMs: 15_000,
    pages: playbackPages,
    settings: playbackSettings,
    tickMode: "boundary",
    tickMs: 250,
    nowMs: 16_000
  });

  assert.notEqual(nextRuntime, runtime);
  assert.equal(nextRuntime.currentIndex, 1);
  assert.equal(nextRuntime.countdownMs, 20_000);
  assert.equal(nextRuntime.isPlaying, true);
});

test("waiting and time-untrusted freeze the last schedule result", () => {
  const waiting = resolvePlaybackScheduleGate({
    atSafeBoundary: false,
    current: {
      activeAllowed: true,
      pendingAllowed: null
    },
    settings: {
      ...playbackSettings,
      scheduleEnabled: true,
      scheduleStart: "09:00",
      scheduleEnd: "17:00"
    },
    snapshot: {
      lastSignalMonotonicMs: null,
      nowEpochMs: null,
      state: "waiting"
    }
  });
  const untrusted = resolvePlaybackScheduleGate({
    atSafeBoundary: true,
    current: waiting,
    settings: playbackSettings,
    snapshot: {
      lastSignalMonotonicMs: 0,
      nowEpochMs: 1_800_000,
      state: "time-untrusted"
    }
  });

  assert.deepEqual(waiting, {
    activeAllowed: true,
    pendingAllowed: null
  });
  assert.deepEqual(untrusted, waiting);
});

test("trusted App Time defers a blocking schedule change until the page boundary", () => {
  const settings = {
    ...playbackSettings,
    repeatDays: [4],
    scheduleEnabled: true,
    scheduleStart: "09:00",
    scheduleEnd: "17:00"
  };
  const outsideSchedule = {
    lastSignalMonotonicMs: 0,
    nowEpochMs: Date.parse("2026-07-30T18:00:00+08:00"),
    state: "synced" as const
  };

  const beforeBoundary = resolvePlaybackScheduleGate({
    atSafeBoundary: false,
    current: {
      activeAllowed: true,
      pendingAllowed: null
    },
    settings,
    snapshot: outsideSchedule
  });
  const atBoundary = resolvePlaybackScheduleGate({
    atSafeBoundary: true,
    current: beforeBoundary,
    settings,
    snapshot: outsideSchedule
  });

  assert.deepEqual(beforeBoundary, {
    activeAllowed: true,
    pendingAllowed: false
  });
  assert.deepEqual(atBoundary, {
    activeAllowed: false,
    pendingAllowed: null
  });
});

test("relative rotation uses monotonic elapsed time while App Time is waiting", () => {
  const gate = resolvePlaybackScheduleGate({
    atSafeBoundary: true,
    current: {
      activeAllowed: true,
      pendingAllowed: null
    },
    settings: playbackSettings,
    snapshot: {
      lastSignalMonotonicMs: null,
      nowEpochMs: null,
      state: "waiting"
    }
  });
  const nextRuntime = resolvePlaybackRuntimeTick({
    current: runtime,
    elapsedMs: 15_000,
    pages: playbackPages,
    scheduleAllowed: gate.activeAllowed,
    settings: playbackSettings,
    tickMode: "boundary",
    tickMs: 250,
    nowMs: 123_456
  });

  assert.equal(nextRuntime.currentIndex, 1);
  assert.equal(nextRuntime.countdownMs, 20_000);
});

test("initial trusted App Time blocks autoplay before the first runtime is created", () => {
  const gate = createInitialPlaybackScheduleGate(
    {
      ...playbackSettings,
      repeatDays: [4],
      scheduleEnabled: true,
      scheduleStart: "09:00",
      scheduleEnd: "17:00"
    },
    {
      lastSignalMonotonicMs: 0,
      nowEpochMs: Date.parse("2026-07-30T18:00:00+08:00"),
      state: "synced"
    }
  );

  assert.deepEqual(gate, {
    activeAllowed: false,
    pendingAllowed: null
  });
});

test("a blocking schedule transition leaves the page at the boundary and can resume autoplay", () => {
  const stopped = resolvePlaybackRuntimeTick({
    current: runtime,
    elapsedMs: 15_000,
    nowMs: 16_000,
    pages: playbackPages,
    scheduleAllowed: false,
    settings: playbackSettings,
    tickMode: "boundary",
    tickMs: 250
  });
  const resumed = resolvePlaybackRuntimeTick({
    current: stopped,
    elapsedMs: 0,
    nowMs: 16_001,
    pages: playbackPages,
    resumeAutoplay: true,
    scheduleAllowed: true,
    settings: playbackSettings,
    tickMode: "boundary",
    tickMs: 250
  });

  assert.equal(stopped.currentIndex, 1);
  assert.equal(stopped.isPlaying, false);
  assert.equal(resumed.currentIndex, 1);
  assert.equal(resumed.isPlaying, true);
});

test("time-untrusted resumes schedule-paused relative rotation without applying absolute updates", () => {
  const snapshot = {
    lastSignalMonotonicMs: 0,
    nowEpochMs: 1_800_000,
    state: "time-untrusted" as const
  };
  let boundaryCalls = 0;
  const pendingResult = resolvePendingRuntimeAtTrustedBoundary(
    snapshot,
    () => {
      boundaryCalls += 1;
      return "applied";
    }
  );
  const resumed = resolvePlaybackRuntimeTick({
    current: {
      ...runtime,
      isPlaying: false
    },
    elapsedMs: 0,
    nowMs: 1_800_000,
    pages: playbackPages,
    resumeAutoplay: true,
    scheduleAllowed: true,
    settings: playbackSettings,
    tickMode: "boundary",
    tickMs: 250
  });

  assert.equal(pendingResult, null);
  assert.equal(boundaryCalls, 0);
  assert.equal(resumed.isPlaying, true);
});

test("pending absolute runtime updates recover only after App Time is trusted", () => {
  let boundaryCalls = 0;
  const result = resolvePendingRuntimeAtTrustedBoundary(
    {
      lastSignalMonotonicMs: 0,
      nowEpochMs: 90_000,
      state: "stale"
    },
    () => {
      boundaryCalls += 1;
      return "applied";
    }
  );

  assert.equal(result, "applied");
  assert.equal(boundaryCalls, 1);
});

test("pending runtime uses its own schedule eligibility at the safe boundary", () => {
  const snapshot = {
    lastSignalMonotonicMs: 0,
    nowEpochMs: Date.parse("2026-07-30T18:00:00+08:00"),
    state: "synced" as const
  };
  const pendingSettings = {
    ...playbackSettings,
    repeatDays: [4],
    scheduleEnabled: true,
    scheduleStart: "09:00",
    scheduleEnd: "17:00"
  };
  const pendingGate = createInitialPlaybackScheduleGate(
    pendingSettings,
    snapshot
  );
  const boundaryRuntime = resolveSafePlaybackBoundaryRuntime({
    current: runtime,
    nextPages: playbackPages,
    nowMs: 15_000,
    plan: {
      applyAtMs: 15_000,
      applyByMs: 15_000,
      currentPageId: 1,
      currentPageRemainsValid: true,
      receivedAtMs: 0
    },
    scheduleAllowed: pendingGate.activeAllowed,
    settings: pendingSettings
  });

  assert.equal(pendingGate.activeAllowed, false);
  assert.equal(boundaryRuntime?.currentIndex, 1);
  assert.equal(boundaryRuntime?.isPlaying, false);
});

test("schedule pause marker survives blocked to untrusted to blocked to allowed", () => {
  const firstBlocked = resolvePlaybackRuntimeTick({
    current: runtime,
    elapsedMs: 15_000,
    nowMs: 15_000,
    pages: playbackPages,
    scheduleAllowed: false,
    settings: playbackSettings,
    tickMode: "boundary",
    tickMs: 250
  });
  let schedulePaused = shouldMarkSchedulePaused(
    runtime,
    firstBlocked,
    false
  );
  const untrustedResumed = resolvePlaybackRuntimeTick({
    current: firstBlocked,
    elapsedMs: 0,
    nowMs: 15_001,
    pages: playbackPages,
    resumeAutoplay: schedulePaused,
    scheduleAllowed: true,
    settings: playbackSettings,
    tickMode: "boundary",
    tickMs: 250
  });
  schedulePaused = false;
  const trustedStillBlocked = resolvePlaybackRuntimeTick({
    current: untrustedResumed,
    elapsedMs: 20_000,
    nowMs: 35_001,
    pages: playbackPages,
    scheduleAllowed: false,
    settings: playbackSettings,
    tickMode: "boundary",
    tickMs: 250
  });
  schedulePaused = shouldMarkSchedulePaused(
    untrustedResumed,
    trustedStillBlocked,
    false
  );
  const allowedAgain = resolvePlaybackRuntimeTick({
    current: trustedStillBlocked,
    elapsedMs: 0,
    nowMs: 35_002,
    pages: playbackPages,
    resumeAutoplay: schedulePaused,
    scheduleAllowed: true,
    settings: playbackSettings,
    tickMode: "boundary",
    tickMs: 250
  });

  assert.equal(firstBlocked.isPlaying, false);
  assert.equal(untrustedResumed.isPlaying, true);
  assert.equal(trustedStillBlocked.isPlaying, false);
  assert.equal(schedulePaused, true);
  assert.equal(allowedAgain.isPlaying, true);
});

test("pending allowed settings resume a schedule-paused runtime and clear its marker", () => {
  const schedulePausedRuntime = {
    ...runtime,
    isPlaying: false
  };
  const pendingCurrent = preparePendingScheduleBoundaryCurrent(
    schedulePausedRuntime,
    {
      autoplay: true,
      scheduleAllowed: true,
      schedulePaused: true
    }
  );
  const boundaryRuntime = resolveSafePlaybackBoundaryRuntime({
    current: pendingCurrent,
    nextPages: playbackPages,
    nowMs: 15_000,
    plan: {
      applyAtMs: 15_000,
      applyByMs: 15_000,
      currentPageId: 1,
      currentPageRemainsValid: true,
      receivedAtMs: 0
    },
    scheduleAllowed: true,
    settings: playbackSettings
  });
  assert.ok(boundaryRuntime);

  assert.equal(boundaryRuntime.isPlaying, true);
  assert.equal(
    resolvePendingSchedulePausedMarker(
      schedulePausedRuntime,
      boundaryRuntime,
      {
        scheduleAllowed: true,
        schedulePaused: true
      }
    ),
    false
  );
});

test("pending blocked settings retain schedule-paused provenance", () => {
  const schedulePausedRuntime = {
    ...runtime,
    isPlaying: false
  };
  const pendingCurrent = preparePendingScheduleBoundaryCurrent(
    schedulePausedRuntime,
    {
      autoplay: true,
      scheduleAllowed: false,
      schedulePaused: true
    }
  );

  assert.equal(pendingCurrent, schedulePausedRuntime);
  assert.equal(
    resolvePendingSchedulePausedMarker(
      schedulePausedRuntime,
      schedulePausedRuntime,
      {
        scheduleAllowed: false,
        schedulePaused: true
      }
    ),
    true
  );
});

const rotationPages: PlaybackPage[] = [
  {
    displayOrder: 1,
    durationSeconds: 15,
    enabled: true,
    id: 1,
    labelEn: "Overview",
    labelZh: "總覽",
    pageKey: "overview",
    route: "/overview",
    templateKey: "overview"
  },
  {
    displayOrder: 2,
    durationSeconds: 20,
    enabled: false,
    id: 2,
    labelEn: "Solar Disabled",
    labelZh: "太陽能停用",
    pageKey: "solar",
    route: "/solar",
    templateKey: "solar"
  },
  {
    displayOrder: 3,
    durationSeconds: 18,
    enabled: true,
    id: 3,
    labelEn: "Images",
    labelZh: "綠能影像",
    pageKey: "images",
    route: "/images",
    templateKey: "images"
  },
  {
    displayOrder: 4,
    durationSeconds: 22,
    enabled: true,
    id: 4,
    labelEn: "Sustainability",
    labelZh: "永續",
    pageKey: "sustainability",
    route: "/sustainability",
    templateKey: "sustainability"
  }
];

test("next effective playback template skips disabled pages", () => {
  assert.equal(
    resolveNextEffectivePlaybackTemplateKey({
      currentIndex: 0,
      loop: true,
      pages: rotationPages
    }),
    "images"
  );
});

test("next effective playback template wraps at the loop edge", () => {
  assert.equal(
    resolveNextEffectivePlaybackTemplateKey({
      currentIndex: 2,
      loop: true,
      pages: rotationPages
    }),
    "overview"
  );
});

test("next effective playback template stays on the last page without loop", () => {
  assert.equal(
    resolveNextEffectivePlaybackTemplateKey({
      currentIndex: 2,
      loop: false,
      pages: rotationPages
    }),
    "sustainability"
  );
});

test("next effective playback template falls back to pageKey when templateKey is absent", () => {
  assert.equal(
    resolvePlaybackPageTemplateKey({
      displayOrder: 1,
      durationSeconds: 15,
      enabled: true,
      id: 9,
      labelEn: "Factory",
      labelZh: "迴路",
      pageKey: "factory-circuit-guanyin",
      route: "/factory-circuit-guanyin"
    }),
    "factory-circuit"
  );
});

test("next effective playback template returns null when no playable pages remain", () => {
  assert.equal(
    resolveNextEffectivePlaybackTemplateKey({
      currentIndex: 0,
      loop: true,
      pages: rotationPages.map((page) => ({ ...page, enabled: false }))
    }),
    null
  );
});

test("scheduled refresh reconciles against the route active at call time", () => {
  // The periodic refresh effect is not re-created when the route changes, so a
  // reload that captured `options.currentPath` would keep reconciling against
  // the route that was active when the loop was established — snapping playback
  // back to it on every refresh. Reading through a ref removes that capture.
  // Synced in an effect, not during render: a ref written while rendering can
  // retain the route of a render that concurrent React later discards.
  assert.match(
    controllerSource,
    /useEffect\(\(\) => \{\s*currentPathRef\.current = options\.currentPath;\s*\}, \[options\.currentPath\]\);/,
    "the route ref must be synced in an effect, not during render"
  );
  assert.match(
    controllerSource,
    /currentPath: currentPathRef\.current/,
    "refresh reconciliation must read the route at call time"
  );
  assert.doesNotMatch(
    controllerSource,
    /currentPath: options\.currentPath,\s*\n\s*currentRuntime/,
    "refresh reconciliation must not capture the render-time route"
  );
});
