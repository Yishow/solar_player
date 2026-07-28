import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-factory-generation-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");

const [{ migrateDatabase }, { seedDatabase }, { getDatabase, closeDatabaseConnection }, aggregateService] = await Promise.all([
  import("../db/migrate.js"),
  import("../db/seed.js"),
  import("../db/index.js"),
  import("./factoryGenerationAggregateService.js")
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
  database.prepare("UPDATE mqtt_settings SET message_timeout = ?").run(timeoutSeconds);
  return database;
}

function insertFactorySummary(
  factory: "cl" | "kn",
  summary: { today_mwh: number; month_mwh: number; total_mwh?: number; timestamp: string }
) {
  const database = getDatabase();
  const insert = database.prepare(`
    INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES (?, ?, 'MWh', CURRENT_TIMESTAMP, 'good', ?)
  `);
  const rawPayload = JSON.stringify(summary);
  insert.run(`factoryGeneration.${factory}.todayMwh`, summary.today_mwh, rawPayload);
  insert.run(`factoryGeneration.${factory}.monthMwh`, summary.month_mwh, rawPayload);
  if (summary.total_mwh !== undefined) {
    insert.run(`factoryGeneration.${factory}.totalMwh`, summary.total_mwh, rawPayload);
  }
}

function readCanonicalRows() {
  return getDatabase()
    .prepare(
      `
        SELECT metric_key, value, unit, timestamp, quality
        FROM live_metric_values
        WHERE metric_key IN ('todayGeneration', 'monthGeneration', 'totalGeneration')
        ORDER BY metric_key
      `
    )
    .all();
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
    INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP, 'good', ?)
  `);
  insert.run("factoryGeneration.cl.todayMwh", 3490, "kWh", payload);
  insert.run("factoryGeneration.cl.monthMwh", 366.93, "MWh", payload);
  insert.run("factoryGeneration.cl.totalMwh", 9986.306, "MWh", payload);

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
    INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES ('totalGeneration', 13645.876, 'MWh', '2026-06-26T15:37:00+08:00', 'good', '{}')
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
    database.prepare("SELECT value FROM live_metric_values WHERE metric_key = 'totalGeneration'").pluck().get(),
    13645.876
  );
  assert.equal(database.prepare("SELECT value FROM live_metric_values WHERE metric_key = 'todayGeneration'").get(), undefined);
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
    INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES ('totalGeneration', 13645.876, 'MWh', '2026-06-26T15:37:55+08:00', 'good', '{}')
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
    database.prepare("SELECT value FROM live_metric_values WHERE metric_key = 'totalGeneration'").pluck().get(),
    13645.876
  );
  assert.equal(database.prepare("SELECT value FROM live_metric_values WHERE metric_key = 'todayGeneration'").get(), undefined);
});

test("persisted cumulative counter rejects a lower aggregate when the canonical live row is absent", () => {
  const database = resetDatabase();
  database.prepare(`
    INSERT INTO cumulative_counters (metric_key, total_value, last_updated, reset_count)
    VALUES ('generation', 13645876, '2026-06-26T15:37:55+08:00', 0)
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
    database.prepare("SELECT total_value FROM cumulative_counters WHERE metric_key = 'generation'").pluck().get(),
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
    ["factoryGeneration.cl.todayMwh", 4],
    ["factoryGeneration.cl.monthMwh", 370],
    ["factoryGeneration.cl.totalMwh", 9000]
  ] as const) {
    database
      .prepare("UPDATE live_metric_values SET value = ?, raw_payload = ? WHERE metric_key = ?")
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
      .prepare("SELECT value FROM live_metric_values WHERE metric_key = 'factoryGeneration.cl.acceptedTotalMwh'")
      .pluck()
      .get(),
    9986.306
  );
});

test("explicit baseline reset atomically accepts the confirmed current regression", () => {
  const database = resetDatabase();
  database.prepare("DELETE FROM cumulative_counters WHERE metric_key = 'generation'").run();
  database.prepare(`
    INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES ('totalGeneration', 13645.876, 'MWh', '2026-06-26T15:37:55+08:00', 'good', '{}')
  `).run();
  database.prepare(`
    INSERT INTO cumulative_counters (metric_key, total_value, last_updated, reset_count)
    VALUES ('generation', 13645876, '2026-06-26T15:37:55+08:00', 2)
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
    database.prepare(
      "SELECT total_value, reset_count FROM cumulative_counters WHERE metric_key = 'generation'"
    ).get(),
    { reset_count: 3, total_value: 11659570 }
  );
  assert.equal(
    database.prepare(
      "SELECT value FROM live_metric_values WHERE metric_key = 'factoryGeneration.cl.acceptedTotalMwh'"
    ).pluck().get(),
    8000
  );
  assert.equal(
    database.prepare(
      "SELECT value FROM live_metric_values WHERE metric_key = 'factoryGeneration.kn.acceptedTotalMwh'"
    ).pluck().get(),
    3659.57
  );
});

test("explicit baseline reset rejects a stale confirmation without mutating accepted values", () => {
  const database = resetDatabase();
  database.prepare("DELETE FROM cumulative_counters WHERE metric_key = 'generation'").run();
  database.prepare(`
    INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES ('totalGeneration', 13645.876, 'MWh', '2026-06-26T15:37:55+08:00', 'good', '{}')
  `).run();
  database.prepare(`
    INSERT INTO cumulative_counters (metric_key, total_value, last_updated, reset_count)
    VALUES ('generation', 13645876, '2026-06-26T15:37:55+08:00', 2)
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
    database.prepare("SELECT value FROM live_metric_values WHERE metric_key = 'totalGeneration'").pluck().get(),
    13645.876
  );
  assert.deepEqual(
    database.prepare(
      "SELECT total_value, reset_count FROM cumulative_counters WHERE metric_key = 'generation'"
    ).get(),
    { reset_count: 2, total_value: 13645876 }
  );
});

test("explicit baseline reset rejects non-regression and unavailable source states", () => {
  const database = resetDatabase();
  database.prepare("DELETE FROM cumulative_counters WHERE metric_key = 'generation'").run();
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
    WHERE metric_key LIKE 'factoryGeneration.kn.%'
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
