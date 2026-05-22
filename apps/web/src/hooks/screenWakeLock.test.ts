import assert from "node:assert/strict";
import test from "node:test";
import { isWakeLockSupported, shouldReacquireWakeLock } from "./screenWakeLock";

test("isWakeLockSupported returns true only when navigator.wakeLock.request is a function", () => {
  assert.equal(
    isWakeLockSupported({
      wakeLock: {
        request: () => Promise.resolve(null)
      }
    }),
    true
  );
  assert.equal(isWakeLockSupported(undefined), false);
  assert.equal(isWakeLockSupported({}), false);
  assert.equal(
    isWakeLockSupported({
      wakeLock: {
        request: "screen"
      }
    }),
    false
  );
});

test("shouldReacquireWakeLock follows the visibility Example table", () => {
  assert.equal(
    shouldReacquireWakeLock({
      hasSentinel: false,
      visibilityState: "visible"
    }),
    true
  );
  assert.equal(
    shouldReacquireWakeLock({
      hasSentinel: true,
      visibilityState: "visible"
    }),
    false
  );
  assert.equal(
    shouldReacquireWakeLock({
      hasSentinel: false,
      visibilityState: "hidden"
    }),
    false
  );
});
