import assert from "node:assert/strict";
import test from "node:test";
import {
  DISPLAY_PAGE_CONTENT_SURFACE_HEIGHT,
  DISPLAY_PAGE_CONTENT_SURFACE_WIDTH,
  isDisplayPageFreeformObjectShape,
  isDisplayPageFreeformObjectType,
  isDisplayPageObjectMount,
  normalizeDisplayPageFreeformObjects,
  sortDisplayPageFreeformObjects,
  validateDisplayPageFreeformObjects,
  type DisplayPageAssetImageObject,
  type DisplayPageFreeformObject,
  type DisplayPageIconAssetObject,
  type DisplayPageLineObject
} from "./displayPageObjects.js";

function lineObject(overrides: Partial<DisplayPageLineObject> = {}): DisplayPageLineObject {
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
  };
}

function assetImageObject(
  overrides: Partial<DisplayPageAssetImageObject> = {}
): DisplayPageAssetImageObject {
  return {
    frame: { height: 120, left: 180, top: 60, width: 240 },
    id: "page-asset-1",
    locked: false,
    metadata: {},
    mount: "content",
    source: { assetId: 7, fallbackSrc: "/uploads/images/object.png", kind: "asset-image" },
    style: {},
    type: "asset-image",
    visible: true,
    zIndex: 2,
    ...overrides
  };
}

function iconAssetObject(
  overrides: Partial<DisplayPageIconAssetObject> = {}
): DisplayPageIconAssetObject {
  return {
    frame: { height: 64, left: 540, top: 72, width: 64 },
    id: "page-icon-1",
    locked: false,
    metadata: {},
    mount: "content",
    source: { assetId: 8, fallbackSrc: "/uploads/images/icon.svg", kind: "icon-asset" },
    style: {},
    type: "icon-asset",
    visible: true,
    zIndex: 3,
    ...overrides
  };
}

test("page freeform object helpers expose the content-surface contract", () => {
  assert.equal(isDisplayPageFreeformObjectType("line"), true);
  assert.equal(isDisplayPageFreeformObjectType("asset-image"), true);
  assert.equal(isDisplayPageFreeformObjectType("icon-asset"), true);
  assert.equal(isDisplayPageFreeformObjectType("ornament-image"), false);

  assert.equal(isDisplayPageObjectMount("content"), true);
  assert.equal(isDisplayPageObjectMount("header"), false);
  assert.equal(DISPLAY_PAGE_CONTENT_SURFACE_WIDTH, 1920);
  assert.equal(DISPLAY_PAGE_CONTENT_SURFACE_HEIGHT, 838);
});

test("page freeform object shape guard accepts supported content objects", () => {
  assert.equal(isDisplayPageFreeformObjectShape(lineObject()), true);
  assert.equal(isDisplayPageFreeformObjectShape(assetImageObject()), true);
  assert.equal(isDisplayPageFreeformObjectShape(iconAssetObject()), true);
  assert.equal(isDisplayPageFreeformObjectShape({ ...lineObject(), mount: "header" }), false);
  assert.equal(isDisplayPageFreeformObjectShape({ ...lineObject(), type: "ornament-image" }), false);
});

test("normalizeDisplayPageFreeformObjects keeps only structurally valid objects", () => {
  const objects = normalizeDisplayPageFreeformObjects([lineObject(), {}, iconAssetObject()]);

  assert.deepEqual(
    objects.map((object) => object.id),
    ["page-line-1", "page-icon-1"]
  );
});

test("sortDisplayPageFreeformObjects keeps deterministic zIndex and id ordering", () => {
  const objects: DisplayPageFreeformObject[] = [
    lineObject({ id: "b", zIndex: 1 }),
    lineObject({ id: "a", zIndex: 1 }),
    assetImageObject({ id: "c", zIndex: 3 })
  ];

  assert.deepEqual(
    sortDisplayPageFreeformObjects(objects).map((object) => object.id),
    ["a", "b", "c"]
  );
});

test("page freeform object validation rejects overflow, malformed source, duplicate ids, and unstable order", () => {
  const result = validateDisplayPageFreeformObjects([
    assetImageObject({
      frame: { height: 120, left: 1820, top: 60, width: 180 },
      id: "asset-overflow"
    }),
    iconAssetObject({
      id: "icon-missing-source",
      source: { kind: "icon-asset" } as DisplayPageIconAssetObject["source"]
    }),
    lineObject({ id: "dup", zIndex: 1 }),
    lineObject({ id: "dup", zIndex: Number.NaN })
  ]);

  assert.equal(result.canPublish, false);
  assert.ok(result.findings.some((finding) => finding.code === "PAGE_OBJECT_CONTENT_OVERFLOW"));
  assert.ok(result.findings.some((finding) => finding.code === "PAGE_OBJECT_INVALID_SOURCE"));
  assert.ok(result.findings.some((finding) => finding.code === "PAGE_OBJECT_DUPLICATE_ID"));
  assert.ok(result.findings.some((finding) => finding.code === "PAGE_OBJECT_UNSTABLE_ORDER"));
});

test("page freeform object validation accepts band-safe line, asset-image, and icon-asset objects", () => {
  assert.equal(
    validateDisplayPageFreeformObjects([lineObject(), assetImageObject(), iconAssetObject()]).canPublish,
    true
  );
});
