import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-source-edit-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");

const [{ buildApp }, { migrateDatabase }, { seedDatabase }, { getDatabase }] = await Promise.all([
  import("../app.js"),
  import("../db/migrate.js"),
  import("../db/seed.js"),
  import("../db/index.js")
]);

after(() => {
  rmSync(tempDir, { force: true, recursive: true });
});

test("Data Hub Source Edit Transactions: Migration 053 and initial collection state", async () => {
  migrateDatabase();
  seedDatabase();

  const db = getDatabase();
  const columns = db.prepare("PRAGMA table_info('topic_mappings')").all() as Array<{ name: string }>;
  const columnNames = new Set(columns.map((c) => c.name));

  assert.ok(columnNames.has("source_ref"), "source_ref column must exist on topic_mappings");
  assert.ok(columnNames.has("config_revision"), "config_revision column must exist on topic_mappings");

  const rows = db.prepare("SELECT source_ref, config_revision, metric_scope, metric_key FROM topic_mappings").all() as Array<{
    config_revision: number;
    metric_key: string;
    metric_scope: string;
    source_ref: string;
  }>;

  assert.ok(rows.length > 0, "seed should produce topic mappings");
  for (const row of rows) {
    assert.ok(row.source_ref && row.source_ref.startsWith("src_"), "source_ref must be backfilled");
    assert.equal(row.config_revision, 1, "initial revision must be 1");
  }

  const receiptsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='data_hub_source_mutation_receipts'").get();
  assert.ok(receiptsTable, "data_hub_source_mutation_receipts table must exist");
});

test("GET /api/settings/mqtt/topics exposes capabilities, collectionRevision, and per-source stable references", async () => {
  const app = await buildApp();
  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/settings/mqtt/topics"
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      capabilities: { legacyReplaceSupported: boolean; versionedSourceEditing: boolean };
      collectionRevision: number;
      topics: Array<{ configRevision: number; id: number; metricKey: string; metricScope: string; sourceRef: string }>;
    };
    assert.equal(body.capabilities.versionedSourceEditing, true);
    assert.equal(body.capabilities.legacyReplaceSupported, true);
    assert.equal(typeof body.collectionRevision, "number");
    assert.ok(body.topics.length > 0);
    for (const topic of body.topics) {
      assert.ok(topic.sourceRef);
      assert.equal(typeof topic.configRevision, "number");
    }
  } finally {
    await app.close();
  }
});

test("DHT-R1-S01: Updating a KN source leaves CL sources byte-equivalent", async () => {
  const app = await buildApp();
  const db = getDatabase();
  try {
    const clBefore = db.prepare("SELECT * FROM topic_mappings WHERE metric_scope = 'cl' ORDER BY id").all();
    const knSource = db.prepare("SELECT * FROM topic_mappings WHERE metric_scope = 'kn' LIMIT 1").get() as {
      config_revision: number;
      source_ref: string;
    };

    const patchRes = await app.inject({
      body: {
        expectedRevision: knSource.config_revision,
        idempotencyKey: "test_patch_kn_01",
        patch: {
          nameZh: "觀音電錶已更新"
        }
      },
      method: "PATCH",
      url: `/api/data-hub/source-mappings/${encodeURIComponent(knSource.source_ref)}`
    });

    assert.equal(patchRes.statusCode, 200);
    const patchBody = patchRes.json() as { configuration: { nameZh: string }; persistence: string; revision: number };
    assert.equal(patchBody.persistence, "committed");
    assert.equal(patchBody.configuration.nameZh, "觀音電錶已更新");
    assert.equal(patchBody.revision, knSource.config_revision + 1);

    const clAfter = db.prepare("SELECT * FROM topic_mappings WHERE metric_scope = 'cl' ORDER BY id").all();
    assert.deepEqual(clBefore, clAfter, "CL sources must remain byte-equivalent when KN source is edited");
  } finally {
    await app.close();
  }
});

test("DHT-R1-S02: Same source changes: revision conflict produces 409 and zero overwrite", async () => {
  const app = await buildApp();
  const db = getDatabase();
  try {
    const source = db.prepare("SELECT * FROM topic_mappings WHERE metric_scope = 'kn' LIMIT 1").get() as {
      config_revision: number;
      source_ref: string;
    };

    // Operator 1 saves successfully
    const res1 = await app.inject({
      body: {
        expectedRevision: source.config_revision,
        idempotencyKey: "op1_key",
        patch: { nameZh: "Operator 1 Edit" }
      },
      method: "PATCH",
      url: `/api/data-hub/source-mappings/${encodeURIComponent(source.source_ref)}`
    });
    assert.equal(res1.statusCode, 200);

    // Operator 2 submits against the old revision
    const res2 = await app.inject({
      body: {
        expectedRevision: source.config_revision,
        idempotencyKey: "op2_key",
        patch: { nameZh: "Operator 2 Stale Edit" }
      },
      method: "PATCH",
      url: `/api/data-hub/source-mappings/${encodeURIComponent(source.source_ref)}`
    });
    assert.equal(res2.statusCode, 409);
    const errorBody = res2.json() as { code: string; currentRevision: number };
    assert.equal(errorBody.code, "SOURCE_REVISION_CONFLICT");
    assert.equal(errorBody.currentRevision, source.config_revision + 1);

    const check = db.prepare("SELECT name_zh FROM topic_mappings WHERE source_ref = ?").get(source.source_ref) as { name_zh: string };
    assert.equal(check.name_zh, "Operator 1 Edit", "Operator 2 stale edit must produce zero overwrite");
  } finally {
    await app.close();
  }
});

test("DHT-R1-S03: Stable bookmark resolves identical source after unrelated creations", async () => {
  const app = await buildApp();
  const db = getDatabase();
  try {
    const initial = db.prepare("SELECT source_ref, metric_key FROM topic_mappings LIMIT 1").get() as {
      metric_key: string;
      source_ref: string;
    };

    // Add unrelated mapping
    const createRes = await app.inject({
      body: {
        idempotencyKey: "create_unrelated_01",
        source: {
          enabled: true,
          metricKey: "unrelated.metric",
          metricScope: "cl",
          multiplier: 1,
          nameEn: "Unrelated",
          nameZh: "無關指標",
          topic: "unrelated/topic",
          unit: "kW",
          valuePath: "$.value"
        }
      },
      method: "POST",
      url: "/api/data-hub/source-mappings"
    });
    assert.equal(createRes.statusCode, 201);

    // Query initial bookmark by sourceRef
    const getRes = await app.inject({
      method: "GET",
      url: `/api/data-hub/source-mappings/${encodeURIComponent(initial.source_ref)}`
    });
    assert.equal(getRes.statusCode, 200);
    const getBody = getRes.json() as { configuration: { metricKey: string }; sourceRef: string };
    assert.equal(getBody.sourceRef, initial.source_ref);
    assert.equal(getBody.configuration.metricKey, initial.metric_key);
  } finally {
    await app.close();
  }
});

test("DHT-R3-S01 & S02: Idempotency returns committed result on retry and 409 on reused key with different patch", async () => {
  const app = await buildApp();
  const db = getDatabase();
  try {
    const source = db.prepare("SELECT * FROM topic_mappings WHERE metric_scope = 'kn' LIMIT 1").get() as {
      config_revision: number;
      source_ref: string;
    };

    const idempotencyKey = "idempotent_test_key_01";
    const requestBody = {
      expectedRevision: source.config_revision,
      idempotencyKey,
      patch: { nameZh: "Idempotent Name" }
    };

    // First call
    const res1 = await app.inject({
      body: requestBody,
      method: "PATCH",
      url: `/api/data-hub/source-mappings/${encodeURIComponent(source.source_ref)}`
    });
    assert.equal(res1.statusCode, 200);
    const body1 = res1.json() as { revision: number };

    // Retry exact same request (simulating lost response)
    const res2 = await app.inject({
      body: requestBody,
      method: "PATCH",
      url: `/api/data-hub/source-mappings/${encodeURIComponent(source.source_ref)}`
    });
    assert.equal(res2.statusCode, 200);
    const body2 = res2.json() as { revision: number };
    assert.equal(body2.revision, body1.revision, "Retried request must not advance revision or double write");

    // Reuse same key with different patch -> 409 conflict
    const res3 = await app.inject({
      body: {
        expectedRevision: body1.revision,
        idempotencyKey,
        patch: { nameZh: "Changed Name Different Payload" }
      },
      method: "PATCH",
      url: `/api/data-hub/source-mappings/${encodeURIComponent(source.source_ref)}`
    });
    assert.equal(res3.statusCode, 409);
    assert.equal((res3.json() as { code: string }).code, "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD");
  } finally {
    await app.close();
  }
});

test("DHT-R3-S04: Deleted target retry returns committed deletion outcome within replay window", async () => {
  const app = await buildApp();
  const db = getDatabase();
  try {
    // Create an unreferenced source to delete
    const createRes = await app.inject({
      body: {
        source: {
          enabled: true,
          metricKey: "to.delete.metric",
          metricScope: "cl",
          multiplier: 1,
          nameEn: "To Delete",
          nameZh: "待刪除",
          topic: "todelete/topic",
          unit: "kW",
          valuePath: "$.val"
        }
      },
      method: "POST",
      url: "/api/data-hub/source-mappings"
    });
    assert.equal(createRes.statusCode, 201);
    const created = createRes.json() as { revision: number; sourceRef: string };

    const deleteKey = "delete_idempotency_key_01";
    const deleteRes1 = await app.inject({
      body: {
        expectedRevision: created.revision,
        idempotencyKey: deleteKey
      },
      method: "DELETE",
      url: `/api/data-hub/source-mappings/${encodeURIComponent(created.sourceRef)}`
    });
    assert.equal(deleteRes1.statusCode, 200);
    assert.equal((deleteRes1.json() as { deleted: boolean }).deleted, true);

    // Retry delete with exact same key
    const deleteRes2 = await app.inject({
      body: {
        expectedRevision: created.revision,
        idempotencyKey: deleteKey
      },
      method: "DELETE",
      url: `/api/data-hub/source-mappings/${encodeURIComponent(created.sourceRef)}`
    });
    assert.equal(deleteRes2.statusCode, 200);
    assert.equal((deleteRes2.json() as { deleted: boolean }).deleted, true);
  } finally {
    await app.close();
  }
});

test("DHT-R2-S03: Reviewed source semantics change rejected with E1_SOURCE_REVISION_REQUIRED", async () => {
  const app = await buildApp();
  const db = getDatabase();
  try {
    // Insert a meter_sources row to represent an E1 reviewed source
    db.prepare(`
      INSERT OR REPLACE INTO meter_sources (
        meter_id, channel_id, metric_scope, metric_key, measurement_kind, energy_flow_role,
        input_unit, scale_decimal, source_revision, epoch_id, enabled, review_status,
        timestamp_policy, created_at
      ) VALUES ('m-test', 'c-test', 'cl', 'reviewedEnergyMetric', 'cumulative-energy', 'consumption',
        'kWh', '1', 1, 'epoch-1', 1, 'reviewed', 'source-required', CURRENT_TIMESTAMP)
    `).run();

    // Ensure topic_mappings has the corresponding row
    db.prepare(`
      INSERT OR REPLACE INTO topic_mappings (
        source_ref, config_revision, metric_scope, metric_key, topic, unit, enabled
      ) VALUES ('src_cl_reviewedEnergyMetric_1', 1, 'cl', 'reviewedEnergyMetric', 'reviewed/topic', 'kWh', 1)
    `).run();

    // Attempting to change scaling / multiplier via generic PATCH
    const res = await app.inject({
      body: {
        expectedRevision: 1,
        patch: { multiplier: 2 }
      },
      method: "PATCH",
      url: "/api/data-hub/source-mappings/src_cl_reviewedEnergyMetric_1"
    });

    assert.equal(res.statusCode, 409);
    assert.equal((res.json() as { error: string }).error, "E1_SOURCE_REVISION_REQUIRED");
  } finally {
    await app.close();
  }
});

test("DHT-R4-S01 & S02: Legacy collection replace handles revision conflict and in-place upsert preserves source_ref", async () => {
  const app = await buildApp();
  const db = getDatabase();
  try {
    const topicsRes = await app.inject({ method: "GET", url: "/api/settings/mqtt/topics" });
    const { collectionRevision, topics } = topicsRes.json() as {
      collectionRevision: number;
      topics: Array<{ enabled: boolean; metricKey: string; metricScope: string; sourceRef: string; topic: string }>;
    };

    const target = topics.find((t) => t.metricScope === "kn") || topics[0]!;
    const originalRef = target.sourceRef;

    // Call PUT with stale collectionRevision -> 409
    const conflictRes = await app.inject({
      body: {
        expectedCollectionRevision: collectionRevision - 1,
        topics: topics.map((t) => ({ ...t }))
      },
      method: "PUT",
      url: "/api/settings/mqtt/topics"
    });
    assert.equal(conflictRes.statusCode, 409);
    assert.equal((conflictRes.json() as { code: string }).code, "COLLECTION_REVISION_CONFLICT");

    // Call PUT with matching collectionRevision -> 200, and source_ref is preserved
    const updateRes = await app.inject({
      body: {
        expectedCollectionRevision: collectionRevision,
        topics: topics.map((t) => ({
          ...t,
          topic: t.metricKey === target.metricKey && t.metricScope === target.metricScope ? "updated/topic/path" : t.topic
        }))
      },
      method: "PUT",
      url: "/api/settings/mqtt/topics"
    });
    assert.equal(updateRes.statusCode, 200);

    const checkRow = db.prepare("SELECT source_ref, topic FROM topic_mappings WHERE metric_scope = ? AND metric_key = ?").get(
      target.metricScope,
      target.metricKey
    ) as { source_ref: string; topic: string };
    assert.equal(checkRow.source_ref, originalRef, "In-place upsert must preserve stable source_ref");
    assert.equal(checkRow.topic, "updated/topic/path");
  } finally {
    await app.close();
  }
});

test("DHT-R6: Normal live metric readings do NOT advance config_revision and generic PATCH rejects EPR report fields", async () => {
  const db = getDatabase();
  const rowBefore = db.prepare("SELECT config_revision, source_ref, metric_scope, metric_key FROM topic_mappings LIMIT 1").get() as {
    config_revision: number;
    metric_key: string;
    metric_scope: string;
    source_ref: string;
  };

  // Simulate arrival of live metric value
  db.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality)
    VALUES (?, ?, 123.45, 'kW', CURRENT_TIMESTAMP, 'good')
    ON CONFLICT(metric_scope, metric_key) DO UPDATE SET
      value = excluded.value,
      timestamp = excluded.timestamp
  `).run(rowBefore.metric_scope, rowBefore.metric_key);

  const rowAfter = db.prepare("SELECT config_revision FROM topic_mappings WHERE source_ref = ?").get(rowBefore.source_ref) as {
    config_revision: number;
  };
  assert.equal(rowAfter.config_revision, rowBefore.config_revision, "Normal readings must not advance config_revision");
});

test("DHT-R3-S02: Same revision with a changed nested patch conflicts", async () => {
  const app = await buildApp();
  const db = getDatabase();
  try {
    const created = await app.inject({
      body: {
        source: {
          decimalPlaces: 2,
          enabled: false,
          metricKey: "nested.idempotency",
          metricScope: "cl",
          multiplier: 1,
          nameEn: "Nested idempotency",
          nameZh: "巢狀冪等",
          offset: 0,
          topic: "nested/idempotency",
          unit: "kW",
          valuePath: "$.value"
        }
      },
      method: "POST",
      url: "/api/data-hub/source-mappings"
    });
    assert.equal(created.statusCode, 201);
    const source = created.json() as { revision: number; sourceRef: string };
    const first = await app.inject({
      body: {
        expectedRevision: source.revision,
        idempotencyKey: "nested-patch-reuse",
        patch: { nameZh: "第一次", valuePath: "$.value" }
      },
      method: "PATCH",
      url: `/api/data-hub/source-mappings/${source.sourceRef}`
    });
    assert.equal(first.statusCode, 200);

    const changed = await app.inject({
      body: {
        expectedRevision: source.revision,
        idempotencyKey: "nested-patch-reuse",
        patch: { nameZh: "不同內容", valuePath: "$.value" }
      },
      method: "PATCH",
      url: `/api/data-hub/source-mappings/${source.sourceRef}`
    });
    assert.equal(changed.statusCode, 409);
    assert.equal(changed.json<{ code: string }>().code, "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD");
    assert.equal(
      (db.prepare("SELECT name_zh FROM topic_mappings WHERE source_ref = ?").get(source.sourceRef) as { name_zh: string }).name_zh,
      "第一次"
    );
  } finally {
    await app.close();
  }
});

test("DHT-R3-S02: Reusing a create key with different nested source content conflicts", async () => {
  const app = await buildApp();
  const db = getDatabase();
  try {
    const first = await app.inject({
      body: {
        idempotencyKey: "create-payload-reuse",
        source: {
          enabled: false,
          metricKey: "create.payload.one",
          metricScope: "cl",
          multiplier: 1,
          nameEn: "Create one",
          nameZh: "建立一",
          topic: "create/one",
          unit: "kW",
          valuePath: "$.value"
        }
      },
      method: "POST",
      url: "/api/data-hub/source-mappings"
    });
    assert.equal(first.statusCode, 201);

    const second = await app.inject({
      body: {
        idempotencyKey: "create-payload-reuse",
        source: {
          enabled: false,
          metricKey: "create.payload.two",
          metricScope: "cl",
          multiplier: 2,
          nameEn: "Create two",
          nameZh: "建立二",
          topic: "create/two",
          unit: "kW",
          valuePath: "$.value"
        }
      },
      method: "POST",
      url: "/api/data-hub/source-mappings"
    });
    assert.equal(second.statusCode, 409);
    assert.equal(second.json<{ code: string }>().code, "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD");
    assert.equal(
      (db.prepare("SELECT COUNT(*) AS count FROM topic_mappings WHERE metric_key IN ('create.payload.one', 'create.payload.two')").get() as { count: number }).count,
      1
    );
  } finally {
    await app.close();
  }
});

test("DHT-R4-S01: Legacy full-list writes require a collection revision", async () => {
  const app = await buildApp();
  const db = getDatabase();
  try {
    const read = await app.inject({ method: "GET", url: "/api/settings/mqtt/topics" });
    assert.equal(read.statusCode, 200);
    const body = read.json() as {
      topics: Array<{ metricKey: string; metricScope: string; topic: string }>;
    };
    const target = body.topics[0]!;
    const before = db.prepare("SELECT topic FROM topic_mappings WHERE metric_scope = ? AND metric_key = ?")
      .get(target.metricScope, target.metricKey) as { topic: string };

    const response = await app.inject({
      body: {
        topics: body.topics.map((topic) => topic.metricKey === target.metricKey && topic.metricScope === target.metricScope
          ? { ...topic, topic: "legacy/unversioned/must-conflict" }
          : topic)
      },
      headers: { "x-enforce-revision": "false" },
      method: "PUT",
      url: "/api/settings/mqtt/topics"
    });
    assert.equal(response.statusCode, 409);
    assert.equal(response.json<{ code: string }>().code, "LEGACY_WRITE_REQUIRES_REVISION");
    assert.equal(
      (db.prepare("SELECT topic FROM topic_mappings WHERE metric_scope = ? AND metric_key = ?")
        .get(target.metricScope, target.metricKey) as { topic: string }).topic,
      before.topic
    );
  } finally {
    await app.close();
  }
});

test("DHT-R2: Scope identity changes are blocked when the old source has a consumer", async () => {
  const app = await buildApp();
  const db = getDatabase();
  try {
    const created = await app.inject({
      body: {
        source: {
          enabled: true,
          metricKey: "scope.move.blocked",
          metricScope: "cl",
          multiplier: 1,
          nameEn: "Scope move",
          nameZh: "範圍搬移",
          topic: "scope/move",
          unit: "kW",
          valuePath: "$.value"
        }
      },
      method: "POST",
      url: "/api/data-hub/source-mappings"
    });
    assert.equal(created.statusCode, 201);
    const source = created.json() as { revision: number; sourceRef: string };
    db.prepare(`
      INSERT OR REPLACE INTO display_page_stage_configs
        (page_key, stage, config_json, version, updated_at)
      VALUES (?, 'draft', ?, 1, CURRENT_TIMESTAMP)
    `).run(
      "scope-move-consumer",
      JSON.stringify({ regions: { dataBindings: {
        item: { itemId: "item", dataBinding: { metricKey: "scope.move.blocked", scope: "cl" } }
      } } })
    );

    const response = await app.inject({
      body: { expectedRevision: source.revision, patch: { metricScope: "kn" } },
      method: "PATCH",
      url: `/api/data-hub/source-mappings/${source.sourceRef}`
    });
    assert.equal(response.statusCode, 409);
    assert.equal(response.json<{ code: string }>().code, "E1_SOURCE_IN_USE");
    assert.equal(
      (db.prepare("SELECT metric_scope FROM topic_mappings WHERE source_ref = ?").get(source.sourceRef) as { metric_scope: string }).metric_scope,
      "cl"
    );
  } finally {
    await app.close();
  }
});

test("DHT-R2-S03: Reviewed E1 topic and value path edits are blocked", async () => {
  const app = await buildApp();
  const db = getDatabase();
  try {
    db.prepare(`
      INSERT OR REPLACE INTO meter_sources (
        meter_id, channel_id, metric_scope, metric_key, measurement_kind, energy_flow_role,
        input_unit, scale_decimal, source_revision, epoch_id, enabled, review_status,
        timestamp_policy, created_at
      ) VALUES ('m-topic-test', 'c-topic-test', 'cl', 'reviewedTopicMetric', 'power-gauge', 'consumption',
        'kW', '1', 1, 'epoch-topic-test', 1, 'reviewed', 'source-required', CURRENT_TIMESTAMP)
    `).run();
    db.prepare(`
      INSERT OR REPLACE INTO topic_mappings
        (source_ref, config_revision, metric_scope, metric_key, topic, unit, value_path, multiplier, enabled)
      VALUES ('src_cl_reviewedTopicMetric_test', 1, 'cl', 'reviewedTopicMetric', 'reviewed/topic', 'kW', '$.value', 1, 1)
    `).run();

    for (const patch of [{ topic: "reviewed/changed" }, { valuePath: "$.reading" }]) {
      const response = await app.inject({
        body: { expectedRevision: 1, patch },
        method: "PATCH",
        url: "/api/data-hub/source-mappings/src_cl_reviewedTopicMetric_test"
      });
      assert.equal(response.statusCode, 409);
      assert.equal(response.json<{ code: string }>().code, "E1_SOURCE_REVISION_REQUIRED");
    }
    assert.deepEqual(
      db.prepare("SELECT topic, value_path FROM topic_mappings WHERE source_ref = ?")
        .get("src_cl_reviewedTopicMetric_test"),
      { topic: "reviewed/topic", value_path: "$.value" }
    );
  } finally {
    await app.close();
  }
});

test("Generic source mutation route redacts unexpected internal errors", async () => {
  const app = await buildApp();
  const db = getDatabase();
  try {
    db.exec("DROP TABLE topic_mappings");
    const response = await app.inject({
      body: {
        source: {
          enabled: false,
          metricKey: "unexpected.error",
          metricScope: "cl",
          multiplier: 1,
          nameEn: "Unexpected",
          nameZh: "例外",
          topic: "unexpected/error",
          unit: "kW",
          valuePath: "$.value"
        }
      },
      method: "POST",
      url: "/api/data-hub/source-mappings"
    });
    assert.equal(response.statusCode, 500);
    const body = response.json() as { error: string; success: boolean };
    assert.equal(body.error, "Internal Server Error");
    assert.equal(body.success, false);
    assert.doesNotMatch(JSON.stringify(body), /topic_mappings|no such table/iu);
  } finally {
    await app.close();
  }
});
