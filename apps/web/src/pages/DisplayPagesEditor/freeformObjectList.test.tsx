import assert from "node:assert/strict";
import test from "node:test";
import type { DisplayPageFreeformObject } from "@solar-display/shared";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  addDisplayPageObject,
  deleteDisplayPageObject,
  DisplayPageObjectList,
  duplicateDisplayPageObject,
  moveDisplayPageObject,
  resolveDisplayPageObjectRows,
  toggleDisplayPageObjectLocked,
  toggleDisplayPageObjectVisible,
  updateDisplayPageObject
} from "./freeformObjectList";

function lineObject(id: string, zIndex: number): DisplayPageFreeformObject {
  return {
    frame: { height: 4, left: 120, top: 88, width: 280 },
    id,
    locked: false,
    metadata: {},
    mount: "content",
    source: { kind: "line" },
    style: { color: "#d2b46a", opacity: 1, thickness: 4 },
    type: "line",
    visible: true,
    zIndex
  };
}

function assetObject(id: string, zIndex: number): DisplayPageFreeformObject {
  return {
    frame: { height: 140, left: 440, top: 120, width: 220 },
    id,
    locked: false,
    metadata: {},
    mount: "content",
    source: { assetId: 7, fallbackSrc: "/uploads/images/object.png", kind: "asset-image" },
    style: { opacity: 1, rotation: 0 },
    type: "asset-image",
    visible: true,
    zIndex
  };
}

function iconObject(id: string, zIndex: number): DisplayPageFreeformObject {
  return {
    frame: { height: 96, left: 760, top: 140, width: 96 },
    id,
    locked: false,
    metadata: {},
    mount: "content",
    source: { assetId: 9, fallbackSrc: "/uploads/images/icon.svg", kind: "icon-asset" },
    style: { opacity: 1, rotation: 0 },
    type: "icon-asset",
    visible: true,
    zIndex
  };
}

const baseObjects = [lineObject("line-1", 1), assetObject("asset-1", 2), iconObject("icon-1", 3)];

test("resolveDisplayPageObjectRows keeps stable z-order and type-aware labels", () => {
  const rows = resolveDisplayPageObjectRows(baseObjects);

  assert.deepEqual(rows.map((row) => row.id), ["line-1", "asset-1", "icon-1"]);
  assert.equal(rows[0]?.label, "線條 1");
  assert.equal(rows[1]?.label, "圖片 2");
  assert.equal(rows[2]?.label, "圖示 3");
});

test("DisplayPageObjectList renders list-first controls for page freeform objects", () => {
  const html = renderToStaticMarkup(
    React.createElement(DisplayPageObjectList, {
      objects: baseObjects,
      onDelete: () => {},
      onDuplicate: () => {},
      onMoveBackward: () => {},
      onMoveForward: () => {},
      onSelect: () => {},
      onToggleLocked: () => {},
      onToggleVisible: () => {},
      selectedObjectId: "asset-1"
    })
  );

  assert.match(html, /線條 1/);
  assert.match(html, /圖片 2/);
  assert.match(html, /圖示 3/);
  assert.match(html, /前移/);
  assert.match(html, /後移/);
  assert.match(html, /隱藏/);
  assert.match(html, /鎖定/);
  assert.match(html, /複製/);
  assert.match(html, /刪除/);
});

test("DisplayPageObjectList localizes asset source summaries", () => {
  const html = renderToStaticMarkup(
    React.createElement(DisplayPageObjectList, {
      objects: [
        {
          ...assetObject("asset-blank", 1),
          source: { assetId: 42, fallbackSrc: "", kind: "asset-image" }
        } as DisplayPageFreeformObject
      ],
      onDelete: () => {},
      onDuplicate: () => {},
      onMoveBackward: () => {},
      onMoveForward: () => {},
      onSelect: () => {},
      onToggleLocked: () => {},
      onToggleVisible: () => {},
      selectedObjectId: "asset-blank"
    })
  );

  assert.match(html, /素材 #42/);
  assert.doesNotMatch(html, /Asset #42/);
});

test("moveDisplayPageObject keeps object identity stable while swapping z-order", () => {
  const moved = moveDisplayPageObject(baseObjects, "asset-1", "forward");

  assert.deepEqual(moved.map((object) => object.id), ["line-1", "icon-1", "asset-1"]);
});

test("toggleDisplayPageObjectVisible and toggleDisplayPageObjectLocked mutate only the target", () => {
  const hidden = toggleDisplayPageObjectVisible(baseObjects, "icon-1");
  const locked = toggleDisplayPageObjectLocked(hidden, "asset-1");

  assert.equal(locked.find((object) => object.id === "icon-1")?.visible, false);
  assert.equal(locked.find((object) => object.id === "asset-1")?.locked, true);
  assert.equal(locked.find((object) => object.id === "line-1")?.visible, true);
});

test("deleteDisplayPageObject returns the next stable selection for the remaining list", () => {
  const deleted = deleteDisplayPageObject(baseObjects, "asset-1", "asset-1");

  assert.deepEqual(deleted.objects.map((object) => object.id), ["line-1", "icon-1"]);
  assert.equal(deleted.selectedObjectId, "line-1");
});

test("duplicateDisplayPageObject creates an independently editable copy with a fresh id", () => {
  const duplicated = duplicateDisplayPageObject(baseObjects, "icon-1", () => "icon-1-copy");
  const copy = duplicated.objects.find((object) => object.id === "icon-1-copy");

  assert.ok(copy);
  assert.notEqual(copy?.id, "icon-1");
  assert.equal(copy?.zIndex, 4);

  const updated = updateDisplayPageObject(duplicated.objects, "icon-1-copy", (object) => ({
    ...object,
    frame: {
      ...object.frame,
      left: object.frame.left + 120
    }
  }));

  assert.equal(updated.find((object) => object.id === "icon-1")?.frame.left, 760);
  assert.equal(updated.find((object) => object.id === "icon-1-copy")?.frame.left, 880);
});

test("addDisplayPageObject creates line, asset-image, and icon-asset seeds", () => {
  const withLine = addDisplayPageObject([], "line", () => "line-new");
  const withAsset = addDisplayPageObject(withLine.objects, "asset-image", () => "asset-new");
  const withIcon = addDisplayPageObject(withAsset.objects, "icon-asset", () => "icon-new");

  assert.equal(withLine.selectedObjectId, "line-new");
  assert.equal(withAsset.objects.find((object) => object.id === "asset-new")?.type, "asset-image");
  assert.equal(withIcon.objects.find((object) => object.id === "icon-new")?.type, "icon-asset");
});
