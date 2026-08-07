import assert from "node:assert/strict";
import test from "node:test";
import {
  readDisplayRuntimeSyncSnapshot,
  resetDisplayRuntimeSyncSnapshotForTests,
  writeDisplayRuntimeSyncSnapshot
} from "./displayRuntimeSyncReporter";

test.beforeEach(resetDisplayRuntimeSyncSnapshotForTests);

test("starts as not reported", () => {
  assert.deepEqual(readDisplayRuntimeSyncSnapshot(), {
    runtimeSyncState: "unknown", runtimeSyncPageKey: null,
    runtimeSyncResolvedAt: null, runtimeSyncError: null
  });
});

test("successful sync clears errors", () => {
  writeDisplayRuntimeSyncSnapshot({ runtimeSyncState: "degraded", runtimeSyncError: "offline" });
  writeDisplayRuntimeSyncSnapshot({ runtimeSyncState: "synced", runtimeSyncPageKey: "overview", runtimeSyncResolvedAt: "2026-01-01T00:00:00.000Z" });
  assert.equal(readDisplayRuntimeSyncSnapshot().runtimeSyncError, null);
});

test("degraded sync retains prior resolution", () => {
  writeDisplayRuntimeSyncSnapshot({ runtimeSyncState: "synced", runtimeSyncResolvedAt: "2026-01-01T00:00:00.000Z" });
  writeDisplayRuntimeSyncSnapshot({ runtimeSyncState: "degraded", runtimeSyncError: "offline" });
  assert.equal(readDisplayRuntimeSyncSnapshot().runtimeSyncResolvedAt, "2026-01-01T00:00:00.000Z");
});
