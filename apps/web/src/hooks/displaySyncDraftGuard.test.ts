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
      isDirty: true,
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
      isDirty: false,
      reloadNow: async () => {
        reloadCount += 1;
      }
    }
  );

  assert.equal(result.outcome, "reloaded");
  assert.equal(reloadCount, 1);
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

  const result = await discardPendingDisplaySyncDraft(
    { hasPendingRemoteChange: true },
    async () => {
      reloadCount += 1;
    }
  );

  assert.equal(result.outcome, "reloaded");
  assert.equal(reloadCount, 1);
  assert.equal(result.nextState.hasPendingRemoteChange, false);
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
