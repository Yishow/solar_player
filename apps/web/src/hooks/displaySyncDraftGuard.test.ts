import assert from "node:assert/strict";
import test from "node:test";
import {
  applyDisplaySyncDraftGuard,
  discardPendingDisplaySyncDraft,
  keepPendingDisplaySyncDraft
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
