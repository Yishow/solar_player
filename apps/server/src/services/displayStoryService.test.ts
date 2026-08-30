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
  { readFreshnessPolicy, updateFreshnessPolicy },
  { evaluateDerivedMetrics, initializeDerivedMetricRegistry, saveDerivedMetricDefinition },
  { resolveServerPlaybackMetricCatalog }
] = await Promise.all([
  import("../db/index.js"),
  import("../db/migrate.js"),
  import("../db/seed.js"),
  import("./displayStoryService.js"),
  import("./displayPagePublishingService.js"),
  import("./displayValueOverrideService.js"),
  import("./freshnessPolicyService.js"),
  import("./derivedMetricRegistryService.js"),
  import("./derivedMetricCatalogService.js")
]);

beforeEach(() => {
  closeDatabaseConnection();
  rmSync(databasePath, { force: true });
  rmSync(`${databasePath}-shm`, { force: true });
  rmSync(`${databasePath}-wal`, { force: true });
  migrateDatabase();
  seedDatabase();
  initializeDerivedMetricRegistry();
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

test("custom Registry definitions update a bound Story without changing widget config", () => {
  seedScopedPowerMetric("cl", 10);
  const definition = saveDerivedMetricDefinition({
    description: "Story binding test",
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
    metricKey: "custom.storyPower",
    name: "Custom Story Power",
    outputScopePolicy: "site",
    outputUnit: "kW",
    precision: 1,
    revision: 0
  });
  writeStageConfig("overview", "live", {
    dataBindings: {
      power: {
        dataBinding: {
          metricKey: definition.metricKey,
          scope: "inherit-device",
          sourceType: "metric"
        },
        itemId: "power"
      }
    }
  });

  const first = readDisplayStory({ siteScope: "cl" }).overview.metrics.find(
    ({ itemId }) => itemId === "power"
  );
  assert.equal(first?.metricKey, "custom.storyPower");
  assert.equal(first?.value, "20.0");
  assert.equal(first?.derivedMetric?.definitionRevision, 1);

  saveDerivedMetricDefinition({ ...definition, expression: "source * 3" });
  const updated = readDisplayStory({ siteScope: "cl" }).overview.metrics.find(
    ({ itemId }) => itemId === "power"
  );
  assert.equal(updated?.metricKey, "custom.storyPower");
  assert.equal(updated?.value, "30.0");
  assert.equal(updated?.derivedMetric?.definitionRevision, 2);
});

test("Display Story falls back when a published custom definition is disabled", () => {
  seedScopedPowerMetric("cl", 10);
  const definition = saveDerivedMetricDefinition({
    description: "Disabled published binding test",
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
    metricKey: "custom.disabledStoryPower",
    name: "Disabled Story Power",
    outputScopePolicy: "site",
    outputUnit: "kW",
    precision: 1,
    revision: 0
  });
  writeStageConfig("overview", "live", {
    dataBindings: {
      power: {
        dataBinding: {
          metricKey: definition.metricKey,
          scope: "inherit-device",
          sourceType: "metric"
        },
        itemId: "power"
      }
    }
  });
  assert.equal(
    readDisplayStory({ siteScope: "cl" }).overview.metrics.find(({ itemId }) => itemId === "power")?.value,
    "20.0"
  );

  saveDerivedMetricDefinition({ ...definition, enabled: false });
  const metric = readDisplayStory({ siteScope: "cl" }).overview.metrics.find(
    ({ itemId }) => itemId === "power"
  );
  assert.equal(metric?.bindingState, "missing");
  assert.equal(metric?.value, "--");
  assert.equal(metric?.provenance, "fallback");
  assert.equal(metric?.derivedMetric, undefined);
});

test("Display Story builds one metric catalog per page read without changing bindings", () => {
  seedScopedPowerMetric("cl", 10);
  const firstDefinition = saveDerivedMetricDefinition({
    description: "Catalog invocation test",
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
    metricKey: "custom.catalogPowerA",
    name: "Catalog Power A",
    outputScopePolicy: "site",
    outputUnit: "kW",
    precision: 1,
    revision: 0
  });
  saveDerivedMetricDefinition({
    ...firstDefinition,
    expression: "source * 3",
    metricKey: "custom.catalogPowerB",
    name: "Catalog Power B"
  });
  writeStageConfig("overview", "live", {
    dataBindings: {
      power: {
        dataBinding: {
          metricKey: "custom.catalogPowerA",
          scope: "inherit-device",
          sourceType: "metric"
        },
        itemId: "power"
      },
      today: {
        dataBinding: {
          metricKey: "custom.catalogPowerB",
          scope: "inherit-device",
          sourceType: "metric"
        },
        itemId: "today"
      }
    }
  });
  const project = (story: ReturnType<typeof readDisplayStory>) => ({
    factoryCircuit: story.factoryCircuit.kpis.map(({ itemId, metricKey, provenance, unit, value }) => ({
      itemId,
      metricKey,
      provenance,
      unit,
      value
    })),
    overview: story.overview.metrics.map(({ itemId, metricKey, provenance, unit, value }) => ({
      itemId,
      metricKey,
      provenance,
      unit,
      value
    })),
    solar: story.solar.kpis.map(({ itemId, metricKey, provenance, unit, value }) => ({
      itemId,
      metricKey,
      provenance,
      unit,
      value
    }))
  });
  const baseline = readDisplayStory({ siteScope: "cl" });
  const catalogBuilds = new Map<string, number>();
  const actual = readDisplayStory({
    resolveMetricCatalog: (pageKey) => {
      catalogBuilds.set(pageKey, (catalogBuilds.get(pageKey) ?? 0) + 1);
      return resolveServerPlaybackMetricCatalog(pageKey);
    },
    siteScope: "cl"
  });

  assert.deepEqual(project(actual), project(baseline));
  assert.deepEqual([...catalogBuilds.entries()].sort(), [
    ["factory-circuit", 1],
    ["factory-circuit-guanyin", 1],
    ["overview", 1],
    ["solar", 1]
  ]);
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

test("Factory Circuit KPI aggregation rejects a scope outside its managed definition allowlist", () => {
  writeStageConfig("factory-circuit", "live", {
    dataBindings: {
      totalPower: {
        dataBinding: { metricKey: "totalPower", scope: "kn", sourceType: "metric" },
        itemId: "totalPower"
      }
    }
  });
  assert.throws(
    () => readDisplayStory({ siteScope: "cl" }),
    /Invalid published widget binding factory-circuit\.totalPower: metric-binding-incompatible-scope/
  );
});

test("Factory Circuit registry aggregates follow the page stale-data policy", () => {
  const slotKeys = [
    "stamping",
    "body",
    "painting",
    "assembly",
    "utility",
    "office"
  ] as const;
  const metricKeys = slotKeys.map((slotKey) =>
    resolveFactoryCircuitSlotMetricKey("factory-circuit", slotKey)
  );
  const insertMetric = getDatabase().prepare(
    `
      INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
      VALUES ('cl', ?, ?, 'kW', ?, 'good', '{}')
      ON CONFLICT(metric_scope, metric_key) DO UPDATE SET
        value = excluded.value,
        timestamp = excluded.timestamp
    `
  );
  const freshTimestamp = new Date().toISOString();
  for (const [index, metricKey] of metricKeys.entries()) {
    insertMetric.run(metricKey, index + 1, freshTimestamp);
  }
  evaluateDerivedMetrics();

  const staleTimestamp = new Date(Date.now() - 120_000).toISOString();
  getDatabase()
    .prepare("UPDATE live_metric_values SET timestamp = ? WHERE metric_scope = 'cl' AND metric_key = ?")
    .run(staleTimestamp, metricKeys[0]);

  const strictStory = readDisplayStory({ siteScope: "cl" });
  const strictSlot = strictStory.factoryCircuit.slots.find(
    (slot) => slot.metricKey === metricKeys[0]
  );
  const strictTotalPower = strictStory.factoryCircuit.kpis.find(
    (metric) => metric.metricKey === "totalPower"
  );
  assert.equal(strictSlot?.freshnessState, "stale");
  assert.equal(strictTotalPower?.value, "--");
  assert.equal(strictTotalPower?.fallbackReason, strictSlot?.fallbackReason);
  assert.equal(strictTotalPower?.freshnessState, strictSlot?.freshnessState);

  getDatabase()
    .prepare("UPDATE playback_runtime_policy SET enforce_fresh_runtime_data = 0 WHERE id = 1")
    .run();
  const permissiveStory = readDisplayStory({ siteScope: "cl" });
  const permissiveTotalPower = permissiveStory.factoryCircuit.kpis.find(
    (metric) => metric.metricKey === "totalPower"
  );
  assert.notEqual(permissiveTotalPower?.value, "--");
  assert.equal(Number(permissiveTotalPower?.value.replaceAll(",", "")), 21);
});

test("Factory Circuit aggregate diagnostics prefer a later stale contributor over an earlier missing slot", () => {
  const slotKeys = [
    "stamping",
    "body",
    "painting",
    "assembly",
    "utility",
    "office"
  ] as const;
  const metricKeys = slotKeys.map((slotKey) =>
    resolveFactoryCircuitSlotMetricKey("factory-circuit", slotKey)
  );
  const insertMetric = getDatabase().prepare(
    `
      INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
      VALUES ('cl', ?, ?, 'kW', ?, 'good', '{}')
      ON CONFLICT(metric_scope, metric_key) DO UPDATE SET
        value = excluded.value,
        timestamp = excluded.timestamp
    `
  );
  const freshTimestamp = new Date().toISOString();
  for (const [index, metricKey] of metricKeys.entries()) {
    insertMetric.run(metricKey, index + 1, freshTimestamp);
  }
  evaluateDerivedMetrics();
  getDatabase()
    .prepare("DELETE FROM circuit_configs WHERE page_key = 'factory-circuit' AND display_slot = ?")
    .run("stamping");
  getDatabase()
    .prepare("UPDATE live_metric_values SET timestamp = ? WHERE metric_scope = 'cl' AND metric_key = ?")
    .run(new Date(Date.now() - 120_000).toISOString(), metricKeys[1]);

  const story = readDisplayStory({ siteScope: "cl" }).factoryCircuit;
  const stamping = story.slots.find(({ metricKey }) => metricKey === metricKeys[0]);
  const body = story.slots.find(({ metricKey }) => metricKey === metricKeys[1]);
  const totalPower = story.kpis.find(({ metricKey }) => metricKey === "totalPower");
  assert.equal(stamping?.fallbackReason, "missing-slot-binding");
  assert.equal(body?.fallbackReason, "stale-data");
  assert.equal(totalPower?.fallbackReason, body?.fallbackReason);
  assert.equal(totalPower?.freshnessState, body?.freshnessState);
  assert.equal(totalPower?.freshness?.state, body?.freshness?.state);
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
