import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-mock-feed-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
const databasePath = process.env.DATABASE_PATH;

const [
  { closeDatabaseConnection, getDatabase },
  { migrateDatabase },
  { readLiveMetricsSnapshot },
  { MockMetricsFeedService, computeMockSolarPowerAt }
] = await Promise.all([
  import("../db/index.js"),
  import("../db/migrate.js"),
  import("../metrics/liveMetrics.js"),
  import("./MockMetricsFeedService.js")
]);

beforeEach(() => {
  closeDatabaseConnection();
  rmSync(databasePath, { force: true });
  rmSync(`${databasePath}-shm`, { force: true });
  rmSync(`${databasePath}-wal`, { force: true });
});

after(() => {
  closeDatabaseConnection();
  rmSync(tempDir, { force: true, recursive: true });
});

const at = (hour: number) => new Date(2026, 5, 9, hour, 0, 0);

test("computeMockSolarPowerAt forms a daily solar bell (midday peak, night zero)", () => {
  assert.equal(computeMockSolarPowerAt(at(0)), 0);
  assert.equal(computeMockSolarPowerAt(at(3)), 0);
  assert.equal(computeMockSolarPowerAt(at(23)), 0);

  const morning = computeMockSolarPowerAt(at(8));
  const noon = computeMockSolarPowerAt(at(12));
  const evening = computeMockSolarPowerAt(at(17));

  assert.ok(morning > 0, "daylight hours should be positive");
  assert.ok(noon > morning, "midday should exceed morning");
  assert.ok(noon > evening, "midday should exceed late afternoon");
});

test("writeReading upserts a realTimePower reading into live_metric_values", () => {
  migrateDatabase();
  const database = getDatabase();
  const service = new MockMetricsFeedService({
    database,
    now: () => at(12)
  });

  service.writeReading();

  const reading = readLiveMetricsSnapshot(database).metrics.realTimePower;
  assert.ok(reading, "expected a realTimePower reading to be written");
  assert.equal(reading.unit, "kW");
  assert.equal(reading.value, computeMockSolarPowerAt(at(12)));
  assert.ok(reading.value > 0);
});

test("writeReading keeps a single realTimePower row across repeated writes", () => {
  migrateDatabase();
  const database = getDatabase();
  const service = new MockMetricsFeedService({ database, now: () => at(12) });

  service.writeReading();
  service.writeReading();

  const count = (
    database
      .prepare("SELECT COUNT(*) AS count FROM live_metric_values WHERE metric_key = 'realTimePower'")
      .get() as { count: number }
  ).count;
  assert.equal(count, 1);
});
