import assert from "node:assert/strict";
import test from "node:test";
import type { MeterSourceDefinition } from "@solar-display/shared";
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

async function applyGuided(
  app: Awaited<ReturnType<typeof buildApp>>,
  idempotencyKey: string,
  draft: typeof guidedDraft = guidedDraft
) {
  const preview = await app.inject({ method: "POST", url: guidedPreviewUrl, payload: draft });
  assert.equal(preview.statusCode, 200, preview.body);
  const body = preview.json() as { canonicalDraft: typeof guidedDraft; previewToken: string };
  const applied = await app.inject({
    method: "POST",
    url: guidedApplyUrl,
    payload: {
      canonicalDraft: body.canonicalDraft,
      idempotencyKey,
      meterId: draft.source.meterId,
      previewToken: body.previewToken,
      source: draft.source
    }
  });
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
