import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";
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

test("readHouseholdEquivalenceCards derives today and cumulative household headlines from self-consumption bases", () => {
  const database = getDatabase();
  const today = "2026-05-21";

  database.prepare("DELETE FROM daily_energy_summaries").run();
  database
    .prepare(
      `
        INSERT INTO daily_energy_summaries (
          date,
          generation_total,
          consumption_total,
          self_consumption_total,
          co2_total,
          peak_generation,
          peak_generation_time,
          peak_consumption,
          peak_consumption_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(today, 120, 92, 72, 18, 30, `${today}T10:00:00.000Z`, 24, `${today}T11:00:00.000Z`);

  database.prepare("DELETE FROM cumulative_counters").run();
  database
    .prepare(
      `
        INSERT INTO cumulative_counters (metric_key, total_value, last_updated, reset_count)
        VALUES
          ('selfConsumption', 4200, '2026-05-21T10:00:00.000Z', 0)
      `
    )
    .run();

  const profile = createDefaultHouseholdEquivalenceCalcProfile();
  const cards = readHouseholdEquivalenceCards({
    now: new Date(`${today}T12:00:00.000Z`)
  });

  assert.equal(cards.today.householdCountDisplay, "18");
  assert.equal(cards.today.calcProfile?.label, profile.label);
  assert.equal(cards.today.provenance?.source, "daily-self-consumption");
  assert.equal(cards.today.derivedStatus, "available");

  assert.equal(cards.cumulative.householdCountDisplay, "35");
  assert.equal(cards.cumulative.calcProfile?.label, profile.label);
  assert.equal(cards.cumulative.provenance?.source, "cumulative-self-consumption");
  assert.equal(cards.cumulative.derivedStatus, "available");
});

test("readHouseholdEquivalenceCards fails closed when the daily self-consumption basis is unavailable", () => {
  const database = getDatabase();
  const today = "2026-05-21";

  database.prepare("DELETE FROM daily_energy_summaries").run();
  database
    .prepare(
      `
        INSERT INTO daily_energy_summaries (
          date,
          generation_total,
          consumption_total,
          self_consumption_total,
          co2_total,
          peak_generation,
          peak_generation_time,
          peak_consumption,
          peak_consumption_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(today, 120, 92, null, 18, 30, `${today}T10:00:00.000Z`, 24, `${today}T11:00:00.000Z`);

  database.prepare("DELETE FROM cumulative_counters").run();
  database
    .prepare(
      `
        INSERT INTO cumulative_counters (metric_key, total_value, last_updated, reset_count)
        VALUES
          ('selfConsumption', 4200, '2026-05-21T10:00:00.000Z', 0)
      `
    )
    .run();

  const cards = readHouseholdEquivalenceCards({
    now: new Date(`${today}T12:00:00.000Z`)
  });

  assert.equal(cards.today.derivedStatus, "unavailable");
  assert.equal(cards.today.householdCountDisplay, "--");
  assert.match(cards.today.supportingLine, /資料不足|不可用/);
  assert.equal(cards.cumulative.derivedStatus, "available");
});
