import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SiteEnergySetupPanel } from "./SiteEnergySetupPanel";

const panelSource = readFileSync(new URL("./SiteEnergySetupPanel.tsx", import.meta.url), "utf8");

test("U6 wizard starts on the site step and keeps KN copy", () => {
  const html = renderToStaticMarkup(<SiteEnergySetupPanel scope="kn" />);
  assert.match(html, /data-site-energy-setup/);
  assert.match(html, /data-site-energy-step="site"/);
  assert.match(html, /設定觀音用電/);
  assert.match(html, /目前廠區是 KN/);
});

test("U6 meter picker binds E1 channelId rather than MQTT metricKey", () => {
  assert.match(panelSource, /channelId: meter\.channelId/);
  assert.match(panelSource, /data-meter-channel=\{option\.channelId\}/);
  assert.match(panelSource, /selected=\{draft\.siteTotal\.memberChannelIds\}/);
  assert.doesNotMatch(panelSource, /metricKey: meter\.metricKey/);
  assert.doesNotMatch(panelSource, /data-meter-channel=\{option\.metricKey\}/);
});
