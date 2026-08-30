import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";
import type { DerivedMetricDefinition } from "@solar-display/shared";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-factory-generation-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");

const [{ migrateDatabase }, { seedDatabase }, { getDatabase, closeDatabaseConnection }, aggregateService, registry] = await Promise.all([
  import("../db/migrate.js"),
  import("../db/seed.js"),
  import("../db/index.js"),
  import("./factoryGenerationAggregateService.js"),
  import("./derivedMetricRegistryService.js")
]);

migrateDatabase();
seedDatabase();

after(() => {
  closeDatabaseConnection();
  rmSync(tempDir, { force: true, recursive: true });
});

function resetDatabase(timeoutSeconds = 60) {
  const database = getDatabase();
  database.prepare("DELETE FROM live_metric_values").run();
  database.prepare("DELETE FROM derived_metric_evaluations").run();
  database.prepare("UPDATE mqtt_settings SET message_timeout = ?").run(timeoutSeconds);
  return database;
}

function insertFactorySummary(
  factory: "cl" | "kn",
  summary: { today_mwh: number; month_mwh: number; total_mwh?: number; timestamp: string }
) {
  const database = getDatabase();
  const insert = database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES (?, ?, ?, 'MWh', CURRENT_TIMESTAMP, 'good', ?)
  `);
  const rawPayload = JSON.stringify(summary);
  insert.run(factory, "factoryGeneration.todayMwh", summary.today_mwh, rawPayload);
  insert.run(factory, "factoryGeneration.monthMwh", summary.month_mwh, rawPayload);
  if (summary.total_mwh !== undefined) {
    insert.run(factory, "factoryGeneration.totalMwh", summary.total_mwh, rawPayload);
  }
}

const aggregateSourceFields = ["todayMwh", "monthMwh", "totalMwh"] as const;

function readCanonicalRows() {
  return getDatabase()
    .prepare(
      `
        SELECT metric_key, value, unit, timestamp, quality
        FROM live_metric_values
        WHERE metric_scope = 'global'
          AND metric_key IN ('todayGeneration', 'monthGeneration', 'totalGeneration')
        ORDER BY metric_key
      `
    )
    .all();
}

function aggregateUnrelatedDefinition(): DerivedMetricDefinition {
  return {
    description: "aggregate unrelated test definition",
    enabled: true,
    expression: "source * 2",
    fallbackPolicy: "unavailable",
    inputs: [{
      alias: "source",
      kind: "metric",
      metricKey: "realTimePower",
      scope: "output-site",
      unit: "kW"
    }],
    managed: false,
    metricKey: "custom.aggregateUnrelated",
    name: "custom.aggregateUnrelated",
    outputScopePolicy: "site",
    outputUnit: "kW",
    precision: 1,
    revision: 0
  };
}

function aggregateAcceptedDefinition(): DerivedMetricDefinition {
  return {
    description: "aggregate accepted total test definition",
    enabled: true,
    expression: "source * 2",
    fallbackPolicy: "unavailable",
    inputs: [{
      alias: "source",
      kind: "metric",
      metricKey: "factoryGeneration.acceptedTotalMwh",
      scope: "output-site",
      unit: "MWh"
    }],
    managed: false,
    metricKey: "custom.aggregateAccepted",
    name: "custom.aggregateAccepted",
    outputScopePolicy: "site",
    outputUnit: "MWh",
    precision: 1,
    revision: 0
  };
}

test("complete CL and KN summaries update canonical generation with the older source timestamp", () => {
  resetDatabase();
  insertFactorySummary("cl", {
    today_mwh: 3.49,
    month_mwh: 366.93,
    total_mwh: 9986.306,
    timestamp: "2026-06-26T15:38:10+08:00"
  });
  insertFactorySummary("kn", {
    today_mwh: 2.92,
    month_mwh: 265.77,
    total_mwh: 3659.570,
    timestamp: "2026-06-26T15:37:55+08:00"
  });

  const result = aggregateService.updateFactoryGenerationAggregate(
    getDatabase(),
    new Date("2026-06-26T15:38:20+08:00")
  );

  assert.deepEqual(result, {
    state: "ready",
    updatedAt: "2026-06-26T15:37:55+08:00",
    issues: []
  });
  assert.deepEqual(readCanonicalRows(), [
    { metric_key: "monthGeneration", value: 632.7, unit: "MWh", timestamp: "2026-06-26T15:37:55+08:00", quality: "good" },
    { metric_key: "todayGeneration", value: 6.41, unit: "MWh", timestamp: "2026-06-26T15:37:55+08:00", quality: "good" },
    { metric_key: "totalGeneration", value: 13645.876, unit: "MWh", timestamp: "2026-06-26T15:37:55+08:00", quality: "good" }
  ]);
});

test("factory aggregate updates only dependent registry nodes in ready and non-ready states", () => {
  const database = resetDatabase();
  database.prepare("DELETE FROM cumulative_counters").run();
  database.prepare("DELETE FROM topic_mappings").run();
  database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES ('cl', 'realTimePower', 5, 'kW', '2026-06-26T15:38:00+08:00', 'good', '{}')
  `).run();
  registry.initializeDerivedMetricRegistry(database);
  registry.saveDerivedMetricDefinition(aggregateUnrelatedDefinition(), database);
  const readUnrelatedRows = () => database.prepare(`
    SELECT * FROM derived_metric_evaluations
    WHERE metric_key = 'custom.aggregateUnrelated'
    ORDER BY metric_scope
  `).all();

  insertFactorySummary("cl", {
    today_mwh: 3.49,
    month_mwh: 366.93,
    total_mwh: 9986.306,
    timestamp: "2026-06-26T15:38:10+08:00"
  });
  registry.evaluateDerivedMetrics(database, new Date("2026-06-26T15:38:10+08:00"));
  const beforeNonReady = readUnrelatedRows();
  assert.equal(
    aggregateService.updateFactoryGenerationAggregate(
      database,
      new Date("2026-06-26T15:38:20+08:00")
    ).state,
    "missing"
  );
  assert.deepEqual(readUnrelatedRows(), beforeNonReady);

  insertFactorySummary("kn", {
    today_mwh: 2.92,
    month_mwh: 265.77,
    total_mwh: 3659.570,
    timestamp: "2026-06-26T15:37:55+08:00"
  });
  const beforeReady = readUnrelatedRows();
  assert.equal(
    aggregateService.updateFactoryGenerationAggregate(
      database,
      new Date("2026-06-26T15:38:20+08:00")
    ).state,
    "ready"
  );
  assert.deepEqual(readUnrelatedRows(), beforeReady);
});

test("factory aggregate updates accepted totals only for triggered factory scopes", () => {
  const database = resetDatabase();
  database.prepare("DELETE FROM cumulative_counters").run();
  database.prepare("DELETE FROM topic_mappings").run();
  registry.initializeDerivedMetricRegistry(database);
  registry.saveDerivedMetricDefinition(aggregateAcceptedDefinition(), database);
  insertFactorySummary("cl", {
    today_mwh: 3.49,
    month_mwh: 366.93,
    total_mwh: 9986.306,
    timestamp: "2026-06-26T15:38:10+08:00"
  });
  insertFactorySummary("kn", {
    today_mwh: 2.92,
    month_mwh: 265.77,
    total_mwh: 3659.570,
    timestamp: "2026-06-26T15:38:10+08:00"
  });
  const allSourceChanges = (["cl", "kn"] as const).flatMap((metricScope) =>
    aggregateSourceFields.map((suffix) => ({ metricScope, metricKey: `factoryGeneration.${suffix}` }))
  );
  aggregateService.updateFactoryGenerationAggregate(
    database,
    new Date("2026-06-26T15:38:20+08:00"),
    { changedMetrics: allSourceChanges }
  );
  const readKnAccepted = () => database.prepare(`
    SELECT * FROM live_metric_values
    WHERE metric_scope = 'kn' AND metric_key = 'factoryGeneration.acceptedTotalMwh'
  `).get();
  const readKnDerived = () => database.prepare(`
    SELECT * FROM derived_metric_evaluations
    WHERE metric_scope = 'kn' AND metric_key = 'custom.aggregateAccepted'
  `).get();
  const previousKnAccepted = readKnAccepted();
  const previousKnDerived = readKnDerived();

  const updatedPayload = JSON.stringify({
    month_mwh: 370,
    timestamp: "2026-06-26T15:38:20+08:00",
    today_mwh: 4,
    total_mwh: 9990
  });
  for (const [metricKey, value] of [
    ["factoryGeneration.todayMwh", 4],
    ["factoryGeneration.monthMwh", 370],
    ["factoryGeneration.totalMwh", 9990]
  ] as const) {
    database.prepare(`
      UPDATE live_metric_values
      SET value = ?, raw_payload = ?
      WHERE metric_scope = 'cl' AND metric_key = ?
    `).run(value, updatedPayload, metricKey);
  }

  aggregateService.updateFactoryGenerationAggregate(
    database,
    new Date("2026-06-26T15:38:25+08:00"),
    {
      changedMetrics: [
        { metricScope: "cl", metricKey: "factoryGeneration.todayMwh" },
        { metricScope: "cl", metricKey: "factoryGeneration.monthMwh" },
        { metricScope: "cl", metricKey: "factoryGeneration.totalMwh" }
      ]
    }
  );

  assert.deepEqual(readKnAccepted(), previousKnAccepted);
  assert.deepEqual(readKnDerived(), previousKnDerived);
});

test("factory aggregate reuses the cached registry after its first lazy initialization", () => {
  const database = resetDatabase();
  database.prepare("DELETE FROM cumulative_counters").run();
  database.prepare("DELETE FROM topic_mappings").run();
  insertFactorySummary("cl", {
    today_mwh: 3.49,
    month_mwh: 366.93,
    total_mwh: 9986.306,
    timestamp: "2026-06-26T15:38:10+08:00"
  });
  insertFactorySummary("kn", {
    today_mwh: 2.92,
    month_mwh: 265.77,
    total_mwh: 3659.570,
    timestamp: "2026-06-26T15:38:10+08:00"
  });
  aggregateService.updateFactoryGenerationAggregate(
    database,
    new Date("2026-06-26T15:38:20+08:00")
  );

  database.prepare(`
    INSERT INTO derived_metric_definitions (
      metric_key, name, description, output_scope_policy, expression, output_unit,
      precision, fallback_policy, enabled, managed, revision
    ) VALUES (
      'custom.cacheProbe', 'custom.cacheProbe', 'cache probe', 'site', 'source * 2', 'MWh',
      1, 'unavailable', 1, 0, 1
    )
  `).run();
  database.prepare(`
    INSERT INTO derived_metric_inputs (
      derived_metric_key, alias, input_kind, metric_key, scope_selector, unit, sort_order
    ) VALUES ('custom.cacheProbe', 'source', 'metric', 'factoryGeneration.totalMwh', 'output-site', 'MWh', 0)
  `).run();
  const updatedPayload = JSON.stringify({
    month_mwh: 370,
    timestamp: "2026-06-26T15:38:20+08:00",
    today_mwh: 4,
    total_mwh: 9990
  });
  database.prepare(`
    UPDATE live_metric_values
    SET value = 9990, raw_payload = ?
    WHERE metric_scope = 'cl' AND metric_key = 'factoryGeneration.totalMwh'
  `).run(updatedPayload);

  aggregateService.updateFactoryGenerationAggregate(
    database,
    new Date("2026-06-26T15:38:25+08:00"),
    { changedMetrics: [{ metricScope: "cl", metricKey: "factoryGeneration.totalMwh" }] }
  );

  assert.equal(registry.readDerivedMetricEvaluation("cl", "custom.cacheProbe", database), null);
});

test("factory summaries normalize today kWh while retaining monthly and cumulative MWh", () => {
  const database = resetDatabase();
  const timestamp = "2026-06-26T15:38:10+08:00";
  const payload = JSON.stringify({
    month_mwh: 366.93,
    timestamp,
    today_mwh: 3490,
    total_mwh: 9986.306
  });
  const insert = database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES ('cl', ?, ?, ?, CURRENT_TIMESTAMP, 'good', ?)
  `);
  insert.run("factoryGeneration.todayMwh", 3490, "kWh", payload);
  insert.run("factoryGeneration.monthMwh", 366.93, "MWh", payload);
  insert.run("factoryGeneration.totalMwh", 9986.306, "MWh", payload);

  const result = aggregateService.evaluateFactoryGenerationScope(
    database,
    "CL",
    new Date("2026-06-26T15:38:20+08:00")
  );

  assert.deepEqual(result, {
    state: "ready",
    updatedAt: timestamp,
    issues: [],
    values: {
      monthGeneration: 366.93,
      todayGeneration: 3.49,
      totalGeneration: 9986.306
    }
  });
});

test("stale KN summary retains the last complete canonical reading", () => {
  const database = resetDatabase(60);
  database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES ('global', 'totalGeneration', 13645.876, 'MWh', '2026-06-26T15:37:00+08:00', 'good', '{}')
  `).run();
  insertFactorySummary("cl", {
    today_mwh: 3.49,
    month_mwh: 366.93,
    total_mwh: 9986.306,
    timestamp: "2026-06-26T15:38:10+08:00"
  });
  insertFactorySummary("kn", {
    today_mwh: 2.92,
    month_mwh: 265.77,
    total_mwh: 3659.570,
    timestamp: "2026-06-26T15:37:19+08:00"
  });

  const result = aggregateService.updateFactoryGenerationAggregate(
    database,
    new Date("2026-06-26T15:38:20+08:00")
  );

  assert.equal(result.state, "stale");
  assert.deepEqual(result.issues, [{ factory: "KN", field: "summary", reason: "stale" }]);
  assert.equal(
    database.prepare("SELECT value FROM live_metric_values WHERE metric_scope = 'global' AND metric_key = 'totalGeneration'").pluck().get(),
    13645.876
  );
  assert.deepEqual(
    database.prepare(`
      SELECT status, failure_code, retained_last_good
      FROM derived_metric_evaluations
      WHERE metric_scope = 'global' AND metric_key = 'totalGeneration'
    `).get(),
    { status: "degraded", failure_code: "input-stale", retained_last_good: 1 }
  );
  assert.equal(database.prepare("SELECT value FROM live_metric_values WHERE metric_scope = 'global' AND metric_key = 'todayGeneration'").get(), undefined);
});

test("missing factory total blocks partial canonical generation", () => {
  const database = resetDatabase();
  insertFactorySummary("cl", {
    today_mwh: 3.49,
    month_mwh: 366.93,
    total_mwh: 9986.306,
    timestamp: "2026-06-26T15:38:10+08:00"
  });
  insertFactorySummary("kn", {
    today_mwh: 2.92,
    month_mwh: 265.77,
    timestamp: "2026-06-26T15:37:55+08:00"
  });

  const result = aggregateService.updateFactoryGenerationAggregate(
    database,
    new Date("2026-06-26T15:38:20+08:00")
  );

  assert.equal(result.state, "missing");
  assert.deepEqual(result.issues, [{ factory: "KN", field: "total_mwh", reason: "missing" }]);
  assert.deepEqual(readCanonicalRows(), []);
});

test("lower combined cumulative total is rejected as a regression", () => {
  const database = resetDatabase();
  database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES ('global', 'totalGeneration', 13645.876, 'MWh', '2026-06-26T15:37:55+08:00', 'good', '{}')
  `).run();
  insertFactorySummary("cl", {
    today_mwh: 1,
    month_mwh: 10,
    total_mwh: 8000,
    timestamp: "2026-06-26T15:39:10+08:00"
  });
  insertFactorySummary("kn", {
    today_mwh: 1,
    month_mwh: 10,
    total_mwh: 3659.570,
    timestamp: "2026-06-26T15:39:05+08:00"
  });

  const result = aggregateService.updateFactoryGenerationAggregate(
    database,
    new Date("2026-06-26T15:39:20+08:00")
  );

  assert.equal(result.state, "regression");
  assert.deepEqual(result.issues, [{ factory: "CL+KN", field: "total_mwh", reason: "regression" }]);
  assert.equal(
    database.prepare("SELECT value FROM live_metric_values WHERE metric_scope = 'global' AND metric_key = 'totalGeneration'").pluck().get(),
    13645.876
  );
  assert.equal(database.prepare("SELECT value FROM live_metric_values WHERE metric_scope = 'global' AND metric_key = 'todayGeneration'").get(), undefined);
  assert.deepEqual(
    database.prepare(
      "SELECT status, failure_code FROM derived_metric_evaluations WHERE metric_scope = 'global' AND metric_key = 'totalGeneration'"
    ).get(),
    { status: "degraded", failure_code: "acceptance-policy-rejected" }
  );
});

test("persisted cumulative counter rejects a lower aggregate when the canonical live row is absent", () => {
  const database = resetDatabase();
  database.prepare(`
    INSERT INTO cumulative_counters (metric_scope, metric_key, total_value, last_updated, reset_count)
    VALUES ('global', 'generation', 13645876, '2026-06-26T15:37:55+08:00', 0)
  `).run();
  insertFactorySummary("cl", {
    today_mwh: 1,
    month_mwh: 10,
    total_mwh: 8000,
    timestamp: "2026-06-26T15:39:10+08:00"
  });
  insertFactorySummary("kn", {
    today_mwh: 1,
    month_mwh: 10,
    total_mwh: 3659.57,
    timestamp: "2026-06-26T15:39:05+08:00"
  });

  const result = aggregateService.updateFactoryGenerationAggregate(
    database,
    new Date("2026-06-26T15:39:20+08:00")
  );

  assert.equal(result.state, "regression");
  assert.deepEqual(result.issues, [{ factory: "CL+KN", field: "total_mwh", reason: "regression" }]);
  assert.deepEqual(readCanonicalRows(), []);
  assert.equal(
    database.prepare("SELECT total_value FROM cumulative_counters WHERE metric_scope = 'global' AND metric_key = 'generation'").pluck().get(),
    13645876
  );
});

test("a lower single-factory cumulative total is rejected against its last accepted baseline", () => {
  const database = resetDatabase();
  insertFactorySummary("cl", {
    today_mwh: 3.49,
    month_mwh: 366.93,
    total_mwh: 9986.306,
    timestamp: "2026-06-26T15:38:10+08:00"
  });
  insertFactorySummary("kn", {
    today_mwh: 2.92,
    month_mwh: 265.77,
    total_mwh: 3659.57,
    timestamp: "2026-06-26T15:37:55+08:00"
  });
  aggregateService.updateFactoryGenerationAggregate(
    database,
    new Date("2026-06-26T15:38:20+08:00")
  );

  const lowerTimestamp = "2026-06-26T15:39:10+08:00";
  const lowerPayload = JSON.stringify({
    month_mwh: 370,
    timestamp: lowerTimestamp,
    today_mwh: 4,
    total_mwh: 9000
  });
  for (const [metricKey, value] of [
    ["factoryGeneration.todayMwh", 4],
    ["factoryGeneration.monthMwh", 370],
    ["factoryGeneration.totalMwh", 9000]
  ] as const) {
    database
      .prepare("UPDATE live_metric_values SET value = ?, raw_payload = ? WHERE metric_scope = 'cl' AND metric_key = ?")
      .run(value, lowerPayload, metricKey);
  }

  const evaluation = aggregateService.evaluateFactoryGenerationScope(
    database,
    "CL",
    new Date("2026-06-26T15:39:20+08:00")
  );

  assert.equal(evaluation.state, "regression");
  assert.deepEqual(evaluation.issues, [
    { factory: "CL", field: "total_mwh", reason: "regression" }
  ]);
  assert.equal(
    database
      .prepare("SELECT value FROM live_metric_values WHERE metric_scope = 'cl' AND metric_key = 'factoryGeneration.acceptedTotalMwh'")
      .pluck()
      .get(),
    9986.306
  );
});

test("explicit baseline reset atomically accepts the confirmed current regression", () => {
  const database = resetDatabase();
  database.prepare("DELETE FROM cumulative_counters WHERE metric_scope = 'global' AND metric_key = 'generation'").run();
  database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES ('global', 'totalGeneration', 13645.876, 'MWh', '2026-06-26T15:37:55+08:00', 'good', '{}')
  `).run();
  database.prepare(`
    INSERT INTO cumulative_counters (metric_scope, metric_key, total_value, last_updated, reset_count)
    VALUES ('global', 'generation', 13645876, '2026-06-26T15:37:55+08:00', 2)
  `).run();
  insertFactorySummary("cl", {
    today_mwh: 1,
    month_mwh: 10,
    total_mwh: 8000,
    timestamp: "2026-06-26T15:39:10+08:00"
  });
  insertFactorySummary("kn", {
    today_mwh: 1,
    month_mwh: 10,
    total_mwh: 3659.57,
    timestamp: "2026-06-26T15:39:05+08:00"
  });
  database.prepare(`
    INSERT OR REPLACE INTO live_metric_values (
      metric_scope, metric_key, value, unit, timestamp, quality, raw_payload
    ) VALUES
      ('global', 'selfConsumptionEnergy', 600, 'kWh', '2026-06-26T15:39:05+08:00', 'good', '{}'),
      ('global', 'consumptionEnergy', 1000, 'kWh', '2026-06-26T15:39:05+08:00', 'good', '{}')
  `).run();
  database.exec(`
    CREATE TEMP TABLE canonical_write_audit (metric_key TEXT NOT NULL);
    CREATE TEMP TRIGGER audit_canonical_insert
    AFTER INSERT ON live_metric_values
    WHEN NEW.metric_scope = 'global'
      AND NEW.metric_key IN (
        'todayGeneration',
        'monthGeneration',
        'totalGeneration',
        'sustainability.global.accumulatedCarbonReductionTons',
        'sustainability.global.annualEnergySavingPercent',
        'sustainability.global.plantedTreeEquivalent'
      )
    BEGIN
      INSERT INTO canonical_write_audit (metric_key) VALUES (NEW.metric_key);
    END;
    CREATE TEMP TRIGGER audit_canonical_update
    AFTER UPDATE ON live_metric_values
    WHEN NEW.metric_scope = 'global'
      AND NEW.metric_key IN (
        'todayGeneration',
        'monthGeneration',
        'totalGeneration',
        'sustainability.global.accumulatedCarbonReductionTons',
        'sustainability.global.annualEnergySavingPercent',
        'sustainability.global.plantedTreeEquivalent'
      )
    BEGIN
      INSERT INTO canonical_write_audit (metric_key) VALUES (NEW.metric_key);
    END;
  `);

  const result = aggregateService.resetFactoryGenerationBaseline(
    database,
    11659.57,
    new Date("2026-06-26T15:39:20+08:00")
  );

  assert.deepEqual(result, {
    acceptedTotalMwh: 11659.57,
    ok: true,
    previousTotalMwh: 13645.876,
    updatedAt: "2026-06-26T15:39:05+08:00"
  });
  assert.deepEqual(readCanonicalRows(), [
    { metric_key: "monthGeneration", value: 20, unit: "MWh", timestamp: "2026-06-26T15:39:05+08:00", quality: "good" },
    { metric_key: "todayGeneration", value: 2, unit: "MWh", timestamp: "2026-06-26T15:39:05+08:00", quality: "good" },
    { metric_key: "totalGeneration", value: 11659.57, unit: "MWh", timestamp: "2026-06-26T15:39:05+08:00", quality: "good" }
  ]);
  assert.deepEqual(
    database.prepare(`
      SELECT metric_key, COUNT(*) AS writes
      FROM canonical_write_audit
      GROUP BY metric_key
      ORDER BY metric_key
    `).all(),
    [
      { metric_key: "monthGeneration", writes: 1 },
      { metric_key: "sustainability.global.accumulatedCarbonReductionTons", writes: 1 },
      { metric_key: "sustainability.global.annualEnergySavingPercent", writes: 1 },
      { metric_key: "sustainability.global.plantedTreeEquivalent", writes: 1 },
      { metric_key: "todayGeneration", writes: 1 },
      { metric_key: "totalGeneration", writes: 1 }
    ]
  );
  assert.deepEqual(
    database.prepare(
      "SELECT total_value, reset_count FROM cumulative_counters WHERE metric_scope = 'global' AND metric_key = 'generation'"
    ).get(),
    { reset_count: 3, total_value: 11659570 }
  );
  assert.equal(
    database.prepare(
      "SELECT value FROM live_metric_values WHERE metric_scope = 'cl' AND metric_key = 'factoryGeneration.acceptedTotalMwh'"
    ).pluck().get(),
    8000
  );
  assert.equal(
    database.prepare(
      "SELECT value FROM live_metric_values WHERE metric_scope = 'kn' AND metric_key = 'factoryGeneration.acceptedTotalMwh'"
    ).pluck().get(),
    3659.57
  );
});

test("explicit baseline reset rejects a stale confirmation without mutating accepted values", () => {
  const database = resetDatabase();
  database.prepare("DELETE FROM cumulative_counters WHERE metric_scope = 'global' AND metric_key = 'generation'").run();
  database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES ('global', 'totalGeneration', 13645.876, 'MWh', '2026-06-26T15:37:55+08:00', 'good', '{}')
  `).run();
  database.prepare(`
    INSERT INTO cumulative_counters (metric_scope, metric_key, total_value, last_updated, reset_count)
    VALUES ('global', 'generation', 13645876, '2026-06-26T15:37:55+08:00', 2)
  `).run();
  insertFactorySummary("cl", {
    today_mwh: 1,
    month_mwh: 10,
    total_mwh: 8000,
    timestamp: "2026-06-26T15:39:10+08:00"
  });
  insertFactorySummary("kn", {
    today_mwh: 1,
    month_mwh: 10,
    total_mwh: 3659.57,
    timestamp: "2026-06-26T15:39:05+08:00"
  });

  const result = aggregateService.resetFactoryGenerationBaseline(
    database,
    11600,
    new Date("2026-06-26T15:39:20+08:00")
  );

  assert.deepEqual(result, {
    currentTotalMwh: 11659.57,
    ok: false,
    reason: "confirmation-mismatch"
  });
  assert.equal(
    database.prepare("SELECT value FROM live_metric_values WHERE metric_scope = 'global' AND metric_key = 'totalGeneration'").pluck().get(),
    13645.876
  );
  assert.deepEqual(
    database.prepare(
      "SELECT total_value, reset_count FROM cumulative_counters WHERE metric_scope = 'global' AND metric_key = 'generation'"
    ).get(),
    { reset_count: 2, total_value: 13645876 }
  );
});

test("explicit baseline reset rejects non-regression and unavailable source states", () => {
  const database = resetDatabase();
  database.prepare("DELETE FROM cumulative_counters WHERE metric_scope = 'global' AND metric_key = 'generation'").run();
  insertFactorySummary("cl", {
    today_mwh: 3.49,
    month_mwh: 366.93,
    total_mwh: 9986.306,
    timestamp: "2026-06-26T15:38:10+08:00"
  });
  insertFactorySummary("kn", {
    today_mwh: 2.92,
    month_mwh: 265.77,
    total_mwh: 3659.57,
    timestamp: "2026-06-26T15:37:55+08:00"
  });

  assert.deepEqual(
    aggregateService.resetFactoryGenerationBaseline(
      database,
      13645.876,
      new Date("2026-06-26T15:38:20+08:00")
    ),
    {
      currentTotalMwh: 13645.876,
      ok: false,
      reason: "not-regression"
    }
  );

  const stalePayload = JSON.stringify({
    month_mwh: 265.77,
    timestamp: "2026-06-26T15:36:00+08:00",
    today_mwh: 2.92,
    total_mwh: 3659.57
  });
  database.prepare(`
    UPDATE live_metric_values
    SET raw_payload = ?
    WHERE metric_scope = 'kn' AND metric_key LIKE 'factoryGeneration.%'
  `).run(stalePayload);

  assert.deepEqual(
    aggregateService.resetFactoryGenerationBaseline(
      database,
      13645.876,
      new Date("2026-06-26T15:38:20+08:00")
    ),
    { ok: false, reason: "source-not-ready" }
  );
  assert.deepEqual(readCanonicalRows(), []);
});
