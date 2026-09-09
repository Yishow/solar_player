import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import Database from "better-sqlite3";
import type { MeterSourceDefinition } from "@solar-display/shared";
import { isSolarAdapterManagedMetricIdentity } from "../mqtt/SolarSourceAdapter.js";
import { applyGuidedMapping, previewGuidedMapping } from "./guidedMqttMappingService.js";
import { saveMeterSource, syncSourceTopicMapping } from "./meterSourceCatalogService.js";

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
  // The page, registry and profile tables belong to the fixture because the destructive
  // guard reads the same dependency surface as source management. Without them every
  // impact lookup fails closed and a rejection could not be attributed to a real consumer.
  for (const file of [
    "044_mapping_apply_receipts.sql", "015_calculation_settings.sql", "037_derived_metric_registry.sql",
    "038_derived_metric_site_scopes.sql", "006_display_page_configs.sql", "007_display_page_publishing.sql",
    "009_display_page_registry.sql", "021_playback_runtime_freshness_policy.sql",
    "027_default_playback_profile.sql"
  ]) {
    db.exec(readFileSync(`src/db/migrations/${file}`, "utf8"));
  }
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

/** N1 fixtures: a guided write must obey the same destination ownership authorities as the legacy route. */
const solarSource: MeterSourceDefinition = {
  ...source, channelId: "cl-solar-total", meterId: "cl-solar-total", metricScope: "cl",
  metricKey: "factoryGeneration.totalKw", measurementKind: "power-gauge",
  energyFlowRole: "generation", inputUnit: "kW"
};
const solarDraft = {
  channelId: solarSource.channelId, metricScope: solarSource.metricScope,
  measurementKind: solarSource.measurementKind, energyFlowRole: solarSource.energyFlowRole,
  timestampPolicy: solarSource.timestampPolicy, selector: { path: ["value"] },
  source: solarSource, topic: "review/isolated/managed"
};

function registerDerivedMetric(
  db: Database.Database,
  metricKey: string,
  options: { enabled: boolean; managed?: boolean; siteScopes?: string[] }
) {
  db.prepare(`
    INSERT INTO derived_metric_definitions (
      metric_key, name, description, output_scope_policy, expression, output_unit,
      precision, fallback_policy, enabled, managed, revision, site_scopes_json
    ) VALUES (?, ?, '', 'site', 'a', 'kWh', 3, 'unavailable', ?, ?, 1, ?)
  `).run(
    metricKey, metricKey, options.enabled ? 1 : 0, options.managed ? 1 : 0,
    options.siteScopes ? JSON.stringify(options.siteScopes) : null
  );
}

function ownershipWriteCounts(db: Database.Database) {
  const count = (table: string) =>
    (db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number }).count;
  return {
    audit: count("meter_source_audit"),
    mappings: count("topic_mappings"),
    receipts: count("mapping_apply_receipts"),
    sources: count("meter_sources"),
    tokens: count("mapping_preview_tokens")
  };
}

test("M2-R11 a Solar-managed destination is rejected before a preview token exists", () => {
  const db = database();
  assert.equal(
    isSolarAdapterManagedMetricIdentity(solarSource.metricScope, solarSource.metricKey),
    true,
    "the fixture must use an identity the current Solar ownership helper reports as managed"
  );
  assert.throws(
    () => previewGuidedMapping(db, solarDraft),
    (error: { code?: string; statusCode?: number }) =>
      error.code === "MANAGED_SOURCE_METRIC_CONFLICT" && error.statusCode === 409
  );
  assert.deepEqual(ownershipWriteCounts(db), { audit: 0, mappings: 0, receipts: 0, sources: 0, tokens: 0 });
  db.close();
});

test("M2-R11 a destination claimed after the preview is rejected inside the apply transaction", () => {
  const db = database();
  const preview = previewGuidedMapping(db, draft);
  registerDerivedMetric(db, source.metricKey, { enabled: true });
  assert.throws(
    () => applyGuidedMapping(db, { ...preview, idempotencyKey: "claimed", meterId: source.meterId, source }),
    (error: { code?: string; statusCode?: number }) =>
      error.code === "DERIVED_METRIC_IDENTITY_CONFLICT" && error.statusCode === 409
  );
  const counts = ownershipWriteCounts(db);
  assert.deepEqual(
    { audit: counts.audit, mappings: counts.mappings, receipts: counts.receipts, sources: counts.sources },
    { audit: 0, mappings: 0, receipts: 0, sources: 0 }
  );
  db.close();
});

test("M2-R11 a disabled derived destination stays reserved against a disabled guided mapping", () => {
  const db = database();
  registerDerivedMetric(db, source.metricKey, { enabled: false });
  const disabledSource = { ...source, enabled: false };
  assert.throws(
    () => previewGuidedMapping(db, { ...draft, source: disabledSource }),
    (error: { code?: string; statusCode?: number }) =>
      error.code === "DERIVED_METRIC_IDENTITY_CONFLICT" && error.statusCode === 409
  );
  assert.deepEqual(ownershipWriteCounts(db), { audit: 0, mappings: 0, receipts: 0, sources: 0, tokens: 0 });
  assert.equal(
    (db.prepare("SELECT enabled FROM derived_metric_definitions WHERE metric_key = ?").get(source.metricKey) as { enabled: number }).enabled,
    0,
    "a rejected guided mapping must not release or overwrite the registered identity"
  );
  db.close();
});

test("M2-R11 server-owned period-energy destinations cannot be acquired by a guided mapping", () => {
  for (const metricKey of ["consumption.period.dayKwh", "consumption.period.monthKwh", "consumption.period.yearKwh"]) {
    const db = database();
    registerDerivedMetric(db, metricKey, { enabled: true, managed: true });
    const periodSource = { ...source, metricKey };
    assert.throws(
      () => previewGuidedMapping(db, { ...draft, source: periodSource }),
      (error: { code?: string; statusCode?: number }) =>
        error.code === "DERIVED_METRIC_IDENTITY_CONFLICT" && error.statusCode === 409,
      metricKey
    );
    assert.deepEqual(ownershipWriteCounts(db), { audit: 0, mappings: 0, receipts: 0, sources: 0, tokens: 0 });
    db.close();
  }
});

test("M2-R11 an unowned custom destination stays previewable and leaves the other site untouched", () => {
  const db = database();
  const clSource = { ...source, channelId: "cl-main", meterId: "cl-main", metricScope: "cl" as const, metricKey: "customPlantEnergy" };
  const clPreview = previewGuidedMapping(db, { ...draft, channelId: clSource.channelId, metricScope: "cl", source: clSource, topic: "factory/cl/main" });
  applyGuidedMapping(db, { ...clPreview, idempotencyKey: "cl-custom", meterId: clSource.meterId, source: clSource });
  const knPreview = previewGuidedMapping(db, draft);
  applyGuidedMapping(db, { ...knPreview, idempotencyKey: "kn-custom", meterId: source.meterId, source });
  assert.deepEqual(
    (db.prepare("SELECT metric_scope, metric_key FROM meter_sources ORDER BY metric_scope").all() as Array<{ metric_scope: string; metric_key: string }>),
    [{ metric_scope: "cl", metric_key: "customPlantEnergy" }, { metric_scope: "kn", metric_key: source.metricKey }]
  );
  db.close();
});

/** M2-R15 fixtures: the reviewed source and its mapping must reach the same enabled state in one commit. */
/**
 * A destination no registered page or readiness requirement consumes. Enabled-state cases use it
 * so the dependency guard has nothing to protect and the commit behaviour is what is under test.
 */
const unconsumedSource: MeterSourceDefinition = { ...source, metricKey: "unconsumedPlantEnergy" };
function guidedApply(
  db: Database.Database,
  idempotencyKey: string,
  overrides: { source?: MeterSourceDefinition; topic?: string; channelId?: string } = {}
) {
  const applied = { ...source, ...overrides.source } as MeterSourceDefinition;
  const nextDraft = {
    ...draft, channelId: applied.channelId, metricScope: applied.metricScope,
    measurementKind: applied.measurementKind, energyFlowRole: applied.energyFlowRole,
    timestampPolicy: applied.timestampPolicy, source: applied,
    topic: overrides.topic ?? draft.topic
  };
  const preview = previewGuidedMapping(db, nextDraft);
  return applyGuidedMapping(db, {
    ...preview, idempotencyKey, meterId: applied.meterId, source: applied, topic: nextDraft.topic
  });
}

function mappingRow(db: Database.Database, metricScope: string, metricKey: string) {
  return db.prepare("SELECT enabled, selector_json, topic, unit FROM topic_mappings WHERE metric_scope = ? AND metric_key = ?")
    .get(metricScope, metricKey) as { enabled: number; selector_json: string | null; topic: string; unit: string | null } | undefined;
}

function sourceRow(db: Database.Database, metricScope: string, channelId: string) {
  return db.prepare("SELECT enabled, source_revision FROM meter_sources WHERE metric_scope = ? AND channel_id = ? ORDER BY source_revision DESC LIMIT 1")
    .get(metricScope, channelId) as { enabled: number; source_revision: number } | undefined;
}

test("M2-R15 a guided re-enable commits the source and its mapping together", () => {
  const db = database();
  guidedApply(db, "initial-enable");
  const savedSelector = mappingRow(db, source.metricScope, source.metricKey)!.selector_json;
  const disabled = saveMeterSource(db, { ...source, enabled: false }, { actor: "management", reason: "operator-disable" });
  syncSourceTopicMapping(db, source.metricScope, disabled);
  assert.deepEqual(
    { mapping: mappingRow(db, source.metricScope, source.metricKey)!.enabled, source: sourceRow(db, source.metricScope, source.channelId)!.enabled },
    { mapping: 0, source: 0 },
    "the existing source path must leave both sides disabled before the guided re-enable"
  );

  guidedApply(db, "guided-re-enable");
  const mapping = mappingRow(db, source.metricScope, source.metricKey)!;
  const persisted = sourceRow(db, source.metricScope, source.channelId)!;
  assert.deepEqual(
    { mapping: mapping.enabled, source: persisted.enabled, revision: persisted.source_revision },
    { mapping: 1, source: 1, revision: 1 },
    "re-enabling without an identity change must enable both sides on the existing revision"
  );
  assert.equal(mapping.selector_json, savedSelector, "an enabled-state change must preserve the selector");
  assert.equal(mapping.topic, draft.topic);
  db.close();
});

test("M2-R15 a guided apply that creates a disabled source also leaves its mapping disabled", () => {
  const db = database();
  guidedApply(db, "create-disabled", { source: { ...source, enabled: false } });
  assert.equal(mappingRow(db, source.metricScope, source.metricKey)!.enabled, 0);
  assert.equal(sourceRow(db, source.metricScope, source.channelId)!.enabled, 0);
  assert.equal(
    (db.prepare("SELECT COUNT(*) AS count FROM meter_readings_accepted").get() as { count: number }).count,
    0,
    "a disabled source must not claim an accepted reading"
  );
  db.close();
});

test("M2-R15 disabling one owner of a shared topic keeps the other owner enabled", () => {
  const db = database();
  const second: MeterSourceDefinition = {
    ...source, channelId: "kn-second", meterId: "kn-second", metricKey: "selfConsumptionEnergy"
  };
  guidedApply(db, "shared-first", { source: unconsumedSource });
  guidedApply(db, "shared-second", { source: second });
  guidedApply(db, "shared-first-disable", { source: { ...unconsumedSource, enabled: false } });
  assert.deepEqual(
    { first: mappingRow(db, unconsumedSource.metricScope, unconsumedSource.metricKey)!.enabled, second: mappingRow(db, second.metricScope, second.metricKey)!.enabled },
    { first: 0, second: 1 },
    "disabling one owner must not disable another mapping on the same topic"
  );
  assert.equal(sourceRow(db, second.metricScope, second.channelId)!.enabled, 1);
  assert.deepEqual(
    (db.prepare("SELECT DISTINCT topic FROM topic_mappings WHERE enabled = 1 AND TRIM(topic) != ''").all() as Array<{ topic: string }>).map((row) => row.topic),
    [draft.topic],
    "the shared topic must stay in the enabled subscription set for its remaining owner"
  );
  db.close();
});

test("M2-R15 a mapping write failure during an enabled-state change rolls back both sides", () => {
  const db = database();
  guidedApply(db, "rollback-initial", { source: unconsumedSource });
  const auditBefore = (db.prepare("SELECT COUNT(*) AS count FROM meter_source_audit").get() as { count: number }).count;
  const receiptsBefore = (db.prepare("SELECT COUNT(*) AS count FROM mapping_apply_receipts").get() as { count: number }).count;
  db.exec("CREATE TRIGGER reject_mapping_update BEFORE UPDATE ON topic_mappings BEGIN SELECT RAISE(ABORT, 'mapping unavailable'); END");
  assert.throws(
    () => guidedApply(db, "rollback-disable", { source: { ...unconsumedSource, enabled: false } }),
    /mapping unavailable/
  );
  db.exec("DROP TRIGGER reject_mapping_update");
  assert.deepEqual(
    { mapping: mappingRow(db, unconsumedSource.metricScope, unconsumedSource.metricKey)!.enabled, source: sourceRow(db, unconsumedSource.metricScope, unconsumedSource.channelId)!.enabled },
    { mapping: 1, source: 1 },
    "a failed enabled-state change must leave neither side changed"
  );
  assert.equal((db.prepare("SELECT COUNT(*) AS count FROM meter_source_audit").get() as { count: number }).count, auditBefore);
  assert.equal((db.prepare("SELECT COUNT(*) AS count FROM mapping_apply_receipts").get() as { count: number }).count, receiptsBefore);
  db.close();
});

test("M2-R15 retrying the same re-enable keeps one source mutation and one receipt", () => {
  const db = database();
  guidedApply(db, "retry-initial");
  const disabled = saveMeterSource(db, { ...source, enabled: false }, { actor: "management", reason: "operator-disable" });
  syncSourceTopicMapping(db, source.metricScope, disabled);
  const preview = previewGuidedMapping(db, draft);
  const request = { ...preview, idempotencyKey: "retry-re-enable", meterId: source.meterId, source, topic: draft.topic };
  const first = applyGuidedMapping(db, request);
  const auditAfterFirst = (db.prepare("SELECT COUNT(*) AS count FROM meter_source_audit").get() as { count: number }).count;
  assert.deepEqual(applyGuidedMapping(db, request), first, "a replayed key must return the committed result");
  assert.deepEqual(
    { mapping: mappingRow(db, source.metricScope, source.metricKey)!.enabled, source: sourceRow(db, source.metricScope, source.channelId)!.enabled },
    { mapping: 1, source: 1 }
  );
  assert.equal((db.prepare("SELECT COUNT(*) AS count FROM meter_source_audit").get() as { count: number }).count, auditAfterFirst);
  assert.equal(
    (db.prepare("SELECT COUNT(*) AS count FROM mapping_apply_receipts WHERE idempotency_key = ?").get("retry-re-enable") as { count: number }).count,
    1
  );
  assert.equal(sourceRow(db, source.metricScope, source.channelId)!.source_revision, 1);
  db.close();
});

/**
 * M2-R16 fixtures: a destination that no registered page or readiness requirement already
 * consumes, so the only dependency in these cases is the one the case itself creates.
 */
const guardedSource: MeterSourceDefinition = {
  ...source, channelId: "kn-guarded", meterId: "kn-guarded", metricKey: "guardedPlantEnergy"
};
const guardedTopic = "factory/kn/guarded";

function referenceFromDraftPage(db: Database.Database, pageKey: string, metricKey: string) {
  db.prepare(`
    INSERT INTO display_page_stage_configs (page_key, stage, config_json, version, updated_at)
    VALUES (?, 'draft', ?, 1, ?)
    ON CONFLICT(page_key, stage) DO UPDATE SET config_json = excluded.config_json
  `).run(
    pageKey,
    JSON.stringify({ regions: { dataBindings: { power: { itemId: "power", dataBinding: { metricKey, scope: "kn", sourceType: "metric" } } } } }),
    new Date().toISOString()
  );
}

/**
 * The configuration a rejected destructive apply must leave untouched. Preview tokens are
 * excluded on purpose: issuing a token is the preview's write, not the apply's.
 */
function committedWrites(db: Database.Database) {
  const rows = (sql: string) => JSON.stringify(db.prepare(sql).all());
  return {
    audit: rows("SELECT * FROM meter_source_audit ORDER BY id"),
    mappings: rows("SELECT * FROM topic_mappings ORDER BY id"),
    receipts: rows("SELECT * FROM mapping_apply_receipts ORDER BY idempotency_key"),
    sources: rows("SELECT * FROM meter_sources ORDER BY metric_scope, channel_id, source_revision")
  };
}

/** The committed writes plus the page and profile configuration the guard reads but never edits. */
function protectedState(db: Database.Database) {
  const rows = (sql: string) => JSON.stringify(db.prepare(sql).all());
  return {
    ...committedWrites(db),
    pages: rows("SELECT page_key, stage, config_json FROM display_page_stage_configs ORDER BY page_key, stage"),
    profiles: rows("SELECT profile_id, page_id, enabled, display_order FROM playback_profile_pages ORDER BY profile_id, page_id")
  };
}

function isDependencyRejection(code: string) {
  return (error: { code?: string; statusCode?: number }) => error.code === code && error.statusCode === 409;
}

test("M2-R16 a guided apply cannot disable a source an unresolved draft still references", () => {
  const db = database();
  guidedApply(db, "guarded-enable", { source: guardedSource, topic: guardedTopic });
  referenceFromDraftPage(db, "overview", guardedSource.metricKey);
  const before = protectedState(db);

  assert.throws(
    () => guidedApply(db, "guarded-disable", { source: { ...guardedSource, enabled: false }, topic: guardedTopic }),
    isDependencyRejection("E1_SOURCE_IN_USE")
  );
  assert.deepEqual(
    {
      mapping: mappingRow(db, guardedSource.metricScope, guardedSource.metricKey)!.enabled,
      source: sourceRow(db, guardedSource.metricScope, guardedSource.channelId)!.enabled
    },
    { mapping: 1, source: 1 },
    "a rejected disable must leave the source and its mapping enabled"
  );
  assert.deepEqual(protectedState(db), before, "a rejected disable must write nothing");
  db.close();
});

test("M2-R16 a rename cannot evade the guard while a derived metric uses the original destination", () => {
  const db = database();
  guidedApply(db, "rename-enable", { source: guardedSource, topic: guardedTopic });
  registerDerivedMetric(db, "guardedDerivedTotal", { enabled: true });
  db.prepare(`
    INSERT INTO derived_metric_inputs (derived_metric_key, alias, input_kind, metric_key, scope_selector, unit, sort_order)
    VALUES ('guardedDerivedTotal', 'a', 'metric', ?, 'output-site', 'kWh', 0)
  `).run(guardedSource.metricKey);
  const before = protectedState(db);

  const renamed = { ...guardedSource, metricKey: "guardedPlantEnergyRenamed", sourceRevision: 2 };
  assert.throws(
    () => guidedApply(db, "rename-apply", { source: renamed, topic: guardedTopic }),
    isDependencyRejection("E1_SOURCE_IN_USE")
  );
  assert.equal(
    mappingRow(db, renamed.metricScope, renamed.metricKey),
    undefined,
    "a rejected rename must not create the replacement mapping"
  );
  assert.deepEqual(protectedState(db), before, "a rejected rename must leave the original source untouched");
  db.close();
});

test("M2-R16 a dependency introduced after the preview still blocks the first apply", () => {
  const db = database();
  guidedApply(db, "post-preview-enable", { source: guardedSource, topic: guardedTopic });
  const disabling = {
    ...draft, channelId: guardedSource.channelId, source: { ...guardedSource, enabled: false }, topic: guardedTopic
  };
  const preview = previewGuidedMapping(db, disabling);
  // The consumer appears only after the token was issued: the mapping and source revisions
  // are unchanged, so a matching snapshot is not evidence that the disable is still safe.
  referenceFromDraftPage(db, "solar", guardedSource.metricKey);
  const before = protectedState(db);

  assert.throws(
    () => applyGuidedMapping(db, {
      ...preview, idempotencyKey: "post-preview-disable", meterId: guardedSource.meterId,
      source: disabling.source, topic: guardedTopic
    }),
    isDependencyRejection("E1_SOURCE_IN_USE")
  );
  assert.deepEqual(protectedState(db), before, "a dependency found at commit time must write nothing");
  db.close();
});

test("M2-R16 an unreadable impact lookup rejects the apply instead of reading as no dependency", () => {
  const db = database();
  guidedApply(db, "unknown-enable", { source: guardedSource, topic: guardedTopic });
  // An unreadable dependency surface is not an empty dependency set. The page stage table is
  // removed because only the impact read consults it: the ownership authorities stay readable,
  // so the rejection can only come from the dependency guard.
  db.exec("DROP TABLE display_page_stage_configs");
  const before = committedWrites(db);

  assert.throws(
    () => guidedApply(db, "unknown-disable", { source: { ...guardedSource, enabled: false }, topic: guardedTopic }),
    isDependencyRejection("E1_SOURCE_IMPACT_UNKNOWN")
  );
  assert.deepEqual(
    {
      mapping: mappingRow(db, guardedSource.metricScope, guardedSource.metricKey)!.enabled,
      source: sourceRow(db, guardedSource.metricScope, guardedSource.channelId)!.enabled
    },
    { mapping: 1, source: 1 }
  );
  assert.deepEqual(committedWrites(db), before, "an unknown impact must write nothing");
  db.close();
});

test("M2-R16 registering a source is not blocked by dependencies already on its destination", () => {
  const db = database();
  referenceFromDraftPage(db, "overview", "newlyBoundPlantEnergy");
  const fresh: MeterSourceDefinition = {
    ...source, channelId: "kn-fresh", meterId: "kn-fresh", metricKey: "newlyBoundPlantEnergy"
  };

  const applied = guidedApply(db, "fresh-register", { source: fresh, topic: "factory/kn/fresh" });
  assert.equal(applied.source.enabled, true, "a first registration has no previous destination to protect");
  assert.deepEqual(
    {
      mapping: mappingRow(db, fresh.metricScope, fresh.metricKey)!.enabled,
      source: sourceRow(db, fresh.metricScope, fresh.channelId)!.enabled
    },
    { mapping: 1, source: 1 }
  );
  db.close();
});

test("M2-R16 a re-enable and a display-name update stay available while the destination is in use", () => {
  const db = database();
  guidedApply(db, "available-enable", { source: guardedSource, topic: guardedTopic });
  guidedApply(db, "available-disable", { source: { ...guardedSource, enabled: false }, topic: guardedTopic });
  referenceFromDraftPage(db, "overview", guardedSource.metricKey);

  const reEnabled = guidedApply(db, "available-re-enable", { source: guardedSource, topic: guardedTopic });
  assert.equal(reEnabled.source.enabled, true, "restoring reception is not a destructive transition");
  assert.deepEqual(
    {
      mapping: mappingRow(db, guardedSource.metricScope, guardedSource.metricKey)!.enabled,
      source: sourceRow(db, guardedSource.metricScope, guardedSource.channelId)!.enabled
    },
    { mapping: 1, source: 1 }
  );

  const renamed = guidedApply(db, "available-display-name", {
    source: { ...guardedSource, displayNameZh: "新名稱" }, topic: guardedTopic
  });
  assert.equal(renamed.source.displayNameZh, "新名稱");
  assert.equal(renamed.source.sourceRevision, guardedSource.sourceRevision, "a display name is not a source identity change");
  assert.deepEqual(
    {
      mapping: mappingRow(db, guardedSource.metricScope, guardedSource.metricKey)!.enabled,
      source: sourceRow(db, guardedSource.metricScope, guardedSource.channelId)!.enabled
    },
    { mapping: 1, source: 1 }
  );
  db.close();
});

test("M2-R16 disabling a source with a known empty impact stays available", () => {
  const db = database();
  guidedApply(db, "unused-enable", { source: guardedSource, topic: guardedTopic });

  const disabled = guidedApply(db, "unused-disable", { source: { ...guardedSource, enabled: false }, topic: guardedTopic });
  assert.equal(disabled.source.enabled, false);
  assert.deepEqual(
    {
      mapping: mappingRow(db, guardedSource.metricScope, guardedSource.metricKey)!.enabled,
      source: sourceRow(db, guardedSource.metricScope, guardedSource.channelId)!.enabled
    },
    { mapping: 0, source: 0 },
    "a permitted disable must leave the source and its mapping consistently disabled"
  );
  db.close();
});

test("M2-R16 an identical committed request stays a replay after new consumers appear", () => {
  const db = database();
  guidedApply(db, "replay-enable", { source: guardedSource, topic: guardedTopic });
  const disabling = {
    ...draft, channelId: guardedSource.channelId, source: { ...guardedSource, enabled: false }, topic: guardedTopic
  };
  const preview = previewGuidedMapping(db, disabling);
  const request = {
    ...preview, idempotencyKey: "replay-disable", meterId: guardedSource.meterId,
    source: disabling.source, topic: guardedTopic
  };
  const committed = applyGuidedMapping(db, request);
  // The replay is not a new destructive mutation, so a consumer added afterwards must not
  // turn a committed result into a rejection.
  referenceFromDraftPage(db, "overview", guardedSource.metricKey);
  const after = committedWrites(db);

  assert.deepEqual(applyGuidedMapping(db, request), committed, "a replayed key must return the committed result");
  assert.deepEqual(committedWrites(db), after, "a replay must not write again");
  assert.throws(
    () => applyGuidedMapping(db, { ...request, source: { ...disabling.source, scaleDecimal: "2" } }),
    /IDEMPOTENCY_CONFLICT/
  );
  db.close();
});

test("M2-R16 the dependency guard does not displace the existing token and ownership checks", () => {
  const db = database();
  guidedApply(db, "precedence-enable", { source: guardedSource, topic: guardedTopic });
  referenceFromDraftPage(db, "overview", guardedSource.metricKey);
  const disabling = {
    ...draft, channelId: guardedSource.channelId, source: { ...guardedSource, enabled: false }, topic: guardedTopic
  };
  const before = committedWrites(db);

  const expired = previewGuidedMapping(db, disabling);
  db.prepare("UPDATE mapping_preview_tokens SET expires_at = '2000-01-01T00:00:00Z' WHERE preview_token = ?")
    .run(expired.previewToken);
  assert.throws(
    () => applyGuidedMapping(db, {
      ...expired, idempotencyKey: "precedence-expired", meterId: guardedSource.meterId,
      source: disabling.source, topic: guardedTopic
    }),
    /PREVIEW_EXPIRED/
  );

  const claimed = previewGuidedMapping(db, disabling);
  registerDerivedMetric(db, guardedSource.metricKey, { enabled: true });
  assert.throws(
    () => applyGuidedMapping(db, {
      ...claimed, idempotencyKey: "precedence-claimed", meterId: guardedSource.meterId,
      source: disabling.source, topic: guardedTopic
    }),
    isDependencyRejection("DERIVED_METRIC_IDENTITY_CONFLICT")
  );
  assert.deepEqual(committedWrites(db), before, "neither earlier rejection may write");
  db.close();
});

test("M2-R16 a rejected destructive apply leaves the other site's configuration unchanged", () => {
  const db = database();
  const clSource: MeterSourceDefinition = {
    ...source, channelId: "cl-main", meterId: "cl-main", metricScope: "cl", metricKey: "clPlantEnergy"
  };
  guidedApply(db, "cross-site-cl", { source: clSource, topic: "factory/cl/main" });
  guidedApply(db, "cross-site-kn", { source: guardedSource, topic: guardedTopic });
  referenceFromDraftPage(db, "overview", guardedSource.metricKey);
  const before = protectedState(db);

  assert.throws(
    () => guidedApply(db, "cross-site-disable", { source: { ...guardedSource, enabled: false }, topic: guardedTopic }),
    isDependencyRejection("E1_SOURCE_IN_USE")
  );
  assert.deepEqual(protectedState(db), before);
  assert.deepEqual(
    {
      mapping: mappingRow(db, clSource.metricScope, clSource.metricKey)!.enabled,
      source: sourceRow(db, clSource.metricScope, clSource.channelId)!.enabled
    },
    { mapping: 1, source: 1 },
    "the other site's source must be untouched by a rejection"
  );
  db.close();
});
