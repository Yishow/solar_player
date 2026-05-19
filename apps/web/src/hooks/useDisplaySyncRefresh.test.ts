import assert from "node:assert/strict";
import test from "node:test";
import { invokeDisplaySyncRefresh } from "./useDisplaySyncRefresh";

test("invokeDisplaySyncRefresh awaits async handlers without surfacing handled reload failures", async () => {
  let callCount = 0;

  await assert.doesNotReject(async () => {
    await invokeDisplaySyncRefresh(async () => {
      callCount += 1;
      throw new Error("reload failed");
    });
  });

  assert.equal(callCount, 1);
});

test("invokeDisplaySyncRefresh still runs synchronous handlers", async () => {
  let callCount = 0;

  await invokeDisplaySyncRefresh(() => {
    callCount += 1;
  });

  assert.equal(callCount, 1);
});
