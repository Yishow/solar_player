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
      appliedVersion: 1,
      desiredVersion: 1,
      isPlaying: true,
      pageKey: "overview",
      route: "/overview",
      timeSyncState: "synced",
      updateError: null,
      updateState: "applied"
    }),
    ...overrides
  };
}

test("buildDisplayClientHeartbeatPayload reports playback and Time Sync State", () => {
  assert.deepEqual(
    buildDisplayClientHeartbeatPayload({
      appliedVersion: 1,
      desiredVersion: 2,
      isIdle: false,
      isPlaying: true,
      pageKey: "overview",
      route: "/overview",
      timeSyncState: "stale",
      updateError: null,
      updateState: "waiting"
    }),
    {
      appliedVersion: 1,
      desiredVersion: 2,
      isPlaying: true,
      pageKey: "overview",
      route: "/overview",
      timeSyncState: "stale",
      updateError: null,
      updateState: "waiting"
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
        appliedVersion: 1,
        desiredVersion: 2,
        isPlaying: true,
        pageKey: "solar",
        route: "/solar",
        timeSyncState: "time-untrusted",
        updateError: null,
        updateState: "waiting"
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

test("startDisplayClientHeartbeatLoop stays quiet until Profile rollout is hydrated", () => {
  const scheduled: ScheduledTimer[] = [];
  const emitted: unknown[] = [];

  const cleanup = startDisplayClientHeartbeatLoop(
    createLoopOptions({
      enabled: false,
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
