import assert from "node:assert/strict";
import test from "node:test";
import { createDiscoveryClient } from "./MqttDiscoveryService.js";

test("M1 discovery client is unique, clean-session and cannot publish", () => {
  const first = createDiscoveryClient("central");
  const second = createDiscoveryClient("central");
  assert.notEqual(first.clientId, second.clientId);
  assert.match(first.clientId, /^solar-discover-/);
  assert.equal(first.clean, true);
  assert.equal(first.canPublish, false);
  assert.equal(first.sharedSubscription, false);
});
