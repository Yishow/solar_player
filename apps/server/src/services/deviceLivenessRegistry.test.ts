import assert from "node:assert/strict";
import test from "node:test";
import { DeviceLivenessRegistry } from "./deviceLivenessRegistry.js";

const identity = {
  clientId: "display-1",
  contextRevision: "revision-1",
  deviceId: 1,
  groupId: 10,
  profileId: 20,
  siteScope: "cl" as const
};

function heartbeat(
  route: string,
  isPlaying: boolean,
  timeSyncState: "stale" | "synced" | "time-untrusted" | "waiting" = "synced"
) {
  return {
    appliedVersion: 1,
    desiredVersion: 1,
    isPlaying,
    pageKey: route.slice(1),
    route,
    timeSyncState,
    runtimeSyncState: "unknown" as const,
    runtimeSyncPageKey: null,
    runtimeSyncResolvedAt: null,
    runtimeSyncError: null,
    updateError: null,
    updateState: "applied" as const
  };
}

test("DeviceLivenessRegistry exposes the latest valid heartbeat Time Sync State", () => {
  const registry = new DeviceLivenessRegistry();
  registry.connect({
    connectionId: "socket-1",
    identity,
    sourceFingerprint: "source-a"
  });

  for (const timeSyncState of [
    "waiting",
    "synced",
    "stale",
    "time-untrusted"
  ] as const) {
    registry.heartbeat(
      "socket-1",
      heartbeat("/overview", true, timeSyncState)
    );
    assert.equal(
      registry.snapshot().clients[0]?.timeSyncState,
      timeSyncState
    );
  }
});

test("DeviceLivenessRegistry retains latest valid state while child connections come and go", () => {
  let now = new Date("2026-05-22T12:00:00.000Z");
  const registry = new DeviceLivenessRegistry({ now: () => now });

  registry.connect({
    connectionId: "socket-1",
    identity,
    sourceFingerprint: "source-a"
  });
  registry.connect({
    connectionId: "socket-2",
    identity,
    sourceFingerprint: "source-a"
  });
  registry.heartbeat("socket-1", heartbeat("/overview", false));
  now = new Date("2026-05-22T12:00:10.000Z");
  registry.heartbeat("socket-2", heartbeat("/solar", true));

  assert.deepEqual(
    {
      connectedCount: registry.snapshot(now).clients[0]?.connectedCount,
      isPlaying: registry.snapshot(now).clients[0]?.isPlaying,
      route: registry.snapshot(now).clients[0]?.route,
      sourceStatus: registry.snapshot(now).clients[0]?.sourceStatus
    },
    {
      connectedCount: 2,
      isPlaying: true,
      route: "/solar",
      sourceStatus: "same-source"
    }
  );

  registry.disconnect("socket-2");
  assert.equal(registry.snapshot(now).clients[0]?.connectedCount, 1);
  assert.equal(registry.snapshot(now).clients[0]?.route, "/solar");

  registry.disconnect("socket-1");
  assert.equal(registry.snapshot(now).clients[0]?.connectedCount, 0);
  assert.equal(registry.snapshot(now).clients[0]?.state, "offline");
});

test("DeviceLivenessRegistry uses the exact 30-second different-source duplicate boundary", () => {
  let now = new Date("2026-05-22T12:00:00.000Z");
  const registry = new DeviceLivenessRegistry({ now: () => now });
  registry.connect({
    connectionId: "socket-1",
    identity,
    sourceFingerprint: "source-a"
  });
  registry.connect({
    connectionId: "socket-2",
    identity,
    sourceFingerprint: "source-b"
  });

  now = new Date("2026-05-22T12:00:29.999Z");
  assert.equal(registry.snapshot(now).clients[0]?.duplicateIdentity, false);

  now = new Date("2026-05-22T12:00:30.000Z");
  assert.equal(registry.snapshot(now).clients[0]?.duplicateIdentity, true);
  assert.equal(
    registry.snapshot(now).clients[0]?.duplicateDetectedAt,
    "2026-05-22T12:00:30.000Z"
  );

  registry.disconnect("socket-2");
  assert.equal(registry.snapshot(now).clients[0]?.duplicateIdentity, false);
  assert.equal(
    registry.snapshot(now).clients[0]?.duplicateDetectedAt,
    "2026-05-22T12:00:30.000Z"
  );

  now = new Date("2026-05-22T12:00:40.000Z");
  registry.connect({
    connectionId: "socket-3",
    identity,
    sourceFingerprint: "source-c"
  });
  now = new Date("2026-05-22T12:01:10.000Z");
  assert.equal(registry.snapshot(now).clients[0]?.duplicateIdentity, true);
  assert.equal(
    registry.snapshot(now).clients[0]?.duplicateDetectedAt,
    "2026-05-22T12:01:10.000Z"
  );
});

test("DeviceLivenessRegistry never warns for same-source or unknown-source overlap", () => {
  const now = new Date("2026-05-22T12:01:00.000Z");

  for (const sourceFingerprint of ["source-a", null]) {
    const registry = new DeviceLivenessRegistry({
      now: () => new Date("2026-05-22T12:00:00.000Z")
    });
    registry.connect({
      connectionId: "socket-1",
      identity,
      sourceFingerprint
    });
    registry.connect({
      connectionId: "socket-2",
      identity,
      sourceFingerprint
    });

    assert.equal(registry.snapshot(now).clients[0]?.duplicateIdentity, false);
    assert.equal(
      registry.snapshot(now).clients[0]?.sourceStatus,
      sourceFingerprint === null ? "source-unknown" : "same-source"
    );
  }
});
