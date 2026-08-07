import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import type { DisplaySyncEvent } from "@solar-display/shared";
import { createDisplaySyncPlaybackReloadCoordinator } from "./displaySyncPlaybackReload";

const hookDir = path.resolve(import.meta.dirname);
const controllerSource = fs.readFileSync(
  path.join(hookDir, "usePlaybackController.ts"),
  "utf8"
);
const rotationSource = fs.readFileSync(
  path.join(hookDir, "usePageRotation.ts"),
  "utf8"
);

/**
 * Minimal stand-in for React's effect dependency semantics: the setup runs on
 * mount and re-runs (after cleanup) whenever any dependency changes identity.
 * This repo has no hook renderer, so this models the one behavior under test —
 * a dependency that changes every render tears the effect down every render.
 */
function createEffectHost() {
  let cleanup: (() => void) | null = null;
  let previousDeps: unknown[] | null = null;
  let setupCount = 0;

  return {
    get setupCount() {
      return setupCount;
    },
    render(deps: unknown[], setup: () => () => void) {
      const unchanged =
        previousDeps !== null
        && previousDeps.length === deps.length
        && previousDeps.every((dep, index) => Object.is(dep, deps[index]));

      if (unchanged) {
        return;
      }

      cleanup?.();
      previousDeps = deps;
      setupCount += 1;
      cleanup = setup();
    }
  };
}

const SYNC_EVENT = {
  generatedAt: "2026-08-06T10:00:00.000Z",
  reason: "display-pages-updated",
  scope: "display-pages"
} as DisplaySyncEvent;

async function runSyncBurstAcrossRenders(options: { stableReload: boolean }) {
  const host = createEffectHost();
  let reloadCount = 0;
  const reload = async () => {
    reloadCount += 1;
  };
  let notify: ((event: DisplaySyncEvent) => void) | null = null;

  const renderOnce = () => {
    // An unstable reload is a fresh closure per render, exactly like a plain
    // function declared in the component body.
    const reloadForThisRender = options.stableReload ? reload : async () => reload();

    host.render([reloadForThisRender], () => {
      const coordinator = createDisplaySyncPlaybackReloadCoordinator({
        reloadPlayback: reloadForThisRender
      });
      notify = (event) => coordinator.notify(event);
      return () => coordinator.dispose();
    });
  };

  renderOnce();
  notify!(SYNC_EVENT);

  // A re-render lands inside the 50ms debounce window — the controller sets
  // loading state on every reload cycle, so this is the normal case, not a race.
  renderOnce();

  await new Promise((resolve) => setTimeout(resolve, 120));
  return { reloadCount, setupCount: host.setupCount };
}

/**
 * Spec scenario: "A burst of sync events spans several re-renders".
 * Sends several events while re-rendering between each, and tracks concurrency
 * so the "SHALL NOT spawn overlapping runtime refreshes" clause is asserted too.
 */
async function runSyncBurst(options: { events: number; stableReload: boolean }) {
  const host = createEffectHost();
  let reloadCount = 0;
  let inFlight = 0;
  let maxConcurrent = 0;
  const reload = async () => {
    reloadCount += 1;
    inFlight += 1;
    maxConcurrent = Math.max(maxConcurrent, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 10));
    inFlight -= 1;
  };
  let notify: ((event: DisplaySyncEvent) => void) | null = null;

  const renderOnce = () => {
    const reloadForThisRender = options.stableReload ? reload : async () => reload();
    host.render([reloadForThisRender], () => {
      const coordinator = createDisplaySyncPlaybackReloadCoordinator({
        reloadPlayback: reloadForThisRender
      });
      notify = (event) => coordinator.notify(event);
      return () => coordinator.dispose();
    });
  };

  renderOnce();
  for (let index = 0; index < options.events; index += 1) {
    notify!(SYNC_EVENT);
    renderOnce();
  }

  await new Promise((resolve) => setTimeout(resolve, 200));
  return { maxConcurrent, reloadCount, setupCount: host.setupCount };
}

test("a burst of sync events across re-renders yields one reload cycle", async () => {
  const burst = await runSyncBurst({ events: 5, stableReload: true });

  assert.equal(burst.setupCount, 1, "a stable reload must not rebuild the coordinator");
  assert.equal(
    burst.reloadCount,
    1,
    `a burst must collapse into one reload cycle, got ${burst.reloadCount}`
  );
  assert.equal(
    burst.maxConcurrent,
    1,
    "overlapping runtime refreshes must never be spawned"
  );
});

test("an unstable reload turns a burst into per-render coordinators", async () => {
  const burst = await runSyncBurst({ events: 5, stableReload: false });

  // Documents the defect: each render gets a fresh coordinator, so the burst is
  // no longer coalesced by a single debounce window.
  assert.ok(
    burst.setupCount > 1,
    "unstable deps rebuild the coordinator on every render"
  );
});

test("a sync event survives a re-render inside the debounce window", async () => {
  const stable = await runSyncBurstAcrossRenders({ stableReload: true });

  assert.equal(stable.setupCount, 1, "a stable reload must not rebuild the coordinator");
  assert.equal(stable.reloadCount, 1, "the pending reload must still run");
});

test("an unstable reload identity drops the pending reload", async () => {
  const unstable = await runSyncBurstAcrossRenders({ stableReload: false });

  // Documents the defect this change fixes: the coordinator is rebuilt per
  // render and the debounced event is cleared away with the old timer.
  assert.ok(unstable.setupCount > 1, "unstable deps rebuild the coordinator");
  assert.equal(unstable.reloadCount, 0, "the pending reload is lost");
});

test("usePlaybackController exposes a reload with a stable identity", () => {
  assert.match(
    controllerSource,
    /const loadPlayback = useCallback\(/,
    "loadPlayback must be memoized so consumers can use it as an effect dependency"
  );
  assert.match(controllerSource, /import \{[^}]*\buseCallback\b[^}]*\} from "react"/);
});

test("usePageRotation depends on the controller reload without rewrapping it", () => {
  assert.match(rotationSource, /\[controller\.reload\]/);
});

test("usePageRotation seeds the initial previous route from the current path so first-load mismatches can redirect", () => {
  assert.match(
    rotationSource,
    /if \(previousControllerRouteRef\.current === undefined\) \{\s+previousControllerRouteRef\.current = options\.currentPath;\s+\}/
  );
});

test("usePageRotation reloads playback runtime from relevant display sync scopes through the shared coordinator", () => {
  assert.match(rotationSource, /subscribeSocketEvent\("display:sync"/);
  assert.match(rotationSource, /createDisplaySyncPlaybackReloadCoordinator\(/);
  assert.match(rotationSource, /coordinator\.notify\(event\)/);
});

test("usePageRotation keeps shell route rotation on boundary ticks instead of visual countdown ticks", () => {
  assert.match(rotationSource, /tickMode: "boundary"/);
});
