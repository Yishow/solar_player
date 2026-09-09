import assert from "node:assert/strict";
import test from "node:test";
import type { DerivedMetricDefinition, MeterSourceDefinition } from "@solar-display/shared";
import { saveDerivedMetricDefinition } from "../services/derivedMetricRegistryService.js";
import { buildApp, getDatabase } from "./display-pages-asset-governance.test-support.js";

const source: MeterSourceDefinition = {
  channelId: "cl-source-impact",
  meterId: "cl-source-impact",
  metricKey: "sourceImpactRouteEnergy",
  metricScope: "cl",
  enabled: true,
  reviewStatus: "reviewed",
  measurementKind: "cumulative-energy",
  energyFlowRole: "consumption",
  inputUnit: "kWh",
  scaleDecimal: "1",
  sourceRevision: 1,
  epochId: "source-impact-one",
  expectedCadenceSeconds: 60,
  sourceTimestampTimeZone: null,
  timestampPolicy: "source-required"
};

const guidedDraft = {
  channelId: source.channelId,
  metricScope: source.metricScope,
  measurementKind: source.measurementKind,
  energyFlowRole: source.energyFlowRole,
  timestampPolicy: source.timestampPolicy,
  selector: { path: ["value"] },
  source,
  topic: "source-impact/cl"
};

const directUrl = "/api/data-hub/sites/cl/meter-sources";
const guidedPreviewUrl = "/api/data-hub/mqtt-mappings/preview";
const guidedApplyUrl = "/api/data-hub/mqtt-mappings/apply";

type GuidedPreviewBody = { canonicalDraft: typeof guidedDraft; previewToken: string };

function writeDraft(configJson: string, pageKey = "source-impact-route-draft") {
  getDatabase().prepare(`
    INSERT INTO display_page_stage_configs (page_key, stage, config_json, version, updated_at)
    VALUES (?, 'draft', ?, 1, ?)
    ON CONFLICT(page_key, stage) DO UPDATE SET config_json = excluded.config_json
  `).run(pageKey, configJson, new Date().toISOString());
}

function committedWrites() {
  const rows = (sql: string) => JSON.stringify(getDatabase().prepare(sql).all());
  return {
    audit: rows("SELECT * FROM meter_source_audit ORDER BY id"),
    mappings: rows("SELECT * FROM topic_mappings ORDER BY id"),
    receipts: rows("SELECT * FROM mapping_apply_receipts ORDER BY idempotency_key"),
    sources: rows("SELECT * FROM meter_sources ORDER BY metric_scope, channel_id, source_revision")
  };
}

function runtimeRecorder(app: Awaited<ReturnType<typeof buildApp>>) {
  const subscribeCalls: string[][] = [];
  app.mqttClientService.subscribe = async (topics: string[]) => {
    subscribeCalls.push([...topics]);
  };
  return { subscribeCalls };
}

function ensureDerivedInputMapping(scope: "cl" | "kn" | "global", metricKey = source.metricKey) {
  getDatabase().prepare(`
    INSERT OR IGNORE INTO topic_mappings (metric_scope, metric_key, topic, unit, enabled)
    VALUES (?, ?, ?, 'kWh', 1)
  `).run(scope, metricKey, `source-impact/derived/${scope}`);
}

function registerDerivedDependency(
  metricKey: string,
  inputScope: "cl" | "kn" | "global" | "output-site",
  siteScopes?: Array<"cl" | "kn">
) {
  const scopes = inputScope === "output-site" ? siteScopes ?? ["cl", "kn"] : [inputScope];
  for (const scope of scopes) ensureDerivedInputMapping(scope, source.metricKey);
  const definition: DerivedMetricDefinition = {
    description: "source impact route test definition",
    enabled: true,
    expression: "source * 2",
    fallbackPolicy: "unavailable",
    inputs: [{ alias: "source", kind: "metric", metricKey: source.metricKey, scope: inputScope, unit: "kWh" }],
    managed: false,
    metricKey,
    name: metricKey,
    outputScopePolicy: "site",
    outputUnit: "kWh",
    precision: 1,
    revision: 0,
    ...(siteScopes ? { siteScopes } : {})
  };
  saveDerivedMetricDefinition(definition, getDatabase());
}

async function previewGuided(
  app: Awaited<ReturnType<typeof buildApp>>,
  draft: typeof guidedDraft = guidedDraft
) {
  const preview = await app.inject({ method: "POST", url: guidedPreviewUrl, payload: draft });
  assert.equal(preview.statusCode, 200, preview.body);
  return preview.json() as GuidedPreviewBody;
}

async function submitGuidedApply(
  app: Awaited<ReturnType<typeof buildApp>>,
  idempotencyKey: string,
  draft: typeof guidedDraft,
  preview: GuidedPreviewBody
) {
  return app.inject({
    method: "POST",
    url: guidedApplyUrl,
    payload: {
      canonicalDraft: preview.canonicalDraft,
      idempotencyKey,
      meterId: draft.source.meterId,
      previewToken: preview.previewToken,
      source: draft.source
    }
  });
}

async function applyGuided(
  app: Awaited<ReturnType<typeof buildApp>>,
  idempotencyKey: string,
  draft: typeof guidedDraft = guidedDraft
) {
  const applied = await submitGuidedApply(app, idempotencyKey, draft, await previewGuided(app, draft));
  assert.equal(applied.statusCode, 200, applied.body);
  return applied;
}

test("direct source mutation rejects same-scope draft dependencies without writes or runtime calls", async () => {
  const app = await buildApp();
  const runtime = runtimeRecorder(app);
  try {
    writeDraft(JSON.stringify({
      regions: {
        dataBindings: {
          power: { itemId: "power", dataBinding: { metricKey: source.metricKey, scope: "cl" } }
        }
      }
    }));
    const created = await app.inject({ method: "POST", url: directUrl, payload: { source, reason: "register" } });
    assert.equal(created.statusCode, 201, created.body);
    const before = committedWrites();
    const callsBefore = runtime.subscribeCalls.length;
    const activeBefore = app.mqttClientService.getActiveTopics();

    const rejected = await app.inject({
      method: "DELETE",
      url: `${directUrl}/${source.channelId}`,
      payload: { expectedRevision: source.sourceRevision, reason: "retire" }
    });
    assert.equal(rejected.statusCode, 409, rejected.body);
    assert.equal(rejected.json().error, "E1_SOURCE_IN_USE");
    assert.deepEqual(committedWrites(), before);
    assert.equal(runtime.subscribeCalls.length, callsBefore);
    assert.deepEqual(app.mqttClientService.getActiveTopics(), activeBefore);
  } finally {
    await app.close();
  }
});

test("direct source mutation rejects malformed draft evidence without writes or runtime calls", async () => {
  const app = await buildApp();
  const runtime = runtimeRecorder(app);
  try {
    const corruptBytes = "{not-json";
    writeDraft(corruptBytes, "source-impact-corrupt-direct");
    const created = await app.inject({ method: "POST", url: directUrl, payload: { source, reason: "register" } });
    assert.equal(created.statusCode, 201, created.body);
    getDatabase().prepare(
      "INSERT INTO topic_mappings (metric_scope, metric_key, topic, unit, enabled) VALUES ('cl', ?, 'source-impact/cl', 'kWh', 1)"
    ).run(source.metricKey);
    const before = committedWrites();
    const callsBefore = runtime.subscribeCalls.length;
    const activeBefore = app.mqttClientService.getActiveTopics();

    const rejected = await app.inject({
      method: "DELETE",
      url: `${directUrl}/${source.channelId}`,
      payload: { expectedRevision: source.sourceRevision, reason: "retire" }
    });
    assert.equal(rejected.statusCode, 409, rejected.body);
    assert.equal(rejected.json().error, "E1_SOURCE_IMPACT_UNKNOWN");
    assert.deepEqual(committedWrites(), before);
    assert.equal(runtime.subscribeCalls.length, callsBefore);
    assert.deepEqual(app.mqttClientService.getActiveTopics(), activeBefore);
    assert.equal(
      (getDatabase().prepare(
        "SELECT config_json FROM display_page_stage_configs WHERE page_key = 'source-impact-corrupt-direct' AND stage = 'draft'"
      ).get() as { config_json: string }).config_json,
      corruptBytes
    );
  } finally {
    await app.close();
  }
});

test("direct source mutation permits a different explicit scope with the same key", async () => {
  const app = await buildApp();
  const runtime = runtimeRecorder(app);
  try {
    writeDraft(JSON.stringify({
      regions: {
        dataBindings: {
          power: { itemId: "power", dataBinding: { metricKey: source.metricKey, scope: "kn" } }
        }
      }
    }));
    const created = await app.inject({ method: "POST", url: directUrl, payload: { source, reason: "register" } });
    assert.equal(created.statusCode, 201, created.body);
    getDatabase().prepare(
      "INSERT INTO topic_mappings (metric_scope, metric_key, topic, unit, enabled) VALUES ('cl', ?, 'source-impact/cl', 'kWh', 1)"
    ).run(source.metricKey);

    const removed = await app.inject({
      method: "DELETE",
      url: `${directUrl}/${source.channelId}`,
      payload: { expectedRevision: source.sourceRevision, reason: "retire" }
    });
    assert.equal(removed.statusCode, 200, removed.body);
    assert.equal(removed.json().source.enabled, false);
    assert.equal(
      (getDatabase().prepare("SELECT enabled FROM topic_mappings WHERE metric_scope = 'cl' AND metric_key = ?")
        .get(source.metricKey) as { enabled: number }).enabled,
      0
    );
    assert.equal(runtime.subscribeCalls.length, 2, "accepted writes reconcile the committed runtime state");
  } finally {
    await app.close();
  }
});

test("direct source mutation permits a disable when only another scope has a derived dependency", async () => {
  const app = await buildApp();
  const runtime = runtimeRecorder(app);
  try {
    const created = await app.inject({ method: "POST", url: directUrl, payload: { source, reason: "register" } });
    assert.equal(created.statusCode, 201, created.body);
    registerDerivedDependency("custom.directCrossScopeDisable", "kn");

    const removed = await app.inject({
      method: "DELETE",
      url: `${directUrl}/${source.channelId}`,
      payload: { expectedRevision: source.sourceRevision, reason: "retire" }
    });
    assert.equal(removed.statusCode, 200, removed.body);
    assert.equal(removed.json().source.enabled, false);
    assert.equal(runtime.subscribeCalls.length, 2, "an accepted direct mutation reconciles the committed runtime state");
  } finally {
    await app.close();
  }
});

test("direct source mutation rejects a disable with a same-scope derived dependency without writes", async () => {
  const app = await buildApp();
  const runtime = runtimeRecorder(app);
  try {
    const created = await app.inject({ method: "POST", url: directUrl, payload: { source, reason: "register" } });
    assert.equal(created.statusCode, 201, created.body);
    registerDerivedDependency("custom.directSameScopeDisable", "cl");
    const before = committedWrites();
    const callsBefore = runtime.subscribeCalls.length;
    const activeBefore = app.mqttClientService.getActiveTopics();

    const rejected = await app.inject({
      method: "DELETE",
      url: `${directUrl}/${source.channelId}`,
      payload: { expectedRevision: source.sourceRevision, reason: "retire" }
    });
    assert.equal(rejected.statusCode, 409, rejected.body);
    assert.equal(rejected.json().error, "E1_SOURCE_IN_USE");
    assert.deepEqual(committedWrites(), before);
    assert.equal(runtime.subscribeCalls.length, callsBefore);
    assert.deepEqual(app.mqttClientService.getActiveTopics(), activeBefore);
  } finally {
    await app.close();
  }
});

test("direct source mutation permits a rename when only another scope has a derived dependency", async () => {
  const app = await buildApp();
  const runtime = runtimeRecorder(app);
  try {
    const created = await app.inject({ method: "POST", url: directUrl, payload: { source, reason: "register" } });
    assert.equal(created.statusCode, 201, created.body);
    registerDerivedDependency("custom.directCrossScopeRename", "kn");
    const renamed = { ...source, metricKey: "sourceImpactRouteEnergyRenamed", sourceRevision: 2, epochId: "source-impact-two" };

    const applied = await app.inject({
      method: "PUT",
      url: `${directUrl}/${source.channelId}`,
      payload: { source: renamed, reason: "rename" }
    });
    assert.equal(applied.statusCode, 200, applied.body);
    assert.equal(applied.json().source.metricKey, renamed.metricKey);
    assert.equal(runtime.subscribeCalls.length, 2, "an accepted direct rename reconciles the committed runtime state");
  } finally {
    await app.close();
  }
});

test("direct source mutation rejects a rename with a same-scope derived dependency without writes", async () => {
  const app = await buildApp();
  const runtime = runtimeRecorder(app);
  try {
    const created = await app.inject({ method: "POST", url: directUrl, payload: { source, reason: "register" } });
    assert.equal(created.statusCode, 201, created.body);
    registerDerivedDependency("custom.directSameScopeRename", "cl");
    const renamed = { ...source, metricKey: "sourceImpactRouteEnergyRenamed", sourceRevision: 2, epochId: "source-impact-two" };
    const before = committedWrites();
    const callsBefore = runtime.subscribeCalls.length;
    const activeBefore = app.mqttClientService.getActiveTopics();

    const rejected = await app.inject({
      method: "PUT",
      url: `${directUrl}/${source.channelId}`,
      payload: { source: renamed, reason: "rename" }
    });
    assert.equal(rejected.statusCode, 409, rejected.body);
    assert.equal(rejected.json().error, "E1_SOURCE_IN_USE");
    assert.deepEqual(committedWrites(), before);
    assert.equal(runtime.subscribeCalls.length, callsBefore);
    assert.deepEqual(app.mqttClientService.getActiveTopics(), activeBefore);
  } finally {
    await app.close();
  }
});

test("guided apply rechecks a draft after preview and rejects corruption without writes or runtime calls", async () => {
  const app = await buildApp();
  const runtime = runtimeRecorder(app);
  try {
    await applyGuided(app, "source-impact-initial");
    const disablingDraft = { ...guidedDraft, source: { ...source, enabled: false } };
    const preview = await app.inject({ method: "POST", url: guidedPreviewUrl, payload: disablingDraft });
    assert.equal(preview.statusCode, 200, preview.body);
    const previewBody = preview.json() as { canonicalDraft: typeof disablingDraft; previewToken: string };
    const before = committedWrites();
    const callsBefore = runtime.subscribeCalls.length;
    const activeBefore = app.mqttClientService.getActiveTopics();

    const corruptBytes = "{not-json";
    writeDraft(corruptBytes, "source-impact-corrupt-after-preview");
    const rejected = await app.inject({
      method: "POST",
      url: guidedApplyUrl,
      payload: {
        canonicalDraft: previewBody.canonicalDraft,
        idempotencyKey: "source-impact-corrupt",
        meterId: source.meterId,
        previewToken: previewBody.previewToken,
        source: disablingDraft.source
      }
    });
    assert.equal(rejected.statusCode, 409, rejected.body);
    assert.equal(rejected.json().error, "E1_SOURCE_IMPACT_UNKNOWN");
    assert.deepEqual(committedWrites(), before);
    assert.equal(runtime.subscribeCalls.length, callsBefore);
    assert.deepEqual(app.mqttClientService.getActiveTopics(), activeBefore);
    assert.equal(
      (getDatabase().prepare(
        "SELECT config_json FROM display_page_stage_configs WHERE page_key = 'source-impact-corrupt-after-preview' AND stage = 'draft'"
      ).get() as { config_json: string }).config_json,
      corruptBytes
    );
  } finally {
    await app.close();
  }
});

test("guided apply permits a different explicit scope with the same key", async () => {
  const app = await buildApp();
  const runtime = runtimeRecorder(app);
  try {
    await applyGuided(app, "source-impact-guided-initial");
    writeDraft(JSON.stringify({
      dataBindings: {
        power: { itemId: "power", dataBinding: { metricKey: source.metricKey, scope: "kn" } }
      }
    }), "source-impact-guided-cross-scope");
    const disablingDraft = { ...guidedDraft, source: { ...source, enabled: false } };
    const preview = await app.inject({ method: "POST", url: guidedPreviewUrl, payload: disablingDraft });
    assert.equal(preview.statusCode, 200, preview.body);
    const body = preview.json() as { canonicalDraft: typeof disablingDraft; previewToken: string };
    const applied = await app.inject({
      method: "POST",
      url: guidedApplyUrl,
      payload: {
        canonicalDraft: body.canonicalDraft,
        idempotencyKey: "source-impact-guided-cross-scope",
        meterId: source.meterId,
        previewToken: body.previewToken,
        source: disablingDraft.source
      }
    });
    assert.equal(applied.statusCode, 200, applied.body);
    assert.equal(applied.json().source.enabled, false);
    assert.equal(runtime.subscribeCalls.length, 2, "accepted guided writes reconcile the runtime state");
  } finally {
    await app.close();
  }
});

test("guided apply permits a disable when only another scope has a derived dependency", async () => {
  const app = await buildApp();
  runtimeRecorder(app);
  try {
    await applyGuided(app, "derived-cross-scope-disable-initial");
    registerDerivedDependency("custom.guidedCrossScopeDisable", "kn");
    const disablingDraft = { ...guidedDraft, source: { ...source, enabled: false } };
    const applied = await applyGuided(app, "derived-cross-scope-disable", disablingDraft);
    assert.equal(applied.json().source.enabled, false);
  } finally {
    await app.close();
  }
});

test("guided apply rejects a disable with a same-scope derived dependency without writes", async () => {
  const app = await buildApp();
  const runtime = runtimeRecorder(app);
  try {
    await applyGuided(app, "derived-same-scope-disable-initial");
    registerDerivedDependency("custom.guidedSameScopeDisable", "cl");
    const disablingDraft = { ...guidedDraft, source: { ...source, enabled: false } };
    const preview = await previewGuided(app, disablingDraft);
    const before = committedWrites();
    const callsBefore = runtime.subscribeCalls.length;
    const activeBefore = app.mqttClientService.getActiveTopics();

    const rejected = await submitGuidedApply(app, "derived-same-scope-disable", disablingDraft, preview);
    assert.equal(rejected.statusCode, 409, rejected.body);
    assert.equal(rejected.json().error, "E1_SOURCE_IN_USE");
    assert.deepEqual(committedWrites(), before);
    assert.equal(runtime.subscribeCalls.length, callsBefore);
    assert.deepEqual(app.mqttClientService.getActiveTopics(), activeBefore);
  } finally {
    await app.close();
  }
});

test("guided apply permits a rename when only another scope has a derived dependency", async () => {
  const app = await buildApp();
  runtimeRecorder(app);
  try {
    await applyGuided(app, "derived-cross-scope-rename-initial");
    registerDerivedDependency("custom.guidedCrossScopeRename", "kn");
    const renamedSource = {
      ...source,
      metricKey: "sourceImpactRouteEnergyGuidedRenamed",
      sourceRevision: 2,
      epochId: "source-impact-two"
    };
    const applied = await applyGuided(app, "derived-cross-scope-rename", {
      ...guidedDraft, source: renamedSource
    });
    assert.equal(applied.json().source.metricKey, renamedSource.metricKey);
  } finally {
    await app.close();
  }
});

test("guided apply rejects a rename with a same-scope derived dependency without writes", async () => {
  const app = await buildApp();
  const runtime = runtimeRecorder(app);
  try {
    await applyGuided(app, "derived-same-scope-rename-initial");
    registerDerivedDependency("custom.guidedSameScopeRename", "cl");
    const renamedSource = {
      ...source,
      metricKey: "sourceImpactRouteEnergyGuidedRenamed",
      sourceRevision: 2,
      epochId: "source-impact-two"
    };
    const renamedDraft = { ...guidedDraft, source: renamedSource };
    const preview = await previewGuided(app, renamedDraft);
    const before = committedWrites();
    const callsBefore = runtime.subscribeCalls.length;
    const activeBefore = app.mqttClientService.getActiveTopics();

    const rejected = await submitGuidedApply(app, "derived-same-scope-rename", renamedDraft, preview);
    assert.equal(rejected.statusCode, 409, rejected.body);
    assert.equal(rejected.json().error, "E1_SOURCE_IN_USE");
    assert.deepEqual(committedWrites(), before);
    assert.equal(runtime.subscribeCalls.length, callsBefore);
    assert.deepEqual(app.mqttClientService.getActiveTopics(), activeBefore);
  } finally {
    await app.close();
  }
});

test("guided first apply rechecks a same-scope derived input added after preview", async () => {
  const app = await buildApp();
  const runtime = runtimeRecorder(app);
  try {
    await applyGuided(app, "derived-post-preview-initial");
    const disablingDraft = { ...guidedDraft, source: { ...source, enabled: false } };
    const preview = await previewGuided(app, disablingDraft);
    registerDerivedDependency("custom.guidedPostPreviewAdded", "cl");
    const before = committedWrites();
    const callsBefore = runtime.subscribeCalls.length;
    const activeBefore = app.mqttClientService.getActiveTopics();

    const rejected = await submitGuidedApply(app, "derived-post-preview-added", disablingDraft, preview);
    assert.equal(rejected.statusCode, 409, rejected.body);
    assert.equal(rejected.json().error, "E1_SOURCE_IN_USE");
    assert.deepEqual(committedWrites(), before);
    assert.equal(runtime.subscribeCalls.length, callsBefore);
    assert.deepEqual(app.mqttClientService.getActiveTopics(), activeBefore);
  } finally {
    await app.close();
  }
});

test("guided first apply rechecks an output-site dependency after site scopes change", async () => {
  const app = await buildApp();
  const runtime = runtimeRecorder(app);
  try {
    await applyGuided(app, "derived-post-preview-scope-initial");
    const dependencyKey = "custom.guidedPostPreviewScopeChange";
    registerDerivedDependency(dependencyKey, "output-site", ["kn"]);
    const disablingDraft = { ...guidedDraft, source: { ...source, enabled: false } };
    const preview = await previewGuided(app, disablingDraft);
    getDatabase().prepare("UPDATE derived_metric_definitions SET site_scopes_json = ? WHERE metric_key = ?")
      .run('["cl"]', dependencyKey);
    const before = committedWrites();
    const callsBefore = runtime.subscribeCalls.length;
    const activeBefore = app.mqttClientService.getActiveTopics();

    const rejected = await submitGuidedApply(app, "derived-post-preview-scope-change", disablingDraft, preview);
    assert.equal(rejected.statusCode, 409, rejected.body);
    assert.equal(rejected.json().error, "E1_SOURCE_IN_USE");
    assert.deepEqual(committedWrites(), before);
    assert.equal(runtime.subscribeCalls.length, callsBefore);
    assert.deepEqual(app.mqttClientService.getActiveTopics(), activeBefore);
    assert.equal(
      (getDatabase().prepare("SELECT site_scopes_json FROM derived_metric_definitions WHERE metric_key = ?")
        .get(dependencyKey) as { site_scopes_json: string }).site_scopes_json,
      '["cl"]'
    );
  } finally {
    await app.close();
  }
});

test("guided replay of an unchanged committed request adds no database mutation", async () => {
  const app = await buildApp();
  try {
    const preview = await previewGuided(app);
    const requestDraft = guidedDraft;
    const first = await submitGuidedApply(app, "derived-unchanged-replay", requestDraft, preview);
    assert.equal(first.statusCode, 200, first.body);
    const afterFirst = committedWrites();

    const replay = await submitGuidedApply(app, "derived-unchanged-replay", requestDraft, preview);
    assert.equal(replay.statusCode, 200, replay.body);
    assert.deepEqual(committedWrites(), afterFirst);
  } finally {
    await app.close();
  }
});
