import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";
import {
  resolveMonitoringMetricBinding,
  resolveMonitoringSlotBinding,
  resolveMonitoringSummaryState,
  resolveFactoryCircuitSlotMetricKey
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
  { writeStageConfig },
  { saveDisplayValueOverride },
  { readFreshnessPolicy, updateFreshnessPolicy }
] = await Promise.all([
  import("../db/index.js"),
  import("../db/migrate.js"),
  import("../db/seed.js"),
  import("./displayStoryService.js"),
  import("./displayPagePublishingService.js"),
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

function seedScopedPowerMetric(
  metricScope: "cl" | "kn",
  value: number,
  timestamp = new Date().toISOString()
) {
  getDatabase()
    .prepare(
      `
        INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
        VALUES (?, 'realTimePower', ?, 'kW', ?, 'good', '{}')
        ON CONFLICT(metric_scope, metric_key) DO UPDATE SET
          value = excluded.value,
          timestamp = excluded.timestamp
      `
    )
    .run(metricScope, value, timestamp);
}

test("Display Story resolves mixed saved bindings by item id and effective scope", () => {
  seedScopedPowerMetric("cl", 11);
  seedScopedPowerMetric("kn", 88);
  writeStageConfig("overview", "live", {
    dataBindings: {
      power: {
        dataBinding: {
          format: { precision: 2, unitDisplay: "hide" },
          metricKey: "realTimePower",
          scope: "kn",
          sourceType: "metric"
        },
        itemId: "power"
      },
      today: {
        dataBinding: { metricKey: "realTimePower", scope: "inherit-device", sourceType: "metric" },
        itemId: "today"
      }
    }
  });

  const metrics = readDisplayStory({ siteScope: "cl" }).overview.metrics;
  const power = metrics.find((metric) => metric.itemId === "power");
  const today = metrics.find((metric) => metric.itemId === "today");

  assert.equal(power?.metricKey, "realTimePower");
  assert.equal(power?.metricScope, "kn");
  assert.equal(power?.value, "88.00");
  assert.equal(power?.unit, "");
  assert.equal(today?.metricKey, "realTimePower");
  assert.equal(today?.metricScope, "cl");
  assert.equal(today?.value, "11.0");
  assert.equal(power?.sourceClass, today?.sourceClass);
});

test("Overview readiness follows effective bindings instead of the previous default metric", () => {
  writeStageConfig("overview", "live", {
    dataBindings: {
      power: {
        dataBinding: {
          metricKey: "todayGeneration",
          scope: "inherit-device",
          sourceType: "metric"
        },
        itemId: "power"
      }
    }
  });

  const findings = readDisplayStory({ siteScope: "cl" }).overview.readinessFindings;
  assert.equal(findings.some((finding) => finding.requirementKey === "realTimePower"), false);
  assert.equal(findings.some((finding) => finding.requirementKey === "todayGeneration"), true);
});

test("Solar Story resolves saved KPI bindings from the same scoped plan", () => {
  seedScopedPowerMetric("cl", 21);
  seedScopedPowerMetric("kn", 84);
  writeStageConfig("solar", "live", {
    dataBindings: {
      efficiency: {
        dataBinding: { metricKey: "realTimePower", scope: "inherit-device", sourceType: "metric" },
        itemId: "efficiency"
      },
      generation: {
        dataBinding: { metricKey: "realTimePower", scope: "kn", sourceType: "metric" },
        itemId: "generation"
      }
    }
  });

  const kpis = readDisplayStory({ siteScope: "cl" }).solar.kpis;
  const generation = kpis.find((metric) => metric.itemId === "generation");
  const efficiency = kpis.find((metric) => metric.itemId === "efficiency");

  assert.equal(generation?.metricScope, "kn");
  assert.equal(generation?.value, "84.0");
  assert.equal(efficiency?.metricScope, "cl");
  assert.equal(efficiency?.value, "21.0");
});

test("Factory Circuit preserves semantic slot ids while resolving an explicit foreign scope", () => {
  const metricKey = resolveFactoryCircuitSlotMetricKey("factory-circuit", "stamping");
  for (const [metricScope, value] of [["cl", 11], ["kn", 88]] as const) {
    getDatabase()
      .prepare(
        `
          INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
          VALUES (?, ?, ?, 'kW', ?, 'good', '{}')
          ON CONFLICT(metric_scope, metric_key) DO UPDATE SET value = excluded.value
        `
      )
      .run(metricScope, metricKey, value, new Date().toISOString());
  }
  writeStageConfig("factory-circuit", "live", {
    dataBindings: {
      stamping: {
        dataBinding: {
          format: { precision: 2, unitDisplay: "hide" },
          metricKey,
          scope: "kn",
          sourceType: "metric"
        },
        itemId: "stamping"
      }
    }
  });

  const slot = readDisplayStory({ siteScope: "cl" }).factoryCircuit.slots.find(
    (candidate) => candidate.itemId === "stamping"
  );
  assert.equal(slot?.slotKey, "stamping");
  assert.equal(slot?.metricScope, "kn");
  assert.equal(slot?.livePowerKw, 88);
  assert.deepEqual(slot?.format, { precision: 2, unitDisplay: "hide" });
});

test("Factory Circuit KPI aggregation reads dependencies from its explicit scope", () => {
  const slotKeys = [
    "stamping",
    "body",
    "painting",
    "assembly",
    "utility",
    "office",
    "heavy_vehicle",
    "ed_coating"
  ] as const;
  const insertMetric = getDatabase().prepare(
    `
      INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
      VALUES (?, ?, ?, 'kW', ?, 'good', '{}')
      ON CONFLICT(metric_scope, metric_key) DO UPDATE SET value = excluded.value
    `
  );
  for (const [index, slotKey] of slotKeys.entries()) {
    const metricKey = resolveFactoryCircuitSlotMetricKey("factory-circuit", slotKey);
    insertMetric.run("cl", metricKey, index + 1, new Date().toISOString());
    insertMetric.run("kn", metricKey, (index + 1) * 10, new Date().toISOString());
  }
  writeStageConfig("factory-circuit", "live", {
    dataBindings: {
      totalPower: {
        dataBinding: { metricKey: "totalPower", scope: "kn", sourceType: "metric" },
        itemId: "totalPower"
      }
    }
  });

  const totalPower = readDisplayStory({ siteScope: "cl" }).factoryCircuit.kpis.find(
    (candidate) => candidate.itemId === "totalPower"
  );
  assert.equal(totalPower?.metricScope, "kn");
  assert.equal(Number(totalPower?.value.replaceAll(",", "")), 210);
});

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
