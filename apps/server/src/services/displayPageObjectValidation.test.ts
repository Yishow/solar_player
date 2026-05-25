import assert from "node:assert/strict";
import test from "node:test";
import { validateDisplayPageObjectDraft } from "./displayPageObjectValidation.js";
import type { DisplayPageFreeformObject } from "@solar-display/shared";

function lineObject(overrides: Partial<DisplayPageFreeformObject> = {}): DisplayPageFreeformObject {
  return {
    frame: { height: 4, left: 40, top: 20, width: 200 },
    id: "page-line-1",
    locked: false,
    metadata: {},
    mount: "content",
    source: { kind: "line" },
    style: { color: "#fff", thickness: 4 },
    type: "line",
    visible: true,
    zIndex: 1,
    ...overrides
  } as DisplayPageFreeformObject;
}

test("display page object validation rejects freeform objects that overflow the content surface", () => {
  const result = validateDisplayPageObjectDraft([
    lineObject({
      frame: { height: 8, left: 1880, top: 120, width: 80 }
    })
  ]);

  assert.equal(result.canPublish, false);
  assert.ok(result.findings.some((finding) => finding.code === "PAGE_OBJECT_CONTENT_OVERFLOW"));
});

test("display page object validation rejects malformed icon-asset payloads", () => {
  const malformedObject = {
    ...lineObject({
      id: "icon-object"
    }),
    source: { kind: "icon-asset" },
    type: "icon-asset"
  } as DisplayPageFreeformObject;

  const result = validateDisplayPageObjectDraft([
    malformedObject
  ]);

  assert.equal(result.canPublish, false);
  assert.ok(result.findings.some((finding) => finding.code === "PAGE_OBJECT_INVALID_SOURCE"));
});
