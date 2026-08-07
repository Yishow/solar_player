import assert from "node:assert/strict";
import test from "node:test";
import { requiresManagementUnlock } from "./useManagementPasswordGate";

test("disabled gate does not require unlock", () => {
  assert.equal(requiresManagementUnlock({ enabled: false, authenticated: false, lockedUntil: null }), false);
});

test("enabled gate without an authenticated session requires unlock", () => {
  assert.equal(requiresManagementUnlock({ enabled: true, authenticated: false, lockedUntil: null }), true);
});

test("unknown gate state fails closed", () => {
  assert.equal(requiresManagementUnlock(null), true);
});
