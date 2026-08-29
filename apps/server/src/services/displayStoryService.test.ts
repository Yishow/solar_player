import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";
import {
  resolveMonitoringMetricBinding,
  resolveMonitoringSlotBinding,
  resolveMonitoringSummaryState
} from "@solar-display/shared";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-story-service-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
const databasePath = process.env.DATABASE_PATH;

const [
  { closeDatabaseConnection, getDatabase },
  { migrateDatabase },
  { seedDatabase },
  { readDisplayStory },
  { saveDisplayValueOverride },
  { readFreshnessPolicy, updateFreshnessPolicy }
] = await Promise.all([
  import("../db/index.js"),
  import("../db/migrate.js"),
  import("../db/seed.js"),
  import("./displayStoryService.js"),
  import("./displayValueOverrideService.js"),
  import("./freshnessPolicyService.js")
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

function seedPowerMetric(
  value = 42,
  timestamp = "2026-07-08T09:00:00.000Z"
) {
  getDatabase()
    .prepare(
      `
        INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
        VALUES ('cl', 'realTimePower', ?, 'kW', ?, 'good', '{}')
      `
    )
    .run(value, timestamp);
}

test("shared monitoring story model keeps fallback diagnostics inspectable", () => {
  const metric = resolveMonitoringMetricBinding({
    binding: {
      fallbackIndex: 0,
      label: "即時發電功率",
      metricKey: "realTimePower",
      unit: "kW"
    },
    isConnected: false,
    metricScope: "cl",
    reading: null
  });

  assert.equal(metric.bindingState, "missing");
  assert.equal(metric.fallbackReason, "socket-disconnected");
  assert.equal(metric.freshnessState, "fallback");
});

test("shared monitoring slot binding preserves missing-slot diagnostics", () => {
  const binding = resolveMonitoringSlotBinding({
    circuitId: null,
    metricScope: "cl",
    slotKey: "stamping"
  });

  assert.equal(binding.bindingState, "missing");
  assert.equal(binding.fallbackReason, "missing-slot-binding");
});

test("shared monitoring summary state elevates stale bindings into warning tone", () => {
  const summary = resolveMonitoringSummaryState([
    {
      alertTone: "normal",
      bindingState: "bound",
      fallbackReason: null,
      freshnessState: "fresh"
    },
    {
      alertTone: "warning",
      bindingState: "bound",
      fallbackReason: "stale-data",
      freshnessState: "stale"
    }
  ]);

  assert.equal(summary.alertTone, "warning");
  assert.equal(summary.fallbackReason, "stale-data");
  assert.equal(summary.freshnessState, "stale");
});

test("Display Story consumes the updated Server Freshness Policy", () => {
  seedPowerMetric(42, new Date(Date.now() - 40_000).toISOString());
  const readPower = () =>
    readDisplayStory({ siteScope: "cl" }).overview.metrics.find(
      (metric) => metric.metricKey === "realTimePower"
    );

  assert.equal(readPower()?.freshness?.state, "delayed");
  const current = readFreshnessPolicy().policy;
  updateFreshnessPolicy({
    ...current,
    realtime: {
      ...current.realtime,
      delayedAfterMs: 45_000
    }
  });
  assert.equal(readPower()?.freshness?.state, "live");
});

test("Factory Circuit Story preserves authoritative freshness for slots and aggregate KPIs", () => {
  const timestamp = new Date(Date.now() - 40_000).toISOString();
  const metricKeys = [
    "factoryCircuit.stampingPower",
    "factoryCircuit.bodyPower",
    "factoryCircuit.paintingPower",
    "factoryCircuit.assemblyPower",
    "factoryCircuit.utilityPower",
    "factoryCircuit.officePower"
  ];
  getDatabase()
    .prepare(`DELETE FROM live_metric_values WHERE metric_key IN (${metricKeys.map(() => "?").join(", ")})`)
    .run(...metricKeys);
  assert.equal(
    readDisplayStory({ siteScope: "cl" }).factoryCircuit.slots[0]?.freshness?.state,
    "unavailable"
  );

  const insert = getDatabase().prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES ('cl', ?, 10, 'kW', ?, 'good', '{}')
  `);
  for (const metricKey of metricKeys) {
    insert.run(metricKey, timestamp);
  }

  const factoryStory = readDisplayStory({ siteScope: "cl" }).factoryCircuit;
  const totalPower = factoryStory.kpis.find(
    (metric) => metric.metricKey === "totalPower"
  );

  assert.ok(factoryStory.freshnessPolicy);
  assert.equal(factoryStory.slots[0]?.freshness?.state, "delayed");
  assert.equal(totalPower?.freshness?.state, "delayed");
  assert.equal(totalPower?.label, "廠區總用電");
});

test("readDisplayStory applies active display overrides after monitoring source resolution", () => {
  seedPowerMetric();
  saveDisplayValueOverride(
    {
      metricScope: "cl",
      cardId: "overview.realTimePower",
      metricKey: "realTimePower",
      pageId: "overview",
      targetId: "overview.realTimePower",
      unit: "kW"
    },
    { displayValue: 60 }
  );

  const story = readDisplayStory({ siteScope: "cl" });
  const rawStory = readDisplayStory({ applyDisplayOverrides: false, siteScope: "cl" });

  assert.equal(
    story.overview.metrics.find((metric) => metric.metricKey === "realTimePower")?.value,
    "60.0"
  );
  assert.equal(
    rawStory.overview.metrics.find((metric) => metric.metricKey === "realTimePower")?.value,
    "42.0"
  );
});

test("readDisplayStory ignores expired display overrides", () => {
  seedPowerMetric();
  saveDisplayValueOverride(
    {
      metricScope: "cl",
      cardId: "overview.realTimePower",
      metricKey: "realTimePower",
      pageId: "overview",
      targetId: "overview.realTimePower",
      unit: "kW"
    },
    {
      displayValue: 60,
      expiresAt: "2000-01-01T00:00:00.000Z"
    }
  );

  const story = readDisplayStory({ siteScope: "cl" });

  assert.equal(
    story.overview.metrics.find((metric) => metric.metricKey === "realTimePower")?.value,
    "42.0"
  );
});

test("readDisplayStory Overview and Solar bindings use contract-aligned sourceClass values", () => {
  seedPowerMetric();
  const story = readDisplayStory({ siteScope: "cl" });

  assert.equal(
    story.overview.metrics.find((metric) => metric.metricKey === "realTimePower")?.sourceClass,
    "mqtt-live"
  );
  assert.equal(
    story.overview.metrics.find((metric) => metric.metricKey === "todayGeneration")?.sourceClass,
    "derived-metric"
  );
  assert.equal(
    story.overview.metrics.find((metric) => metric.metricKey === "todayCo2Reduction")?.sourceClass,
    "derived-metric"
  );
  assert.notEqual(
    story.overview.metrics.find((metric) => metric.metricKey === "todayGeneration")?.sourceClass,
    "mqtt-live"
  );

  assert.equal(
    story.solar.kpis.find((kpi) => kpi.metricKey === "todayGeneration")?.sourceClass,
    "derived-metric"
  );
  assert.equal(
    story.solar.kpis.find((kpi) => kpi.metricKey === "selfConsumptionRatio")?.sourceClass,
    "derived-metric"
  );
  assert.equal(
    story.solar.kpis.find((kpi) => kpi.metricKey === "todayCo2Reduction")?.sourceClass,
    "derived-metric"
  );
  assert.equal(
    story.solar.kpis.find((kpi) => kpi.metricKey === "systemEfficiency")?.sourceClass,
    "mqtt-live"
  );
});
