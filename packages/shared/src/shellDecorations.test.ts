import assert from "node:assert/strict";
import test from "node:test";
import {
  createDefaultShellDecorationEnvelope,
  createEmptyShellDecorationChannel,
  isDisplayObjectType,
  isShellDecorationMount,
  isShellDecorationObjectShape,
  resolveShellBandHeight,
  sortShellDecorationObjects,
  toPublicShellDecorationConfig,
  validateShellDecorationChannel,
  type ShellDecorationAssetImageObject,
  type ShellDecorationChannel,
  type ShellDecorationLineObject,
  type ShellDecorationObject
} from "./shellDecorations.js";

function lineObject(overrides: Partial<ShellDecorationLineObject> = {}): ShellDecorationLineObject {
  return {
    frame: { height: 4, left: 40, top: 20, width: 200 },
    id: "line-1",
    locked: false,
    metadata: {},
    mount: "header",
    source: { kind: "line" },
    style: { color: "#fff", thickness: 4 },
    type: "line",
    visible: true,
    zIndex: 1,
    ...overrides
  };
}

function assetImageObject(
  overrides: Partial<ShellDecorationAssetImageObject> = {}
): ShellDecorationAssetImageObject {
  return {
    frame: { height: 48, left: 100, top: 10, width: 48 },
    id: "asset-1",
    locked: false,
    metadata: {},
    mount: "header",
    source: { assetId: 7, fallbackSrc: "/uploads/images/logo.png", kind: "asset-image" },
    style: {},
    type: "asset-image",
    visible: true,
    zIndex: 2,
    ...overrides
  };
}

test("createEmptyShellDecorationChannel and default envelope expose deterministic empty seed", () => {
  assert.deepEqual(createEmptyShellDecorationChannel(), { footerObjects: [], headerObjects: [] });

  const draft = createDefaultShellDecorationEnvelope("draft");
  assert.equal(draft.stage, "draft");
  assert.equal(draft.version, 1);
  assert.equal(draft.updatedAt, null);
  assert.deepEqual(draft.headerObjects, []);
  assert.deepEqual(draft.footerObjects, []);
});

test("type guards narrow supported object types and mounts", () => {
  assert.equal(isDisplayObjectType("line"), true);
  assert.equal(isDisplayObjectType("asset-image"), true);
  assert.equal(isDisplayObjectType("ornament-image"), true);
  assert.equal(isDisplayObjectType("text"), false);

  assert.equal(isShellDecorationMount("header"), true);
  assert.equal(isShellDecorationMount("footer"), true);
  assert.equal(isShellDecorationMount("content"), false);

  assert.equal(resolveShellBandHeight("header"), 110);
  assert.equal(resolveShellBandHeight("footer"), 72);
});

test("header asset image object exposes the shared base object fields", () => {
  const object: ShellDecorationObject = assetImageObject();
  for (const field of ["id", "type", "mount", "frame", "visible", "locked", "zIndex", "source", "style", "metadata"]) {
    assert.ok(field in object, `expected base field ${field}`);
  }
  assert.equal(object.mount, "header");
});

test("isShellDecorationObjectShape accepts full base shapes and rejects structurally invalid ones", () => {
  assert.equal(isShellDecorationObjectShape(lineObject()), true);
  assert.equal(isShellDecorationObjectShape(assetImageObject()), true);

  assert.equal(isShellDecorationObjectShape({}), false);
  assert.equal(isShellDecorationObjectShape("not-an-object"), false);
  assert.equal(isShellDecorationObjectShape({ ...lineObject(), id: "" }), false);
  assert.equal(isShellDecorationObjectShape({ ...lineObject(), frame: { left: 0, top: 0 } }), false);
  assert.equal(isShellDecorationObjectShape({ ...lineObject(), zIndex: "1" }), false);
  assert.equal(isShellDecorationObjectShape({ ...lineObject(), source: null }), false);
  assert.equal(isShellDecorationObjectShape({ ...lineObject(), mount: "content" }), false);
  assert.equal(isShellDecorationObjectShape({ ...lineObject(), type: "text" }), false);
});

test("publish validation rejects a header line that crosses the header band boundary", () => {
  const channel: ShellDecorationChannel = {
    footerObjects: [],
    headerObjects: [lineObject({ frame: { height: 28, left: 40, top: 96, width: 200 }, id: "line-overflow" })]
  };

  const result = validateShellDecorationChannel(channel);
  assert.equal(result.canPublish, false);
  const finding = result.findings.find((entry) => entry.code === "SHELL_OBJECT_BAND_OVERFLOW");
  assert.ok(finding);
  assert.equal(finding?.regionId, "line-overflow");
});

test("publish validation rejects an asset-image object that omits its managed asset reference and fallback source", () => {
  const channel: ShellDecorationChannel = {
    footerObjects: [
      {
        ...assetImageObject({ id: "asset-missing", mount: "footer", frame: { height: 48, left: 0, top: 0, width: 48 } }),
        source: { kind: "asset-image" } as ShellDecorationAssetImageObject["source"]
      }
    ],
    headerObjects: []
  };

  const result = validateShellDecorationChannel(channel);
  assert.equal(result.canPublish, false);
  const finding = result.findings.find((entry) => entry.code === "SHELL_OBJECT_INVALID_SOURCE");
  assert.ok(finding);
  assert.equal(finding?.regionId, "asset-missing");
});

test("publish validation rejects duplicate ids and non-finite zIndex ordering", () => {
  const duplicateId = validateShellDecorationChannel({
    footerObjects: [lineObject({ id: "dup", mount: "footer", zIndex: 5 })],
    headerObjects: [lineObject({ id: "dup", zIndex: 1 })]
  });
  assert.ok(duplicateId.findings.some((entry) => entry.code === "SHELL_OBJECT_DUPLICATE_ID"));

  const unstable = validateShellDecorationChannel({
    footerObjects: [],
    headerObjects: [lineObject({ id: "a", zIndex: Number.NaN })]
  });
  assert.ok(unstable.findings.some((entry) => entry.code === "SHELL_OBJECT_UNSTABLE_ORDER"));
});

test("publish validation accepts shared zIndex within a band because id breaks the tie", () => {
  const result = validateShellDecorationChannel({
    footerObjects: [],
    headerObjects: [lineObject({ id: "a", zIndex: 1 }), lineObject({ id: "b", zIndex: 1 })]
  });
  assert.equal(result.canPublish, true);
});

test("a band-safe channel passes validation", () => {
  const channel: ShellDecorationChannel = {
    footerObjects: [],
    headerObjects: [lineObject({ id: "ok", zIndex: 1 }), assetImageObject({ id: "ok-asset", zIndex: 2 })]
  };
  assert.equal(validateShellDecorationChannel(channel).canPublish, true);
});

test("toPublicShellDecorationConfig sorts deterministically and drops management metadata", () => {
  const publicConfig = toPublicShellDecorationConfig({
    footerObjects: [],
    headerObjects: [assetImageObject({ id: "second", zIndex: 5 }), lineObject({ id: "first", zIndex: 1 })],
    publishedAt: "2026-05-26T00:00:00.000Z",
    publishedBy: "operator",
    stage: "live",
    updatedAt: "2026-05-26T00:00:00.000Z",
    version: 3
  });

  assert.deepEqual(
    publicConfig.headerObjects.map((object) => object.id),
    ["first", "second"]
  );
  assert.equal(publicConfig.version, 3);
  assert.equal("publishedBy" in publicConfig, false);
});

test("sortShellDecorationObjects breaks zIndex ties by id without mutating input", () => {
  const input = [lineObject({ id: "b", zIndex: 1 }), lineObject({ id: "a", zIndex: 1 })];
  const sorted = sortShellDecorationObjects(input);
  assert.deepEqual(sorted.map((object) => object.id), ["a", "b"]);
  assert.deepEqual(input.map((object) => object.id), ["b", "a"]);
});
