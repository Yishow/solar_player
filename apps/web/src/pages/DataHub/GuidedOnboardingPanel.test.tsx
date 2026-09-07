import assert from "node:assert/strict";
import test from "node:test";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import type { MeterSourceDefinition } from "@solar-display/shared";
import { GuidedOnboardingPanel } from "./GuidedOnboardingPanel";
import { GuidedMqttMappingPanel } from "./GuidedMqttMappingPanel";

const reviewedSource: MeterSourceDefinition = {
  channelId: "kn-meter-01",
  enabled: true,
  energyFlowRole: "consumption",
  epochId: "epoch-01",
  expectedCadenceSeconds: 60,
  inputUnit: "kWh",
  measurementKind: "cumulative-energy",
  meterId: "meter-01",
  metricKey: "meter.kn.01",
  metricScope: "kn",
  reviewStatus: "reviewed",
  scaleDecimal: "1",
  sourceRevision: 1,
  sourceTimestampTimeZone: null,
  timestampPolicy: "source-required"
};

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
  const html = renderToStaticMarkup(
    <GuidedMqttMappingPanel
      metricScope="kn"
      payload={{ tag: "MAIN", value: "10000.125" }}
      source={reviewedSource}
      topic="site/kn/meter-01"
    />
  );
  assert.match(html, /data-mapping-stage="select"/);
  assert.match(html, /從已接收資料選欄位/);
  assert.match(html, /data-mapping-field="value"/);
  assert.match(html, /tag=MAIN/);
  assert.match(html, /data-mapping-suggest/);
});

test("M2 mapping panel does not invent an observation before capture", () => {
  const html = renderToStaticMarkup(<GuidedMqttMappingPanel metricScope="kn" />);
  assert.match(html, /data-mapping-no-observation/);
  assert.match(html, /尚未收到可選的實際資料/);
  assert.doesNotMatch(html, /data-mapping-field="value"/);
  assert.doesNotMatch(html, /tag=MAIN/);
});

test("M2 mapping preview uses the reviewed source semantics and topic", async () => {
  const source: MeterSourceDefinition = {
    channelId: "kn-channel-42",
    enabled: true,
    energyFlowRole: "generation",
    epochId: "epoch-42",
    expectedCadenceSeconds: 30,
    inputUnit: "kW",
    measurementKind: "power-gauge",
    meterId: "meter-42",
    metricKey: "meter.kn.42",
    metricScope: "kn",
    reviewStatus: "reviewed",
    scaleDecimal: "1",
    sourceRevision: 3,
    sourceTimestampTimeZone: null,
    timestampPolicy: "allow-receive-time-estimate"
  };
  const calls: Array<{ body: string; url: string }> = [];
  const originalFetch = globalThis.fetch;
  const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", {
    pretendToBeVisual: true,
    url: "http://127.0.0.1/"
  });
  for (const [key, value] of Object.entries({
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    navigator: dom.window.navigator,
    window: dom.window
  })) {
    Object.defineProperty(globalThis, key, { configurable: true, value, writable: true });
  }
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    const body = String(init?.body ?? "");
    calls.push({ body, url });
    if (url.endsWith("/mqtt-mappings/preview")) {
      return new Response(JSON.stringify({ canonicalDraft: JSON.parse(body), previewToken: "mapping-token-1" }), {
        headers: { "content-type": "application/json" },
        status: 200
      });
    }
    if (url.endsWith("/mqtt-mappings/apply")) {
      return new Response(JSON.stringify({ applied: true }), {
        headers: { "content-type": "application/json" },
        status: 200
      });
    }
    throw new Error(`unexpected URL ${url}`);
  };

  const root = createRoot(dom.window.document.getElementById("root")!);
  const button = (label: string) => {
    const found = [...dom.window.document.querySelectorAll("button")]
      .find((entry) => entry.textContent?.includes(label));
    assert.ok(found, `expected button: ${label}`);
    return found as HTMLButtonElement;
  };

  try {
    await act(async () => {
      root.render(
        <GuidedMqttMappingPanel
          metricScope="kn"
          payload={{ tag: "GEN", value: "12.5" }}
          source={source}
          topic="site/kn/generation-42"
        />
      );
      await Promise.resolve();
    });
    await act(async () => {
      (dom.window.document.querySelector('[data-mapping-field="value"]') as HTMLButtonElement).click();
    });
    await act(async () => { button("下一步").click(); });
    await act(async () => { button("產生預覽").click(); await Promise.resolve(); });

    const previewBody = JSON.parse(calls.find(({ url }) => url.endsWith("/mqtt-mappings/preview"))?.body ?? "{}") as Record<string, unknown>;
    assert.equal(previewBody.channelId, source.channelId);
    assert.equal(previewBody.energyFlowRole, source.energyFlowRole);
    assert.equal(previewBody.measurementKind, source.measurementKind);
    assert.equal(previewBody.timestampPolicy, source.timestampPolicy);
    assert.deepEqual(previewBody.source, source);
    assert.equal(previewBody.topic, "site/kn/generation-42");
    assert.match(dom.window.document.body.textContent ?? "", /預覽已完成，尚未套用/u);

    await act(async () => { button("套用對應").click(); await Promise.resolve(); });
    await act(async () => { button("套用對應").click(); await Promise.resolve(); });
    const applyBodies = calls
      .filter(({ url }) => url.endsWith("/mqtt-mappings/apply"))
      .map(({ body }) => JSON.parse(body) as Record<string, unknown>);
    assert.equal(applyBodies.length, 2);
    assert.deepEqual(applyBodies[0], applyBodies[1]);
    assert.equal(applyBodies[0]?.idempotencyKey, "m2-mapping-token-1");
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    globalThis.fetch = originalFetch;
  }
});

test("U2 connection test is separate from real publish", () => {
  const html = renderToStaticMarkup(<GuidedOnboardingPanel scope="kn" />);
  assert.match(html, /data-onboarding-connection-test/);
  assert.match(html, /測試連線/);
  assert.doesNotMatch(html, /data-onboarding-real-publish/);
});
