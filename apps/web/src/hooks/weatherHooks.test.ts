import assert from "node:assert/strict";
import test from "node:test";
import { setupWeatherPolling } from "./weatherPolling.js";

test("setupWeatherPolling sets up setInterval and returns clearInterval cleanup", () => {
  let intervalCallback: (() => void) | null = null;
  let intervalDelay = 0;

  // Stub setInterval
  const originalSetInterval = globalThis.setInterval;
  (globalThis as any).setInterval = (cb: any, delay: number) => {
    intervalCallback = cb;
    intervalDelay = delay;
    return 999 as any;
  };

  const originalClearInterval = globalThis.clearInterval;
  let clearedId: any = null;
  (globalThis as any).clearInterval = (id: any) => {
    clearedId = id;
  };

  try {
    let callCount = 0;
    const cleanup = setupWeatherPolling(true, 15, () => {
      callCount += 1;
    });

    assert.equal(intervalDelay, 15 * 60 * 1000);
    assert.ok(intervalCallback);

    const cb = intervalCallback as any;
    cb();
    assert.equal(callCount, 1);

    if (cleanup) cleanup();
    assert.equal(clearedId, 999);
  } finally {
    globalThis.setInterval = originalSetInterval;
    globalThis.clearInterval = originalClearInterval;
  }
});

test("setupWeatherPolling returns undefined when disabled or intervalMinutes <= 0", () => {
  const cleanup1 = setupWeatherPolling(false, 15, () => {});
  assert.equal(cleanup1, undefined);

  const cleanup2 = setupWeatherPolling(true, 0, () => {});
  assert.equal(cleanup2, undefined);

  const cleanup3 = setupWeatherPolling(true, -5, () => {});
  assert.equal(cleanup3, undefined);
});
