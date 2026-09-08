import assert from "node:assert/strict";
import test, { after } from "node:test";
import { JSDOM } from "jsdom";
import type {
  PeriodConsumptionResult,
  ProfileApplyResponse,
  ProfilePreviewResponse,
  SiteEnergyProfileV1
} from "@solar-display/shared";

// React DOM feature-detects its event plugins at module load, so the DOM globals
// must exist before the routed task is imported.
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
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
const { MemoryRouter } = await import("react-router-dom");
const { DataHubTaskHome } = await import("./TaskHome");

after(() => dom.window.close());

const summary = {
  emptyReason: null,
  hasData: true,
  issueCount: 0,
  issueExplanations: [],
  lastUpdated: "2026-09-08T01:02:00.000Z",
  managedCount: 0,
  operatorCount: 1,
  scopeLabel: "KN",
  sourceCount: 1
} as const;

const profile: SiteEnergyProfileV1 = {
  departments: [],
  effectiveFrom: "2026-09-01T00:00:00.000Z",
  metricScope: "kn",
  profileId: "kn-energy",
  revision: 0,
  schemaVersion: 1,
  shareBasis: { kind: "site-main" },
  siteTimeZone: "Asia/Taipei",
  siteTotal: {
    coverageReview: "needs-review",
    kind: "meter-set",
    label: "觀音總錶",
    memberChannelIds: []
  },
  status: "incomplete"
};

function result(valueKwh: string | null, quality: PeriodConsumptionResult["quality"] = "exact"): PeriodConsumptionResult {
  return {
    calculatedThrough: "2026-09-08T00:00:00.000Z",
    dailyCoverage: { coveredDays: valueKwh === null ? 0 : 8, isComplete: valueKwh !== null, totalDays: 8 },
    issues: valueKwh === null ? ["MISSING_BASELINE:main"] : [],
    periodEnd: "2026-09-09T00:00:00+08:00",
    periodStart: "2026-09-01T00:00:00+08:00",
    profileRevision: 0,
    quality,
    siteTimeZone: "Asia/Taipei",
    valueKwh
  };
}

function previewFixture(overrides: Partial<ProfilePreviewResponse> = {}): ProfilePreviewResponse {
  const periodSelection = { kind: "month" as const, month: 9, year: 2026 };
  const asOf = "2026-09-08T01:02:03.000Z";
  const previewProfile: SiteEnergyProfileV1 = {
    ...profile,
    departments: [{
      accountingIncluded: true,
      coverageReview: "reviewed",
      departmentId: "stamping",
      memberChannelIds: ["stamping"],
      nameZh: "沖壓"
    }],
    siteTotal: {
      ...profile.siteTotal,
      coverageReview: "reviewed",
      memberChannelIds: ["main"]
    }
  };
  return {
    asOf,
    calculator: {
      basis: { memberChannelIds: ["main"], result: result("400") },
      departments: [{ departmentId: "stamping", nameZh: "沖壓", ratio: 0.25, result: result("100") }],
      period: result("400")
    },
    expectedRevision: 0,
    periodSelection,
    previewToken: "preview-1",
    profile: previewProfile,
    readiness: { asOf, periodSelection, reasons: [], status: "ready" },
    reviewContext: "profile-draft",
    siteTimeZone: "Asia/Taipei",
    sources: [
      { channelId: "main", epochId: "epoch-1", meterId: "main", sourceRevision: 1 },
      { channelId: "stamping", epochId: "epoch-1", meterId: "stamping", sourceRevision: 1 }
    ],
    ...overrides
  };
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json" },
    status
  });
}

function createHarness(options: {
  profile?: SiteEnergyProfileV1 | null;
  profileResponses?: Array<SiteEnergyProfileV1 | null | { error: string } | { missingProfile: true }>;
  previewResponses?: Array<ProfilePreviewResponse | { error: string; status?: number }>;
  applyResponse?: ProfileApplyResponse;
  applyResponses?: Array<ProfileApplyResponse | { error: string }>;
} = {}) {
  const calls: Array<{ body: string; method: string; url: string }> = [];
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  const originalFetch = globalThis.fetch;
  let previewIndex = 0;
  let profileIndex = 0;
  let applyIndex = 0;
  const previewResponses = options.previewResponses ?? [previewFixture()];
  const applyResponse = options.applyResponse ?? {
    ...profile,
    activationAsOf: "2026-09-08T01:03:00.000Z",
    readiness: { asOf: "2026-09-08T01:03:00.000Z", periodSelection: { kind: "month" as const, month: 9, year: 2026 }, reasons: [], status: "ready" as const },
    reviewAsOf: "2026-09-08T01:02:03.000Z",
    revision: 1,
    status: "ready" as const
  } satisfies ProfileApplyResponse;
  const meters = [
    { channelId: "main", displayNameZh: "觀音總錶", meterId: "main" },
    { channelId: "stamping", displayNameZh: "沖壓電錶", meterId: "stamping" }
  ];

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const body = String(init?.body ?? "");
    calls.push({ body, method, url });
    if (url.endsWith("/api/settings/mqtt/topics")) {
      return jsonResponse({ status: { broker: "", clientId: "", connected: false, reason: null, updatedAt: null }, topics: [] });
    }
    if (url.endsWith("/api/settings/mqtt/solar-sources")) {
      return jsonResponse({ errors: [], sources: [], zones: [] });
    }
    if (url.endsWith("/api/data-hub/sites/kn/energy-profile")) {
      const configuredProfile = options.profileResponses
        ? options.profileResponses[Math.min(profileIndex++, options.profileResponses.length - 1)]
        : options.profile ?? null;
      if (configuredProfile && "error" in configuredProfile) {
        return jsonResponse(configuredProfile, 503);
      }
      if (configuredProfile && "missingProfile" in configuredProfile) {
        return jsonResponse({ meters, receivedTags: [] });
      }
      return jsonResponse({ meters, profile: configuredProfile, receivedTags: [] });
    }
    if (url.endsWith("/api/data-hub/sites/kn/energy-profile/preview")) {
      const response = previewResponses[Math.min(previewIndex++, previewResponses.length - 1)];
      if (!response) {
        throw new Error("preview fixture missing");
      }
      return "error" in response ? jsonResponse(response, response.status ?? 503) : jsonResponse(response);
    }
    if (url.endsWith("/api/data-hub/sites/kn/energy-profile/apply")) {
      const response = options.applyResponses
        ? options.applyResponses[Math.min(applyIndex++, options.applyResponses.length - 1)]
        : applyResponse;
      if (response && "error" in response) {
        return jsonResponse(response, 409);
      }
      return jsonResponse(response);
    }
    throw new Error(`unexpected URL ${url}`);
  };

  const root = createRoot(container);
  return {
    calls,
    container,
    root,
    async dispose() {
      await act(async () => root.unmount());
      container.remove();
      globalThis.fetch = originalFetch;
    }
  };
}

function button(container: HTMLElement, label: string) {
  const found = [...container.querySelectorAll("button")]
    .find((entry) => entry.textContent?.includes(label));
  assert.ok(found, `expected button: ${label}`);
  return found as HTMLButtonElement;
}

async function renderRoutedTask(harness: ReturnType<typeof createHarness>) {
  await act(async () => {
    harness.root.render(
      <MemoryRouter initialEntries={["/settings/data-hub?scope=kn&task=energy"]}>
        <DataHubTaskHome />
      </MemoryRouter>
    );
    await Promise.resolve();
  });
}

async function advanceToBasis(harness: ReturnType<typeof createHarness>) {
  await act(async () => { button(harness.container, "下一步").click(); });
  await act(async () => {
    (harness.container.querySelector('[data-meter-channel="main"]') as HTMLInputElement).click();
  });
  await act(async () => {
    (harness.container.querySelector('[data-site-energy-coverage="site-total"]') as HTMLInputElement).click();
  });
  await act(async () => { button(harness.container, "下一步").click(); });
  await act(async () => {
    (harness.container.querySelector('[data-meter-channel="stamping"]') as HTMLInputElement).click();
  });
  await act(async () => {
    (harness.container.querySelector('[data-site-energy-coverage="stamping"]') as HTMLInputElement).click();
  });
  await act(async () => { button(harness.container, "下一步").click(); });
}

function configuredProfile(revision: number, memberChannelIds: string[] = []): SiteEnergyProfileV1 {
  return {
    ...profile,
    revision,
    siteTotal: {
      ...profile.siteTotal,
      coverageReview: memberChannelIds.length > 0 ? "reviewed" : "needs-review",
      memberChannelIds
    },
    status: memberChannelIds.length > 0 ? "ready" : "incomplete"
  };
}

function applyFixture(nextProfile: SiteEnergyProfileV1): ProfileApplyResponse {
  return {
    ...nextProfile,
    activationAsOf: "2026-09-08T01:03:00.000Z",
    readiness: {
      asOf: "2026-09-08T01:03:00.000Z",
      periodSelection: { kind: "month", month: 9, year: 2026 },
      reasons: [],
      status: "ready"
    },
    reviewAsOf: "2026-09-08T01:02:03.000Z"
  };
}

for (const [code, message] of [
  ["PREVIEW_DRAFT_MISMATCH", /草稿內容已變更.*重新預覽/u],
  ["PROFILE_NOT_READY", /尚未符合套用條件.*重新預覽/u],
  ["PREVIEW_EXPIRED", /預覽已過期.*重新預覽/u]
] as const) {
  test(`R10 ${code} keeps the draft and requires a fresh preview`, async () => {
    const initialProfile = configuredProfile(7);
    const firstPreview = previewFixture({
      expectedRevision: 7,
      profile: { ...previewFixture().profile, revision: 7 }
    });
    const nextPreview = previewFixture({
      expectedRevision: 7,
      previewToken: "preview-2",
      profile: { ...previewFixture().profile, revision: 7 }
    });
    const harness = createHarness({
      profile: initialProfile,
      previewResponses: [firstPreview, nextPreview],
      applyResponses: [
        { error: code },
        applyFixture(configuredProfile(8))
      ]
    });
    try {
      await renderRoutedTask(harness);
      await advanceToBasis(harness);
      await act(async () => {
        (harness.container.querySelector('[data-site-energy-basis-confirm]') as HTMLInputElement).click();
      });
      await act(async () => { button(harness.container, "預覽變更").click(); await Promise.resolve(); });
      const firstRequest = harness.calls.find(({ url }) => url.endsWith("/energy-profile/preview"));
      assert.ok(firstRequest);
      const firstDraft = (JSON.parse(firstRequest.body) as { draft: SiteEnergyProfileV1 }).draft;

      await act(async () => { button(harness.container, "確認套用").click(); await Promise.resolve(); });
      assert.match(harness.container.textContent ?? "", message);
      assert.doesNotMatch(harness.container.textContent ?? "", /確認套用|PREVIEW_DRAFT_MISMATCH|PROFILE_NOT_READY|PREVIEW_EXPIRED/u);

      await act(async () => { button(harness.container, "預覽變更").click(); await Promise.resolve(); });
      const previewRequests = harness.calls.filter(({ url }) => url.endsWith("/energy-profile/preview"));
      assert.equal(previewRequests.length, 2);
      assert.deepEqual((JSON.parse(previewRequests[1]!.body) as { draft: SiteEnergyProfileV1 }).draft, firstDraft);
      await act(async () => { button(harness.container, "確認套用").click(); await Promise.resolve(); });
      assert.match(harness.container.textContent ?? "", /廠區用電設定已套用/u);
    } finally {
      await harness.dispose();
    }
  });
}

test("R10 revision conflict refreshes only expected revision and keeps the draft", async () => {
  const initialProfile = configuredProfile(7);
  const serverProfile = {
    ...configuredProfile(8, ["server-new"]),
    departments: []
  };
  const firstPreview = previewFixture({
    expectedRevision: 7,
    profile: { ...previewFixture().profile, revision: 7 }
  });
  const nextPreview = previewFixture({
    expectedRevision: 8,
    previewToken: "preview-2",
    profile: { ...previewFixture().profile, revision: 7 }
  });
  const harness = createHarness({
    profileResponses: [initialProfile, serverProfile],
    previewResponses: [firstPreview, nextPreview],
    applyResponses: [
      { error: "PROFILE_REVISION_CONFLICT" },
      applyFixture(configuredProfile(8))
    ]
  });
  try {
    await renderRoutedTask(harness);
    await advanceToBasis(harness);
    await act(async () => {
      (harness.container.querySelector('[data-site-energy-basis-confirm]') as HTMLInputElement).click();
    });
    await act(async () => { button(harness.container, "預覽變更").click(); await Promise.resolve(); });
    const firstRequest = harness.calls.find(({ url }) => url.endsWith("/energy-profile/preview"));
    assert.ok(firstRequest);
    const firstDraft = (JSON.parse(firstRequest.body) as { draft: SiteEnergyProfileV1 }).draft;

    await act(async () => { button(harness.container, "確認套用").click(); await Promise.resolve(); });
    assert.match(harness.container.textContent ?? "", /設定版本已更新.*保留目前草稿.*重新預覽/u);
    assert.doesNotMatch(harness.container.textContent ?? "", /確認套用|PROFILE_REVISION_CONFLICT/u);
    assert.equal(harness.calls.filter(({ method, url }) => method === "GET" && url.endsWith("/energy-profile")).length, 2);

    await act(async () => { button(harness.container, "預覽變更").click(); await Promise.resolve(); });
    const previewRequests = harness.calls.filter(({ url }) => url.endsWith("/energy-profile/preview"));
    assert.equal(previewRequests.length, 2);
    const retried = JSON.parse(previewRequests[1]!.body) as { draft: SiteEnergyProfileV1; expectedRevision: number };
    assert.equal(retried.expectedRevision, 8);
    assert.deepEqual(retried.draft, firstDraft);
    assert.deepEqual(retried.draft.siteTotal.memberChannelIds, ["main"]);
    assert.deepEqual(retried.draft.departments[0]?.memberChannelIds, ["stamping"]);
  } finally {
    await harness.dispose();
  }
});

test("R10 revision refresh failure disables preview instead of reusing the stale revision", async () => {
  const initialProfile = configuredProfile(7);
  const refreshedProfile = configuredProfile(8, ["server-new"]);
  const firstPreview = previewFixture({
    expectedRevision: 7,
    profile: { ...previewFixture().profile, revision: 7 }
  });
  const harness = createHarness({
    profileResponses: [initialProfile, { missingProfile: true }, refreshedProfile],
    previewResponses: [firstPreview, previewFixture({
      expectedRevision: 8,
      previewToken: "preview-2",
      profile: { ...firstPreview.profile, revision: 7 }
    })],
    applyResponses: [{ error: "PROFILE_REVISION_CONFLICT" }]
  });
  try {
    await renderRoutedTask(harness);
    await advanceToBasis(harness);
    await act(async () => {
      (harness.container.querySelector('[data-site-energy-basis-confirm]') as HTMLInputElement).click();
    });
    await act(async () => { button(harness.container, "預覽變更").click(); await Promise.resolve(); });
    await act(async () => { button(harness.container, "確認套用").click(); await Promise.resolve(); });
    assert.match(harness.container.textContent ?? "", /設定版本讀取失敗.*重試讀取設定版本/u);
    const retryRead = button(harness.container, "重試讀取設定版本");
    assert.equal(retryRead.disabled, false);
    assert.equal(button(harness.container, "預覽變更").disabled, true);
    await act(async () => { retryRead.click(); await Promise.resolve(); });
    assert.equal(button(harness.container, "預覽變更").disabled, false);
    await act(async () => { button(harness.container, "預覽變更").click(); await Promise.resolve(); });
    assert.equal(harness.calls.filter(({ url }) => url.endsWith("/energy-profile/preview")).length, 2);
    const retried = JSON.parse(harness.calls.filter(({ url }) => url.endsWith("/energy-profile/preview"))[1]!.body) as {
      draft: SiteEnergyProfileV1;
      expectedRevision: number;
    };
    assert.equal(retried.expectedRevision, 8);
    assert.deepEqual(retried.draft.siteTotal.memberChannelIds, ["main"]);
  } finally {
    await harness.dispose();
  }
});

test("R10 preview revision conflict refreshes the revision before allowing retry", async () => {
  const initialProfile = configuredProfile(7);
  const refreshedProfile = configuredProfile(8, ["server-new"]);
  const firstPreview = previewFixture({
    expectedRevision: 7,
    profile: { ...previewFixture().profile, revision: 7 }
  });
  const nextPreview = previewFixture({
    expectedRevision: 8,
    previewToken: "preview-2",
    profile: { ...previewFixture().profile, revision: 7 }
  });
  const harness = createHarness({
    profileResponses: [initialProfile, refreshedProfile],
    previewResponses: [{ error: "PROFILE_REVISION_CONFLICT", status: 409 }, nextPreview]
  });
  try {
    await renderRoutedTask(harness);
    await advanceToBasis(harness);
    await act(async () => {
      (harness.container.querySelector('[data-site-energy-basis-confirm]') as HTMLInputElement).click();
    });
    await act(async () => { button(harness.container, "預覽變更").click(); await Promise.resolve(); });
    assert.match(harness.container.textContent ?? "", /設定版本已更新.*保留目前草稿.*重新預覽/u);
    assert.equal(harness.calls.filter(({ method, url }) => method === "GET" && url.endsWith("/energy-profile")).length, 2);

    await act(async () => { button(harness.container, "預覽變更").click(); await Promise.resolve(); });
    const previewRequests = harness.calls.filter(({ url }) => url.endsWith("/energy-profile/preview"));
    assert.equal(previewRequests.length, 2);
    const retried = JSON.parse(previewRequests[1]!.body) as { draft: SiteEnergyProfileV1; expectedRevision: number };
    assert.equal(retried.expectedRevision, 8);
    assert.deepEqual(retried.draft.siteTotal.memberChannelIds, ["main"]);
    assert.deepEqual(retried.draft.departments[0]?.memberChannelIds, ["stamping"]);
  } finally {
    await harness.dispose();
  }
});

test("R10 routed profile=null setup keeps site-main, reviews coverage, and renders actual preview evidence", async () => {
  const harness = createHarness();
  try {
    await renderRoutedTask(harness);
    await advanceToBasis(harness);

    const basis = harness.container.querySelector("select") as HTMLSelectElement | null;
    assert.ok(basis);
    assert.equal(basis.value, "site-main", "a new setup keeps the site-main default");
    await act(async () => {
      (harness.container.querySelector('[data-site-energy-basis-confirm]') as HTMLInputElement).click();
    });
    await act(async () => { button(harness.container, "預覽變更").click(); await Promise.resolve(); });

    const previewCall = harness.calls.find(({ url }) => url.endsWith("/energy-profile/preview"));
    assert.ok(previewCall);
    const submitted = JSON.parse(previewCall.body) as { draft: SiteEnergyProfileV1 };
    assert.equal(submitted.draft.status, "incomplete", "client event history must not forge ready");
    const review = harness.container.querySelector("[data-site-energy-review]");
    assert.ok(review);
    assert.match(review.querySelector("[data-site-energy-calculator]")?.textContent ?? "", /總量：400 kWh/);
    assert.match(review.querySelector("[data-site-energy-calculator]")?.textContent ?? "", /比較基準：觀音總錶，400 kWh/);
    assert.match(review.textContent ?? "", /預覽來源：觀音總錶（main）/);
    assert.match(review.querySelector("[data-site-energy-calculator]")?.textContent ?? "", /沖壓：100 kWh/);
    assert.match(review.querySelector("[data-site-energy-calculator]")?.textContent ?? "", /占比 25%/);
    assert.match(review.querySelector("[data-site-energy-calculator]")?.textContent ?? "", /品質 完整/);
    assert.match(review.textContent ?? "", /評估期間 2026-09/);
    assert.match(review.textContent ?? "", /廠區時區 Asia\/Taipei/);
    assert.match(review.querySelector("[data-site-energy-readiness]")?.textContent ?? "", /已就緒/);

    await act(async () => {
      (harness.container.querySelector('[data-site-energy-basis-confirm]') as HTMLInputElement).click();
    });
    assert.equal(button(harness.container, "確認套用").disabled, true, "withdrawing confirmation must block apply");
    await act(async () => {
      (harness.container.querySelector('[data-site-energy-basis-confirm]') as HTMLInputElement).click();
    });
    await act(async () => { button(harness.container, "確認套用").click(); await Promise.resolve(); });
    assert.equal(harness.calls.filter(({ url }) => url.endsWith("/energy-profile/apply")).length, 1);
    assert.match(harness.container.textContent ?? "", /廠區用電設定已套用/u);
  } finally {
    await harness.dispose();
  }
});

test("R10 preview failure preserves routed selections and offers retry", async () => {
  const harness = createHarness({
    previewResponses: [{ error: "CALCULATOR_FAILED" }, previewFixture()]
  });
  try {
    await renderRoutedTask(harness);
    await advanceToBasis(harness);
    await act(async () => {
      (harness.container.querySelector('[data-site-energy-basis-confirm]') as HTMLInputElement).click();
    });
    await act(async () => { button(harness.container, "預覽變更").click(); await Promise.resolve(); });
    assert.match(harness.container.textContent ?? "", /預覽|失敗|重試/u);
    const previewBody = JSON.parse(harness.calls.find(({ url }) => url.endsWith("/energy-profile/preview"))?.body ?? "{}") as {
      draft?: SiteEnergyProfileV1;
    };
    assert.deepEqual(previewBody.draft?.siteTotal.memberChannelIds, ["main"]);
    assert.ok(button(harness.container, "預覽變更"));

    await act(async () => { button(harness.container, "預覽變更").click(); await Promise.resolve(); });
    assert.equal(harness.calls.filter(({ url }) => url.endsWith("/energy-profile/preview")).length, 2);
    assert.match(harness.container.textContent ?? "", /100/);
  } finally {
    await harness.dispose();
  }
});

test("R10 waiting readiness can be saved while incomplete readiness cannot be confirmed", async () => {
  const waiting = previewFixture({
    calculator: {
      basis: { memberChannelIds: ["main"], result: result(null, "unavailable") },
      departments: [{ departmentId: "stamping", nameZh: "沖壓", ratio: null, result: result(null, "unavailable") }],
      period: result(null, "unavailable")
    },
    readiness: {
      asOf: "2026-09-08T01:02:03.000Z",
      periodSelection: { kind: "month", month: 9, year: 2026 },
      reasons: ["MISSING_BASELINE:main"],
      status: "configured-awaiting-data"
    }
  });
  const harness = createHarness({
    applyResponse: {
      ...profile,
      activationAsOf: "2026-09-08T01:03:00.000Z",
      readiness: waiting.readiness,
      reviewAsOf: waiting.asOf,
      revision: 1,
      status: "configured-awaiting-data"
    },
    previewResponses: [waiting]
  });
  try {
    await renderRoutedTask(harness);
    await advanceToBasis(harness);
    await act(async () => {
      (harness.container.querySelector('[data-site-energy-basis-confirm]') as HTMLInputElement).click();
    });
    await act(async () => { button(harness.container, "預覽變更").click(); await Promise.resolve(); });
    assert.match(harness.container.textContent ?? "", /MISSING_BASELINE|基準|等待資料/u);
    assert.ok(button(harness.container, "確認套用"), "configured-awaiting-data remains saveable");
    assert.doesNotMatch(harness.container.textContent ?? "", /尚無差值/);
    await act(async () => { button(harness.container, "確認套用").click(); await Promise.resolve(); });
    assert.equal(harness.calls.filter(({ url }) => url.endsWith("/energy-profile/apply")).length, 1);
    assert.match(harness.container.textContent ?? "", /目前等待資料/u);
  } finally {
    await harness.dispose();
  }
});

test("R10 toggling the basis away and back preserves the same draft and back navigation", async () => {
  const harness = createHarness();
  try {
    await renderRoutedTask(harness);
    await advanceToBasis(harness);
    await act(async () => {
      (harness.container.querySelector('[data-site-energy-basis-confirm]') as HTMLInputElement).click();
      button(harness.container, "預覽變更").click();
      await Promise.resolve();
    });
    await act(async () => { button(harness.container, "上一步").click(); });
    assert.equal(harness.container.querySelector("[data-site-energy-setup]")?.getAttribute("data-site-energy-step"), "departments");
    assert.ok(harness.container.querySelector('[data-meter-channel="stamping"]:checked'));
    await act(async () => { button(harness.container, "下一步").click(); });
    const select = harness.container.querySelector("select") as HTMLSelectElement;
    await act(async () => {
      select.value = "department-sum";
      select.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });
    await act(async () => {
      select.value = "site-main";
      select.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });
    assert.equal((harness.container.querySelector('[data-site-energy-basis-confirm]') as HTMLInputElement).checked, false);
    await act(async () => {
      (harness.container.querySelector('[data-site-energy-basis-confirm]') as HTMLInputElement).click();
      button(harness.container, "預覽變更").click();
      await Promise.resolve();
    });
    const previewBodies = harness.calls
      .filter(({ url }) => url.endsWith("/energy-profile/preview"))
      .map(({ body }) => JSON.parse(body) as { draft: SiteEnergyProfileV1 });
    assert.equal(previewBodies.length, 2);
    assert.deepEqual(previewBodies[1]?.draft, previewBodies[0]?.draft);
    assert.equal(previewBodies[1]?.draft.shareBasis.kind, "site-main");
  } finally {
    await harness.dispose();
  }
});

test("R10 incomplete readiness never enables confirmation or writes", async () => {
  const incomplete = previewFixture({
    readiness: {
      asOf: "2026-09-08T01:02:03.000Z",
      periodSelection: { kind: "month", month: 9, year: 2026 },
      reasons: ["SITE_TOTAL_COVERAGE_REVIEW_REQUIRED"],
      status: "incomplete"
    }
  });
  const harness = createHarness({ previewResponses: [incomplete] });
  try {
    await renderRoutedTask(harness);
    await advanceToBasis(harness);
    await act(async () => {
      (harness.container.querySelector('[data-site-energy-basis-confirm]') as HTMLInputElement).click();
      button(harness.container, "預覽變更").click();
      await Promise.resolve();
    });
    const confirm = button(harness.container, "確認套用");
    assert.equal(confirm.disabled, true);
    await act(async () => { confirm.click(); await Promise.resolve(); });
    assert.equal(harness.calls.filter(({ url }) => url.endsWith("/energy-profile/apply")).length, 0);
  } finally {
    await harness.dispose();
  }
});

test("R10 unknown readiness status fails closed without confirmation", async () => {
  const malformed = previewFixture({
    readiness: {
      asOf: "2026-09-08T01:02:03.000Z",
      periodSelection: { kind: "month", month: 9, year: 2026 },
      reasons: [],
      status: "unexpected" as never
    }
  });
  const harness = createHarness({ previewResponses: [malformed] });
  try {
    await renderRoutedTask(harness);
    await advanceToBasis(harness);
    await act(async () => {
      (harness.container.querySelector('[data-site-energy-basis-confirm]') as HTMLInputElement).click();
      button(harness.container, "預覽變更").click();
      await Promise.resolve();
    });
    assert.match(harness.container.textContent ?? "", /預覽回應缺少必要資料/);
    assert.ok(button(harness.container, "預覽變更"));
    assert.equal(harness.calls.filter(({ url }) => url.endsWith("/energy-profile/apply")).length, 0);
  } finally {
    await harness.dispose();
  }
});
