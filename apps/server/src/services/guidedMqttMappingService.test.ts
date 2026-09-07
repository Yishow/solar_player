import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import Database from "better-sqlite3";
import type { MeterSourceDefinition } from "@solar-display/shared";
import { applyGuidedMapping, previewGuidedMapping } from "./guidedMqttMappingService.js";

const source: MeterSourceDefinition = {
  channelId: "kn-main", meterId: "kn-main", metricKey: "consumptionEnergy", metricScope: "kn",
  enabled: true, reviewStatus: "reviewed", measurementKind: "cumulative-energy", energyFlowRole: "consumption",
  inputUnit: "kWh", scaleDecimal: "1", sourceRevision: 1, epochId: "one", expectedCadenceSeconds: 60,
  sourceTimestampTimeZone: null, timestampPolicy: "source-required"
};
const draft = {
  channelId: source.channelId, metricScope: source.metricScope, measurementKind: source.measurementKind,
  energyFlowRole: source.energyFlowRole, timestampPolicy: source.timestampPolicy, selector: { path: ["value"] },
  source, topic: "factory/kn/main"
};

function database() {
  const db = new Database(":memory:");
  for (const file of ["001_init.sql", "040_meter_reading_contracts.sql", "049_meter_source_boundary_age.sql", "048_meter_source_lifecycle.sql", "042_consumption_projections.sql", "043_energy_authoring_tokens.sql"]) {
    db.exec(readFileSync(`src/db/migrations/${file}`, "utf8"));
  }
  db.exec("ALTER TABLE topic_mappings ADD COLUMN metric_scope TEXT");
  db.exec(readFileSync("src/db/migrations/044_mapping_apply_receipts.sql", "utf8"));
  return db;
}

test("M2 apply rejects source or topic changes with zero writes", () => {
  const db = database();
  const preview = previewGuidedMapping(db, draft);
  for (const change of [
    { source: { ...source, metricScope: "cl" as const } },
    { source: { ...source, scaleDecimal: "1000" } },
    { topic: "factory/kn/unreviewed" }
  ]) {
    assert.throws(() => applyGuidedMapping(db, {
      ...preview, idempotencyKey: "one", meterId: source.meterId, source, topic: draft.topic, ...change
    }), /PREVIEW_DRAFT_MISMATCH/);
    assert.equal((db.prepare("SELECT COUNT(*) AS count FROM meter_sources").get() as { count: number }).count, 0);
  }
  db.close();
});

test("M2 retry returns its committed result after expiry and rejects changed key reuse", () => {
  const db = database();
  const preview = previewGuidedMapping(db, draft);
  const request = { ...preview, idempotencyKey: "retry", meterId: source.meterId, source, topic: draft.topic };
  const result = applyGuidedMapping(db, request);
  db.prepare("UPDATE mapping_preview_tokens SET expires_at = '2000-01-01T00:00:00Z'").run();
  assert.deepEqual(applyGuidedMapping(db, request), result);
  assert.throws(() => applyGuidedMapping(db, { ...request, source: { ...source, scaleDecimal: "2" } }), /IDEMPOTENCY_CONFLICT/);
  assert.equal((db.prepare("SELECT COUNT(*) AS count FROM meter_sources").get() as { count: number }).count, 1);
  db.close();
});

test("M2 source and mapping commit atomically and reject a stale target", () => {
  const db = database();
  const preview = previewGuidedMapping(db, draft);
  const request = { ...preview, idempotencyKey: "atomic", meterId: source.meterId, source, topic: draft.topic };
  db.exec("CREATE TRIGGER reject_mapping BEFORE INSERT ON topic_mappings BEGIN SELECT RAISE(ABORT, 'mapping unavailable'); END");
  assert.throws(() => applyGuidedMapping(db, request), /mapping unavailable/);
  assert.equal((db.prepare("SELECT COUNT(*) AS count FROM meter_sources").get() as { count: number }).count, 0);
  db.exec("DROP TRIGGER reject_mapping");
  db.prepare("INSERT INTO topic_mappings (metric_scope, metric_key, topic) VALUES (?, ?, ?)").run("kn", "consumptionEnergy", "changed/topic");
  assert.throws(() => applyGuidedMapping(db, request), /PREVIEW_STALE/);
  db.close();
});


test("M2 transport changes cannot reuse a source revision", () => {
  const db = database();
  const first = previewGuidedMapping(db, draft);
  applyGuidedMapping(db, { ...first, idempotencyKey: "original", meterId: source.meterId, source });
  const changed = { ...draft, topic: "factory/kn/replacement" };
  const preview = previewGuidedMapping(db, changed);
  assert.throws(() => applyGuidedMapping(db, { ...preview, idempotencyKey: "changed", meterId: source.meterId, source }), /REVISION/);
  assert.equal((db.prepare("SELECT topic FROM topic_mappings").get() as {topic:string}).topic, draft.topic);
  const nextSource = { ...source, sourceRevision: 2, epochId: "two" };
  const next = previewGuidedMapping(db, { ...changed, source: nextSource });
  applyGuidedMapping(db, { ...next, idempotencyKey: "next", meterId: source.meterId, source: nextSource });
  assert.equal((db.prepare("SELECT topic FROM topic_mappings").get() as {topic:string}).topic, changed.topic);
  db.close();
});
