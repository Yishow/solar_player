import assert from "node:assert/strict";
import test from "node:test";
import {
  DISPLAY_CLIENT_STALENESS_WINDOW_SECONDS,
  buildDisplayClientLivenessSnapshot,
  classifyDisplayClientLiveness,
  type DisplayClientLivenessEntry
} from "./displayClientLiveness.js";

const now = new Date("2026-05-22T12:00:00.000Z");

function buildEntry(overrides: Partial<DisplayClientLivenessEntry>): DisplayClientLivenessEntry {
  return {
    clientTime: null,
    connected: true,
    connectedAt: "2026-05-22T11:59:00.000Z",
    isIdle: false,
    isPlaying: true,
    lastSeenAt: "2026-05-22T11:59:55.000Z",
    pageKey: "overview",
    remoteAddress: "127.0.0.1",
    route: "/overview",
    sessionClass: "playback-safe",
    socketId: "socket-1",
    viewport: {
      height: 1080,
      width: 1920
    },
    ...overrides
  };
}

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
        lastSeenAt: "2026-05-22T11:59:55.000Z",
        socketId: "online-client"
      }),
      buildEntry({
        lastSeenAt: "2026-05-22T11:59:10.000Z",
        pageKey: "solar",
        route: "/solar",
        socketId: "stale-client"
      }),
      buildEntry({
        connected: false,
        lastSeenAt: "2026-05-22T11:59:10.000Z",
        pageKey: null,
        route: "/offline",
        socketId: "offline-client"
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
  assert.equal(snapshot.clients[0]?.socketId, "online-client");
  assert.equal(snapshot.clients[0]?.state, "online");
  assert.equal(snapshot.clients[1]?.state, "stale");
  assert.equal(snapshot.clients[2]?.state, "offline");
});
