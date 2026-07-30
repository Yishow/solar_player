import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDisplayClientHeartbeatPayload,
  DISPLAY_CLIENT_HEARTBEAT_INTERVAL_MS,
  startDisplayClientHeartbeatLoop,
  type DisplayClientHeartbeatLoopOptions
} from "./useDisplayClientHeartbeat";

type ScheduledTimer = {
  callback: () => void;
  ms: number;
};

function createLoopOptions(
  overrides: Partial<DisplayClientHeartbeatLoopOptions> = {}
): DisplayClientHeartbeatLoopOptions {
  return {
    connected: true,
    emitHeartbeat() {},
    emitImmediately: false,
    intervalMs: DISPLAY_CLIENT_HEARTBEAT_INTERVAL_MS,
    payloadFactory: () => ({
      isPlaying: true,
      pageKey: "overview",
      route: "/overview",
      timeSyncState: "synced"
    }),
    ...overrides
  };
}

test("buildDisplayClientHeartbeatPayload reports playback and Time Sync State", () => {
  assert.deepEqual(
    buildDisplayClientHeartbeatPayload({
      isIdle: false,
      isPlaying: true,
      pageKey: "overview",
      route: "/overview",
      timeSyncState: "stale"
    }),
    {
      isPlaying: true,
      pageKey: "overview",
      route: "/overview",
      timeSyncState: "stale"
    }
  );
});

test("startDisplayClientHeartbeatLoop emits once after a heartbeat interval when connected", () => {
  const scheduled: ScheduledTimer[] = [];
  const emitted: unknown[] = [];

  const cleanup = startDisplayClientHeartbeatLoop(
    createLoopOptions({
      emitHeartbeat(payload) {
        emitted.push(payload);
      },
      intervalMs: undefined,
      scheduleInterval(callback, ms) {
        scheduled.push({ callback, ms });
        return scheduled.length;
      }
    })
  );

  assert.equal(scheduled[0]?.ms, DISPLAY_CLIENT_HEARTBEAT_INTERVAL_MS);
  assert.deepEqual(emitted, []);

  scheduled[0]?.callback();

  assert.equal(emitted.length, 1);
  cleanup();
});

test("startDisplayClientHeartbeatLoop emits immediately when the playback page changes", () => {
  const emitted: Array<{ pageKey: string | null }> = [];

  const cleanup = startDisplayClientHeartbeatLoop(
    createLoopOptions({
      emitHeartbeat(payload) {
        emitted.push({ pageKey: payload.pageKey });
      },
      emitImmediately: true,
      payloadFactory: () => ({
        isPlaying: true,
        pageKey: "solar",
        route: "/solar",
        timeSyncState: "time-untrusted"
      })
    })
  );

  assert.deepEqual(emitted, [{ pageKey: "solar" }]);
  cleanup();
});

test("startDisplayClientHeartbeatLoop stays quiet while disconnected", () => {
  const scheduled: ScheduledTimer[] = [];
  const emitted: unknown[] = [];

  const cleanup = startDisplayClientHeartbeatLoop(
    createLoopOptions({
      connected: false,
      emitHeartbeat(payload) {
        emitted.push(payload);
      },
      emitImmediately: true,
      scheduleInterval(callback, ms) {
        scheduled.push({ callback, ms });
        return scheduled.length;
      }
    })
  );

  assert.deepEqual(emitted, []);
  assert.deepEqual(scheduled, []);
  cleanup();
});
