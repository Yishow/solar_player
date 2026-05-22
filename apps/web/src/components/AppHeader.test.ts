import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { AppHeader } from "./AppHeader";

test("AppHeader does not render fabricated weather copy", () => {
  const headerHtml = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/overview"] },
      React.createElement(AppHeader, {
        meta: {
          status: "disconnected",
          statusLabel: "離線"
        }
      })
    )
  );

  assert.doesNotMatch(headerHtml, /晴\s*26°C/);
  assert.match(headerHtml, />離線</);
});
