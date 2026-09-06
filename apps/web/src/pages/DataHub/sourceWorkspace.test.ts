import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWorkspaceHealthSummary,
  createGenericMappingDraft,
  filterMetricRows,
  filterSourceRows,
  mergeLiveObservationSnapshot,
  mergeScopedTopicEdits,
  overlayLiveObservations,
  sourceDisplayName,
  validateGenericMappingForSave
} from "./sourceWorkspace";
import { buildSourceRows, buildTopicMappingsSavePayload, type DataHubSourcesModel } from "./SourcesModel";
import type { MetricInventoryRow } from "./MetricsModel";

const baseModel: DataHubSourcesModel = {
  solar: {
    errors: [],
    sources: [
      {
        discoveredZoneCount: 1,
        health: "healthy",
        lastAlert: null,
        lastError: null,
        lastGoodSummaryAt: "2026-08-31T01:00:00.000Z",
        lastHeartbeatAt: "2026-08-31T01:01:00.000Z",
        lastStatus: "online",
        metricScope: "cl",
        ownership: "managed",
        sourceId: "solar-collector",
        sourceTimestamp: "2026-08-31T01:00:00.000Z",
        sourceTopic: "solar/CL/summary"
      }
    ],
    zones: []
  },
  status: {
    broker: "mqtt://central-broker:1883",
    clientId: "solar-display-player",
    connected: true,
    reason: null,
    updatedAt: "2026-08-31T01:02:00.000Z"
  },
  topics: [
    {
      enabled: true,
      id: 10,
      lastReceivedAt: "2026-08-31T01:02:00.000Z",
      lastValue: 4.2,
      metricKey: "factoryCircuit.stampingPower",
      metricScope: "cl",
      multiplier: 1,
      nameEn: "CL Stamping",
      nameZh: "CL 沖床",
      quality: "good",
      topic: "factory/cl/stamping",
      unit: "kW",
      updatedAt: "2026-08-30T01:00:00.000Z",
      valuePath: "$.value"
    },
    {
      enabled: true,
      id: 11,
      lastReceivedAt: null,
      lastValue: null,
      metricKey: "factoryCircuit.stampingPower",
      metricScope: "kn",
      multiplier: 1,
      nameEn: "KN Stamping",
      nameZh: "KN 沖床",
      quality: null,
      topic: "factory/kn/stamping",
      unit: "kW",
      updatedAt: "2026-08-30T01:00:00.000Z",
      valuePath: "$.value"
    }
  ]
};

test("U1-R4-S01 KN plus unhealthy plus name search only returns the matching KN source", () => {
  const rows = buildSourceRows({
    ...baseModel,
    topics: [
      ...baseModel.topics,
      {
        ...baseModel.topics[1]!,
        id: 21,
        lastReceivedAt: null,
        nameZh: "KN 空壓",
        quality: "stale",
        topic: "factory/kn/air"
      }
    ]
  });
  const filtered = filterSourceRows(rows, { filter: "issue", scope: "kn", search: "空壓" });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.metricScope, "kn");
  assert.match(sourceDisplayName(filtered[0]!), /空壓/);
  assert.match(filtered[0]!.health.label, /品質異常|Degraded|等待資料|Waiting/);
  assert.equal(filtered.some((row) => row.metricScope === "cl"), false);
});

test("U1-R5-S01 saving a KN-only draft keeps CL mappings byte-equivalent", () => {
  const original = baseModel.topics;
  const knOnlyDraft = original
    .filter((topic) => topic.metricScope === "kn")
    .map((topic) => ({ ...topic, nameZh: "KN 沖床（已改）" }));
  const merged = mergeScopedTopicEdits({
    draft: knOnlyDraft,
    original,
    visibleScope: "kn"
  });
  const originalCl = buildTopicMappingsSavePayload(original.filter((topic) => topic.metricScope === "cl"));
  const mergedCl = buildTopicMappingsSavePayload(merged.filter((topic) => topic.metricScope === "cl"));
  assert.equal(JSON.stringify(mergedCl), JSON.stringify(originalCl));
  assert.equal(merged.find((topic) => topic.id === 11)?.nameZh, "KN 沖床（已改）");
});

test("U1-R5-S02 live observation overlay updates value without replacing an edited name", () => {
  const draft = baseModel.topics.map((topic) =>
    topic.id === 10 ? { ...topic, nameZh: "CL 沖床（草稿）" } : topic
  );
  const overlay = mergeLiveObservationSnapshot({}, {
    metricScope: "cl",
    metrics: {
      "factoryCircuit.stampingPower": {
        quality: "good",
        timestamp: "2026-08-31T03:02:00.000Z",
        unit: "kW",
        value: 8.4
      }
    },
    timestamp: "2026-08-31T03:02:00.000Z"
  });
  const displayed = overlayLiveObservations(draft, overlay);
  assert.equal(displayed[0]?.nameZh, "CL 沖床（草稿）");
  assert.equal(displayed[0]?.lastValue, 8.4);
  assert.equal(displayed[0]?.lastReceivedAt, "2026-08-31T03:02:00.000Z");
  assert.equal(draft[0]?.nameZh, "CL 沖床（草稿）");
  assert.equal(draft[0]?.lastValue, 4.2);
});

test("U1-R2 create draft under KN selects KN; all requires a site before save", () => {
  const knDraft = createGenericMappingDraft({ existing: baseModel.topics, managementScope: "kn" });
  assert.equal(knDraft.mapping.metricScope, "kn");
  assert.equal(knDraft.siteChoicePending, false);
  assert.notEqual(knDraft.mapping.metricScope, "cl");

  const allDraft = createGenericMappingDraft({ existing: baseModel.topics, managementScope: "all" });
  assert.equal(allDraft.siteChoicePending, true);
  const pending = validateGenericMappingForSave(allDraft.mapping, allDraft.siteChoicePending);
  assert.equal(pending.ok, false);
  assert.match(pending.message ?? "", /CL 或 KN/);
});

test("U1-R1 health summary uses the same scoped rows and does not treat missing data as zero-healthy", () => {
  const rows = buildSourceRows(baseModel);
  const kn = buildWorkspaceHealthSummary(rows, "kn");
  assert.equal(kn.hasData, true);
  assert.equal(kn.sourceCount, 1);
  assert.equal(kn.scopeLabel, "KN");
  const empty = buildWorkspaceHealthSummary(rows, "global");
  assert.equal(empty.hasData, false);
  assert.equal(empty.sourceCount, 0);
  assert.ok(empty.emptyReason);
  assert.doesNotMatch(empty.emptyReason ?? "", /^0$/);
});

test("metric list search and issue filter keep same-scope identities", () => {
  const rows: MetricInventoryRow[] = [
    {
      evaluation: null,
      evaluationState: "not-evaluated",
      freshness: null,
      freshnessState: "live",
      id: "cl:inventory.same",
      label: "Shared power",
      metricKey: "inventory.same",
      metricScope: "cl",
      ownership: "operator",
      provenance: { dependencies: [], sourceId: null, sourceTimestamp: null, sourceTopic: "factory/cl/power" },
      sourceClass: "mqtt-live",
      unit: "kW",
      value: 12
    },
    {
      evaluation: { evaluatedAt: null, failureCode: "missing", freshnessState: "unavailable", retainedLastGood: false, status: "unavailable" },
      evaluationState: "unavailable",
      freshness: null,
      freshnessState: "unavailable",
      id: "kn:inventory.same",
      label: "Shared power",
      metricKey: "inventory.same",
      metricScope: "kn",
      ownership: "catalog",
      provenance: { dependencies: [], sourceId: null, sourceTimestamp: null, sourceTopic: "factory/kn/power" },
      sourceClass: "mqtt-live",
      unit: "kW",
      value: null
    }
  ];
  const filtered = filterMetricRows(rows, { filter: "issue", scope: "kn", search: "Shared" });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.metricScope, "kn");
});
