import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMetricDetailsRequestUrl,
  createMetricDetailsStore,
  type MetricDetailsIdentity
} from "./MetricDetailsModel";
import { buildMetricProvenancePath } from "./DiagnosticsModel";
import type { DataHubDiagnosticsModel } from "./DiagnosticsModel";
import { buildMetricUsagePath, type DataHubUsageModel } from "./UsageModel";

const usage: DataHubUsageModel = {
  generatedAt: "2026-08-31T03:00:00.000Z",
  scope: "cl",
  usage: []
};

const diagnostics: DataHubDiagnosticsModel = {
  edges: [],
  generatedAt: "2026-08-31T03:00:00.000Z",
  maxDepth: 4,
  maxNodes: 100,
  metricKey: "inventory.same",
  nodes: [
    {
      category: "semantic-metric",
      id: "semantic-metric:cl:inventory.same",
      label: "Shared power",
      metadata: { metricKey: "inventory.same" },
      scope: "cl",
      status: "live"
    }
  ],
  scope: "cl",
  truncated: false
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

test("Metric details query each composite identity in parallel and cache completed results", async () => {
  const identity: MetricDetailsIdentity = { metricKey: "inventory.same", metricScope: "cl" };
  const otherIdentity: MetricDetailsIdentity = { metricKey: "inventory.same", metricScope: "kn" };
  const usageRequest = deferred<DataHubUsageModel>();
  const diagnosticsRequest = deferred<DataHubDiagnosticsModel | null>();
  const started: string[] = [];
  const store = createMetricDetailsStore({
    diagnostics: async (requestUrl) => {
      started.push(`diagnostics:${requestUrl}`);
      return diagnosticsRequest.promise;
    },
    usage: async (requestUrl) => {
      started.push(`usage:${requestUrl}`);
      return usageRequest.promise;
    }
  });

  store.load(identity);
  await flushPromises();
  assert.deepEqual(started.map((entry) => entry.slice(0, entry.indexOf(":"))), ["usage", "diagnostics"]);
  for (const requestUrl of started.map((entry) => entry.slice(entry.indexOf(":") + 1))) {
    const query = new URL(requestUrl, "https://display.local").searchParams;
    assert.equal(query.get("metricKey"), "inventory.same");
    assert.equal(query.get("scope"), "cl");
  }
  assert.equal(store.get(identity).usage.status, "loading");
  assert.equal(store.get(identity).diagnostics.status, "loading");
  store.load(identity);
  await flushPromises();
  assert.equal(started.length, 2);

  usageRequest.resolve(usage);
  diagnosticsRequest.resolve(diagnostics);
  await flushPromises();
  assert.equal(store.get(identity).usage.status, "empty");
  assert.equal(store.get(identity).diagnostics.status, "ready");

  store.load(identity);
  await flushPromises();
  assert.equal(started.length, 2);

  store.load(otherIdentity);
  await flushPromises();
  assert.equal(started.length, 4);
  assert.match(started[2] ?? "", /scope=kn/);
  assert.match(started[3] ?? "", /scope=kn/);
  store.dispose();
});

test("Metric details preserve partial failure state and ignore late results after invalidation", async () => {
  const identity: MetricDetailsIdentity = { metricKey: "inventory.same", metricScope: "cl" };
  const usageRequest = deferred<DataHubUsageModel>();
  const diagnosticsRequest = deferred<DataHubDiagnosticsModel | null>();
  const store = createMetricDetailsStore({
    diagnostics: async () => diagnosticsRequest.promise,
    usage: async () => usageRequest.promise
  });

  store.load(identity);
  await flushPromises();
  store.invalidate(identity);
  usageRequest.resolve(usage);
  diagnosticsRequest.reject(new Error("provenance unavailable"));
  await flushPromises();

  const invalidated = store.get(identity);
  assert.equal(invalidated.usage.status, "idle");
  assert.equal(invalidated.diagnostics.status, "idle");
  assert.equal(invalidated.diagnosticsLatencyMs, null);

  const disposedUsageRequest = deferred<DataHubUsageModel>();
  const disposedDiagnosticsRequest = deferred<DataHubDiagnosticsModel | null>();
  const disposedStore = createMetricDetailsStore({
    diagnostics: async () => disposedDiagnosticsRequest.promise,
    usage: async () => disposedUsageRequest.promise
  });
  disposedStore.load(identity);
  await flushPromises();
  disposedStore.dispose();
  disposedUsageRequest.resolve(usage);
  disposedDiagnosticsRequest.resolve(diagnostics);
  await flushPromises();
  assert.equal(disposedStore.get(identity).usage.status, "idle");
  assert.equal(disposedStore.get(identity).diagnostics.status, "idle");

  const secondDiagnostics = deferred<DataHubDiagnosticsModel | null>();
  const partialStore = createMetricDetailsStore({
    diagnostics: async () => secondDiagnostics.promise,
    usage: async () => usage,
    now: () => 100
  });
  partialStore.load(identity);
  await flushPromises();
  secondDiagnostics.reject(new Error("diagnostics failed"));
  await flushPromises();

  const partial = partialStore.get(identity);
  assert.equal(partial.usage.status, "empty");
  assert.equal(partial.diagnostics.status, "error");
  assert.equal(partial.diagnostics.errorMessage, "diagnostics failed");
  partialStore.dispose();
  store.dispose();
});

test("Metric details request URL encodes the trusted metric key and scope", () => {
  const identity = { metricKey: "power/total & ready", metricScope: "global" } as const;
  const request = new URL(buildMetricDetailsRequestUrl(identity));
  assert.equal(request.searchParams.get("metricKey"), "power/total & ready");
  assert.equal(request.searchParams.get("scope"), "global");
  assert.equal(buildMetricUsagePath(buildMetricDetailsRequestUrl(identity)), "/api/data-hub/usage?metricKey=power%2Ftotal%20%26%20ready&scope=global");
  assert.equal(buildMetricProvenancePath(buildMetricDetailsRequestUrl(identity)), "/api/data-hub/provenance?metricKey=power%2Ftotal%20%26%20ready&scope=global");
});
