import assert from "node:assert/strict";
import test from "node:test";
import { unifyPublishPreflight } from "./displayPublishPreflight.js";

test("U5 preflight blocks publish when bindings are unsaved or energy setup is incomplete", () => {
  const blocked = unifyPublishPreflight({ bindingErrors: [], energyProfileReady: false, unsavedBindings: true });
  assert.equal(blocked.canPublish, false);
  assert.equal(blocked.findings.length, 2);
  const ready = unifyPublishPreflight({ bindingErrors: [], energyProfileReady: true, unsavedBindings: false });
  assert.equal(ready.canPublish, true);
});
