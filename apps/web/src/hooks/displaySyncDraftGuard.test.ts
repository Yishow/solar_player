import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import type { DisplaySyncEvent } from "@solar-display/shared";
import {
  applyDisplaySyncDraftGuard,
  discardPendingDisplaySyncDraft,
  keepPendingDisplaySyncDraft,
  useDisplaySyncDraftGuard,
  type DisplaySyncReloadResult
} from "./displaySyncDraftGuard";

test("dirty surface defers display sync reload and marks remote change pending", async () => {
  let reloadCount = 0;

  const result = await applyDisplaySyncDraftGuard(
    { hasPendingRemoteChange: false },
    {
      event: {
        generatedAt: "2026-05-20T00:00:00.000Z",
        reason: "draft-guard-test",
        scope: "display-pages"
      },
      isDirty: true,
      relevantScopes: ["display-pages"],
      reloadNow: async () => {
        reloadCount += 1;
      }
    }
  );

  assert.equal(result.outcome, "deferred");
  assert.equal(reloadCount, 0);
  assert.equal(result.nextState.hasPendingRemoteChange, true);
});

test("clean surface reloads immediately on display sync", async () => {
  let reloadCount = 0;

  const result = await applyDisplaySyncDraftGuard(
    { hasPendingRemoteChange: true },
    {
      event: {
        generatedAt: "2026-05-20T00:00:00.000Z",
        reason: "draft-guard-test",
        scope: "display-pages"
      },
      isDirty: false,
      relevantScopes: ["display-pages"],
      reloadNow: async () => {
        reloadCount += 1;
      }
    }
  );

  assert.equal(result.outcome, "reloaded");
  assert.equal(reloadCount, 1);
  assert.equal(result.nextState.hasPendingRemoteChange, false);
});

test("a clean reload that defers during flight keeps the remote change pending", async () => {
  const result = await applyDisplaySyncDraftGuard(
    { hasPendingRemoteChange: false },
    {
      event: {
        generatedAt: "2026-05-20T00:00:00.000Z",
        reason: "draft-guard-test",
        scope: "display-pages"
      },
      isDirty: false,
      relevantScopes: ["display-pages"],
      reloadNow: async () => ({ operationToken: 2, outcome: "deferred" })
    }
  );

  assert.equal(result.outcome, "deferred");
  assert.equal(result.nextState.hasPendingRemoteChange, true);
});

test("an obsolete reload completion cannot clear the current pending state", async () => {
  const state = { hasPendingRemoteChange: true };
  const result = await applyDisplaySyncDraftGuard(state, {
    event: {
      generatedAt: "2026-05-20T00:00:00.000Z",
      reason: "draft-guard-test",
      scope: "display-pages"
    },
    isDirty: false,
    relevantScopes: ["display-pages"],
    reloadNow: async () => ({ operationToken: 1, outcome: "stale" })
  });

  assert.equal(result.outcome, "ignored");
  assert.equal(result.nextState, state);
});

test("irrelevant display sync scopes keep the current draft state untouched", async () => {
  let reloadCount = 0;

  const result = await applyDisplaySyncDraftGuard(
    { hasPendingRemoteChange: false },
    {
      event: {
        generatedAt: "2026-05-20T00:00:00.000Z",
        reason: "draft-guard-test",
        scope: "images"
      },
      isDirty: true,
      relevantScopes: ["display-pages"],
      reloadNow: async () => {
        reloadCount += 1;
      }
    }
  );

  assert.equal(result.outcome, "ignored");
  assert.equal(reloadCount, 0);
  assert.equal(result.nextState.hasPendingRemoteChange, false);
});

test("keep editing preserves the pending remote-change state", () => {
  assert.deepEqual(
    keepPendingDisplaySyncDraft({ hasPendingRemoteChange: true }),
    { hasPendingRemoteChange: true }
  );
});

test("discarding a pending remote change reloads and clears the pending state", async () => {
  let reloadCount = 0;
  let discardDraft = false;

  const result = await discardPendingDisplaySyncDraft(
    { hasPendingRemoteChange: true },
    async (context) => {
      reloadCount += 1;
      discardDraft = context?.discardDraft ?? false;
      return { operationToken: 3, outcome: "committed" };
    }
  );

  assert.equal(result.outcome, "reloaded");
  assert.equal(reloadCount, 1);
  assert.equal(discardDraft, true);
  assert.equal(result.nextState.hasPendingRemoteChange, false);
});

test("discard followed by a new local mutation keeps pending when reload defers", async () => {
  const result = await discardPendingDisplaySyncDraft(
    { hasPendingRemoteChange: true },
    async () => ({ operationToken: 4, outcome: "deferred" })
  );

  assert.equal(result.outcome, "deferred");
  assert.equal(result.nextState.hasPendingRemoteChange, true);
});

test("failed discard-and-reload keeps the pending remote-change state", async () => {
  await assert.rejects(
    () =>
      discardPendingDisplaySyncDraft(
        { hasPendingRemoteChange: true },
        async () => {
          throw new Error("reload failed");
        }
      ),
    /reload failed/
  );
});

// ---------------------------------------------------------------------------
// Mounted guard harness: the hook runs in a real React root so dirty
// transitions, remote events and reload outcomes replay their real effect order.

type GuardProps = {
  externalReloadResult: DisplaySyncReloadResult | null;
  isDirty: boolean;
  stickyPending: boolean;
};

const mountedGuardEvent: DisplaySyncEvent = {
  generatedAt: "2026-09-11T00:00:00.000Z",
  reason: "draft-guard-mounted-test",
  scope: "weather"
};

let guardDom: JSDOM | null = null;

function ensureGuardDom() {
  if (guardDom) {
    return;
  }

  guardDom = new JSDOM("<!doctype html><html><body></body></html>", { pretendToBeVisual: true });
  for (const [key, value] of Object.entries({
    document: guardDom.window.document,
    HTMLElement: guardDom.window.HTMLElement,
    navigator: guardDom.window.navigator,
    window: guardDom.window
  })) {
    Object.defineProperty(globalThis, key, { configurable: true, value, writable: true });
  }
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
}

test.after(() => {
  guardDom?.window.close();
});

function committed(operationToken: number): DisplaySyncReloadResult {
  return { operationToken, outcome: "committed" };
}

async function mountGuard(initialProps: GuardProps, { strict = false } = {}) {
  ensureGuardDom();
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const latest: { current: ReturnType<typeof useDisplaySyncDraftGuard> | null } = { current: null };
  let props = initialProps;
  let reloads = 0;

  function Probe(probeProps: GuardProps) {
    latest.current = useDisplaySyncDraftGuard({
      ...probeProps,
      relevantScopes: ["weather"],
      reloadNow: async () => {
        reloads += 1;
      }
    });
    return null;
  }

  const render = async (nextProps: Partial<GuardProps> = {}) => {
    props = { ...props, ...nextProps };
    const probe = React.createElement(Probe, props);
    await act(async () => {
      root.render(strict ? React.createElement(React.StrictMode, null, probe) : probe);
    });
  };
  await render();

  return {
    get pending() {
      assert.ok(latest.current);
      return latest.current.hasPendingRemoteChange;
    },
    get reloads() {
      return reloads;
    },
    remoteEvent: async () => {
      assert.ok(latest.current);
      const guard = latest.current;
      await act(async () => {
        await guard.handleDisplaySync(mountedGuardEvent);
      });
    },
    render,
    unmount: async () => {
      await act(async () => root.unmount());
      container.remove();
    }
  };
}

test("a reverted local edit keeps a remote notice after the bootstrap commit was consumed", async () => {
  const guard = await mountGuard({ externalReloadResult: committed(1), isDirty: false, stickyPending: true });

  try {
    assert.equal(guard.pending, false);
    await guard.render({ isDirty: true });
    await guard.remoteEvent();
    assert.equal(guard.pending, true);
    assert.equal(guard.reloads, 0, "a dirty draft defers the remote event without reloading");

    await guard.render({ isDirty: false });
    assert.equal(guard.pending, true, "reverting to the baseline must not replay committed token 1");
    assert.equal(guard.reloads, 0);
  } finally {
    await guard.unmount();
  }
});

test("the first committed outcome is consumed once even under StrictMode effect replay", async () => {
  const guard = await mountGuard({ externalReloadResult: null, isDirty: true, stickyPending: true }, { strict: true });

  try {
    await guard.remoteEvent();
    assert.equal(guard.pending, true);
    await guard.render({ isDirty: false });
    assert.equal(guard.pending, true, "a local revert alone does not acknowledge the notice");

    await guard.render({ externalReloadResult: committed(1) });
    assert.equal(guard.pending, false, "the first current committed outcome acknowledges the notice");

    await guard.render({ isDirty: true });
    await guard.remoteEvent();
    assert.equal(guard.pending, true);
    await guard.render({ isDirty: false });
    assert.equal(guard.pending, true, "the consumed commit must not acknowledge a later notice");
    assert.equal(guard.reloads, 0);
  } finally {
    await guard.unmount();
  }
});

test("equal or older reload tokens delivered again cannot acknowledge a newer notice", async () => {
  const guard = await mountGuard({ externalReloadResult: committed(2), isDirty: false, stickyPending: true });

  try {
    await guard.render({ externalReloadResult: { operationToken: 3, outcome: "deferred" } });
    assert.equal(guard.pending, true);

    await guard.render({ externalReloadResult: committed(3) });
    assert.equal(guard.pending, true, "an already consumed token must not be processed again");

    await guard.render({ externalReloadResult: committed(2) });
    assert.equal(guard.pending, true, "an older token must not acknowledge the notice");

    await guard.render({ externalReloadResult: committed(4) });
    assert.equal(guard.pending, false, "a new current committed token acknowledges the notice");
  } finally {
    await guard.unmount();
  }
});

test("failed, stale, and deferred outcomes keep the notice and are never reinterpreted as commits", async () => {
  const guard = await mountGuard({ externalReloadResult: committed(1), isDirty: true, stickyPending: true });

  try {
    await guard.remoteEvent();
    assert.equal(guard.pending, true);

    const outcomes: Array<DisplaySyncReloadResult> = [
      { operationToken: 2, outcome: "failed" },
      { operationToken: 3, outcome: "stale" },
      { operationToken: 4, outcome: "deferred" }
    ];
    for (const outcome of outcomes) {
      await guard.render({ externalReloadResult: outcome });
      assert.equal(guard.pending, true, `${outcome.outcome} must keep the notice`);
      await guard.render({ isDirty: false });
      assert.equal(guard.pending, true, `${outcome.outcome} must not turn into an acknowledgement once clean`);
      await guard.render({ isDirty: true });
    }

    await guard.render({ externalReloadResult: committed(5), isDirty: false });
    assert.equal(guard.pending, false);
    assert.equal(guard.reloads, 0);
  } finally {
    await guard.unmount();
  }
});

test("a guard without the Weather opt-in still clears pending when clean and reloads clean events", async () => {
  const guard = await mountGuard({ externalReloadResult: null, isDirty: true, stickyPending: false });

  try {
    await guard.remoteEvent();
    assert.equal(guard.pending, true);
    assert.equal(guard.reloads, 0);

    await guard.render({ isDirty: false });
    assert.equal(guard.pending, false, "non-Weather consumers keep their clean-state clearing");

    await guard.remoteEvent();
    assert.equal(guard.reloads, 1, "a clean non-Weather surface reloads immediately");
    assert.equal(guard.pending, false);
  } finally {
    await guard.unmount();
  }
});
