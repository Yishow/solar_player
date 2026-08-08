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
  writeDisplayRuntimeSyncSnapshot({ runtimeSyncState: "degraded", runtimeSyncPageKey: "overview", runtimeSyncError: "offline" });
  writeDisplayRuntimeSyncSnapshot({ runtimeSyncState: "synced", runtimeSyncPageKey: "overview", runtimeSyncResolvedAt: "2026-01-01T00:00:00.000Z" });
  assert.equal(readDisplayRuntimeSyncSnapshot().runtimeSyncError, null);
});

test("degraded sync retains prior resolution", () => {
  writeDisplayRuntimeSyncSnapshot({ runtimeSyncState: "synced", runtimeSyncPageKey: "overview", runtimeSyncResolvedAt: "2026-01-01T00:00:00.000Z" });
  writeDisplayRuntimeSyncSnapshot({ runtimeSyncState: "degraded", runtimeSyncPageKey: "overview", runtimeSyncError: "offline" });
  assert.equal(readDisplayRuntimeSyncSnapshot().runtimeSyncResolvedAt, "2026-01-01T00:00:00.000Z");
});

test("rotation to a healthy page keeps reporting the failing page", () => {
  writeDisplayRuntimeSyncSnapshot({ runtimeSyncState: "degraded", runtimeSyncPageKey: "overview", runtimeSyncError: "story endpoint unavailable" });
  writeDisplayRuntimeSyncSnapshot({ runtimeSyncState: "loading", runtimeSyncPageKey: "images" });
  writeDisplayRuntimeSyncSnapshot({ runtimeSyncState: "synced", runtimeSyncPageKey: "images", runtimeSyncResolvedAt: "2026-01-01T00:05:00.000Z" });

  assert.deepEqual(readDisplayRuntimeSyncSnapshot(), {
    runtimeSyncState: "degraded",
    runtimeSyncPageKey: "overview",
    runtimeSyncResolvedAt: null,
    runtimeSyncError: "story endpoint unavailable"
  });
});

test("most recent degraded page wins when several pages fail", () => {
  writeDisplayRuntimeSyncSnapshot({ runtimeSyncState: "degraded", runtimeSyncPageKey: "overview", runtimeSyncError: "first" });
  writeDisplayRuntimeSyncSnapshot({ runtimeSyncState: "degraded", runtimeSyncPageKey: "solar", runtimeSyncError: "second" });

  const snapshot = readDisplayRuntimeSyncSnapshot();
  assert.equal(snapshot.runtimeSyncPageKey, "solar");
  assert.equal(snapshot.runtimeSyncError, "second");
});

test("a recovered page stops being reported as degraded", () => {
  writeDisplayRuntimeSyncSnapshot({ runtimeSyncState: "degraded", runtimeSyncPageKey: "overview", runtimeSyncError: "offline" });
  writeDisplayRuntimeSyncSnapshot({ runtimeSyncState: "synced", runtimeSyncPageKey: "overview", runtimeSyncResolvedAt: "2026-01-01T00:10:00.000Z" });

  assert.deepEqual(readDisplayRuntimeSyncSnapshot(), {
    runtimeSyncState: "synced",
    runtimeSyncPageKey: "overview",
    runtimeSyncResolvedAt: "2026-01-01T00:10:00.000Z",
    runtimeSyncError: null
  });
});

test("a load in flight drops the earlier error but keeps the last successful timestamp", () => {
  writeDisplayRuntimeSyncSnapshot({ runtimeSyncState: "synced", runtimeSyncPageKey: "overview", runtimeSyncResolvedAt: "2026-01-01T00:00:00.000Z" });
  writeDisplayRuntimeSyncSnapshot({ runtimeSyncState: "degraded", runtimeSyncPageKey: "overview", runtimeSyncError: "offline" });
  writeDisplayRuntimeSyncSnapshot({ runtimeSyncState: "loading", runtimeSyncPageKey: "overview" });

  assert.deepEqual(readDisplayRuntimeSyncSnapshot(), {
    runtimeSyncState: "loading",
    runtimeSyncPageKey: "overview",
    runtimeSyncResolvedAt: "2026-01-01T00:00:00.000Z",
    runtimeSyncError: null
  });
});

test("loading is reported only when no page is degraded", () => {
  writeDisplayRuntimeSyncSnapshot({ runtimeSyncState: "degraded", runtimeSyncPageKey: "overview", runtimeSyncError: "offline" });
  writeDisplayRuntimeSyncSnapshot({ runtimeSyncState: "loading", runtimeSyncPageKey: "images" });

  assert.equal(readDisplayRuntimeSyncSnapshot().runtimeSyncState, "degraded");
});

test("an update without a page key changes nothing", () => {
  writeDisplayRuntimeSyncSnapshot({ runtimeSyncState: "synced", runtimeSyncPageKey: "overview", runtimeSyncResolvedAt: "2026-01-01T00:00:00.000Z" });
  writeDisplayRuntimeSyncSnapshot({ runtimeSyncState: "degraded", runtimeSyncError: "offline" });

  assert.deepEqual(readDisplayRuntimeSyncSnapshot(), {
    runtimeSyncState: "synced",
    runtimeSyncPageKey: "overview",
    runtimeSyncResolvedAt: "2026-01-01T00:00:00.000Z",
    runtimeSyncError: null
  });
});
