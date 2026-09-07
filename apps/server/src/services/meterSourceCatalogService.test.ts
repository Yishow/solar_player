import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import type { MeterSourceDefinition } from "@solar-display/shared";
import { seedAcceptedReading } from "./meterReadingService.js";
import { getMeterSource, listMeterSources, saveMeterSource } from "./meterSourceCatalogService.js";

function createDatabase() {
  const database = new Database(":memory:");
  for (const migration of [
    "001_init.sql",
    "040_meter_reading_contracts.sql",
    "046_meter_reading_evidence.sql",
    "048_meter_source_lifecycle.sql",
    "049_meter_source_boundary_age.sql"
  ]) {
    database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations", migration), "utf8"));
  }
  return database;
}

const mainSource: MeterSourceDefinition = {
  channelId: "main",
  enabled: true,
  energyFlowRole: "consumption",
  epochId: "epoch-1",
  expectedCadenceSeconds: 60,
  inputUnit: "kWh",
  measurementKind: "cumulative-energy",
  meterId: "meter-1",
  metricKey: "consumptionEnergy",
  metricScope: "cl",
  reviewStatus: "reviewed",
  scaleDecimal: "1",
  sourceRevision: 1,
  sourceTimestampTimeZone: "UTC",
  timestampPolicy: "source-required",
  displayNameZh: "總錶",
  displayNameEn: "Main"
};

const canonicalMainSource = { ...mainSource, boundaryMaxAgeSeconds: 300 };

function auditRows(database: Database.Database) {
  return database.prepare(`
    SELECT metric_scope, channel_id, meter_id, source_revision, epoch_id,
      actor, reason, before_json, after_json
    FROM meter_source_audit
    ORDER BY id
  `).all() as Array<{
    metric_scope: string;
    channel_id: string;
    meter_id: string;
    source_revision: number;
    epoch_id: string;
    actor: string;
    reason: string;
    before_json: string | null;
    after_json: string;
  }>;
}

test("049 schema defaults boundary age and rejects non-positive rows", () => {
  const database = createDatabase();
  database.prepare(`
    INSERT INTO meter_sources (
      meter_id, channel_id, metric_scope, metric_key, measurement_kind, energy_flow_role,
      input_unit, scale_decimal, source_revision, epoch_id, enabled, review_status,
      source_timestamp_time_zone, timestamp_policy, expected_cadence_seconds,
      display_name_zh, display_name_en, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    "raw-meter", "raw-channel", "cl", "rawEnergy", "cumulative-energy", "consumption",
    "kWh", "1", 1, "raw-epoch", 1, "reviewed", null, "source-required", 60, null, null,
    "2026-09-07T00:00:00.000Z"
  );
  assert.equal(
    (database.prepare("SELECT boundary_max_age_seconds FROM meter_sources WHERE channel_id = 'raw-channel'").get() as { boundary_max_age_seconds: number }).boundary_max_age_seconds,
    300
  );
  assert.throws(() => database.prepare(`
    INSERT INTO meter_sources (
      meter_id, channel_id, metric_scope, metric_key, measurement_kind, energy_flow_role,
      input_unit, scale_decimal, source_revision, epoch_id, enabled, review_status,
      source_timestamp_time_zone, timestamp_policy, expected_cadence_seconds,
      boundary_max_age_seconds, display_name_zh, display_name_en, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    "raw-meter-2", "raw-channel-2", "cl", "rawEnergy2", "cumulative-energy", "consumption",
    "kWh", "1", 1, "raw-epoch-2", 1, "reviewed", null, "source-required", 60, 0, null, null,
    "2026-09-07T00:00:00.000Z"
  ), /CHECK constraint failed/);
  database.close();
});

test("source registration records an audit and returns the full canonical definition", () => {
  const database = createDatabase();
  const saved = saveMeterSource(database, mainSource);
  assert.deepEqual(saved, canonicalMainSource);
  assert.deepEqual(getMeterSource(database, "cl", "main"), canonicalMainSource);
  assert.deepEqual(listMeterSources(database, "cl"), [canonicalMainSource]);
  assert.deepEqual(auditRows(database).map(({ before_json: _before, ...row }) => ({
    ...row,
    before_json: _before,
    after_json: JSON.parse(row.after_json)
  })), [{
    metric_scope: "cl",
    channel_id: "main",
    meter_id: "meter-1",
    source_revision: 1,
    epoch_id: "epoch-1",
    actor: "internal",
    reason: "source-registration",
    before_json: null,
    after_json: canonicalMainSource
  }]);
  database.close();
});

test("metadata update requires audit context and preserves accepted history/live state", () => {
  const database = createDatabase();
  saveMeterSource(database, mainSource);
  seedAcceptedReading(database, mainSource, "10100", "2026-09-01T00:00:00Z", "2026-09-01T00:00:01Z");
  const beforeLive = database.prepare("SELECT * FROM meter_live_state").all();
  assert.equal(getMeterSource(database, "cl", "main")?.boundaryMaxAgeSeconds, 300);
  assert.throws(
    () => saveMeterSource(database, { ...mainSource, displayNameZh: "未授權" }),
    (error: Error & { code?: string; statusCode?: number }) => error.code === "E1_SOURCE_AUDIT_CONTEXT_REQUIRED" && error.statusCode === 409
  );
  const renamed = saveMeterSource(database, { ...mainSource, displayNameZh: "新總錶", boundaryMaxAgeSeconds: 600 }, {
    actor: "management",
    reason: "rename-source"
  });
  assert.equal(renamed.sourceRevision, mainSource.sourceRevision);
  assert.equal(renamed.epochId, mainSource.epochId);
  assert.equal(renamed.displayNameZh, "新總錶");
  assert.equal(renamed.boundaryMaxAgeSeconds, 600);
  const preserved = saveMeterSource(database, { ...mainSource, displayNameZh: "省略欄位" }, {
    actor: "management",
    reason: "preserve-boundary"
  });
  assert.equal(preserved.boundaryMaxAgeSeconds, 600);
  assert.equal((database.prepare("SELECT COUNT(*) AS count FROM meter_readings_accepted").get() as { count: number }).count, 1);
  assert.deepEqual(database.prepare("SELECT * FROM meter_live_state").all(), beforeLive);
  assert.equal(auditRows(database).length, 3);
  assert.equal(JSON.parse(auditRows(database)[1]!.after_json).boundaryMaxAgeSeconds, 600);
  assert.deepEqual(JSON.parse(auditRows(database)[1]!.before_json!), canonicalMainSource);
  assert.deepEqual(JSON.parse(auditRows(database)[1]!.after_json), renamed);
  database.close();
});

test("boundary age rejects invalid source writes without creating a row", () => {
  for (const value of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1.5, "300", null]) {
    const database = createDatabase();
    assert.throws(
      () => saveMeterSource(database, { ...mainSource, boundaryMaxAgeSeconds: value } as never),
      (error: Error & { code?: string; statusCode?: number; fields?: string[] }) =>
        error.code === "E1_SOURCE_INVALID" && error.statusCode === 422 && error.fields?.includes("boundaryMaxAgeSeconds") === true
    );
    assert.equal((database.prepare("SELECT COUNT(*) AS count FROM meter_sources").get() as { count: number }).count, 0);
    database.close();
  }
});

test("physical or metric identity changes require a newer revision and a new epoch", () => {
  const database = createDatabase();
  saveMeterSource(database, mainSource);
  assert.throws(
    () => saveMeterSource(database, { ...mainSource, meterId: "meter-2", epochId: "epoch-2" }, {
      actor: "management",
      reason: "replace-meter"
    }),
    (error: Error & { code?: string; statusCode?: number }) => error.code === "E1_SOURCE_REVISION_REUSED" && error.statusCode === 409
  );
  const replacement = saveMeterSource(database, {
    ...mainSource,
    meterId: "meter-2",
    epochId: "epoch-2",
    sourceRevision: 2
  }, { actor: "management", reason: "replace-meter" });
  assert.equal(replacement.sourceRevision, 2);
  assert.equal(replacement.epochId, "epoch-2");
  assert.equal(getMeterSource(database, "cl", "main")?.meterId, "meter-2");
  assert.deepEqual(
    database.prepare("SELECT source_revision, epoch_id, meter_id, enabled FROM meter_sources ORDER BY source_revision").all(),
    [
      { source_revision: 1, epoch_id: "epoch-1", meter_id: "meter-1", enabled: 0 },
      { source_revision: 2, epoch_id: "epoch-2", meter_id: "meter-2", enabled: 1 }
    ]
  );
  assert.throws(
    () => saveMeterSource(database, { ...replacement, meterId: "meter-3", sourceRevision: 1, epochId: "epoch-3" }, {
      actor: "management",
      reason: "stale-replacement"
    }),
    /E1_SOURCE_REVISION_STALE/
  );
  assert.throws(
    () => saveMeterSource(database, { ...replacement, meterId: "meter-3", sourceRevision: 3, epochId: "epoch-1" }, {
      actor: "management",
      reason: "reused-epoch"
    }),
    /E1_SOURCE_EPOCH_REUSED/
  );
  database.close();
});

test("semantic correction for the same physical meter may keep its epoch with a newer revision", () => {
  const database = createDatabase();
  saveMeterSource(database, mainSource);
  const corrected = saveMeterSource(database, {
    ...mainSource,
    sourceRevision: 2,
    energyFlowRole: "grid-import"
  }, { actor: "management", reason: "correct-energy-role" });
  assert.equal(corrected.epochId, mainSource.epochId);
  assert.equal(corrected.sourceRevision, 2);
  assert.equal(corrected.energyFlowRole, "grid-import");
  assert.deepEqual(
    database.prepare("SELECT source_revision, epoch_id, energy_flow_role, enabled FROM meter_sources ORDER BY source_revision").all(),
    [
      { source_revision: 1, epoch_id: "epoch-1", energy_flow_role: "consumption", enabled: 0 },
      { source_revision: 2, epoch_id: "epoch-1", energy_flow_role: "grid-import", enabled: 1 }
    ]
  );
  database.close();
});

test("each D5 source semantic change rejects revision reuse and preserves the old live/history", () => {
  const changes: Array<{ name: string; change: Partial<MeterSourceDefinition> }> = [
    { name: "metric key", change: { metricKey: "gridImportEnergy" } },
    { name: "measurement kind", change: { measurementKind: "power-gauge", inputUnit: "kW" } },
    { name: "energy flow role", change: { energyFlowRole: "generation" } },
    { name: "input unit", change: { inputUnit: "Wh" } },
    { name: "scale", change: { scaleDecimal: "2" } },
    { name: "source timezone", change: { sourceTimestampTimeZone: "Asia/Taipei" } },
    { name: "timestamp policy", change: { timestampPolicy: "allow-receive-time-estimate" } }
  ];

  for (const { name, change } of changes) {
    const database = createDatabase();
    saveMeterSource(database, mainSource);
    seedAcceptedReading(database, mainSource, "10100", "2026-09-01T00:00:00Z", "2026-09-01T00:00:01Z");

    assert.throws(
      () => saveMeterSource(database, { ...mainSource, ...change }, {
        actor: "management",
        reason: `reject-${name}`
      }),
      (error: Error & { code?: string; statusCode?: number }) => error.code === "E1_SOURCE_REVISION_REUSED" && error.statusCode === 409
    );
    assert.equal((database.prepare("SELECT COUNT(*) AS count FROM meter_sources").get() as { count: number }).count, 1);

    const replacement = saveMeterSource(database, {
      ...mainSource,
      ...change,
      sourceRevision: 2
    }, {
      actor: "management",
      reason: `apply-${name}`
    });
    for (const [key, value] of Object.entries(change)) {
      assert.equal(replacement[key as keyof MeterSourceDefinition], value, name);
    }
    assert.equal(replacement.epochId, mainSource.epochId, name);
    assert.equal((database.prepare("SELECT COUNT(*) AS count FROM meter_readings_accepted").get() as { count: number }).count, 1, name);
    assert.equal(
      (database.prepare("SELECT live_value_kwh FROM meter_live_state WHERE source_revision = 1").get() as { live_value_kwh: string }).live_value_kwh,
      "10100",
      name
    );
    assert.deepEqual(
      database.prepare("SELECT source_revision, enabled FROM meter_sources ORDER BY source_revision").all(),
      [{ source_revision: 1, enabled: 0 }, { source_revision: 2, enabled: 1 }],
      name
    );
    database.close();
  }
});

test("enabled metric keys are owned by one channel per scope while CL and KN stay isolated", () => {
  const database = createDatabase();
  saveMeterSource(database, mainSource);
  assert.throws(
    () => saveMeterSource(database, { ...mainSource, channelId: "other", meterId: "meter-2", epochId: "epoch-2" }, {
      actor: "management",
      reason: "duplicate-primary"
    }),
    (error: Error & { code?: string; statusCode?: number }) => error.code === "E1_SOURCE_METRIC_KEY_CONFLICT" && error.statusCode === 409
  );
  const kn = saveMeterSource(database, { ...mainSource, metricScope: "kn", channelId: "other", meterId: "meter-kn", epochId: "epoch-kn" });
  assert.equal(kn.metricScope, "kn");
  assert.equal(listMeterSources(database, "cl").length, 1);
  assert.equal(listMeterSources(database, "kn").length, 1);
  database.close();
});

test("receive-time estimate approval requires context even for initial registration", () => {
  const database = createDatabase();
  assert.throws(
    () => saveMeterSource(database, { ...mainSource, timestampPolicy: "allow-receive-time-estimate" }),
    /E1_SOURCE_AUDIT_CONTEXT_REQUIRED/
  );
  assert.equal((database.prepare("SELECT COUNT(*) AS count FROM meter_sources").get() as { count: number }).count, 0);
  const approved = saveMeterSource(database, { ...mainSource, timestampPolicy: "allow-receive-time-estimate" }, {
    actor: "management",
    reason: "approve-receive-estimate"
  });
  assert.equal(approved.timestampPolicy, "allow-receive-time-estimate");
  database.close();
});

test("source and audit writes roll back together when the audit append fails", () => {
  const database = createDatabase();
  saveMeterSource(database, mainSource);
  database.exec(`
    CREATE TRIGGER reject_meter_source_audit
    BEFORE INSERT ON meter_source_audit
    BEGIN
      SELECT RAISE(ABORT, 'audit write rejected');
    END;
  `);
  assert.throws(
    () => saveMeterSource(database, { ...mainSource, displayNameEn: "Should Roll Back" }, {
      actor: "management",
      reason: "rollback-check"
    }),
    /audit write rejected/
  );
  assert.equal(getMeterSource(database, "cl", "main")?.displayNameEn, "Main");
  assert.equal((database.prepare("SELECT COUNT(*) AS count FROM meter_sources").get() as { count: number }).count, 1);
  assert.equal((database.prepare("SELECT COUNT(*) AS count FROM meter_source_audit").get() as { count: number }).count, 1);
  database.close();
});
