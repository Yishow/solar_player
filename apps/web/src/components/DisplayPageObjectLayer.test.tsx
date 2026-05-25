import assert from "node:assert/strict";
import test from "node:test";
import type { DisplayPageFreeformObject } from "@solar-display/shared";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DisplayPageObjectLayer } from "./DisplayPageObjectLayer";

const objects: DisplayPageFreeformObject[] = [
  {
    frame: { height: 4, left: 42, top: 24, width: 200 },
    id: "line-b",
    locked: false,
    metadata: {},
    mount: "content",
    source: { kind: "line" },
    style: { color: "#d2b46a", opacity: 0.8, thickness: 4 },
    type: "line",
    visible: true,
    zIndex: 2
  },
  {
    frame: { height: 88, left: 160, top: 52, width: 88 },
    id: "icon-a",
    locked: false,
    metadata: {},
    mount: "content",
    source: { assetId: 7, fallbackSrc: "/uploads/images/icon.svg", kind: "icon-asset" },
    style: { opacity: 1 },
    type: "icon-asset",
    visible: true,
    zIndex: 1
  },
  {
    frame: { height: 120, left: 260, top: 80, width: 180 },
    id: "asset-hidden",
    locked: false,
    metadata: {},
    mount: "content",
    source: { assetId: 9, fallbackSrc: "/uploads/images/hidden.png", kind: "asset-image" },
    style: {},
    type: "asset-image",
    visible: false,
    zIndex: 3
  }
];

test("DisplayPageObjectLayer sorts objects and skips hidden entries", () => {
  const html = renderToStaticMarkup(React.createElement(DisplayPageObjectLayer, { objects }));

  assert.match(html, /data-display-page-object-layer="true"/);
  assert.match(html, /data-display-page-object-id="icon-a"/);
  assert.match(html, /data-display-page-object-id="line-b"/);
  assert.doesNotMatch(html, /asset-hidden/);
  assert.ok(html.indexOf("icon-a") < html.indexOf("line-b"));
});

test("DisplayPageObjectLayer skips malformed asset-backed sources without dropping the remaining layer", () => {
  const malformedObject = {
    ...objects[1]!,
    id: "icon-bad",
    source: { kind: "icon-asset" }
  } as DisplayPageFreeformObject;

  const html = renderToStaticMarkup(
    React.createElement(DisplayPageObjectLayer, {
      objects: [
        ...objects,
        malformedObject
      ]
    })
  );

  assert.match(html, /data-display-page-object-layer="true"/);
  assert.doesNotMatch(html, /icon-bad/);
});
