import assert from "node:assert/strict";
import test from "node:test";
import {
  createSingleSourceMappingApi,
  deleteSingleSourceMappingApi,
  fetchDataHubCapabilities,
  normalizeSavedTopicMapping,
  resolveSourcesSaveErrorMessage,
  saveSingleSourceMappingApi,
  type GenericMqttMapping
} from "./SourcesModel";

test("normalizeSavedTopicMapping keeps row identity while merging the versioned response envelope", () => {
  const previous: GenericMqttMapping = {
    configRevision: 1,
    enabled: true,
    id: 41,
    lastReceivedAt: "2026-09-16T00:00:00.000Z",
    lastValue: 12.5,
    metricKey: "factoryCircuit.stampingPower",
    metricScope: "kn",
    multiplier: 1,
    nameEn: "Stamping power",
    nameZh: "沖壓功率",
    quality: "good",
    sourceRef: "src_kn_stamping",
    topic: "factory/kn/stamping",
    unit: "kW",
    updatedAt: "2026-09-16T00:00:00.000Z",
    valuePath: "value"
  };

  const saved = normalizeSavedTopicMapping({
    configuration: {
      enabled: false,
      nameZh: "沖壓功率（更新）",
      topic: "factory/kn/stamping-v2"
    },
    persistence: "committed",
    revision: 2,
    sourceRef: "src_kn_stamping"
  }, previous);

  assert.equal(saved.id, 41);
  assert.equal(saved.sourceRef, "src_kn_stamping");
  assert.equal(saved.configRevision, 2);
  assert.equal(saved.enabled, false);
  assert.equal(saved.nameZh, "沖壓功率（更新）");
  assert.equal(saved.topic, "factory/kn/stamping-v2");
  assert.equal(saved.lastReceivedAt, previous.lastReceivedAt);
  assert.equal(saved.lastValue, previous.lastValue);
});

test("fetchDataHubCapabilities returns backend capabilities", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      if (url.includes("/api/data-hub/capabilities")) {
        return new Response(
          JSON.stringify({
            capabilities: {
              legacyReplaceSupported: true,
              versionedSourceEditing: true
            }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("Not found", { status: 404 });
    };

    const caps = await fetchDataHubCapabilities();
    assert.equal(caps.versionedSourceEditing, true);
    assert.equal(caps.legacyReplaceSupported, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("updateSingleSourceMapping sends PATCH with expectedRevision and patch", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  try {
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      calls.push({ url, method, body });

      return new Response(
        JSON.stringify({
          configuration: {
            configRevision: 2,
            enabled: true,
            id: 42,
            metricKey: "factoryCircuit.stampingPower",
            metricScope: "kn",
            nameZh: "沖壓更新",
            sourceRef: "src_kn_stamping",
            topic: "factory/kn/stamping"
          },
          persistence: "committed",
          revision: 2,
          sourceRef: "src_kn_stamping"
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const result = await saveSingleSourceMappingApi({
      expectedRevision: 1,
      idempotencyKey: "test_key_1",
      patch: {
        nameZh: "沖壓更新"
      },
      sourceRef: "src_kn_stamping"
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0]!.method, "PATCH");
    assert.ok(calls[0]!.url.includes("/api/data-hub/source-mappings/src_kn_stamping"));
    assert.equal(result.persistence, "committed");
    assert.equal(result.revision, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("deleteSingleSourceMapping sends DELETE with expectedRevision", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  try {
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      calls.push({ url, method, body });

      return new Response(
        JSON.stringify({
          configuration: null,
          persistence: "committed",
          revision: 2,
          sourceRef: "src_kn_stamping"
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const result = await deleteSingleSourceMappingApi({
      expectedRevision: 1,
      idempotencyKey: "test_del_1",
      sourceRef: "src_kn_stamping"
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0]!.method, "DELETE");
    assert.equal(result.persistence, "committed");
    assert.equal((result as any).configuration ?? null, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("createSingleSourceMapping sends POST with full configuration", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  try {
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      calls.push({ url, method, body });

      return new Response(
        JSON.stringify({
          configuration: {
            configRevision: 1,
            enabled: true,
            id: 99,
            metricKey: "customMetric",
            metricScope: "kn",
            nameZh: "自訂來源",
            sourceRef: "src_kn_customMetric",
            topic: "factory/kn/custom"
          },
          persistence: "committed",
          revision: 1,
          sourceRef: "src_kn_customMetric"
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const result = await createSingleSourceMappingApi({
      source: {
        enabled: true,
        metricKey: "customMetric",
        metricScope: "kn",
        nameZh: "自訂來源",
        topic: "factory/kn/custom"
      } as any
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0]!.method, "POST");
    assert.equal(result.persistence, "committed");
    assert.equal(result.revision, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("resolveSourcesSaveErrorMessage returns structured Traditional Chinese messages", () => {
  assert.match(
    resolveSourcesSaveErrorMessage({ body: { code: "SOURCE_REVISION_CONFLICT" } }),
    /此資料來源已被其他操作者更新/
  );
  assert.match(
    resolveSourcesSaveErrorMessage({ body: { code: "COLLECTION_REVISION_CONFLICT" } }),
    /此資料來源已被其他操作者更新/
  );
  assert.match(
    resolveSourcesSaveErrorMessage({ body: { code: "LEGACY_WRITE_REQUIRES_REVISION" } }),
    /伺服器已啟用版本化來源管理/
  );
  assert.match(
    resolveSourcesSaveErrorMessage({ body: { code: "E1_SOURCE_REVISION_REQUIRED" } }),
    /受審核的正式電錶/
  );
  assert.match(
    resolveSourcesSaveErrorMessage({ body: { code: "E1_SOURCE_IN_USE" } }),
    /這個來源仍被引用/
  );
  assert.match(
    resolveSourcesSaveErrorMessage({ body: { code: "E1_SOURCE_IMPACT_UNKNOWN" } }),
    /無法確認引用影響/
  );
  assert.match(
    resolveSourcesSaveErrorMessage({ body: { code: "MANAGED_SOURCE_METRIC_CONFLICT" } }),
    /Solar adapter 管理/
  );
  assert.match(
    resolveSourcesSaveErrorMessage({ body: { code: "DERIVED_METRIC_IDENTITY_CONFLICT" } }),
    /derived metric 管理/
  );
});
