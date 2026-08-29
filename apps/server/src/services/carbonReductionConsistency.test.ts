import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";
import { formatMonitoringValue } from "@solar-display/shared";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-carbon-reduction-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
const databasePath = process.env.DATABASE_PATH;

const [
  { closeDatabaseConnection, getDatabase },
  { migrateDatabase },
  { seedDatabase },
  { readDisplayStory }
] = await Promise.all([
  import("../db/index.js"),
  import("../db/migrate.js"),
  import("../db/seed.js"),
  import("./displayStoryService.js")
]);

function removeDatabaseFiles() {
  if (!databasePath) {
    return;
  }

  rmSync(databasePath, { force: true });
  rmSync(`${databasePath}-shm`, { force: true });
  rmSync(`${databasePath}-wal`, { force: true });
}

beforeEach(() => {
  closeDatabaseConnection();
  removeDatabaseFiles();
  migrateDatabase();
  seedDatabase();
});

after(() => {
  closeDatabaseConnection();
  rmSync(tempDir, { force: true, recursive: true });
});

test("overview and solar carbon cards derive the same values from generation and the configured factor", () => {
  const database = getDatabase();
  const timestamp = "2026-06-29T10:00:00.000Z";

  database.prepare("DELETE FROM live_metric_values").run();
  database.prepare("DELETE FROM cumulative_counters").run();
  database
    .prepare(
      `
        UPDATE calculation_settings
        SET carbon_emission_factor = 0.5
        WHERE id = 1
      `
    )
    .run();

  database
    .prepare(
      `
        INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
        VALUES
          ('cl', 'realTimePower', 512, 'kW', ?, 'good', '{}'),
          ('cl', 'todayGeneration', 990, 'kWh', ?, 'good', '{}'),
          ('cl', 'totalGeneration', 2000, 'kWh', ?, 'good', '{}')
      `
    )
    .run(timestamp, timestamp, timestamp);
  database
    .prepare(
      `
        INSERT INTO cumulative_counters (metric_scope, metric_key, total_value, last_updated, reset_count)
        VALUES
          ('cl', 'generation', 2000, ?, 0)
      `
    )
    .run(timestamp);

  const { overview, solar } = readDisplayStory({ siteScope: "cl" });
  const overviewTodayCarbon = overview.metrics.find((metric) => metric.metricKey === "todayCo2Reduction");
  const overviewTotalCarbon = overview.metrics.find((metric) => metric.metricKey === "totalCo2Reduction");
  const solarTodayCarbon = solar.kpis.find((metric) => metric.metricKey === "todayCo2Reduction");
  const solarTotalCarbon = solar.kpis.find((metric) => metric.metricKey === "totalCo2Reduction");

  assert.equal(overviewTodayCarbon?.value, formatMonitoringValue(0.495, "t"));
  assert.equal(overviewTotalCarbon?.value, formatMonitoringValue(1, "t"));
  assert.equal(solarTodayCarbon?.value, formatMonitoringValue(0.495, "t"));
  assert.equal(solarTotalCarbon?.value, formatMonitoringValue(1, "t"));
});

test("overview and solar carbon cards switch sub-ton displays to kilograms when the preference is enabled", () => {
  const database = getDatabase();
  const timestamp = "2026-06-29T10:00:00.000Z";

  database.prepare("DELETE FROM live_metric_values").run();
  database.prepare("DELETE FROM cumulative_counters").run();
  database
    .prepare(
      `
        UPDATE calculation_settings
        SET carbon_emission_factor = 0.5,
            co2_auto_convert_small_to_kg = 1
        WHERE id = 1
      `
    )
    .run();

  database
    .prepare(
      `
        INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
        VALUES
          ('cl', 'realTimePower', 512, 'kW', ?, 'good', '{}'),
          ('cl', 'todayGeneration', 990, 'kWh', ?, 'good', '{}'),
          ('cl', 'totalGeneration', 2000, 'kWh', ?, 'good', '{}')
      `
    )
    .run(timestamp, timestamp, timestamp);
  database
    .prepare(
      `
        INSERT INTO cumulative_counters (metric_scope, metric_key, total_value, last_updated, reset_count)
        VALUES
          ('cl', 'generation', 2000, ?, 0)
      `
    )
    .run(timestamp);

  const { overview, solar } = readDisplayStory({ siteScope: "cl" });
  const overviewTodayCarbon = overview.metrics.find((metric) => metric.metricKey === "todayCo2Reduction");
  const overviewTotalCarbon = overview.metrics.find((metric) => metric.metricKey === "totalCo2Reduction");
  const solarTodayCarbon = solar.kpis.find((metric) => metric.metricKey === "todayCo2Reduction");
  const solarTotalCarbon = solar.kpis.find((metric) => metric.metricKey === "totalCo2Reduction");

  assert.equal(overviewTodayCarbon?.unit, "kg");
  assert.equal(overviewTodayCarbon?.value, "495");
  assert.equal(overviewTotalCarbon?.unit, "t");
  assert.equal(overviewTotalCarbon?.value, "1.0");
  assert.equal(solarTodayCarbon?.unit, "kg");
  assert.equal(solarTodayCarbon?.value, "495");
  assert.equal(solarTotalCarbon?.unit, "t");
  assert.equal(solarTotalCarbon?.value, "1.0");
});

test("overview and solar carbon cards preserve precision before converting small derived CO2 values to kilograms", () => {
  const database = getDatabase();
  const timestamp = "2026-07-09T05:35:46.000Z";

  database.prepare("DELETE FROM live_metric_values").run();
  database.prepare("DELETE FROM cumulative_counters").run();
  database
    .prepare(
      `
        UPDATE calculation_settings
        SET carbon_emission_factor = 0.467,
            co2_auto_convert_small_to_kg = 1
        WHERE id = 1
      `
    )
    .run();

  database
    .prepare(
      `
        INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
        VALUES
          ('cl', 'realTimePower', 538.64, 'kW', ?, 'good', '{}'),
          ('cl', 'todayGeneration', 2.716, 'kWh', ?, 'good', '{}'),
          ('cl', 'totalGeneration', 109.551, 'kWh', ?, 'good', '{}')
      `
    )
    .run(timestamp, timestamp, timestamp);
  database
    .prepare(
      `
        INSERT INTO cumulative_counters (metric_scope, metric_key, total_value, last_updated, reset_count)
        VALUES
          ('cl', 'generation', 109.551, ?, 0)
      `
    )
    .run(timestamp);

  const { overview, solar } = readDisplayStory({ siteScope: "cl" });
  const overviewTodayCarbon = overview.metrics.find((metric) => metric.metricKey === "todayCo2Reduction");
  const overviewTotalCarbon = overview.metrics.find((metric) => metric.metricKey === "totalCo2Reduction");
  const solarTodayCarbon = solar.kpis.find((metric) => metric.metricKey === "todayCo2Reduction");
  const solarTotalCarbon = solar.kpis.find((metric) => metric.metricKey === "totalCo2Reduction");

  assert.equal(overviewTodayCarbon?.unit, "kg");
  assert.equal(overviewTodayCarbon?.value, "1.27");
  assert.equal(overviewTotalCarbon?.unit, "kg");
  assert.equal(overviewTotalCarbon?.value, "51.2");
  assert.equal(solarTodayCarbon?.unit, "kg");
  assert.equal(solarTodayCarbon?.value, "1.27");
  assert.equal(solarTotalCarbon?.unit, "kg");
  assert.equal(solarTotalCarbon?.value, "51.2");
});

test("overview and solar carbon cards treat lower-case mWh as megawatt-hours", () => {
  const database = getDatabase();
  const timestamp = "2026-07-09T05:35:46.000Z";

  database.prepare("DELETE FROM live_metric_values").run();
  database.prepare("DELETE FROM cumulative_counters").run();
  database
    .prepare(
      `
        UPDATE calculation_settings
        SET carbon_emission_factor = 0.467,
            co2_auto_convert_small_to_kg = 1
        WHERE id = 1
      `
    )
    .run();

  database
    .prepare(
      `
        INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
        VALUES
          ('cl', 'realTimePower', 538.64, 'kW', ?, 'good', '{}'),
          ('cl', 'todayGeneration', 2.716, 'mWh', ?, 'good', '{}'),
          ('cl', 'totalGeneration', 2716, 'kWh', ?, 'good', '{}')
      `
    )
    .run(timestamp, timestamp, timestamp);
  database
    .prepare(
      `
        INSERT INTO cumulative_counters (metric_scope, metric_key, total_value, last_updated, reset_count)
        VALUES
          ('cl', 'generation', 2716, ?, 0)
      `
    )
    .run(timestamp);

  const { overview, solar } = readDisplayStory({ siteScope: "cl" });
  const overviewTodayCarbon = overview.metrics.find((metric) => metric.metricKey === "todayCo2Reduction");
  const overviewTotalCarbon = overview.metrics.find((metric) => metric.metricKey === "totalCo2Reduction");
  const solarTodayCarbon = solar.kpis.find((metric) => metric.metricKey === "todayCo2Reduction");
  const solarTotalCarbon = solar.kpis.find((metric) => metric.metricKey === "totalCo2Reduction");

  assert.equal(overviewTodayCarbon?.unit, "t");
  assert.equal(overviewTodayCarbon?.value, "1.27");
  assert.equal(overviewTotalCarbon?.unit, "t");
  assert.equal(overviewTotalCarbon?.value, "1.27");
  assert.equal(solarTodayCarbon?.unit, "t");
  assert.equal(solarTodayCarbon?.value, "1.27");
  assert.equal(solarTotalCarbon?.unit, "t");
  assert.equal(solarTotalCarbon?.value, "1.27");
});

test("overview and solar carbon cards fail closed when the generation basis is unavailable", () => {
  const database = getDatabase();
  const timestamp = "2026-06-29T10:00:00.000Z";

  database.prepare("DELETE FROM live_metric_values").run();
  database.prepare("DELETE FROM cumulative_counters").run();
  database
    .prepare(
      `
        INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
        VALUES ('cl', 'realTimePower', 512, 'kW', ?, 'good', '{}')
      `
    )
    .run(timestamp);

  const { overview, solar } = readDisplayStory({ siteScope: "cl" });
  const overviewTodayCarbon = overview.metrics.find((metric) => metric.metricKey === "todayCo2Reduction");
  const overviewTotalCarbon = overview.metrics.find((metric) => metric.metricKey === "totalCo2Reduction");
  const solarTodayCarbon = solar.kpis.find((metric) => metric.metricKey === "todayCo2Reduction");
  const solarTotalCarbon = solar.kpis.find((metric) => metric.metricKey === "totalCo2Reduction");

  assert.equal(overviewTodayCarbon?.value, "--");
  assert.equal(overviewTotalCarbon?.value, "--");
  assert.equal(solarTodayCarbon?.value, "--");
  assert.equal(solarTotalCarbon?.value, "--");
});
