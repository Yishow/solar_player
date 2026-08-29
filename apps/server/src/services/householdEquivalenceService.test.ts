import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";
import type Database from "better-sqlite3";
import { setOnlyDefaultPlaybackPagesEnabledForTest } from "../testing/defaultPlaybackProfileTestSupport.js";
import { createDefaultHouseholdEquivalenceCalcProfile } from "@solar-display/shared";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-household-equivalence-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display-household-equivalence.sqlite");
const databasePath = process.env.DATABASE_PATH;

const [{ closeDatabaseConnection, getDatabase }, { migrateDatabase }, { seedDatabase }, { readHouseholdEquivalenceCards }] =
  await Promise.all([
    import("../db/index.js"),
    import("../db/migrate.js"),
    import("../db/seed.js"),
    import("./householdEquivalenceService.js")
  ]);

beforeEach(() => {
  closeDatabaseConnection();
  rmSync(databasePath, { force: true });
  rmSync(`${databasePath}-shm`, { force: true });
  rmSync(`${databasePath}-wal`, { force: true });
  migrateDatabase();
  seedDatabase();
});

after(() => {
  closeDatabaseConnection();
  rmSync(tempDir, { force: true, recursive: true });
});

function setHouseholdCalculationSettings(
  database: Database.Database,
  settings: {
    dailyUsageKwh: number;
    monthlyUsageKwh: number;
    tariffPerKwh: number;
  }
) {
  database
    .prepare(
      `
        UPDATE calculation_settings
        SET household_daily_usage_kwh = ?,
            household_monthly_usage_kwh = ?,
            estimated_tariff_per_kwh = ?
        WHERE id = 1
      `
    )
    .run(settings.dailyUsageKwh, settings.monthlyUsageKwh, settings.tariffPerKwh);
}

function arrangeChungliFactorySummary(
  database: Database.Database,
  summary: {
    monthMwh: number;
    timestamp: string;
    todayMwh: number;
    totalMwh: number;
  }
) {
  setOnlyDefaultPlaybackPagesEnabledForTest(database, ["factory-circuit"]);
  database.prepare("DELETE FROM live_metric_values WHERE metric_key LIKE 'factoryGeneration.%'").run();
  const rawPayload = JSON.stringify({
    month_mwh: summary.monthMwh,
    timestamp: summary.timestamp,
    today_mwh: summary.todayMwh,
    total_mwh: summary.totalMwh
  });
  const insertLiveMetric = database.prepare(
    `
      INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
      VALUES ('cl', ?, ?, 'MWh', ?, 'good', ?)
    `
  );
  insertLiveMetric.run("factoryGeneration.todayMwh", summary.todayMwh, summary.timestamp, rawPayload);
  insertLiveMetric.run("factoryGeneration.monthMwh", summary.monthMwh, summary.timestamp, rawPayload);
  insertLiveMetric.run("factoryGeneration.totalMwh", summary.totalMwh, summary.timestamp, rawPayload);
}

test("readHouseholdEquivalenceCards derives today from self-consumption and cumulative from the active factory summary", () => {
  const database = getDatabase();
  const today = "2026-05-21";

  setHouseholdCalculationSettings(database, {
    dailyUsageKwh: 4,
    monthlyUsageKwh: 120,
    tariffPerKwh: 5
  });
  database.prepare("DELETE FROM daily_energy_summaries").run();
  database
    .prepare(
      `
        INSERT INTO daily_energy_summaries (
          metric_scope,
          date,
          generation_total,
          consumption_total,
          self_consumption_total,
          co2_total,
          peak_generation,
          peak_generation_time,
          peak_consumption,
          peak_consumption_time
        ) VALUES ('global', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(today, 120, 92, 72, 18, 30, `${today}T10:00:00.000Z`, 24, `${today}T11:00:00.000Z`);

  database.prepare("DELETE FROM cumulative_counters").run();
  database
    .prepare(
      `
        INSERT INTO cumulative_counters (metric_scope, metric_key, total_value, last_updated, reset_count)
        VALUES
          ('global', 'generation', 4200, '2026-05-21T10:00:00.000Z', 0)
      `
    )
    .run();
  arrangeChungliFactorySummary(database, {
    monthMwh: 1.2,
    timestamp: `${today}T12:00:00.000Z`,
    todayMwh: 0.12,
    totalMwh: 4.2
  });

  const profile = createDefaultHouseholdEquivalenceCalcProfile();
  const cards = readHouseholdEquivalenceCards({
    now: new Date(`${today}T12:00:00.000Z`)
  });

  assert.equal(cards.today.householdCountDisplay, "18");
  assert.equal(cards.today.calcProfile?.label, profile.label);
  assert.equal(cards.today.provenance?.source, "daily-self-consumption");
  assert.equal(cards.today.derivedStatus, "available");

  assert.equal(cards.cumulative.householdCountDisplay, "1,050");
  assert.equal(cards.cumulative.calcProfile?.label, profile.label);
  assert.equal(cards.cumulative.provenance?.source, "CL MQTT");
  assert.equal(cards.cumulative.provenance?.updatedAt, `${today}T12:00:00.000Z`);
  assert.equal(cards.cumulative.derivedStatus, "available");
});

test("readHouseholdEquivalenceCards derives cumulative households from the fresh Chungli summary", () => {
  const database = getDatabase();
  const now = new Date();
  const timestamp = now.toISOString();
  const summary = JSON.stringify({
    month_mwh: 2345,
    timestamp,
    today_mwh: 123.4,
    total_mwh: 45678
  });

  setHouseholdCalculationSettings(database, {
    dailyUsageKwh: 13,
    monthlyUsageKwh: 400,
    tariffPerKwh: 4.5
  });
  database.prepare("DELETE FROM live_metric_values").run();
  database.prepare("DELETE FROM cumulative_counters").run();
  setOnlyDefaultPlaybackPagesEnabledForTest(database, ["factory-circuit"]);
  const insertLiveMetric = database.prepare(
    `
      INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
      VALUES ('cl', ?, ?, 'MWh', ?, 'good', ?)
    `
  );
  insertLiveMetric.run("factoryGeneration.todayMwh", 123.4, timestamp, summary);
  insertLiveMetric.run("factoryGeneration.monthMwh", 2345, timestamp, summary);
  insertLiveMetric.run("factoryGeneration.totalMwh", 45678, timestamp, summary);
  database
    .prepare(
      `
        INSERT INTO cumulative_counters (metric_scope, metric_key, total_value, last_updated, reset_count)
        VALUES ('global', 'generation', 12350, ?, 0)
      `
    )
    .run(timestamp);

  const cards = readHouseholdEquivalenceCards({ now });

  assert.equal(cards.cumulative.householdCountDisplay, "3,513,692");
  assert.equal(cards.cumulative.provenance?.source, "CL MQTT");
  assert.equal(cards.cumulative.provenance?.updatedAt, timestamp);
});

test("readHouseholdEquivalenceCards does not fall back to the global counter when Chungli summary is stale", () => {
  const database = getDatabase();
  const now = new Date();
  const timestamp = new Date(now.getTime() - 120_000).toISOString();
  const summary = JSON.stringify({
    month_mwh: 2345,
    timestamp,
    today_mwh: 123.4,
    total_mwh: 45678
  });

  setHouseholdCalculationSettings(database, {
    dailyUsageKwh: 13,
    monthlyUsageKwh: 400,
    tariffPerKwh: 4.5
  });
  database.prepare("DELETE FROM live_metric_values").run();
  database.prepare("DELETE FROM cumulative_counters").run();
  database.prepare("UPDATE mqtt_settings SET message_timeout = 60").run();
  setOnlyDefaultPlaybackPagesEnabledForTest(database, ["factory-circuit"]);
  const insertLiveMetric = database.prepare(
    `
      INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
      VALUES ('cl', ?, ?, 'MWh', ?, 'good', ?)
    `
  );
  insertLiveMetric.run("factoryGeneration.todayMwh", 123.4, timestamp, summary);
  insertLiveMetric.run("factoryGeneration.monthMwh", 2345, timestamp, summary);
  insertLiveMetric.run("factoryGeneration.totalMwh", 45678, timestamp, summary);
  database
    .prepare(
      `
        INSERT INTO cumulative_counters (metric_scope, metric_key, total_value, last_updated, reset_count)
        VALUES ('global', 'generation', 12350, ?, 0)
      `
    )
    .run(timestamp);

  const cards = readHouseholdEquivalenceCards({ now });

  assert.equal(cards.cumulative.derivedStatus, "unavailable");
  assert.equal(cards.cumulative.householdCountDisplay, "--");
  assert.equal(cards.cumulative.provenance?.source, "CL MQTT");
});

test("readHouseholdEquivalenceCards derives cumulative household headline from cumulative generation on the daily usage basis", () => {
  const database = getDatabase();
  const today = "2026-07-09";

  setHouseholdCalculationSettings(database, {
    dailyUsageKwh: 13,
    monthlyUsageKwh: 400,
    tariffPerKwh: 4.5
  });
  database.prepare("DELETE FROM daily_energy_summaries").run();
  database
    .prepare(
      `
        INSERT INTO daily_energy_summaries (
          metric_scope,
          date,
          generation_total,
          consumption_total,
          self_consumption_total
        ) VALUES ('global', ?, 100, 80, 16)
      `
    )
    .run(today);
  database.prepare("DELETE FROM cumulative_counters").run();
  database
    .prepare(
      `
        INSERT INTO cumulative_counters (metric_scope, metric_key, total_value, last_updated, reset_count)
        VALUES
          ('global', 'generation', 114820, '2026-07-09T08:43:30.386Z', 0),
          ('global', 'selfConsumption', 22584, '2026-07-09T08:43:30.386Z', 0)
      `
    )
    .run();
  arrangeChungliFactorySummary(database, {
    monthMwh: 100,
    timestamp: "2026-07-09T12:00:00.000Z",
    todayMwh: 1,
    totalMwh: 114.82
  });

  const cards = readHouseholdEquivalenceCards({
    now: new Date(`${today}T12:00:00.000Z`)
  });

  assert.equal(cards.cumulative.householdCountDisplay, "8,832");
  assert.equal(cards.cumulative.basisSourceLabel, "累積發電量");
  assert.equal(cards.cumulative.provenance?.source, "CL MQTT");
  assert.equal(cards.cumulative.provenance?.updatedAt, "2026-07-09T12:00:00.000Z");
  assert.equal(cards.cumulative.supportingLine, "約相當於累積日用電");
});

test("readHouseholdEquivalenceCards falls back to live today generation when daily self-consumption is stale zero", () => {
  const database = getDatabase();

  setHouseholdCalculationSettings(database, {
    dailyUsageKwh: 13,
    monthlyUsageKwh: 400,
    tariffPerKwh: 4.5
  });
  database.prepare("DELETE FROM daily_energy_summaries").run();
  database
    .prepare(
      `
        INSERT INTO daily_energy_summaries (
          metric_scope,
          date,
          generation_total,
          consumption_total,
          self_consumption_total
        ) VALUES ('global', '2026-07-08', 0, 0, 0)
      `
    )
    .run();
  database.prepare("DELETE FROM cumulative_counters").run();
  database
    .prepare(
      `
        INSERT INTO cumulative_counters (metric_scope, metric_key, total_value, last_updated, reset_count)
        VALUES ('global', 'generation', 114820, '2026-07-09T08:43:30.386Z', 0)
      `
    )
    .run();
  database.prepare("DELETE FROM live_metric_values").run();
  database
    .prepare(
      `
        INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
        VALUES ('global', 'todayGeneration', 7.99, 'MWh', '2026-07-09T08:43:14.000Z', 'good', '{}')
      `
    )
    .run();

  const cards = readHouseholdEquivalenceCards({
    now: new Date("2026-07-09T12:00:00.000Z")
  });

  assert.equal(cards.today.householdCountDisplay, "615");
  assert.equal(cards.today.basisSourceLabel, "今日發電量");
  assert.equal(cards.today.provenance?.source, "live-today-generation-fallback");
  assert.equal(cards.today.provenance?.updatedAt, "2026-07-09T08:43:14.000Z");
});

test("readHouseholdEquivalenceCards fails closed when the daily self-consumption basis is unavailable", () => {
  const database = getDatabase();
  const today = "2026-05-21";

  setHouseholdCalculationSettings(database, {
    dailyUsageKwh: 4,
    monthlyUsageKwh: 120,
    tariffPerKwh: 5
  });
  database.prepare("DELETE FROM daily_energy_summaries").run();
  database
    .prepare(
      `
        INSERT INTO daily_energy_summaries (
          metric_scope,
          date,
          generation_total,
          consumption_total,
          self_consumption_total,
          co2_total,
          peak_generation,
          peak_generation_time,
          peak_consumption,
          peak_consumption_time
        ) VALUES ('global', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(today, 120, 92, null, 18, 30, `${today}T10:00:00.000Z`, 24, `${today}T11:00:00.000Z`);

  database.prepare("DELETE FROM cumulative_counters").run();
  database
    .prepare(
      `
        INSERT INTO cumulative_counters (metric_scope, metric_key, total_value, last_updated, reset_count)
        VALUES
          ('global', 'generation', 4200, '2026-05-21T10:00:00.000Z', 0)
      `
    )
    .run();
  arrangeChungliFactorySummary(database, {
    monthMwh: 1.2,
    timestamp: `${today}T12:00:00.000Z`,
    todayMwh: 0.12,
    totalMwh: 4.2
  });

  const cards = readHouseholdEquivalenceCards({
    now: new Date(`${today}T12:00:00.000Z`)
  });

  assert.equal(cards.today.derivedStatus, "unavailable");
  assert.equal(cards.today.householdCountDisplay, "--");
  assert.match(cards.today.supportingLine, /資料不足|不可用/);
  assert.equal(cards.cumulative.derivedStatus, "available");
  assert.equal(cards.cumulative.provenance?.source, "CL MQTT");
});

test("readHouseholdEquivalenceCards falls back to the latest daily summary when today has no row yet", () => {
  const database = getDatabase();
  const latestAvailable = "2026-05-21";

  setHouseholdCalculationSettings(database, {
    dailyUsageKwh: 4,
    monthlyUsageKwh: 120,
    tariffPerKwh: 5
  });
  database.prepare("DELETE FROM daily_energy_summaries").run();
  database
    .prepare(
      `
        INSERT INTO daily_energy_summaries (
          metric_scope,
          date,
          generation_total,
          consumption_total,
          self_consumption_total,
          co2_total,
          peak_generation,
          peak_generation_time,
          peak_consumption,
          peak_consumption_time
        ) VALUES ('global', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(
      latestAvailable,
      120,
      92,
      72,
      18,
      30,
      `${latestAvailable}T10:00:00.000Z`,
      24,
      `${latestAvailable}T11:00:00.000Z`
    );

  database.prepare("DELETE FROM cumulative_counters").run();
  database
    .prepare(
      `
        INSERT INTO cumulative_counters (metric_scope, metric_key, total_value, last_updated, reset_count)
        VALUES ('global', 'generation', 4200, '2026-05-21T10:00:00.000Z', 0)
      `
    )
    .run();

  const cards = readHouseholdEquivalenceCards({
    now: new Date("2026-05-22T12:00:00.000Z")
  });

  assert.equal(cards.today.householdCountDisplay, "18");
  assert.equal(cards.today.derivedStatus, "available");
  assert.equal(cards.today.provenance?.updatedAt, `${latestAvailable}T00:00:00.000Z`);
});

test("readHouseholdEquivalenceCards does not fall back to live total generation when the factory summary is missing", () => {
  const database = getDatabase();
  const today = "2026-05-21";

  setHouseholdCalculationSettings(database, {
    dailyUsageKwh: 4,
    monthlyUsageKwh: 120,
    tariffPerKwh: 5
  });
  setOnlyDefaultPlaybackPagesEnabledForTest(database, ["factory-circuit"]);
  database.prepare("DELETE FROM daily_energy_summaries").run();
  database
    .prepare(
      `
        INSERT INTO daily_energy_summaries (
          metric_scope,
          date,
          generation_total,
          consumption_total,
          self_consumption_total,
          co2_total,
          peak_generation,
          peak_generation_time,
          peak_consumption,
          peak_consumption_time
        ) VALUES ('global', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(today, 120, 92, 72, 18, 30, `${today}T10:00:00.000Z`, 24, `${today}T11:00:00.000Z`);
  database.prepare("DELETE FROM cumulative_counters").run();
  database.prepare("DELETE FROM live_metric_values").run();
  database
    .prepare(
      `
        INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
        VALUES ('global', 'totalGeneration', 4.2, 'MWh', ?, 'good', '{}')
      `
    )
    .run(`${today}T10:00:00.000Z`);

  const cards = readHouseholdEquivalenceCards({
    now: new Date(`${today}T12:00:00.000Z`)
  });

  assert.equal(cards.cumulative.derivedStatus, "unavailable");
  assert.equal(cards.cumulative.householdCountDisplay, "--");
  assert.equal(cards.cumulative.provenance?.source, "CL MQTT");
  assert.equal(cards.cumulative.provenance?.updatedAt, null);
});

test("readHouseholdEquivalenceCards uses configured household usage and tariff coefficients in the profile", () => {
  const database = getDatabase();
  const today = "2026-05-21";

  setHouseholdCalculationSettings(database, {
    dailyUsageKwh: 6,
    monthlyUsageKwh: 210,
    tariffPerKwh: 6.5
  });

  database.prepare("DELETE FROM daily_energy_summaries").run();
  database
    .prepare(
      `
        INSERT INTO daily_energy_summaries (
          metric_scope,
          date,
          generation_total,
          consumption_total,
          self_consumption_total,
          co2_total,
          peak_generation,
          peak_generation_time,
          peak_consumption,
          peak_consumption_time
        ) VALUES ('global', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(today, 120, 92, 72, 18, 30, `${today}T10:00:00.000Z`, 24, `${today}T11:00:00.000Z`);

  database.prepare("DELETE FROM cumulative_counters").run();
  database
    .prepare(
      `
        INSERT INTO cumulative_counters (metric_scope, metric_key, total_value, last_updated, reset_count)
        VALUES ('global', 'generation', 4200, '2026-05-21T10:00:00.000Z', 0)
      `
    )
    .run();
  arrangeChungliFactorySummary(database, {
    monthMwh: 1.2,
    timestamp: `${today}T12:00:00.000Z`,
    todayMwh: 0.12,
    totalMwh: 4.2
  });

  const cards = readHouseholdEquivalenceCards({
    now: new Date(`${today}T12:00:00.000Z`)
  });

  assert.equal(cards.today.householdCountDisplay, "12");
  assert.equal(cards.cumulative.householdCountDisplay, "700");
  assert.equal(cards.today.calcProfile?.averageDailyUsageKwh, 6);
  assert.equal(cards.cumulative.calcProfile?.averageMonthlyUsageKwh, 210);
  assert.equal(cards.today.calcProfile?.estimatedTariffPerKwh, 6.5);
  assert.match(cards.today.disclaimer, /6(\.0)? kWh/);
  assert.match(cards.cumulative.disclaimer, /210(\.0)? kWh/);
  assert.match(cards.today.disclaimer, /6\.5/);
});
