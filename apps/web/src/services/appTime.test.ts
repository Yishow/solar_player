import assert from "node:assert/strict";
import test from "node:test";
import {
  SERVER_TIME_BROADCAST_INTERVAL_MS,
  SERVER_TIME_ZONE,
  type ServerTimeSignal
} from "@solar-display/shared";
import { createAppTimeStore } from "./appTime";

function signal(
  overrides: Partial<ServerTimeSignal> = {}
): ServerTimeSignal {
  return {
    broadcastIntervalMs: SERVER_TIME_BROADCAST_INTERVAL_MS,
    epochMs: 1_785_364_800_000,
    instanceId: "server-process-a",
    sequence: 1,
    timeZone: SERVER_TIME_ZONE,
    ...overrides
  };
}

test("App Time derives epoch from monotonic elapsed and ignores duplicate or out-of-order signals", () => {
  let monotonicMs = 1_000;
  const store = createAppTimeStore({
    monotonicNow: () => monotonicMs
  });

  assert.deepEqual(store.getSnapshot(), {
    lastSignalMonotonicMs: null,
    nowEpochMs: null,
    state: "waiting"
  });
  assert.equal(store.acceptSignal(signal({ sequence: 8 })), true);

  monotonicMs = 1_750;
  assert.deepEqual(store.getSnapshot(), {
    lastSignalMonotonicMs: 1_000,
    nowEpochMs: 1_785_364_800_750,
    state: "synced"
  });

  assert.equal(
    store.acceptSignal(signal({ epochMs: 1, sequence: 8 })),
    false
  );
  assert.equal(
    store.acceptSignal(signal({ epochMs: 1, sequence: 7 })),
    false
  );
  assert.equal(store.getSnapshot().nowEpochMs, 1_785_364_800_750);
});

test("App Time accepts a corrected earlier baseline from a new server instance", () => {
  let monotonicMs = 100;
  const store = createAppTimeStore({
    monotonicNow: () => monotonicMs
  });
  store.acceptSignal(signal({ epochMs: 10_000, sequence: 8 }));

  monotonicMs = 200;
  assert.equal(
    store.acceptSignal(signal({
      epochMs: 5_000,
      instanceId: "server-process-b",
      sequence: 1
    })),
    true
  );
  assert.equal(store.getSnapshot().nowEpochMs, 5_000);
});

test("App Time exposes exact waiting, synced, stale, and time-untrusted boundaries", () => {
  let monotonicMs = 0;
  const store = createAppTimeStore({
    monotonicNow: () => monotonicMs
  });

  assert.equal(store.getSnapshot().state, "waiting");
  store.acceptSignal(signal());

  const cases = [
    [89_999, "synced"],
    [90_000, "stale"],
    [1_799_999, "stale"],
    [1_800_000, "time-untrusted"]
  ] as const;
  for (const [elapsedMs, expected] of cases) {
    monotonicMs = elapsedMs;
    assert.equal(store.getSnapshot().state, expected);
  }
});

test("App Time ignores invalid payloads and keeps the last valid baseline", () => {
  let monotonicMs = 0;
  const store = createAppTimeStore({
    monotonicNow: () => monotonicMs
  });
  store.acceptSignal(signal());
  monotonicMs = 500;

  assert.equal(
    store.acceptSignal({
      ...signal({ sequence: 2 }),
      timeZone: "UTC"
    }),
    false
  );
  assert.equal(store.getSnapshot().nowEpochMs, 1_785_364_800_500);
});
