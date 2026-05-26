import assert from "node:assert/strict";
import test from "node:test";
import type { ShellDecorationObject } from "@solar-display/shared";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  SHELL_CHROME_CONTENT_Z_INDEX,
  ShellDecorationLayer,
  partitionShellDecorationObjectsByPlane
} from "./ShellDecorationLayer";

function lineObject(id: string, zIndex: number): ShellDecorationObject {
  return {
    frame: { height: 2, left: 86, top: 76, width: 642 },
    id,
    locked: false,
    metadata: {},
    mount: "header",
    source: { kind: "line" },
    style: { color: "#d2b46a" },
    type: "line",
    visible: true,
    zIndex
  };
}

function ornamentObject(id: string, zIndex: number): ShellDecorationObject {
  return {
    frame: { height: 48, left: 28, top: 8, width: 48 },
    id,
    locked: false,
    metadata: {},
    mount: "footer",
    source: { kind: "ornament-image", ornamentKey: "leaf" },
    style: { opacity: 0.7 },
    type: "ornament-image",
    visible: true,
    zIndex
  };
}

function assetObject(id: string, zIndex: number, src = "/uploads/images/shell.png"): ShellDecorationObject {
  return {
    frame: { height: 40, left: 120, top: 12, width: 120 },
    id,
    locked: false,
    metadata: {},
    mount: "footer",
    source: { assetId: 7, fallbackSrc: src, kind: "asset-image" },
    style: {},
    type: "asset-image",
    visible: true,
    zIndex
  };
}

test("partitionShellDecorationObjectsByPlane keeps deterministic order around the shared shell content threshold", () => {
  const partitions = partitionShellDecorationObjectsByPlane([
    lineObject("foreground-line", SHELL_CHROME_CONTENT_Z_INDEX + 1),
    lineObject("background-line", 1),
    lineObject("tie-line", SHELL_CHROME_CONTENT_Z_INDEX)
  ]);

  assert.deepEqual(
    partitions.background.map((object) => object.id),
    ["background-line"]
  );
  assert.deepEqual(
    partitions.foreground.map((object) => object.id),
    ["tie-line", "foreground-line"]
  );
});

test("ShellDecorationLayer renders stable FHD coordinates with passive background and foreground planes", () => {
  const html = renderToStaticMarkup(
    React.createElement(ShellDecorationLayer, {
      mount: "header",
      objects: [lineObject("foreground-line", SHELL_CHROME_CONTENT_Z_INDEX + 5), lineObject("background-line", 1)]
    })
  );

  assert.match(html, /data-shell-decoration-mount="header"/);
  assert.match(html, /data-shell-decoration-plane="background"/);
  assert.match(html, /data-shell-decoration-plane="foreground"/);
  assert.match(html, /pointer-events:none/);
  assert.match(html, /left:86px/);
  assert.match(html, /top:76px/);
  assert.ok(html.indexOf('data-shell-decoration-object-id="background-line"') < html.indexOf('data-shell-decoration-object-id="foreground-line"'));
});

test("ShellDecorationLayer skips invisible, mount-mismatched, and unresolved ornament objects without breaking remaining shell chrome", () => {
  const invisible = lineObject("hidden-line", 1);
  invisible.visible = false;
  const wrongMount = lineObject("wrong-mount", 2);
  wrongMount.mount = "header";
  const unknownOrnament = ornamentObject("unknown-ornament", 3);
  unknownOrnament.source = { kind: "ornament-image", ornamentKey: "unknown" };

  const html = renderToStaticMarkup(
    React.createElement(ShellDecorationLayer, {
      mount: "footer",
      objects: [assetObject("asset-ok", 4), invisible, wrongMount, unknownOrnament, ornamentObject("leaf-ok", 1)]
    })
  );

  assert.match(html, /data-shell-decoration-object-id="asset-ok"/);
  assert.match(html, /data-shell-decoration-object-id="leaf-ok"/);
  assert.doesNotMatch(html, /hidden-line/);
  assert.doesNotMatch(html, /wrong-mount/);
  assert.doesNotMatch(html, /unknown-ornament/);
});

test("ShellDecorationLayer renders managed shell ornament images before built-in ornament fallback", () => {
  const managedOrnament = ornamentObject("managed-leaf", 1);
  managedOrnament.source = {
    assetId: 42,
    fallbackSrc: "/uploads/images/managed-leaf.png",
    kind: "ornament-image",
    ornamentKey: "leaf"
  };

  const html = renderToStaticMarkup(
    React.createElement(ShellDecorationLayer, {
      mount: "footer",
      objects: [managedOrnament]
    })
  );

  assert.match(html, /<img/);
  assert.match(html, /data-shell-decoration-object-id="managed-leaf"/);
  assert.match(html, /src="\/uploads\/images\/managed-leaf\.png"/);
});
