import assert from "node:assert/strict";
import test, { after } from "node:test";
import { JSDOM } from "jsdom";
import type { MeterSourceDefinition } from "@solar-display/shared";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  pretendToBeVisual: true,
  url: "http://127.0.0.1/"
});

for (const [key, value] of Object.entries({
  document: dom.window.document,
  Event: dom.window.Event,
  HTMLElement: dom.window.HTMLElement,
  HTMLInputElement: dom.window.HTMLInputElement,
  HTMLSelectElement: dom.window.HTMLSelectElement,
  navigator: dom.window.navigator,
  window: dom.window
})) {
  Object.defineProperty(globalThis, key, { configurable: true, value, writable: true });
}
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const React = (await import("react")).default;
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { GuidedMqttMappingPanel } = await import("./GuidedMqttMappingPanel");
const { PublishDiagnosticsSection } = await import("./PublishDiagnosticsSection");
const { OnboardingPrerequisites } = await import("./OnboardingPrerequisites");

after(() => dom.window.close());

const reviewedSource: MeterSourceDefinition = {
  channelId: "kn-stamping-main",
  enabled: true,
  energyFlowRole: "consumption",
  epochId: "ep-01",
  expectedCadenceSeconds: 60,
  inputUnit: "kWh",
  measurementKind: "cumulative-energy",
  meterId: "meter-stamp-01",
  metricKey: "meter.kn.stamping",
  metricScope: "kn",
  reviewStatus: "reviewed",
  scaleDecimal: "1",
  sourceRevision: 1,
  sourceTimestampTimeZone: null,
  timestampPolicy: "source-required"
};

function button(container: HTMLElement, label: string) {
  const found = [...container.querySelectorAll("button")].find((el) => el.textContent?.includes(label));
  assert.ok(found, `Expected button with label: ${label}`);
  return found as HTMLButtonElement;
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  input.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
}

test("DHM-R1: Partial multiplier string does not silently fallback to 1 and invalidates preview", async () => {
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);

  try {
    await act(async () => {
      root.render(
        <GuidedMqttMappingPanel
          metricScope="kn"
          payload={{ tag: "MAIN", val: "5000" }}
          source={reviewedSource}
          topic="factory/kn/stamping"
        />
      );
      await Promise.resolve();
    });

    const field = container.querySelector('[data-mapping-field="val"]') as HTMLButtonElement;
    assert.ok(field);
    await act(async () => { field.click(); });
    await act(async () => { button(container, "下一步").click(); await Promise.resolve(); });

    // In meaning stage, find scaleMultiplier input
    const inputs = [...container.querySelectorAll("input")];
    const multiplierInput = inputs.find((i) => i.value === "1");
    assert.ok(multiplierInput);

    // Enter partial input "-"
    await act(async () => { setInputValue(multiplierInput, "-"); });
    assert.match(container.textContent ?? "", /乘數尚未完成輸入/);
    const previewBtn = button(container, "產生預覽");
    assert.equal(previewBtn.disabled, true, "Cannot generate preview with invalid multiplier");

    // Enter valid decimal "0.01"
    await act(async () => { setInputValue(multiplierInput, "0.01"); });
    assert.equal(previewBtn.disabled, false, "Preview allowed with valid decimal multiplier");
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

test("DHM-R1: Ambiguous tag in payload triggers warning and disables safe guessing", async () => {
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);

  try {
    await act(async () => {
      root.render(
        <GuidedMqttMappingPanel
          metricScope="kn"
          payload={[
            { tag: "MAIN", val: "100" },
            { tag: "MAIN", val: "200" }
          ]}
          source={reviewedSource}
          topic="factory/kn/stamping"
        />
      );
      await Promise.resolve();
    });

    assert.match(container.textContent ?? "", /偵測到重複 Tag: MAIN/);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

test("DHM-R7: multiple selected suggestions require distinct reviewed targets", async () => {
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push(url);
    if (url.endsWith("/mqtt-mappings/suggest")) {
      return new Response(JSON.stringify({
        suggestions: [
          {
            autoSelectAsSiteMain: false,
            existingMeterId: "meter-a",
            namespace: "kn",
            reason: "第一筆已審查建議",
            tag: "MAIN",
            topic: "factory/kn/main",
            value: "100"
          },
          {
            autoSelectAsSiteMain: false,
            existingMeterId: "meter-b",
            namespace: "kn",
            reason: "第二筆已審查建議",
            tag: "AUX",
            topic: "factory/kn/aux",
            value: "200"
          }
        ]
      }), { headers: { "content-type": "application/json" }, status: 200 });
    }
    throw new Error(`Unexpected URL: ${url} ${String(init?.method ?? "GET")}`);
  };

  try {
    await act(async () => {
      root.render(
        <GuidedMqttMappingPanel
          metricScope="kn"
          payload={{ tag: "MAIN", val: "300" }}
          source={reviewedSource}
          topic="factory/kn/stamping"
        />
      );
      await Promise.resolve();
    });

    await act(async () => {
      (container.querySelector('[data-mapping-field="val"]') as HTMLButtonElement).click();
    });
    await act(async () => {
      button(container, "產生建議").click();
      await Promise.resolve();
    });

    const checkboxes = [...container.querySelectorAll('input[type="checkbox"]')] as HTMLInputElement[];
    assert.equal(checkboxes.length, 2);
    await act(async () => {
      checkboxes[0]!.click();
    });
    await act(async () => {
      checkboxes[1]!.click();
    });
    assert.equal(checkboxes[0]!.checked, true);
    assert.equal(checkboxes[1]!.checked, true);
    await act(async () => {
      button(container, "下一步").click();
    });

    assert.match(container.textContent ?? "", /每一列都必須指定不同的同廠區已審查來源/);
    const previewButton = button(container, "產生預覽");
    assert.equal(previewButton.disabled, true);
    assert.equal(calls.filter((url) => url.endsWith("/mqtt-mappings/preview")).length, 0);
  } finally {
    await act(async () => root.unmount());
    container.remove();
    globalThis.fetch = originalFetch;
  }
});

test("DHM-R7: a single selected suggestion reaches both preview and apply", async () => {
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);
  const originalFetch = globalThis.fetch;
  const calls: Array<{ body: Record<string, unknown>; url: string }> = [];

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {};
    calls.push({ body, url });
    if (url.endsWith("/mqtt-mappings/suggest")) {
      return new Response(JSON.stringify({
        suggestions: [{
          autoSelectAsSiteMain: false,
          existingMeterId: "meter-a",
          namespace: "kn",
          reason: "已審查建議",
          tag: "MAIN",
          topic: "factory/kn/main",
          value: "100"
        }]
      }), { headers: { "content-type": "application/json" }, status: 200 });
    }
    if (url.endsWith("/mqtt-mappings/preview")) {
      return new Response(JSON.stringify({ canonicalDraft: body, previewToken: "single-token" }), {
        headers: { "content-type": "application/json" },
        status: 200
      });
    }
    if (url.endsWith("/mqtt-mappings/apply")) {
      return new Response(JSON.stringify({ applied: true, saved: true }), {
        headers: { "content-type": "application/json" },
        status: 200
      });
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  try {
    await act(async () => {
      root.render(
        <GuidedMqttMappingPanel
          metricScope="kn"
          payload={{ tag: "MAIN", val: "300" }}
          source={reviewedSource}
          topic="factory/kn/stamping"
        />
      );
      await Promise.resolve();
    });
    await act(async () => {
      (container.querySelector('[data-mapping-field="val"]') as HTMLButtonElement).click();
    });
    await act(async () => {
      button(container, "產生建議").click();
      await Promise.resolve();
      await Promise.resolve();
    });
    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    assert.ok(checkbox);
    await act(async () => checkbox.click());
    await act(async () => button(container, "下一步").click());
    await act(async () => {
      button(container, "產生預覽").click();
      await Promise.resolve();
      await Promise.resolve();
    });

    const previewCall = calls.find((call) => call.url.endsWith("/mqtt-mappings/preview"));
    assert.ok(previewCall);
    const previewBody = previewCall.body as {
      selector?: { path?: string[]; tagEquals?: string };
      topic?: string;
    };
    assert.deepEqual(previewBody.selector?.path, ["val"]);
    assert.equal(previewBody.selector?.tagEquals, "MAIN");
    assert.equal(previewBody.topic, "factory/kn/main");

    await act(async () => {
      button(container, "套用對應").click();
      await Promise.resolve();
      await Promise.resolve();
    });
    const applyCall = calls.find((call) => call.url.endsWith("/mqtt-mappings/apply"));
    assert.ok(applyCall);
    const applyBody = applyCall.body as { canonicalDraft?: typeof previewBody };
    assert.equal(applyBody.canonicalDraft?.topic, "factory/kn/main");
    assert.equal(applyBody.canonicalDraft?.selector?.tagEquals, "MAIN");
  } finally {
    await act(async () => root.unmount());
    container.remove();
    globalThis.fetch = originalFetch;
  }
});

test("DHM-R7: selected rows send canonical drafts and apply one atomic batch", async () => {
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);
  const originalFetch = globalThis.fetch;
  const calls: Array<{ body: Record<string, unknown>; url: string }> = [];
  const secondSource: MeterSourceDefinition = {
    ...reviewedSource,
    channelId: "kn-stamping-aux",
    meterId: "meter-stamp-aux",
    metricKey: "meter.kn.stamping.aux",
    epochId: "ep-aux"
  };

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {};
    calls.push({ body, url });
    if (url.endsWith("/mqtt-mappings/suggest")) {
      return new Response(JSON.stringify({
        suggestions: [
          {
            autoSelectAsSiteMain: false,
            namespace: "kn",
            reason: "第一筆已審查建議",
            tag: "MAIN",
            topic: "factory/kn/main",
            value: "100"
          },
          {
            autoSelectAsSiteMain: false,
            namespace: "kn",
            reason: "第二筆已審查建議",
            tag: "AUX",
            topic: "factory/kn/aux",
            value: "200"
          }
        ]
      }), { headers: { "content-type": "application/json" }, status: 200 });
    }
    if (url.endsWith("/mqtt-mappings/batch-preview")) {
      const requestItems = Array.isArray(body.items) ? body.items as Array<Record<string, unknown>> : [];
      return new Response(JSON.stringify({
        batchToken: "batch-token",
        items: requestItems.map((item, index) => ({
          canonicalDraft: item.draft,
          previewToken: "row-token-" + (index + 1),
          reused: false,
          rowId: item.rowId
        }))
      }), { headers: { "content-type": "application/json" }, status: 200 });
    }
    if (url.endsWith("/mqtt-mappings/batch-apply")) {
      const requestItems = Array.isArray(body.items) ? body.items as Array<Record<string, unknown>> : [];
      return new Response(JSON.stringify({
        applied: true,
        items: requestItems.map((item) => ({
          applied: true,
          channelId: (item.canonicalDraft as Record<string, unknown>).channelId,
          rowId: item.rowId,
          saved: true,
          source: item.source
        }))
      }), { headers: { "content-type": "application/json" }, status: 200 });
    }
    throw new Error("Unexpected URL: " + url);
  };

  try {
    await act(async () => {
      root.render(
        <GuidedMqttMappingPanel
          metricScope="kn"
          payload={{ tag: "MAIN", val: "300" }}
          source={reviewedSource}
          sources={[reviewedSource, secondSource]}
          topic="factory/kn/stamping"
        />
      );
      await Promise.resolve();
    });
    await act(async () => {
      (container.querySelector('[data-mapping-field="val"]') as HTMLButtonElement).click();
      button(container, "產生建議").click();
      await Promise.resolve();
      await Promise.resolve();
    });
    const checkboxes = [...container.querySelectorAll('input[type="checkbox"]')] as HTMLInputElement[];
    assert.equal(checkboxes.length, 2);
    await act(async () => checkboxes[0]!.click());
    await act(async () => checkboxes[1]!.click());
    const targets = [...container.querySelectorAll("select[aria-label]")] as HTMLSelectElement[];
    assert.equal(targets.length, 2);
    const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLSelectElement.prototype, "value")?.set;
    await act(async () => {
      setter?.call(targets[1], secondSource.channelId);
      targets[1]!.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });
    await act(async () => button(container, "下一步").click());
    await act(async () => {
      button(container, "產生預覽").click();
      await Promise.resolve();
      await Promise.resolve();
    });

    const previewCall = calls.find((call) => call.url.endsWith("/mqtt-mappings/batch-preview"));
    assert.ok(previewCall);
    const previewItems = previewCall.body.items as Array<{ draft: Record<string, unknown>; rowId: string }>;
    assert.equal(previewItems.length, 2);
    assert.deepEqual(previewItems.map((item) => item.draft.channelId), [
      reviewedSource.channelId,
      secondSource.channelId
    ]);
    assert.match(container.textContent ?? "", /批次 Token: batch-token/);
    assert.match(container.textContent ?? "", /row-token-1/);
    assert.match(container.textContent ?? "", /row-token-2/);

    await act(async () => {
      button(container, "套用對應").click();
      await Promise.resolve();
      await Promise.resolve();
    });
    const applyCall = calls.find((call) => call.url.endsWith("/mqtt-mappings/batch-apply"));
    assert.ok(applyCall);
    assert.equal(applyCall.body.batchToken, "batch-token");
    assert.equal((applyCall.body.items as unknown[]).length, 2);
  } finally {
    await act(async () => root.unmount());
    container.remove();
    globalThis.fetch = originalFetch;
  }
});

test("DHM-R2: Mapping apply reuses the exact same idempotencyKey on retries", async () => {
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);
  const calls: Array<{ body: string; url: string }> = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    const body = String(init?.body ?? "");
    calls.push({ body, url });
    if (url.endsWith("/mqtt-mappings/preview")) {
      return new Response(JSON.stringify({ canonicalDraft: JSON.parse(body), previewToken: "token-abc" }), {
        headers: { "content-type": "application/json" },
        status: 200
      });
    }
    if (url.endsWith("/mqtt-mappings/apply")) {
      return new Response(JSON.stringify({ applied: true, saved: true }), {
        headers: { "content-type": "application/json" },
        status: 200
      });
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  try {
    await act(async () => {
      root.render(
        <GuidedMqttMappingPanel
          metricScope="kn"
          payload={{ val: "300" }}
          source={reviewedSource}
          topic="factory/kn/stamping"
        />
      );
      await Promise.resolve();
    });

    await act(async () => { (container.querySelector('[data-mapping-field="val"]') as HTMLButtonElement).click(); });
    await act(async () => { button(container, "下一步").click(); await Promise.resolve(); });
    await act(async () => { button(container, "產生預覽").click(); await Promise.resolve(); });

    assert.match(container.textContent ?? "", /Token: token-abc/);
    assert.match(container.textContent ?? "", /尚未累積足夠的區間用電基線/);

    await act(async () => { button(container, "套用對應").click(); await Promise.resolve(); });
    await act(async () => { button(container, "套用對應").click(); await Promise.resolve(); });

    const applyCalls = calls.filter((c) => c.url.endsWith("/mqtt-mappings/apply"));
    assert.equal(applyCalls.length, 2);
    const firstBody = JSON.parse(applyCalls[0]!.body) as { idempotencyKey: string };
    const secondBody = JSON.parse(applyCalls[1]!.body) as { idempotencyKey: string };
    assert.equal(firstBody.idempotencyKey, "m2-token-abc");
    assert.equal(firstBody.idempotencyKey, secondBody.idempotencyKey, "idempotencyKey must be strictly identical");
  } finally {
    await act(async () => root.unmount());
    container.remove();
    globalThis.fetch = originalFetch;
  }
});

test("DHM-R3: Publish diagnostics resolves target from selected source and blocks Solar targets", async () => {
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);
  const originalFetch = globalThis.fetch;
  const calls: Array<{ body: string; url: string }> = [];

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    const body = String(init?.body ?? "");
    calls.push({ body, url });
    if (url.includes("/publish-confirmation")) {
      return new Response(
        JSON.stringify({
          broker: "broker.local:1883",
          confirmationToken: "conf-123",
          exactTopic: "factory/kn/stamping",
          expiresAt: "2026-09-16T12:00:00Z",
          metricKey: reviewedSource.metricKey,
          metricScope: "kn",
          payload: JSON.stringify({ value: 88.8 }),
          retain: false,
          source: null,
          targetFingerprint: "fp",
          value: "88.8"
        }),
        { headers: { "content-type": "application/json" }, status: 200 }
      );
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  try {
    await act(async () => {
      root.render(
        <PublishDiagnosticsSection
          defaultOpen={true}
          metricScope="kn"
          source={reviewedSource}
        />
      );
      await Promise.resolve();
    });

    assert.match(container.textContent ?? "", /meter\.kn\.stamping/);

    const valInput = container.querySelector("[data-onboarding-publish-value]") as HTMLInputElement;
    assert.ok(valInput);
    await act(async () => { setInputValue(valInput, "88.8"); });
    await act(async () => { button(container, "發送測試值（需確認）").click(); await Promise.resolve(); });

    const confirmCall = calls.find((c) => c.url.includes("/publish-confirmation"));
    assert.ok(confirmCall);
    assert.ok(confirmCall.url.includes(`/topics/${reviewedSource.metricKey}/publish-confirmation`), "Target must use source metricKey, not hard-coded consumptionEnergy");

    // Changing value invalidates confirmation
    assert.ok(container.querySelector("[data-onboarding-publish-confirm]"));
    await act(async () => { setInputValue(valInput, "99.9"); });
    assert.equal(container.querySelector("[data-onboarding-publish-confirm]"), null, "Confirmation invalidated on value change");

    // Solar source is blocked
    const solarSource: MeterSourceDefinition = { ...reviewedSource, metricKey: "solar.output" };
    await act(async () => {
      root.render(
        <PublishDiagnosticsSection
          defaultOpen={true}
          metricScope="kn"
          source={solarSource}
        />
      );
      await Promise.resolve();
    });
    assert.match(container.textContent ?? "", /Solar 託管資料，禁止進行實際發送測試/);
  } finally {
    await act(async () => root.unmount());
    container.remove();
    globalThis.fetch = originalFetch;
  }
});

test("M2-R1: OnboardingPrerequisites displays inline checks without full-page blocking wizard", async () => {
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);

  try {
    // Missing site
    await act(async () => {
      root.render(
        <OnboardingPrerequisites
          broker="10.0.0.1:1883"
          profiles={[]}
          site={null}
        />
      );
      await Promise.resolve();
    });
    assert.ok(container.querySelector("[data-onboarding-choose-site]"));

    // Concrete site
    await act(async () => {
      root.render(
        <OnboardingPrerequisites
          broker="10.0.0.1:1883"
          profiles={[{ allowedFilters: ["factory/kn/"], id: "p1", name: "KN Power", siteScope: "kn" }]}
          site="kn"
        />
      );
      await Promise.resolve();
    });
    assert.match(container.textContent ?? "", /廠區 KN/);
    assert.match(container.textContent ?? "", /接收範圍已核准/);
    assert.ok(container.querySelector("[data-onboarding-connection-test]"));
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
