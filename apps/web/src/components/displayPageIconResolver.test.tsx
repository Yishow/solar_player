import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  renderDisplayPageIcon,
  type DisplayPageIconSource
} from "./displayPageIconResolver";

function renderIcon(source: DisplayPageIconSource, seedSource: DisplayPageIconSource) {
  return renderToStaticMarkup(
    React.createElement(
      "div",
      {},
      renderDisplayPageIcon({
        alt: "Seed Alt",
        className: "icon-shell",
        seedSource,
        source
      })
    )
  );
}

test("display page icon resolver renders reference glyph payloads as svg", () => {
  const html = renderIcon(
    {
      glyphName: "leaf",
      mode: "reference-glyph"
    },
    {
      glyphName: "bolt",
      mode: "reference-glyph"
    }
  );

  assert.match(html, /<svg/);
  assert.match(html, /icon-shell/);
});

test("display page icon resolver resolves page-local registries through a shared contract", () => {
  const html = renderIcon(
    {
      iconKey: "esg-doc",
      mode: "page-icon-key",
      registry: "sustainability"
    },
    {
      glyphName: "bolt",
      mode: "reference-glyph"
    }
  );

  assert.match(html, /<svg/);
  assert.match(html, /circle/);
});

test("display page icon resolver falls back to the seed source when a page-local payload is invalid", () => {
  const html = renderIcon(
    {
      iconKey: "missing-key",
      mode: "page-icon-key",
      registry: "sustainability"
    },
    {
      glyphName: "bolt",
      mode: "reference-glyph"
    }
  );

  assert.match(html, /<svg/);
  assert.doesNotMatch(html, /missing-key/);
});

test("display page icon resolver keeps solar asset fallback output on img when asset payload is invalid", () => {
  const html = renderIcon(
    {
      alt: "Broken Icon",
      mode: "asset-image",
      src: ""
    },
    {
      alt: "Solar KPI",
      mode: "asset-image",
      src: "/assets/solar-kpi.png"
    }
  );

  assert.match(html, /<img/);
  assert.match(html, /src="\/assets\/solar-kpi\.png"/);
  assert.match(html, /alt="Solar KPI"/);
});
