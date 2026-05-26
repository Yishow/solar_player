import assert from "node:assert/strict";
import test from "node:test";
import type { ShellDecorationChannel, ShellDecorationObject } from "@solar-display/shared";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  addShellDecorationObject,
  deleteShellDecorationObject,
  duplicateShellDecorationObject,
  moveShellDecorationObject,
  resolveShellObjectSections,
  ShellDecorationObjectList,
  toggleShellDecorationObjectLocked,
  toggleShellDecorationObjectVisible,
  updateShellDecorationObject
} from "./objectList";

function lineObject(id: string, mount: "header" | "footer", zIndex: number): ShellDecorationObject {
  return {
    frame: { height: 2, left: 86, top: 24, width: 320 },
    id,
    locked: false,
    metadata: {},
    mount,
    source: { kind: "line" },
    style: { color: "#d2b46a", thickness: 2 },
    type: "line",
    visible: true,
    zIndex
  };
}

function ornamentObject(id: string, mount: "header" | "footer", zIndex: number): ShellDecorationObject {
  return {
    frame: { height: 40, left: 22, top: 12, width: 40 },
    id,
    locked: false,
    metadata: {},
    mount,
    source: { kind: "ornament-image", ornamentKey: "leaf" },
    style: {},
    type: "ornament-image",
    visible: true,
    zIndex
  };
}

const baseChannel: ShellDecorationChannel = {
  footerObjects: [ornamentObject("footer-ornament", "footer", 1), lineObject("footer-line", "footer", 2)],
  headerObjects: [lineObject("header-line", "header", 1)]
};

test("resolveShellObjectSections groups shell objects by mount and stable z-order", () => {
  const sections = resolveShellObjectSections(baseChannel);

  assert.deepEqual(sections.map((section) => section.mount), ["header", "footer"]);
  assert.deepEqual(sections[0]?.objects.map((object) => object.id), ["header-line"]);
  assert.deepEqual(sections[1]?.objects.map((object) => object.id), ["footer-ornament", "footer-line"]);
});

test("ShellDecorationObjectList renders grouped header/footer rows and list-first controls", () => {
  const html = renderToStaticMarkup(
    React.createElement(ShellDecorationObjectList, {
      channel: baseChannel,
      onDelete: () => {},
      onDuplicate: () => {},
      onMoveBackward: () => {},
      onMoveForward: () => {},
      onSelect: () => {},
      onToggleLocked: () => {},
      onToggleVisible: () => {},
      selectedObjectId: "footer-line"
    })
  );

  assert.match(html, />頁首</);
  assert.match(html, />頁尾</);
  assert.match(html, /header-line/);
  assert.match(html, /footer-ornament/);
  assert.match(html, /footer-line/);
  assert.match(html, /前移/);
  assert.match(html, /後移/);
  assert.match(html, /隱藏/);
  assert.match(html, /鎖定/);
  assert.match(html, /複製/);
  assert.match(html, /刪除/);
});

test("moveShellDecorationObject keeps the selected object stable while swapping z-order within its mount", () => {
  const moved = moveShellDecorationObject(baseChannel, "footer-ornament", "forward");

  assert.deepEqual(moved.footerObjects.map((object) => object.id), ["footer-line", "footer-ornament"]);
});

test("toggleShellDecorationObjectVisible and toggleShellDecorationObjectLocked mutate only the targeted object", () => {
  const hidden = toggleShellDecorationObjectVisible(baseChannel, "footer-ornament");
  const locked = toggleShellDecorationObjectLocked(hidden, "footer-line");

  assert.equal(locked.footerObjects.find((object) => object.id === "footer-ornament")?.visible, false);
  assert.equal(locked.footerObjects.find((object) => object.id === "footer-line")?.locked, true);
  assert.equal(locked.headerObjects[0]?.visible, true);
});

test("deleteShellDecorationObject removes the target and returns the next stable selection", () => {
  const deleted = deleteShellDecorationObject(baseChannel, "footer-ornament", "footer-ornament");

  assert.deepEqual(deleted.channel.footerObjects.map((object) => object.id), ["footer-line"]);
  assert.equal(deleted.selectedObjectId, "footer-line");
});

test("duplicateShellDecorationObject creates an independently editable copy with a fresh id and predictable z-order", () => {
  const duplicated = duplicateShellDecorationObject(baseChannel, "footer-line", () => "footer-line-copy");
  const copy = duplicated.channel.footerObjects.find((object) => object.id === "footer-line-copy");

  assert.ok(copy);
  assert.notEqual(copy?.id, "footer-line");
  assert.equal(copy?.zIndex, 3);

  const updated = updateShellDecorationObject(duplicated.channel, "footer-line-copy", (object) => ({
    ...object,
    frame: {
      ...object.frame,
      left: object.frame.left + 100
    }
  }));

  assert.equal(updated.footerObjects.find((object) => object.id === "footer-line")?.frame.left, 86);
  assert.equal(updated.footerObjects.find((object) => object.id === "footer-line-copy")?.frame.left, 186);
});

test("addShellDecorationObject creates mount-aware line, asset-image, and ornament-image seeds", () => {
  const withHeaderLine = addShellDecorationObject(baseChannel, { mount: "header", type: "line" }, () => "header-new");
  const withFooterAsset = addShellDecorationObject(withHeaderLine.channel, { mount: "footer", type: "asset-image" }, () => "footer-asset");
  const withFooterOrnament = addShellDecorationObject(withFooterAsset.channel, { mount: "footer", type: "ornament-image" }, () => "footer-ornament-copy");

  assert.equal(withHeaderLine.selectedObjectId, "header-new");
  assert.equal(withFooterAsset.channel.footerObjects.find((object) => object.id === "footer-asset")?.type, "asset-image");
  assert.equal(
    withFooterOrnament.channel.footerObjects.find((object) => object.id === "footer-ornament-copy")?.type,
    "ornament-image"
  );
});
