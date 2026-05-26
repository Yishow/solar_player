import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DisplayLeafOrnament } from "./DisplayLeafOrnament";
import { createLeafOrnamentChromeConfig } from "./displayPageChromeConfig";

test("DisplayLeafOrnament renders a managed asset when the source resolves", () => {
  const html = renderToStaticMarkup(
    React.createElement(DisplayLeafOrnament, {
      className: "display-surface-leaf-ornament",
      config: createLeafOrnamentChromeConfig({
        source: {
          assetId: 42,
          fallbackSrc: "/uploads/images/leaf.png",
          mode: "managed-asset",
          ornamentKey: "leaf"
        }
      }),
      style: { height: 120, width: 160 }
    })
  );

  assert.match(html, /<img/);
  assert.match(html, /src="\/uploads\/images\/leaf\.png"/);
});

test("DisplayLeafOrnament falls back to the built-in leaf primitive", () => {
  const html = renderToStaticMarkup(
    React.createElement(DisplayLeafOrnament, {
      className: "display-surface-leaf-ornament",
      config: createLeafOrnamentChromeConfig({
        source: {
          assetId: 42,
          mode: "managed-asset",
          ornamentKey: "leaf"
        }
      }),
      style: { height: 120, width: 160 }
    })
  );

  assert.match(html, /<div/);
  assert.doesNotMatch(html, /<img/);
});
