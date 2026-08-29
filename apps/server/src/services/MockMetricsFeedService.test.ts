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
  { readScopedLiveMetricsSnapshot },
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
    metricScope: "cl",
    now: () => at(12)
  });

  service.writeReading();

  const reading = readScopedLiveMetricsSnapshot("cl", database).metrics.realTimePower;
  assert.ok(reading, "expected a realTimePower reading to be written");
  assert.equal(reading.unit, "kW");
  assert.equal(reading.value, computeMockSolarPowerAt(at(12)));
  assert.ok(reading.value > 0);
});

test("writeReading seeds a runtime-complete mock metric set for playback surfaces", () => {
  migrateDatabase();
  const database = getDatabase();
  const service = new MockMetricsFeedService({
    database,
    metricScope: "cl",
    now: () => at(12)
  });

  service.writeReading();

  const snapshot = readScopedLiveMetricsSnapshot("cl", database).metrics;
  const requiredMetricKeys = [
    "realTimePower",
    "todayGeneration",
    "totalGeneration",
    "todayCo2Reduction",
    "totalCo2Reduction",
    "consumptionEnergy",
    "selfConsumptionEnergy",
    "systemEfficiency",
    "factoryCircuit.stampingPower",
    "factoryCircuit.bodyPower",
    "factoryCircuit.paintingPower",
    "factoryCircuit.assemblyPower",
    "factoryCircuit.utilityPower",
    "factoryCircuit.officePower",
    "factoryCircuit.heavyVehiclePower",
    "factoryCircuit.edCoatingPower"
  ] as const;

  for (const metricKey of requiredMetricKeys) {
    assert.ok(snapshot[metricKey], `expected ${metricKey} to be written`);
  }

  assert.equal(snapshot.realTimePower?.unit, "kW");
  assert.equal(snapshot.todayGeneration?.unit, "kWh");
  assert.equal(snapshot.totalGeneration?.unit, "GWh");
  assert.equal(snapshot.todayCo2Reduction?.unit, "t");
  assert.equal(snapshot.totalCo2Reduction?.unit, "t");
  assert.equal(snapshot.consumptionEnergy?.unit, "kWh");
  assert.equal(snapshot.selfConsumptionEnergy?.unit, "kWh");
  assert.equal(snapshot.systemEfficiency?.unit, "%");

  const todayGeneration = snapshot.todayGeneration!.value;
  const totalGeneration = snapshot.totalGeneration!.value;
  const todayCo2Reduction = snapshot.todayCo2Reduction!.value;
  const totalCo2Reduction = snapshot.totalCo2Reduction!.value;
  const consumptionEnergy = snapshot.consumptionEnergy!.value;
  const selfConsumptionEnergy = snapshot.selfConsumptionEnergy!.value;
  const totalFactoryPower =
    snapshot["factoryCircuit.stampingPower"]!.value +
    snapshot["factoryCircuit.bodyPower"]!.value +
    snapshot["factoryCircuit.paintingPower"]!.value +
    snapshot["factoryCircuit.assemblyPower"]!.value +
    snapshot["factoryCircuit.utilityPower"]!.value +
    snapshot["factoryCircuit.officePower"]!.value +
    snapshot["factoryCircuit.heavyVehiclePower"]!.value +
    snapshot["factoryCircuit.edCoatingPower"]!.value;

  assert.ok(todayGeneration > 0, "expected daytime generation to be positive");
  assert.ok(totalGeneration > todayGeneration / 1000, "expected cumulative generation to exceed today's contribution");
  assert.ok(todayCo2Reduction > 0, "expected daytime carbon reduction to be positive");
  assert.ok(totalCo2Reduction > todayCo2Reduction, "expected cumulative carbon reduction to exceed today's contribution");
  assert.ok(consumptionEnergy >= selfConsumptionEnergy, "self-consumption cannot exceed total consumption");
  assert.ok(selfConsumptionEnergy > 0, "expected self-consumption energy to be positive");
  assert.ok(totalFactoryPower > 0, "expected factory slot power distribution to be positive");
  assert.ok(snapshot.systemEfficiency!.value >= 90 && snapshot.systemEfficiency!.value <= 100);

  const expectedTodayCo2Reduction = Number((todayGeneration * 0.494 / 1000).toFixed(2));
  assert.equal(todayCo2Reduction, expectedTodayCo2Reduction);
});

test("writeReading keeps a single realTimePower row across repeated writes", () => {
  migrateDatabase();
  const database = getDatabase();
  const service = new MockMetricsFeedService({ database, metricScope: "cl", now: () => at(12) });

  service.writeReading();
  service.writeReading();

  const realTimePowerCount = (
    database
      .prepare("SELECT COUNT(*) AS count FROM live_metric_values WHERE metric_scope = 'cl' AND metric_key = 'realTimePower'")
      .get() as { count: number }
  ).count;
  const totalCount = (
    database.prepare("SELECT COUNT(*) AS count FROM live_metric_values").get() as { count: number }
  ).count;
  assert.equal(realTimePowerCount, 1);
  assert.equal(totalCount, 16);
});

test("mock cumulative energy advances within a day and does not reset across local days", () => {
  migrateDatabase();
  const database = getDatabase();
  let current = new Date(2026, 5, 9, 12, 0, 0);
  const service = new MockMetricsFeedService({ database, metricScope: "cl", now: () => current });
  const readCumulativeEnergy = () => {
    const metrics = readScopedLiveMetricsSnapshot("cl", database).metrics;
    return {
      consumption: metrics.consumptionEnergy!.value,
      generation: metrics.totalGeneration!.value,
      selfConsumption: metrics.selfConsumptionEnergy!.value
    };
  };

  service.writeReading();
  const noon = readCumulativeEnergy();

  current = new Date(2026, 5, 9, 13, 0, 0);
  service.writeReading();
  const afternoon = readCumulativeEnergy();

  current = new Date(2026, 5, 10, 12, 0, 0);
  service.writeReading();
  const nextDay = readCumulativeEnergy();

  assert.ok(afternoon.generation > noon.generation, "sub-1000 kWh generation changes must remain visible");
  assert.ok(afternoon.consumption >= noon.consumption);
  assert.ok(afternoon.selfConsumption >= noon.selfConsumption);
  assert.ok(nextDay.generation > afternoon.generation);
  assert.ok(nextDay.consumption >= afternoon.consumption);
  assert.ok(nextDay.selfConsumption >= afternoon.selfConsumption);
});
