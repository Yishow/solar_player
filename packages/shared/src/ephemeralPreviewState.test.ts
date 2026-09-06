import assert from "node:assert/strict";
import test from "node:test";
import { nextEditRevision, PREVIEW_DEBOUNCE_MS, shouldAcceptPreviewResponse } from "./ephemeralPreviewState.js";

test("U4-R3-S01 slower A cannot overwrite current B", () => {
  const current = { contextKey: "site:kn", editRevision: 2 };
  assert.equal(shouldAcceptPreviewResponse(current, { contextKey: "site:kn", editRevision: 1 }), false);
  assert.equal(shouldAcceptPreviewResponse(current, { contextKey: "site:kn", editRevision: 2 }), true);
});

test("U4-R3 stale context is discarded", () => {
  assert.equal(
    shouldAcceptPreviewResponse(
      { contextKey: "site:kn", editRevision: 3 },
      { contextKey: "site:cl", editRevision: 3 }
    ),
    false
  );
});

test("U4-R3 debounce is 300ms and revisions increase", () => {
  assert.equal(PREVIEW_DEBOUNCE_MS, 300);
  assert.equal(nextEditRevision(0), 1);
});
