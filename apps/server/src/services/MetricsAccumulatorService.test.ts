import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import type { LiveMetricsSnapshot } from "../metrics/liveMetrics.js";
import { MetricsAccumulatorService } from "./MetricsAccumulatorService.js";

function createDatabase() {
  const database = new Database(":memory:");
  const migration001 = readFileSync(
    resolve(process.cwd(), "src/db/migrations/001_init.sql"),
    "utf8"
  );
  const migration003 = readFileSync(
    resolve(process.cwd(), "src/db/migrations/003_history.sql"),
    "utf8"
  );
  const migration015 = readFileSync(
    resolve(process.cwd(), "src/db/migrations/015_calculation_settings.sql"),
    "utf8"
  );
  const migration016 = readFileSync(
    resolve(process.cwd(), "src/db/migrations/016_co2_display_preference.sql"),
    "utf8"
  );

  database.exec(migration001);
  database.exec(migration003);
  database.exec(migration015);
  database.exec(migration016);
  database
    .prepare(
      `
        INSERT INTO calculation_settings (
          id,
          carbon_emission_factor,
          tree_equivalent_factor,
          co2_auto_convert_small_to_kg,
          household_daily_usage_kwh,
          household_monthly_usage_kwh,
          estimated_tariff_per_kwh,
          created_at,
          updated_at
        )
        VALUES (1, 0.5, 2.6, 0, 4, 120, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `
    )
    .run();

  return database;
}

function buildSnapshot(
  entries: Array<[metricKey: string, value: number, unit: string]>,
  timestamp: string
): LiveMetricsSnapshot {
  return {
    metrics: Object.fromEntries(
      entries.map(([metricKey, value, unit]) => [
        metricKey,
        {
          quality: "good",
          timestamp,
          unit,
          value
        }
      ])
    ),
    timestamp
  };
}

test("MetricsAccumulatorService prefers total metrics, integrates power fallback, skips long gaps, and throttles DB writes", () => {
  const database = createDatabase();
  const emitted: Array<{ reason: string; scope: string }> = [];

  database
    .prepare(
      `
        INSERT INTO cumulative_counters (metric_key, total_value, last_updated, reset_count)
        VALUES
          ('generation', 100, '2026-05-13T00:00:00.000Z', 0),
          ('co2', 50, '2026-05-13T00:00:00.000Z', 0)
      `
    )
    .run();

  const snapshots = [
    buildSnapshot(
      [
        ["totalGeneration", 120, "kWh"],
        ["consumptionEnergy", 40, "kWh"],
        ["selfConsumptionEnergy", 30, "kWh"],
        ["realTimePower", 500, "kW"],
        ["systemEfficiency", 97.2, "%"]
      ],
      "2026-05-13T09:00:00.000Z"
    ),
    buildSnapshot(
      [
        ["realTimePower", 600, "kW"],
        ["consumptionEnergy", 42, "kWh"],
        ["selfConsumptionEnergy", 31, "kWh"],
        ["systemEfficiency", 96.8, "%"]
      ],
      "2026-05-13T09:02:00.000Z"
    ),
    buildSnapshot(
      [
        ["realTimePower", 700, "kW"],
        ["systemEfficiency", 96.1, "%"]
      ],
      "2026-05-13T09:10:30.000Z"
    )
  ];
  let snapshotIndex = 0;

  const service = new MetricsAccumulatorService({
    database,
    emitDisplaySync: (payload) => {
      emitted.push({ reason: payload.reason, scope: payload.scope });
    },
    flushIntervalMs: 30_000,
    readSnapshot: () => snapshots[snapshotIndex]!
  });

  service.initialize();
  service.processAt(new Date("2026-05-13T09:00:00.000Z"));

  assert.deepEqual(service.getCounters(), {
    co2: 60,
    consumption: 40,
    generation: 120,
    selfConsumption: 30
  });

  const afterFirstProcess = database
    .prepare("SELECT total_value FROM cumulative_counters WHERE metric_key = 'generation'")
    .get() as { total_value: number };
  assert.equal(afterFirstProcess.total_value, 100);

  snapshotIndex = 1;
  service.processAt(new Date("2026-05-13T09:02:00.000Z"));

  assert.deepEqual(service.getCounters(), {
    co2: 70,
    consumption: 42,
    generation: 140,
    selfConsumption: 31
  });

  snapshotIndex = 2;
  service.processAt(new Date("2026-05-13T09:10:30.000Z"));

  assert.deepEqual(service.getCounters(), {
    co2: 70,
    consumption: 42,
    generation: 140,
    selfConsumption: 31
  });

  service.flush(true);

  const persistedRows = database
    .prepare(
      `
        SELECT metric_key, total_value, reset_count
        FROM cumulative_counters
        ORDER BY metric_key ASC
      `
    )
    .all() as Array<{ metric_key: string; reset_count: number; total_value: number }>;

  assert.deepEqual(persistedRows, [
    { metric_key: "co2", reset_count: 0, total_value: 70 },
    { metric_key: "consumption", reset_count: 0, total_value: 42 },
    { metric_key: "generation", reset_count: 0, total_value: 140 },
    { metric_key: "selfConsumption", reset_count: 0, total_value: 31 }
  ]);
  assert.deepEqual(emitted, [{ reason: "metrics-counters-flushed", scope: "monitoring-history" }]);

  database.close();
});

test("MetricsAccumulatorService normalizes energy totals to kWh before persisting cumulative counters", () => {
  const database = createDatabase();
  const timestamp = "2026-06-29T08:50:57.000Z";

  const service = new MetricsAccumulatorService({
    database,
    readSnapshot: () =>
      buildSnapshot(
        [
          ["totalGeneration", 419.41, "mWh"],
          ["consumptionEnergy", 12.5, "MWh"],
          ["selfConsumptionEnergy", 2.0, "kWh"]
        ],
        timestamp
      )
  });

  service.initialize();
  service.processAt(new Date(timestamp));
  service.flush(true);

  const persistedRows = database
    .prepare(
      `
        SELECT metric_key, total_value
        FROM cumulative_counters
        ORDER BY metric_key ASC
      `
    )
    .all() as Array<{ metric_key: string; total_value: number }>;

  assert.deepEqual(persistedRows, [
    { metric_key: "co2", total_value: 209705 },
    { metric_key: "consumption", total_value: 12500 },
    { metric_key: "generation", total_value: 419410 },
    { metric_key: "selfConsumption", total_value: 2 }
  ]);

  database.close();
});

test("MetricsAccumulatorService persists the canonical CL plus KN total and derives CO2 from the configured factor", () => {
  const database = createDatabase();
  const timestamp = "2026-06-26T15:37:55+08:00";
  database
    .prepare("UPDATE calculation_settings SET carbon_emission_factor = 0.495 WHERE id = 1")
    .run();

  const service = new MetricsAccumulatorService({
    database,
    readSnapshot: () =>
      buildSnapshot(
        [
          ["totalGeneration", 13645.876, "MWh"],
          ["factoryGeneration.cl.totalMwh", 999999, "MWh"],
          ["factoryGeneration.kn.totalMwh", 999999, "MWh"],
          ["totalCo2Reduction", 999999, "t"]
        ],
        timestamp
      )
  });

  service.initialize();
  service.processAt(new Date(timestamp));
  service.flush(true);

  assert.deepEqual(service.getCounters(), {
    co2: 6754708.62,
    consumption: 0,
    generation: 13645876,
    selfConsumption: 0
  });

  database.close();
});

test("MetricsAccumulatorService derives cumulative CO2 from normalized generation when external CO2 is inconsistent", () => {
  const database = createDatabase();
  const timestamp = "2026-07-09T05:35:46.000Z";

  database
    .prepare("UPDATE calculation_settings SET carbon_emission_factor = 0.467 WHERE id = 1")
    .run();

  const service = new MetricsAccumulatorService({
    database,
    readSnapshot: () =>
      buildSnapshot(
        [
          ["totalGeneration", 2.716, "mWh"],
          ["totalCo2Reduction", 9857.49, "t"]
        ],
        timestamp
      )
  });

  service.initialize();
  service.processAt(new Date(timestamp));
  service.flush(true);

  const persistedRows = database
    .prepare(
      `
        SELECT metric_key, total_value
        FROM cumulative_counters
        WHERE metric_key IN ('generation', 'co2')
        ORDER BY metric_key ASC
      `
    )
    .all() as Array<{ metric_key: string; total_value: number }>;

  assert.deepEqual(persistedRows, [
    { metric_key: "co2", total_value: 1268.372 },
    { metric_key: "generation", total_value: 2716 }
  ]);

  database.close();
});

test("MetricsAccumulatorService restores persisted counters before a new MQTT reading arrives", () => {
  const database = createDatabase();
  database
    .prepare(
      `
        INSERT INTO cumulative_counters (metric_key, total_value, last_updated, reset_count)
        VALUES
          ('generation', 12346, '2026-07-16T06:00:00.000Z', 0),
          ('consumption', 2100, '2026-07-16T06:00:00.000Z', 1),
          ('selfConsumption', 2234, '2026-07-16T06:00:00.000Z', 1),
          ('co2', 6111.27, '2026-07-16T06:00:00.000Z', 1)
      `
    )
    .run();

  const service = new MetricsAccumulatorService({
    database,
    readSnapshot: () => ({ metrics: {}, timestamp: null })
  });

  service.initialize();

  assert.deepEqual(service.getCounters(), {
    co2: 6111.27,
    consumption: 2100,
    generation: 12346,
    selfConsumption: 2234
  });
  assert.deepEqual(service.getLatestSnapshot(), {
    capturedAt: null,
    co2: 6111.27,
    consumption: 2100,
    consumptionPower: null,
    efficiency: null,
    generation: 12346,
    generationPower: null,
    ratio: 18.09,
    selfConsumption: 2234
  });

  database.close();
});

test("MetricsAccumulatorService preserves a newer persisted reset during an immediate forced flush", () => {
  const database = createDatabase();
  database.prepare(`
    INSERT INTO cumulative_counters (metric_key, total_value, last_updated, reset_count)
    VALUES ('generation', 2000000, '2026-07-17T05:00:00.000Z', 4)
  `).run();
  const service = new MetricsAccumulatorService({
    database,
    readSnapshot: () => ({ metrics: {}, timestamp: null })
  });
  service.initialize();

  database.prepare(`
    UPDATE cumulative_counters
    SET total_value = 1100000,
        last_updated = '2026-07-17T05:01:00.000Z',
        reset_count = 5
    WHERE metric_key = 'generation'
  `).run();

  service.flush(true);

  assert.deepEqual(
    database.prepare(`
      SELECT total_value, reset_count
      FROM cumulative_counters
      WHERE metric_key = 'generation'
    `).get(),
    { reset_count: 5, total_value: 1100000 }
  );
  assert.equal(service.getCounters().generation, 1100000);

  database.close();
});
