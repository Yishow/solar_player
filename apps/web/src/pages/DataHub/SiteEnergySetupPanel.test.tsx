import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SiteEnergySetupPanel } from "./SiteEnergySetupPanel";

test("U6 wizard starts on the site step and keeps KN copy", () => {
  const html = renderToStaticMarkup(<SiteEnergySetupPanel scope="kn" />);
  assert.match(html, /data-site-energy-setup/);
  assert.match(html, /data-site-energy-step="site"/);
  assert.match(html, /設定觀音用電/);
  assert.match(html, /目前廠區是 KN/);
});
