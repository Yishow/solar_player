import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React, { act } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import type { ProfilePreviewResponse, SiteEnergyProfileV1 } from "@solar-display/shared";
import { SiteEnergySetupPanel } from "./SiteEnergySetupPanel";

const panelSource = readFileSync(new URL("./SiteEnergySetupPanel.tsx", import.meta.url), "utf8");

function previewResponse(profile: SiteEnergyProfileV1, previewToken: string): ProfilePreviewResponse {
  const result = {
    profileRevision: profile.revision,
    quality: "exact" as const,
    siteTimeZone: profile.siteTimeZone,
    valueKwh: "12.5"
  };
  const periodSelection = { kind: "month" as const, month: 9, year: 2026 };
  return {
    asOf: "2026-09-08T01:02:03.000Z",
    calculator: {
      basis: { memberChannelIds: profile.siteTotal.memberChannelIds, result },
      departments: [],
      period: result
    },
    expectedRevision: profile.revision,
    periodSelection,
    previewToken,
    profile,
    readiness: { asOf: "2026-09-08T01:02:03.000Z", periodSelection, reasons: [], status: "ready" },
    reviewContext: "profile-draft",
    siteTimeZone: profile.siteTimeZone,
    sources: profile.siteTotal.memberChannelIds.map((channelId) => ({
      channelId, epochId: "epoch-1", meterId: channelId, sourceRevision: 1
    }))
  };
}

for (const code of ["PROFILE_SOURCE_CONFLICT", "PROFILE_SOURCE_REVIEW_REQUIRED"]) {
  test(`U6 ${code} preserves selections and requires a fresh preview`, async () => {
    const profile: SiteEnergyProfileV1 = {
      departments: [], effectiveFrom: "2026-09-01T00:00:00Z", metricScope: "kn",
      profileId: "kn-energy", revision: 7, schemaVersion: 1,
      shareBasis: { kind: "site-main" }, siteTimeZone: "Asia/Taipei",
      siteTotal: { coverageReview: "reviewed", kind: "meter-set", label: "總錶", memberChannelIds: ["main"] },
      status: "ready"
    };
    const dom = new JSDOM('<div id="root"></div>', { url: "http://127.0.0.1/" });
    const globals = {
      document: dom.window.document, HTMLElement: dom.window.HTMLElement,
      navigator: dom.window.navigator, window: dom.window, IS_REACT_ACT_ENVIRONMENT: true
    };
    const descriptors = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    for (const [key, value] of Object.entries(globals)) {
      Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    }
    const originalFetch = globalThis.fetch;
    const previews: Array<{ draft: SiteEnergyProfileV1 }> = [];
    const applies: Array<{ previewToken: string; draft: SiteEnergyProfileV1 }> = [];
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
      headers: { "content-type": "application/json" }, status
    });
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      if (url.endsWith("/energy-profile")) return json({ profile, meters: [
        { channelId: "main", meterId: "main" }, { channelId: "second", meterId: "second" }
      ] });
      if (url.endsWith("/preview")) {
        previews.push(JSON.parse(String(init?.body)));
        if (previews.length === 2) return json({ error: "PROFILE_SOURCE_UNAVAILABLE" }, 422);
        return json(previewResponse(profile, `token-${previews.length}`));
      }
      if (url.endsWith("/apply")) {
        const submitted = JSON.parse(String(init?.body)) as typeof applies[number];
        applies.push(submitted);
        return applies.length === 1 ? json({ error: code }, 409) : json({
          ...submitted.draft,
          activationAsOf: "2026-09-08T01:03:00.000Z",
          readiness: {
            asOf: "2026-09-08T01:03:00.000Z",
            periodSelection: { kind: "month", month: 9, year: 2026 },
            reasons: [],
            status: "ready"
          },
          reviewAsOf: "2026-09-08T01:02:03.000Z",
          revision: 8
        });
      }
      throw new Error(`Unexpected URL ${url}`);
    };
    const root = createRoot(dom.window.document.getElementById("root")!);
    const click = async (label: string) => {
      const button = [...dom.window.document.querySelectorAll("button")].find((item) => item.textContent === label);
      assert.ok(button, label);
      await act(async () => button.click());
    };
    try {
      await act(async () => root.render(<SiteEnergySetupPanel scope="kn" />));
      await click("下一步");
      await act(async () => (dom.window.document.querySelector('[data-meter-channel="second"]') as HTMLInputElement).click());
      await act(async () => (dom.window.document.querySelector('[data-site-energy-coverage="site-total"]') as HTMLInputElement).click());
      await click("下一步");
      await click("下一步");
      await act(async () => (dom.window.document.querySelector('[data-site-energy-basis-confirm]') as HTMLInputElement).click());
      await click("預覽變更");
      await click("確認套用");
      assert.match(dom.window.document.body.textContent ?? "", /來源設定.*重新預覽/);
      assert.doesNotMatch(dom.window.document.body.textContent ?? "", /確認套用|PROFILE_SOURCE/);
      await click("預覽變更");
      assert.match(dom.window.document.body.textContent ?? "", /所選來源目前不可用/);
      assert.doesNotMatch(dom.window.document.body.textContent ?? "", /確認套用|PROFILE_SOURCE/);
      await click("預覽變更");
      const [firstPreview, rejectedPreview, freshPreview] = previews;
      assert.ok(firstPreview && rejectedPreview && freshPreview);
      assert.deepEqual(rejectedPreview.draft, firstPreview.draft);
      assert.deepEqual(freshPreview.draft, firstPreview.draft);
      assert.deepEqual(freshPreview.draft.siteTotal.memberChannelIds, ["main", "second"]);
      await click("確認套用");
      assert.deepEqual(applies.map((entry) => entry.previewToken), ["token-1", "token-3"]);
      assert.match(dom.window.document.body.textContent ?? "", /廠區用電設定已套用/);
    } finally {
      await act(async () => root.unmount());
      dom.window.close();
      globalThis.fetch = originalFetch;
      for (const [key, descriptor] of descriptors) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else Reflect.deleteProperty(globalThis, key);
      }
    }
  });
}

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

test("U6 previews before confirm and retries with the same token key", async () => {
  const profile: SiteEnergyProfileV1 = {
    departments: [],
    effectiveFrom: "2026-09-01T00:00:00.000Z",
    metricScope: "kn",
    profileId: "kn-energy",
    revision: 7,
    schemaVersion: 1,
    shareBasis: { kind: "site-main" },
    siteTimeZone: "Asia/Taipei",
    siteTotal: {
      coverageReview: "reviewed",
      kind: "meter-set",
      label: "觀音總錶",
      memberChannelIds: ["kn-channel-1"]
    },
    status: "ready"
  };
  const calls: Array<{ body: string; url: string }> = [];
  let applyAttempts = 0;
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
    calls.push({ body: String(init?.body ?? ""), url });
    if (url.endsWith("/energy-profile")) {
      return new Response(JSON.stringify({
        meters: [{ channelId: "kn-channel-1", displayNameZh: "觀音總錶", meterId: "meter-1" }],
        profile,
        receivedTags: []
      }), { headers: { "content-type": "application/json" }, status: 200 });
    }
    if (url.endsWith("/energy-profile/preview")) {
      return new Response(JSON.stringify(previewResponse(profile, "preview-token-1")), {
        headers: { "content-type": "application/json" }, status: 200
      });
    }
    if (url.endsWith("/energy-profile/apply")) {
      applyAttempts += 1;
      if (applyAttempts === 1) {
        return new Response(JSON.stringify({ error: "temporary failure" }), {
          headers: { "content-type": "application/json" },
          status: 503
        });
      }
      return new Response(JSON.stringify({
        ...profile,
        activationAsOf: "2026-09-08T01:03:00.000Z",
        readiness: {
          asOf: "2026-09-08T01:03:00.000Z",
          periodSelection: { kind: "month", month: 9, year: 2026 },
          reasons: [],
          status: "ready"
        },
        reviewAsOf: "2026-09-08T01:02:03.000Z",
        revision: 8
      }), {
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
      root.render(<SiteEnergySetupPanel scope="kn" />);
      await Promise.resolve();
    });
    await act(async () => { button("下一步").click(); });
    await act(async () => { button("下一步").click(); });
    await act(async () => { button("下一步").click(); });
    await act(async () => { (dom.window.document.querySelector('[data-site-energy-basis-confirm]') as HTMLInputElement).click(); });
    await act(async () => { button("預覽變更").click(); await Promise.resolve(); });

    assert.equal(calls.filter(({ url }) => url.endsWith("/energy-profile/preview")).length, 1);
    assert.equal(calls.filter(({ url }) => url.endsWith("/energy-profile/apply")).length, 0);
    assert.match(dom.window.document.body.textContent ?? "", /待確認/u);
    assert.match(dom.window.document.body.textContent ?? "", /確認套用/u);

    await act(async () => { button("確認套用").click(); await Promise.resolve(); });
    await act(async () => { button("確認套用").click(); await Promise.resolve(); });
    const applyBodies = calls
      .filter(({ url }) => url.endsWith("/energy-profile/apply"))
      .map(({ body }) => JSON.parse(body) as Record<string, unknown>);
    assert.equal(applyBodies.length, 2);
    assert.deepEqual(applyBodies[0], applyBodies[1]);
    assert.equal(applyBodies[0]?.expectedRevision, 7);
    assert.equal(applyBodies[0]?.previewToken, "preview-token-1");
    assert.equal(applyBodies[0]?.idempotencyKey, "u6-kn-preview-token-1");
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    globalThis.fetch = originalFetch;
  }
});
