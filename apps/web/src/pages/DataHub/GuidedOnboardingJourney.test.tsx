import assert from "node:assert/strict";
import test, { after } from "node:test";
import { JSDOM } from "jsdom";
import type { MeterSourceDefinition } from "@solar-display/shared";
import type { WorkspaceHealthSummary } from "./sourceWorkspace";

// React DOM feature-detects its event plugins at module load, so the DOM globals
// must exist before it is imported; otherwise input/change events never reach React.
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  pretendToBeVisual: true,
  url: "http://127.0.0.1/"
});
for (const [key, value] of Object.entries({
  document: dom.window.document,
  Event: dom.window.Event,
  HTMLElement: dom.window.HTMLElement,
  HTMLInputElement: dom.window.HTMLInputElement,
  navigator: dom.window.navigator,
  window: dom.window
})) {
  Object.defineProperty(globalThis, key, { configurable: true, value, writable: true });
}
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const React = (await import("react")).default;
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
type Root = ReturnType<typeof createRoot>;
const { MemoryRouter } = await import("react-router-dom");
const { DataHubTaskHomeContent } = await import("./TaskHome");

after(() => dom.window.close());

const reviewedSource: MeterSourceDefinition = {
  channelId: "kn-main", enabled: true, energyFlowRole: "consumption", epochId: "one",
  expectedCadenceSeconds: 60, inputUnit: "kWh", measurementKind: "cumulative-energy",
  meterId: "kn-main", metricKey: "consumptionEnergy", metricScope: "kn", reviewStatus: "reviewed",
  scaleDecimal: "1", sourceRevision: 1, sourceTimestampTimeZone: null, timestampPolicy: "source-required"
};
const configuredTopic = "factory/kn/main";
const summary: WorkspaceHealthSummary = {
  emptyReason: null, hasData: true, issueCount: 0, issueExplanations: [],
  lastUpdated: "2026-09-08T01:02:00.000Z", managedCount: 0, operatorCount: 1,
  scopeLabel: "KN", sourceCount: 1
};

type Call = { body: string; method: string; url: string };

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { headers: { "content-type": "application/json" }, status });
}

function createHarness(options: { candidates?: unknown[] } = {}) {
  const calls: Call[] = [];
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  const originalFetch = globalThis.fetch;
  const candidates = options.candidates ?? [{
    candidateId: configuredTopic, declaredTag: "MAIN", exactTopic: configuredTopic,
    lastSeenAt: "2026-09-08T01:00:00.000Z", sampleRefs: ["sample-1"], schemaVersion: 1
  }];

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    const body = String(init?.body ?? "");
    const method = init?.method ?? "GET";
    calls.push({ body, method, url });
    if (url.endsWith("/api/settings/mqtt")) {
      return jsonResponse({ status: { broker: "10.0.0.9:1883", connected: true } });
    }
    if (url.endsWith("/reception-profiles")) {
      return jsonResponse({ profiles: [{ allowedFilters: ["factory/kn/"], id: "kn-power", name: "觀音電力資料", siteScope: "kn" }] });
    }
    if (url.endsWith("/meter-sources")) {
      return jsonResponse({ sources: [reviewedSource] });
    }
    if (url.endsWith("/captures") && method === "POST") {
      return jsonResponse({
        captureId: "capture-1", connectionRef: "central", coverage: "no-traffic",
        discovery: { reason: null, state: "granted" }, dropped: 0,
        expiresAt: "2026-09-08T01:03:00.000Z", featureEnabled: true,
        receptionProfileId: "kn-power", siteScope: "kn"
      });
    }
    if (url.endsWith("/candidates")) {
      return jsonResponse({ candidates, captureId: "capture-1", coverage: candidates.length ? "partial" : "no-traffic", dropped: 0 });
    }
    if (url.includes("/samples/")) {
      return jsonResponse({
        captureId: "capture-1", connectionRef: "central", exactTopic: configuredTopic,
        receptionProfileId: "kn-power", redactedPayload: JSON.stringify({ tag: "MAIN", value: "1234.5" }),
        sampleId: "sample-1", schemaVersion: 1, siteScope: "kn", truncated: false,
        transportEvidence: { dup: false, origin: "mqtt", qos: 0, receivedAt: "2026-09-08T01:00:00.000Z", retain: false }
      });
    }
    if (url.endsWith("/mqtt-mappings/preview")) {
      return jsonResponse({ canonicalDraft: JSON.parse(body), previewToken: "journey-token" });
    }
    if (url.endsWith("/mqtt-mappings/apply")) {
      return jsonResponse({
        activation: { reason: null, retryable: false, state: "active", topic: configuredTopic },
        applied: true, channelId: reviewedSource.channelId, reception: { observed: false }, saved: true,
        source: reviewedSource
      });
    }
    if (url.endsWith("/publish-confirmation")) {
      return jsonResponse({
        broker: "10.0.0.9:1883", confirmationToken: "confirm-1", exactTopic: configuredTopic,
        expiresAt: "2026-09-08T01:05:00.000Z", metricKey: "consumptionEnergy", metricScope: "kn",
        payload: JSON.stringify({ value: 77.25 }), retain: false,
        source: {
          channelId: reviewedSource.channelId, inputUnit: reviewedSource.inputUnit,
          measurementKind: reviewedSource.measurementKind, meterId: reviewedSource.meterId,
          sourceRevision: reviewedSource.sourceRevision
        },
        targetFingerprint: "fingerprint-1", value: "77.25"
      });
    }
    if (url.endsWith("/publish")) {
      return jsonResponse({ actualPublish: true, metricKey: "consumptionEnergy", payload: JSON.stringify({ value: 77.25 }), success: true, topic: configuredTopic });
    }
    throw new Error(`unexpected URL ${url}`);
  };

  const root = createRoot(container);
  return {
    calls,
    container,
    dom,
    root,
    async dispose() {
      await act(async () => root.unmount());
      container.remove();
      globalThis.fetch = originalFetch;
    }
  };
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  input.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
}

function button(scopeRoot: { querySelectorAll: Element["querySelectorAll"] }, label: string) {
  const found = [...scopeRoot.querySelectorAll("button")]
    .find((entry) => entry.textContent?.includes(label));
  assert.ok(found, `expected button: ${label}`);
  return found as HTMLButtonElement;
}

async function renderRoutedConnectTask(root: Root) {
  await act(async () => {
    root.render(
      <MemoryRouter>
        <DataHubTaskHomeContent summary={summary} task="connect" workspaceScope="kn" />
      </MemoryRouter>
    );
    await Promise.resolve();
  });
}

async function advanceTo(container: HTMLElement, step: "site" | "received-data" | "confirm") {
  const order = ["connection", "site", "received-data", "confirm"];
  const target = order.indexOf(step);
  for (let index = 0; index < target; index += 1) {
    await act(async () => { button(container, "下一步").click(); await Promise.resolve(); });
  }
}

async function reachSelectableFields(harness: ReturnType<typeof createHarness>) {
  await renderRoutedConnectTask(harness.root);
  await advanceTo(harness.container, "received-data");
  await act(async () => { button(harness.container, "開始接收").click(); await Promise.resolve(); });
  const captureCall = harness.calls.find(({ method, url }) => method === "POST" && url.endsWith("/captures"));
  assert.ok(captureCall, "the routed task must start a capture itself");
  assert.equal(
    (JSON.parse(captureCall.body) as { filter?: string }).filter,
    "factory/kn/#",
    "discovery must ask for a filter that actually matches topics under the approved prefix"
  );
  await act(async () => { button(harness.container, "重新整理").click(); await Promise.resolve(); });
  const candidate = harness.container.querySelector(`[data-onboarding-candidate="${configuredTopic}"]`);
  assert.ok(candidate, "the routed task must list the discovered candidate topic");
  await act(async () => { (candidate as HTMLButtonElement).click(); await Promise.resolve(); });
  const sourceOption = harness.container.querySelector(`[data-onboarding-source="${reviewedSource.channelId}"]`);
  assert.ok(sourceOption, "the routed task must offer a concrete reviewed source");
  await act(async () => { (sourceOption as HTMLButtonElement).click(); await Promise.resolve(); });
}

test("R3 the routed connect task reaches mapping preview from real capture evidence", async () => {
  const harness = createHarness();
  try {
    await reachSelectableFields(harness);
    const field = harness.container.querySelector('[data-mapping-field="value"]');
    assert.ok(field, "selectable fields must come from the fetched sample, not from injected component props");
    assert.match(harness.container.textContent ?? "", /1234\.5/);

    await act(async () => { (field as HTMLButtonElement).click(); });
    await act(async () => { button(harness.container, "下一步").click(); await Promise.resolve(); });
    await act(async () => { button(harness.container, "產生預覽").click(); await Promise.resolve(); });

    const previewCall = harness.calls.find(({ url }) => url.endsWith("/mqtt-mappings/preview"));
    assert.ok(previewCall, "the routed task must reach mapping preview");
    const previewBody = JSON.parse(previewCall.body) as Record<string, unknown>;
    assert.equal(previewBody.topic, configuredTopic, "the exact topic must come from the selected sample");
    assert.deepEqual(previewBody.source, reviewedSource);

    await act(async () => { button(harness.container, "套用對應").click(); await Promise.resolve(); });
    const applyCall = harness.calls.find(({ url }) => url.endsWith("/mqtt-mappings/apply"));
    assert.ok(applyCall, "the routed task must be able to apply without a manual topic copy");
    assert.equal((JSON.parse(applyCall.body) as { topic?: string }).topic, configuredTopic);
  } finally {
    await harness.dispose();
  }
});

test("R3 step navigation preserves the selected site, source, sample and topic", async () => {
  const harness = createHarness();
  try {
    await reachSelectableFields(harness);
    await act(async () => { button(harness.container, "上一步").click(); await Promise.resolve(); });
    await act(async () => { button(harness.container, "下一步").click(); await Promise.resolve(); });
    const selected = harness.container.querySelector("[data-onboarding-selected-topic]");
    assert.ok(selected, "the selected topic must survive step navigation");
    assert.equal(selected.getAttribute("data-onboarding-selected-topic"), configuredTopic);
    assert.equal(
      harness.container.querySelector("[data-onboarding-selected-source]")?.getAttribute("data-onboarding-selected-source"),
      reviewedSource.channelId
    );
    assert.ok(harness.container.querySelector('[data-mapping-field="value"]'), "the mapping draft must survive step navigation");
  } finally {
    await harness.dispose();
  }
});

test("R3 a silent capture stays recoverable and never claims the source is live", async () => {
  const harness = createHarness({ candidates: [] });
  try {
    await renderRoutedConnectTask(harness.root);
    await advanceTo(harness.container, "received-data");
    await act(async () => { button(harness.container, "開始接收").click(); await Promise.resolve(); });
    await act(async () => { button(harness.container, "重新整理").click(); await Promise.resolve(); });
    const text = harness.container.textContent ?? "";
    assert.ok(harness.container.querySelector("[data-onboarding-capture-empty]"), "a silent capture must be stated explicitly");
    assert.doesNotMatch(text, /來源已上線|已在接收資料/u, "a silent capture must not claim the source is live");
    assert.ok(button(harness.container, "重新整理"), "capture retry must stay available");
    assert.equal(harness.container.querySelector('[data-mapping-field="value"]'), null);
  } finally {
    await harness.dispose();
  }
});

test("R4 the confirm step shows the server-resolved target and publishes only the confirmed payload", async () => {
  const harness = createHarness();
  try {
    await renderRoutedConnectTask(harness.root);
    await advanceTo(harness.container, "confirm");
    const valueInput = harness.container.querySelector("[data-onboarding-publish-value]") as HTMLInputElement | null;
    assert.ok(valueInput, "the operator must enter the value that will be sent");
    await act(async () => { setInputValue(valueInput, "77.25"); });
    await act(async () => { button(harness.container, "發送測試值（需確認）").click(); await Promise.resolve(); });

    const confirmationCall = harness.calls.find(({ url }) => url.endsWith("/publish-confirmation"));
    assert.ok(confirmationCall, "the confirmation target must be resolved by the server");
    assert.equal((JSON.parse(confirmationCall.body) as { value?: unknown }).value, "77.25");
    const shown = harness.container.querySelector("[data-onboarding-publish-confirm]")?.textContent ?? "";
    assert.match(shown, /factory\/kn\/main/, "confirmation must show the configured topic");
    assert.doesNotMatch(shown, /kn\/kn-main/, "confirmation must not invent a topic from a naming convention");
    assert.doesNotMatch(shown, /10000\.125/, "no fixed production test reading may be offered");
    assert.match(shown, /10\.0\.0\.9:1883/);
    assert.match(shown, /77\.25/);
    assert.match(shown, /retain=false|不保留/u);
    assert.equal(harness.calls.filter(({ url }) => url.endsWith("/publish")).length, 0, "showing a confirmation must publish nothing");

    await act(async () => { button(harness.container, "確認發送").click(); await Promise.resolve(); });
    const publishCalls = harness.calls.filter(({ url }) => url.endsWith("/publish"));
    assert.equal(publishCalls.length, 1);
    const publishBody = JSON.parse(publishCalls[0]!.body) as Record<string, unknown>;
    assert.equal(publishBody.confirmationToken, "confirm-1");
    assert.equal(publishBody.confirmed, true);
    assert.equal(publishBody.retain, false);
    assert.equal(publishBody.value, "77.25");
  } finally {
    await harness.dispose();
  }
});

test("R4 cancelling a confirmation publishes nothing", async () => {
  const harness = createHarness();
  try {
    await renderRoutedConnectTask(harness.root);
    await advanceTo(harness.container, "confirm");
    const valueInput = harness.container.querySelector("[data-onboarding-publish-value]") as HTMLInputElement | null;
    assert.ok(valueInput);
    await act(async () => { setInputValue(valueInput, "77.25"); });
    await act(async () => { button(harness.container, "發送測試值（需確認）").click(); await Promise.resolve(); });
    await act(async () => { button(harness.container, "取消發送").click(); await Promise.resolve(); });
    assert.equal(harness.calls.filter(({ url }) => url.endsWith("/publish")).length, 0);
    assert.equal(harness.container.querySelector("[data-onboarding-publish-confirm]"), null);
  } finally {
    await harness.dispose();
  }
});
