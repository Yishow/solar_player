import assert from "node:assert/strict";
import test from "node:test";
import {
  DISPLAY_CLIENT_HEARTBEAT_INTERVAL_MS,
  DISPLAY_CLIENT_STALENESS_WINDOW_SECONDS,
  buildDisplayClientLivenessSnapshot,
  classifyDisplayClientLiveness,
  type DisplayClientHeartbeat,
  type DisplayClientLivenessEntry
} from "./displayClientLiveness.js";

const now = new Date("2026-05-22T12:00:00.000Z");

function buildEntry(overrides: Partial<DisplayClientLivenessEntry>): DisplayClientLivenessEntry {
  return {
    clientId: "display-1",
    connectedCount: 1,
    deviceId: 1,
    duplicateDetectedAt: null,
    duplicateIdentity: false,
    groupId: 10,
    isIdle: false,
    isPlaying: true,
    lastSeenAt: "2026-05-22T11:59:55.000Z",
    pageKey: "overview",
    profileId: 100,
    route: "/overview",
    siteScope: "cl",
    sourceStatus: "same-source",
    timeSyncState: "waiting",
    viewport: {
      height: 1080,
      width: 1920
    },
    ...overrides
  };
}

test("display liveness keeps the 10 second heartbeat interval and a server-owned identity-free payload", () => {
  const heartbeat: DisplayClientHeartbeat = {
    isPlaying: true,
    pageKey: "overview",
    route: "/overview",
    timeSyncState: "synced"
  };

  assert.equal(DISPLAY_CLIENT_HEARTBEAT_INTERVAL_MS, 10_000);
  assert.deepEqual(heartbeat, {
    isPlaying: true,
    pageKey: "overview",
    route: "/overview",
    timeSyncState: "synced"
  });
});

test("display liveness exposes exactly one valid Time Sync State per Device", () => {
  const states = [
    "waiting",
    "synced",
    "stale",
    "time-untrusted"
  ] as const;

  for (const timeSyncState of states) {
    const client = buildDisplayClientLivenessSnapshot([
      buildEntry({ timeSyncState })
    ], now).clients[0];
    assert.equal(client?.timeSyncState, timeSyncState);
  }
});

test("classifyDisplayClientLiveness returns online when last-seen age is within the window", () => {
  assert.equal(
    classifyDisplayClientLiveness({
      connected: true,
      lastSeenAt: "2026-05-22T11:59:55.000Z",
      now,
      stalenessWindowSeconds: DISPLAY_CLIENT_STALENESS_WINDOW_SECONDS
    }),
    "online"
  );
});

test("classifyDisplayClientLiveness keeps the boundary equal-to-window case online", () => {
  assert.equal(
    classifyDisplayClientLiveness({
      connected: true,
      lastSeenAt: "2026-05-22T11:59:30.000Z",
      now,
      stalenessWindowSeconds: DISPLAY_CLIENT_STALENESS_WINDOW_SECONDS
    }),
    "online"
  );
});

test("classifyDisplayClientLiveness returns stale when a connected client exceeds the staleness window", () => {
  assert.equal(
    classifyDisplayClientLiveness({
      connected: true,
      lastSeenAt: "2026-05-22T11:59:15.000Z",
      now,
      stalenessWindowSeconds: DISPLAY_CLIENT_STALENESS_WINDOW_SECONDS
    }),
    "stale"
  );
});

test("classifyDisplayClientLiveness returns offline when the client is not connected", () => {
  assert.equal(
    classifyDisplayClientLiveness({
      connected: false,
      lastSeenAt: "2026-05-22T11:59:15.000Z",
      now,
      stalenessWindowSeconds: DISPLAY_CLIENT_STALENESS_WINDOW_SECONDS
    }),
    "offline"
  );
});

test("buildDisplayClientLivenessSnapshot counts online, stale, and offline clients in the summary", () => {
  const snapshot = buildDisplayClientLivenessSnapshot(
    [
      buildEntry({
        deviceId: 3,
        lastSeenAt: "2026-05-22T11:59:55.000Z",
        clientId: "online-client"
      }),
      buildEntry({
        deviceId: 2,
        lastSeenAt: "2026-05-22T11:59:10.000Z",
        pageKey: "solar",
        route: "/solar",
        clientId: "stale-client"
      }),
      buildEntry({
        connectedCount: 0,
        deviceId: 1,
        lastSeenAt: "2026-05-22T11:59:10.000Z",
        pageKey: null,
        route: "/offline",
        clientId: "offline-client"
      })
    ],
    now
  );

  assert.deepEqual(snapshot.summary, {
    offline: 1,
    online: 1,
    stale: 1,
    total: 3
  });
  assert.deepEqual(
    snapshot.clients.map((client) => client.deviceId),
    [1, 2, 3]
  );
  assert.equal(snapshot.clients[0]?.clientId, "offline-client");
  assert.equal(snapshot.clients[0]?.state, "offline");
  assert.equal(snapshot.clients[1]?.state, "stale");
  assert.equal(snapshot.clients[2]?.state, "online");
});

test("buildDisplayClientLivenessSnapshot exposes Device context without credential or raw connection details", () => {
  const unsafeEntry = {
    ...buildEntry({
      clientId: "display-7",
      connectedCount: 2,
      deviceId: 7,
      duplicateDetectedAt: "2026-05-22T11:59:50.000Z",
      duplicateIdentity: true,
      groupId: 20,
      profileId: 200,
      siteScope: "kn",
      sourceStatus: "multi-source"
    }),
    credential: "secret",
    remoteAddress: "10.0.0.7",
    socketId: "socket-7",
    sourceFingerprint: "raw-source"
  } as DisplayClientLivenessEntry;

  const client = buildDisplayClientLivenessSnapshot([unsafeEntry], now).clients[0];

  assert.deepEqual(client, {
    clientId: "display-7",
    connectedCount: 2,
    deviceId: 7,
    duplicateDetectedAt: "2026-05-22T11:59:50.000Z",
    duplicateIdentity: true,
    groupId: 20,
    isIdle: false,
    isPlaying: true,
    lastSeenAt: "2026-05-22T11:59:55.000Z",
    pageKey: "overview",
    profileId: 200,
    route: "/overview",
    siteScope: "kn",
    sourceStatus: "multi-source",
    state: "online",
    timeSyncState: "waiting",
    viewport: {
      height: 1080,
      width: 1920
    }
  });
});
