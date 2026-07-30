import assert from "node:assert/strict";
import test from "node:test";
import {
  SERVER_TIME_BROADCAST_INTERVAL_MS,
  SERVER_TIME_ZONE
} from "@solar-display/shared";
import { createServerTimeSignal } from "./serverTimeSignal.js";

test("server time signal emits immediately and then every 30 seconds with ordered sequence", () => {
  let currentEpochMs = 1_785_364_800_000;
  const scheduled: Array<{ callback: () => void; intervalMs: number }> = [];
  const cleared: unknown[] = [];
  const emitted: unknown[] = [];
  const signal = createServerTimeSignal({
    clearScheduledInterval: (timer) => {
      cleared.push(timer);
    },
    createInstanceId: () => "server-process-a",
    nowEpochMs: () => currentEpochMs,
    scheduleInterval: (callback, intervalMs) => {
      scheduled.push({ callback, intervalMs });
      return "timer-a";
    }
  });

  signal.emitImmediately((payload) => {
    emitted.push(payload);
  });
  const stop = signal.startBroadcast((payload) => {
    emitted.push(payload);
  });

  assert.equal(scheduled[0]?.intervalMs, SERVER_TIME_BROADCAST_INTERVAL_MS);
  assert.deepEqual(emitted, [{
    broadcastIntervalMs: SERVER_TIME_BROADCAST_INTERVAL_MS,
    epochMs: 1_785_364_800_000,
    instanceId: "server-process-a",
    sequence: 1,
    timeZone: SERVER_TIME_ZONE
  }]);

  currentEpochMs += SERVER_TIME_BROADCAST_INTERVAL_MS;
  scheduled[0]?.callback();
  assert.deepEqual(
    emitted.map((payload) => (payload as { sequence: number }).sequence),
    [1, 2]
  );

  stop();
  assert.deepEqual(cleared, ["timer-a"]);
});

test("a new server time signal process accepts sequence 1 with a new instance", () => {
  const first = createServerTimeSignal({
    createInstanceId: () => "server-process-a",
    nowEpochMs: () => 2_000
  });
  const restarted = createServerTimeSignal({
    createInstanceId: () => "server-process-b",
    nowEpochMs: () => 1_000
  });
  const emitted: unknown[] = [];

  first.emitImmediately((payload) => emitted.push(payload));
  restarted.emitImmediately((payload) => emitted.push(payload));

  assert.deepEqual(emitted, [
    {
      broadcastIntervalMs: SERVER_TIME_BROADCAST_INTERVAL_MS,
      epochMs: 2_000,
      instanceId: "server-process-a",
      sequence: 1,
      timeZone: SERVER_TIME_ZONE
    },
    {
      broadcastIntervalMs: SERVER_TIME_BROADCAST_INTERVAL_MS,
      epochMs: 1_000,
      instanceId: "server-process-b",
      sequence: 1,
      timeZone: SERVER_TIME_ZONE
    }
  ]);
});
