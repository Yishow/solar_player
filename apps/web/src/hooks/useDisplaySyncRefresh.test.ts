import assert from "node:assert/strict";
import test from "node:test";
import {
  invokeDisplaySyncRefresh,
  shouldHandleDisplaySyncScope
} from "./useDisplaySyncRefresh";

const baseDisplaySyncEvent = {
  generatedAt: "2026-05-20T00:00:00.000Z",
  reason: "hook-test",
  scope: "display-pages"
} as const;

test("invokeDisplaySyncRefresh awaits async handlers without surfacing handled reload failures", async () => {
  let callCount = 0;

  await assert.doesNotReject(async () => {
    await invokeDisplaySyncRefresh(async () => {
      callCount += 1;
      throw new Error("reload failed");
    }, baseDisplaySyncEvent);
  });

  assert.equal(callCount, 1);
});

test("invokeDisplaySyncRefresh still runs synchronous handlers", async () => {
  let callCount = 0;

  await invokeDisplaySyncRefresh(() => {
    callCount += 1;
  }, baseDisplaySyncEvent);

  assert.equal(callCount, 1);
});

test("shouldHandleDisplaySyncScope only accepts explicitly relevant scopes", () => {
  assert.equal(shouldHandleDisplaySyncScope(baseDisplaySyncEvent, ["display-pages", "playback"]), true);
  assert.equal(shouldHandleDisplaySyncScope(baseDisplaySyncEvent, ["images", "mqtt"]), false);
});
