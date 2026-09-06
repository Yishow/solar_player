import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GuidedOnboardingPanel } from "./GuidedOnboardingPanel";
import { GuidedMqttMappingPanel } from "./GuidedMqttMappingPanel";

test("U2 onboarding asks for a site under all-scope", () => {
  const html = renderToStaticMarkup(<GuidedOnboardingPanel scope="all" />);
  assert.match(html, /data-onboarding-choose-site/);
});

test("U2 onboarding keeps KN and starts at connection", () => {
  const html = renderToStaticMarkup(<GuidedOnboardingPanel scope="kn" />);
  assert.match(html, /data-onboarding-step="connection"/);
  assert.match(html, /目前廠區 KN/);
});

test("M2 three-stage mapping panel starts at select", () => {
  const html = renderToStaticMarkup(<GuidedMqttMappingPanel metricScope="kn" />);
  assert.match(html, /data-mapping-stage="select"/);
  assert.match(html, /從已接收資料選欄位/);
  assert.match(html, /data-mapping-field="value"/);
  assert.match(html, /tag=MAIN/);
});
