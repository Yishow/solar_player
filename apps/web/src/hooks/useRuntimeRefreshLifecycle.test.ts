import assert from "node:assert/strict";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import test from "node:test";
import {
  createRuntimeRefreshState,
  markRuntimeRefreshLoading,
  resolveRuntimeRefreshFailure,
  resolveRuntimeRefreshSuccess,
  shouldApplyRuntimeRefreshResult,
  useRuntimeRefreshLifecycle
} from "./useRuntimeRefreshLifecycle";
import {
  readDisplayRuntimeSyncSnapshot,
  resetDisplayRuntimeSyncSnapshotForTests
} from "../services/displayRuntimeSyncReporter";

type ScheduledRetry = {
  callback: () => void;
  delay: number;
  id: number;
};

function createScheduler() {
  const scheduled: ScheduledRetry[] = [];
  const cancelled = new Set<number>();
  let nextId = 0;

  return {
    scheduled,
    cancelled,
    schedule(callback: () => void, delay: number) {
      const entry = { callback, delay, id: nextId++ };
      scheduled.push(entry);
      return entry.id as unknown as ReturnType<typeof setTimeout>;
    },
    cancel(timer: ReturnType<typeof setTimeout>) {
      cancelled.add(timer as unknown as number);
    },
    flushNext() {
      const entry = scheduled.shift();
      assert.ok(entry);
      if (!cancelled.has(entry.id)) {
        entry.callback();
      }
    }
  };
}

async function mountLifecycle(options: Record<string, unknown>) {
  const dom = new JSDOM(
    "<!doctype html><html><body><div id=\"root\"></div></body></html>",
    { url: "http://127.0.0.1/", pretendToBeVisual: true }
  );
  Object.defineProperty(globalThis, "window", { configurable: true, value: dom.window });
  Object.defineProperty(globalThis, "document", { configurable: true, value: dom.window.document });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  let root: Root | null = createRoot(dom.window.document.getElementById("root")!);
  const render = () => React.createElement(TestLifecycle, options);
  await act(async () => {
    root!.render(render());
    await Promise.resolve();
    await Promise.resolve();
  });
  return {
    root,
    dom,
    unmount: async () => {
      await act(async () => root?.unmount());
      dom.window.close();
    }
  };
}

function TestLifecycle(props: Record<string, unknown>) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const lifecycle = requireLifecycle(props);
  return React.createElement("output", { "data-state": lifecycle.errorMessage });
}

function requireLifecycle(props: Record<string, unknown>) {
  // Kept in a separate function so the test harness remains expression-only in .ts.
  return useRuntimeRefreshLifecycle(props as never);
}

test("shared runtime lifecycle marks bootstrap loads consistently before first payload resolves", () => {
  const nextState = markRuntimeRefreshLoading(createRuntimeRefreshState<unknown>());

  assert.equal(nextState.isLoading, true);
  assert.equal(nextState.isRefreshing, false);
  assert.equal(nextState.usesFallback, false);
  assert.equal(nextState.payload, null);
});

test("shared runtime lifecycle preserves the last payload and marks fallback on refresh failure", () => {
  const resolvedState = resolveRuntimeRefreshSuccess(
    markRuntimeRefreshLoading(createRuntimeRefreshState({ greeting: "hello" })),
    { greeting: "hello" },
    "2026-05-20T00:00:00.000Z"
  );
  const failedState = resolveRuntimeRefreshFailure(
    markRuntimeRefreshLoading(resolvedState, { refreshing: true }),
    "runtime source failed"
  );

  assert.deepEqual(failedState.payload, { greeting: "hello" });
  assert.equal(failedState.isLoading, false);
  assert.equal(failedState.isRefreshing, false);
  assert.equal(failedState.usesFallback, true);
  assert.equal(failedState.errorMessage, "runtime source failed");
});

test("shared runtime lifecycle starts from an initial payload without blocking first render", () => {
  const initialState = createRuntimeRefreshState({ greeting: "cached" });
  const loadingState = markRuntimeRefreshLoading(initialState);

  assert.deepEqual(initialState.payload, { greeting: "cached" });
  assert.equal(initialState.isLoading, false);
  assert.equal(loadingState.isLoading, false);
  assert.equal(loadingState.isRefreshing, true);
  assert.deepEqual(loadingState.payload, { greeting: "cached" });
});

test("shared runtime lifecycle ignores stale request results", () => {
  assert.equal(shouldApplyRuntimeRefreshResult(2, 2), true);
  assert.equal(shouldApplyRuntimeRefreshResult(3, 2), false);
});

test("display runtime retries with 2/4/8/16/32/60 second bounded backoff", async () => {
  resetDisplayRuntimeSyncSnapshotForTests();
  const scheduler = createScheduler();
  let loads = 0;
  const harness = await mountLifecycle({
    enabled: true,
    load: async () => {
      loads += 1;
      throw new Error(`failure-${loads}`);
    },
    refreshKey: "initial",
    runtimeSyncPageKey: "overview",
    shouldRefresh: () => true,
    scheduleRetry: scheduler.schedule,
    cancelRetry: scheduler.cancel,
    subscribeDisplaySync: () => () => {}
  });

  try {
    for (const delay of [2_000, 4_000, 8_000, 16_000, 32_000, 60_000, 60_000]) {
      assert.equal(scheduler.scheduled[0]?.delay, delay);
      await act(async () => {
        scheduler.flushNext();
        await Promise.resolve();
        await Promise.resolve();
      });
    }
    assert.equal(loads, 8);
  } finally {
    await harness.unmount();
  }
});

test("display runtime resets backoff after success and cancels a pending retry on new load", async () => {
  resetDisplayRuntimeSyncSnapshotForTests();
  const scheduler = createScheduler();
  let loads = 0;
  let resolveLoad!: (value: string) => void;
  const harness = await mountLifecycle({
    enabled: true,
    load: () => {
      loads += 1;
      if (loads === 1) {
        return Promise.reject(new Error("temporary"));
      }
      if (loads === 2) {
        return new Promise<string>((resolve) => {
          resolveLoad = resolve;
        });
      }
      return Promise.reject(new Error("again"));
    },
    refreshKey: "initial",
    runtimeSyncPageKey: "solar",
    shouldRefresh: () => true,
    scheduleRetry: scheduler.schedule,
    cancelRetry: scheduler.cancel,
    subscribeDisplaySync: () => () => {}
  });

  try {
    assert.equal(scheduler.scheduled[0]?.delay, 2_000);
    await act(async () => {
      scheduler.flushNext();
      await Promise.resolve();
      await Promise.resolve();
    });
    assert.equal(loads, 2);
    assert.equal(scheduler.scheduled.length, 0);
    resolveLoad("ok");
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => {
      harness.root!.render(React.createElement(TestLifecycle, {
        enabled: true,
        load: async () => {
          loads += 1;
          throw new Error("again");
        },
        refreshKey: "changed",
        runtimeSyncPageKey: "solar",
        shouldRefresh: () => true,
        scheduleRetry: scheduler.schedule,
        cancelRetry: scheduler.cancel,
        subscribeDisplaySync: () => () => {}
      }));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    assert.equal(scheduler.scheduled[0]?.delay, 2_000);
    await act(async () => {
      harness.root!.render(React.createElement(TestLifecycle, {
        enabled: true,
        load: async () => "manual",
        refreshKey: "changed-again",
        runtimeSyncPageKey: "solar",
        shouldRefresh: () => true,
        scheduleRetry: scheduler.schedule,
        cancelRetry: scheduler.cancel,
        subscribeDisplaySync: () => () => {}
      }));
      await Promise.resolve();
      await Promise.resolve();
    });
    assert.ok(scheduler.cancelled.size >= 1);
  } finally {
    await harness.unmount();
  }
});

test("unmount cancels pending retry and page-less lifecycle neither retries nor reports", async () => {
  resetDisplayRuntimeSyncSnapshotForTests();
  const scheduler = createScheduler();
  let loads = 0;
  const harness = await mountLifecycle({
    enabled: true,
    load: async () => {
      loads += 1;
      throw new Error("offline");
    },
    refreshKey: "initial",
    runtimeSyncPageKey: "images",
    shouldRefresh: () => true,
    scheduleRetry: scheduler.schedule,
    cancelRetry: scheduler.cancel,
    subscribeDisplaySync: () => () => {}
  });
  await harness.unmount();
  scheduler.flushNext();
  assert.equal(loads, 1);

  resetDisplayRuntimeSyncSnapshotForTests();
  const noKeyScheduler = createScheduler();
  const noKeyHarness = await mountLifecycle({
    enabled: true,
    load: async () => {
      throw new Error("offline");
    },
    refreshKey: "initial",
    shouldRefresh: () => true,
    scheduleRetry: noKeyScheduler.schedule,
    cancelRetry: noKeyScheduler.cancel,
    subscribeDisplaySync: () => () => {}
  });
  try {
    assert.equal(noKeyScheduler.scheduled.length, 0);
    assert.deepEqual(readDisplayRuntimeSyncSnapshot(), {
      runtimeSyncState: "unknown",
      runtimeSyncPageKey: null,
      runtimeSyncResolvedAt: null,
      runtimeSyncError: null
    });
  } finally {
    await noKeyHarness.unmount();
  }
});
