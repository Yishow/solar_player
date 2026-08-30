import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";
import type { DerivedMetricDefinition, DerivedMetricDependencyIdentity } from "@solar-display/shared";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-derived-registry-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
const databasePath = process.env.DATABASE_PATH;

const [{ migrateDatabase }, { seedDatabase }, databaseModule, registry, catalogService, { resolveMetric }] = await Promise.all([
  import("../db/migrate.js"),
  import("../db/seed.js"),
  import("../db/index.js"),
  import("./derivedMetricRegistryService.js"),
  import("./derivedMetricCatalogService.js"),
  import("./MetricResolver.js")
]);

function resetDatabase() {
  databaseModule.closeDatabaseConnection();
  rmSync(databasePath, { force: true });
  rmSync(`${databasePath}-shm`, { force: true });
  rmSync(`${databasePath}-wal`, { force: true });
  migrateDatabase();
  seedDatabase();
  return databaseModule.getDatabase();
}

function customDefinition(metricKey: string, expression = "source * 2"): DerivedMetricDefinition {
  return {
    description: "test definition",
    enabled: true,
    expression,
    fallbackPolicy: "unavailable",
    inputs: [{ alias: "source", kind: "metric", metricKey: "realTimePower", scope: "output-site", unit: "kW" }],
    managed: false,
    metricKey,
    name: metricKey,
    outputScopePolicy: "site",
    outputUnit: "kW",
    precision: 1,
    revision: 0
  };
}

beforeEach(resetDatabase);

after(() => {
  databaseModule.closeDatabaseConnection();
  rmSync(tempDir, { force: true, recursive: true });
});

test("seeds managed definitions for canonical first-party formulas", () => {
  const definitions = registry.initializeDerivedMetricRegistry();
  assert.equal(definitions.nodes.length, 20);
  assert.deepEqual(
    registry.listDerivedMetricDefinitions().map(({ managed, metricKey }) => ({ managed, metricKey })),
    [
      { managed: true, metricKey: "factoryCircuit.guanyinTotalPower" },
      { managed: true, metricKey: "factoryCircuit.jungliTotalPower" },
      { managed: true, metricKey: "monthGeneration" },
      { managed: true, metricKey: "selfConsumptionRatio" },
      { managed: true, metricKey: "sustainability.global.accumulatedCarbonReductionTons" },
      { managed: true, metricKey: "sustainability.global.annualEnergySavingPercent" },
      { managed: true, metricKey: "sustainability.global.plantedTreeEquivalent" },
      { managed: true, metricKey: "sustainability.site.accumulatedCarbonReductionTons" },
      { managed: true, metricKey: "sustainability.site.annualEnergySavingPercent" },
      { managed: true, metricKey: "sustainability.site.plantedTreeEquivalent" },
      { managed: true, metricKey: "todayCo2Reduction" },
      { managed: true, metricKey: "todayGeneration" },
      { managed: true, metricKey: "totalCo2Reduction" },
      { managed: true, metricKey: "totalGeneration" }
    ]
  );
});

test("evaluates scope-qualified Sustainability definitions with counter fallback and fixed tree factor", () => {
  const database = databaseModule.getDatabase();
  const observedAt = "2026-08-30T08:00:00.000Z";
  database.prepare("DELETE FROM live_metric_values").run();
  database.prepare("DELETE FROM cumulative_counters").run();
  database.prepare(`
    UPDATE calculation_settings
    SET carbon_emission_factor = 0.5, tree_equivalent_factor = 999
    WHERE id = 1
  `).run();
  const insertLive = database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES (?, ?, ?, ?, ?, 'good', ?)
  `);
  for (const [metricScope, total] of [["cl", 1234.567], ["kn", 2000]] as const) {
    const rawPayload = JSON.stringify({
      sourceTopic: `solar/${metricScope.toUpperCase()}/summary`,
      timestamp: observedAt
    });
    insertLive.run(metricScope, "factoryGeneration.totalMwh", total, "MWh", observedAt, rawPayload);
  }
  database.prepare(`
    INSERT INTO cumulative_counters (metric_scope, metric_key, total_value, last_updated, reset_count)
    VALUES
      ('global', 'generation', 50000, ?, 0),
      ('global', 'consumption', 1000, ?, 0),
      ('global', 'selfConsumption', 600, ?, 0)
  `).run(observedAt, observedAt, observedAt);

  registry.initializeDerivedMetricRegistry(database);
  registry.evaluateDerivedMetrics(database, new Date(observedAt));

  const clCarbon = registry.readDerivedMetricEvaluation(
    "cl",
    "sustainability.site.accumulatedCarbonReductionTons",
    database
  );
  const clTrees = registry.readDerivedMetricEvaluation(
    "cl",
    "sustainability.site.plantedTreeEquivalent",
    database
  );
  const knCarbon = registry.readDerivedMetricEvaluation(
    "kn",
    "sustainability.site.accumulatedCarbonReductionTons",
    database
  );
  const knTrees = registry.readDerivedMetricEvaluation(
    "kn",
    "sustainability.site.plantedTreeEquivalent",
    database
  );
  assert.equal(clCarbon?.value, 617.284);
  assert.equal(clCarbon?.outputUnit, "t");
  assert.equal(clCarbon?.precision, 3);
  assert.equal(clCarbon?.status, "ready");
  assert.equal(clCarbon?.timestamp, observedAt);
  assert.equal(clCarbon?.failureCode, null);
  assert.equal(clCarbon?.dependencies[0]?.sourceTopic, "solar/CL/summary");
  assert.deepEqual(
    clCarbon?.dependencies.find(({ kind }) => kind === "calculation-setting"),
    {
      alias: "carbonFactor",
      kind: "calculation-setting",
      settingKey: "carbonEmissionFactor",
      settingRevision: "1",
      unit: "kg/kWh",
      value: 0.5
    }
  );
  assert.equal(clTrees?.value, 3856);
  assert.equal(clTrees?.outputUnit, "trees");
  assert.equal(clTrees?.precision, 0);
  assert.equal(clTrees?.status, "ready");
  assert.equal(clTrees?.dependencies[0]?.metricKey, "sustainability.site.accumulatedCarbonReductionTons");
  assert.equal(clTrees?.dependencies[0]?.value, 617.284);
  assert.equal(clTrees?.dependencies[0]?.upstream?.[0]?.value, 1234.567);
  assert.equal(knCarbon?.value, 1000);
  assert.equal(knCarbon?.outputUnit, "t");
  assert.equal(knCarbon?.precision, 3);
  assert.equal(knCarbon?.status, "ready");
  assert.equal(knCarbon?.timestamp, observedAt);
  assert.equal(knCarbon?.failureCode, null);
  assert.equal(knCarbon?.dependencies[0]?.sourceTopic, "solar/KN/summary");
  assert.equal(knTrees?.value, 6250);
  assert.equal(knTrees?.outputUnit, "trees");
  assert.equal(knTrees?.precision, 0);
  assert.equal(knTrees?.status, "ready");
  assert.equal(knTrees?.dependencies[0]?.value, 1000);

  for (const metricKey of [
    "sustainability.site.annualEnergySavingPercent",
    "sustainability.global.annualEnergySavingPercent"
  ]) {
    const scope = metricKey.startsWith("sustainability.site.") ? "cl" : "global";
    const definition = registry.readDerivedMetricEvaluation(scope, metricKey, database);
    assert.equal(definition?.outputUnit, "%");
    assert.equal(definition?.precision, 1);
  }
  const siteAnnual = registry.readDerivedMetricEvaluation(
    "cl",
    "sustainability.site.annualEnergySavingPercent",
    database
  );
  assert.equal(siteAnnual?.status, "unavailable");
  assert.equal(siteAnnual?.value, null);
  assert.equal(siteAnnual?.timestamp, null);
  assert.equal(siteAnnual?.failureCode, "input-unavailable");
  const knAnnual = registry.readDerivedMetricEvaluation(
    "kn",
    "sustainability.site.annualEnergySavingPercent",
    database
  );
  assert.equal(knAnnual?.status, "unavailable");
  assert.equal(knAnnual?.value, null);
  assert.equal(knAnnual?.timestamp, null);
  assert.equal(knAnnual?.failureCode, "input-unavailable");

  const globalCarbon = registry.readDerivedMetricEvaluation(
    "global",
    "sustainability.global.accumulatedCarbonReductionTons",
    database
  );
  const globalTrees = registry.readDerivedMetricEvaluation(
    "global",
    "sustainability.global.plantedTreeEquivalent",
    database
  );
  const globalAnnual = registry.readDerivedMetricEvaluation(
    "global",
    "sustainability.global.annualEnergySavingPercent",
    database
  );
  assert.equal(globalCarbon?.value, 1617.284);
  assert.equal(globalCarbon?.outputUnit, "t");
  assert.equal(globalCarbon?.status, "ready");
  assert.equal(globalCarbon?.dependencies[0]?.metricKey, "totalGeneration");
  assert.equal(globalCarbon?.dependencies[0]?.unit, "MWh");
  assert.equal(globalCarbon?.dependencies[0]?.value, 3234.567);
  assert.equal(globalTrees?.value, 10106);
  assert.equal(globalTrees?.outputUnit, "trees");
  assert.equal(globalAnnual?.value, 60);
  assert.equal(globalAnnual?.outputUnit, "%");
  assert.equal(globalAnnual?.precision, 1);
  assert.equal(globalAnnual?.status, "ready");
  assert.equal(globalAnnual?.dependencies[0]?.metricKey, "selfConsumptionEnergy");
  assert.equal(globalAnnual?.dependencies[0]?.unit, "kWh");
  assert.equal(globalAnnual?.dependencies[0]?.value, 600);
  assert.equal(globalAnnual?.dependencies[0]?.timestamp, observedAt);

  database.prepare("DELETE FROM live_metric_values WHERE metric_key = 'factoryGeneration.totalMwh'").run();
  database.prepare(`
    DELETE FROM derived_metric_evaluations
    WHERE metric_scope = 'global' AND metric_key IN (
      'totalGeneration',
      'sustainability.global.accumulatedCarbonReductionTons',
      'sustainability.global.plantedTreeEquivalent'
    )
  `).run();
  database.prepare(`
    DELETE FROM live_metric_values
    WHERE metric_scope = 'global' AND metric_key IN (
      'totalGeneration',
      'sustainability.global.accumulatedCarbonReductionTons',
      'sustainability.global.plantedTreeEquivalent'
    )
  `).run();
  registry.evaluateDerivedMetrics(database, new Date(observedAt));
  const counterGlobalCarbon = registry.readDerivedMetricEvaluation(
    "global",
    "sustainability.global.accumulatedCarbonReductionTons",
    database
  );
  const counterGlobalTrees = registry.readDerivedMetricEvaluation(
    "global",
    "sustainability.global.plantedTreeEquivalent",
    database
  );
  assert.equal(counterGlobalCarbon?.value, 25);
  assert.equal(counterGlobalCarbon?.dependencies[0]?.unit, "MWh");
  assert.equal(counterGlobalCarbon?.dependencies[0]?.value, 50);
  assert.equal(counterGlobalCarbon?.dependencies[0]?.timestamp, observedAt);
  assert.equal(counterGlobalTrees?.value, 156);

  database.prepare("DELETE FROM cumulative_counters").run();
  insertLive.run("global", "selfConsumptionEnergy", 4200, "kWh", observedAt, "{}");
  insertLive.run("global", "consumptionEnergy", 6000, "kWh", observedAt, "{}");
  registry.evaluateDerivedMetrics(database, new Date(observedAt));
  assert.equal(
    registry.readDerivedMetricEvaluation("global", "sustainability.global.annualEnergySavingPercent", database)?.value,
    70
  );
});

test("restricts managed Factory Circuit definitions to their declared sites", () => {
  const database = databaseModule.getDatabase();
  const snapshot = registry.initializeDerivedMetricRegistry(database);
  const definitions = registry.listDerivedMetricDefinitions(database);
  type ScopedSiteDefinition = DerivedMetricDefinition & { siteScopes: Array<"cl" | "kn"> };
  const jungli = definitions.find(({ metricKey }) => metricKey === "factoryCircuit.jungliTotalPower");
  const guanyin = definitions.find(({ metricKey }) => metricKey === "factoryCircuit.guanyinTotalPower");
  assert.deepEqual((jungli as ScopedSiteDefinition).siteScopes, ["cl"]);
  assert.deepEqual((guanyin as ScopedSiteDefinition).siteScopes, ["kn"]);

  const factoryNodeIds = snapshot.nodes
    .filter(({ definition }) => definition.definition.metricKey.startsWith("factoryCircuit."))
    .map(({ nodeId }) => nodeId)
    .sort();
  const expectedFactoryNodeIds = [
    "cl:factoryCircuit.jungliTotalPower",
    "kn:factoryCircuit.guanyinTotalPower"
  ];
  assert.deepEqual(factoryNodeIds, expectedFactoryNodeIds);
  const reverseFactoryNodeIds = [...snapshot.reverseMetricDependencies.values()]
    .flatMap((nodeIds) => nodeIds)
    .filter((nodeId) => nodeId.includes("factoryCircuit.jungliTotalPower") || nodeId.includes("factoryCircuit.guanyinTotalPower"));
  assert.deepEqual([...new Set(reverseFactoryNodeIds)].sort(), expectedFactoryNodeIds);

  const observedAt = "2026-08-30T08:00:00.000Z";
  const upsert = database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES (?, ?, 1, 'kW', ?, 'good', '{}')
    ON CONFLICT(metric_scope, metric_key) DO UPDATE SET
      value = excluded.value,
      unit = excluded.unit,
      timestamp = excluded.timestamp,
      quality = excluded.quality,
      raw_payload = excluded.raw_payload
  `);
  for (const definition of definitions.filter(({ metricKey }) => metricKey.startsWith("factoryCircuit."))) {
    for (const scope of ["cl", "kn"] as const) {
      for (const input of definition.inputs) {
        if (input.kind === "metric") upsert.run(scope, input.metricKey, observedAt);
      }
    }
  }
  registry.evaluateDerivedMetrics(database, new Date(observedAt));
  const expectedFactoryRows = [
    { metric_scope: "cl", metric_key: "factoryCircuit.jungliTotalPower" },
    { metric_scope: "kn", metric_key: "factoryCircuit.guanyinTotalPower" }
  ];
  assert.deepEqual(
    database.prepare(`
      SELECT metric_scope, metric_key FROM derived_metric_evaluations
      WHERE metric_key IN ('factoryCircuit.jungliTotalPower', 'factoryCircuit.guanyinTotalPower')
      ORDER BY metric_scope, metric_key
    `).all(),
    expectedFactoryRows
  );
  assert.deepEqual(
    database.prepare(`
      SELECT metric_scope, metric_key FROM live_metric_values
      WHERE metric_key IN ('factoryCircuit.jungliTotalPower', 'factoryCircuit.guanyinTotalPower')
      ORDER BY metric_scope, metric_key
    `).all(),
    expectedFactoryRows
  );

  const unrestrictedKey = "custom.unrestrictedSiteDefinition";
  for (const scope of ["cl", "kn"] as const) upsert.run(scope, "realTimePower", observedAt);
  registry.saveDerivedMetricDefinition(customDefinition(unrestrictedKey), database);
  assert.deepEqual(
    database.prepare(`
      SELECT metric_scope, metric_key FROM derived_metric_evaluations
      WHERE metric_key = ? ORDER BY metric_scope
    `).all(unrestrictedKey),
    [
      { metric_scope: "cl", metric_key: unrestrictedKey },
      { metric_scope: "kn", metric_key: unrestrictedKey }
    ]
  );

  databaseModule.closeDatabaseConnection();
  const reopened = databaseModule.getDatabase();
  migrateDatabase();
  const persisted = registry.listDerivedMetricDefinitions(reopened);
  assert.deepEqual(
    (persisted.find(({ metricKey }) => metricKey === "factoryCircuit.jungliTotalPower") as ScopedSiteDefinition).siteScopes,
    ["cl"]
  );
  assert.deepEqual(
    (persisted.find(({ metricKey }) => metricKey === "factoryCircuit.guanyinTotalPower") as ScopedSiteDefinition).siteScopes,
    ["kn"]
  );
});

test("reconciles registry-owned rows outside narrowed site scopes on startup", () => {
  const initial = databaseModule.getDatabase();
  registry.initializeDerivedMetricRegistry(initial);
  databaseModule.closeDatabaseConnection();
  const database = databaseModule.getDatabase();
  const observedAt = new Date().toISOString();
  const scopedRows = [
    ["cl", "factoryCircuit.jungliTotalPower"],
    ["kn", "factoryCircuit.jungliTotalPower"],
    ["cl", "factoryCircuit.guanyinTotalPower"],
    ["kn", "factoryCircuit.guanyinTotalPower"]
  ] as const;
  const insertEvaluation = database.prepare(`
    INSERT INTO derived_metric_evaluations (
      metric_scope, metric_key, definition_revision, status, failure_code,
      retained_last_good, value, unit, source_timestamp, evaluated_at, provenance_json
    ) VALUES (?, ?, 1, 'ready', NULL, 0, 10, 'kW', ?, ?, '{}')
  `);
  const insertLive = database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES (?, ?, 10, 'kW', ?, 'good', ?)
  `);
  for (const [metricScope, metricKey] of scopedRows) {
    insertEvaluation.run(metricScope, metricKey, observedAt, observedAt);
    insertLive.run(metricScope, metricKey, observedAt, JSON.stringify({ source: "derived-metric-registry" }));
  }
  insertLive.run("cl", "factoryCircuit.stampingPower", observedAt, "{}");
  insertLive.run("kn", "factoryCircuit.stampingPower", observedAt, "{}");

  registry.initializeDerivedMetricRegistry(database);

  assert.deepEqual(
    database.prepare(`
      SELECT metric_scope, metric_key FROM derived_metric_evaluations
      WHERE metric_key IN ('factoryCircuit.jungliTotalPower', 'factoryCircuit.guanyinTotalPower')
      ORDER BY metric_scope, metric_key
    `).all(),
    [
      { metric_scope: "cl", metric_key: "factoryCircuit.jungliTotalPower" },
      { metric_scope: "kn", metric_key: "factoryCircuit.guanyinTotalPower" }
    ]
  );
  assert.deepEqual(
    database.prepare(`
      SELECT metric_scope, metric_key FROM live_metric_values
      WHERE metric_key IN ('factoryCircuit.jungliTotalPower', 'factoryCircuit.guanyinTotalPower')
      ORDER BY metric_scope, metric_key
    `).all(),
    [
      { metric_scope: "cl", metric_key: "factoryCircuit.jungliTotalPower" },
      { metric_scope: "kn", metric_key: "factoryCircuit.guanyinTotalPower" }
    ]
  );
  assert.deepEqual(
    database.prepare(`
      SELECT metric_scope, metric_key FROM live_metric_values
      WHERE metric_key = 'factoryCircuit.stampingPower' ORDER BY metric_scope
    `).all(),
    [
      { metric_scope: "cl", metric_key: "factoryCircuit.stampingPower" },
      { metric_scope: "kn", metric_key: "factoryCircuit.stampingPower" }
    ]
  );
  assert.equal(registry.readDerivedMetricEvaluation("kn", "factoryCircuit.jungliTotalPower", database), null);
  assert.equal(registry.readDerivedMetricEvaluation("cl", "factoryCircuit.guanyinTotalPower", database), null);
  assert.equal(
    resolveMetric(database, { metricScope: "kn", metricKey: "factoryCircuit.jungliTotalPower" }).value,
    null
  );
  assert.equal(
    resolveMetric(database, { metricScope: "cl", metricKey: "factoryCircuit.guanyinTotalPower" }).value,
    null
  );
});

test("preserves persisted source rows while removing orphan evaluations", () => {
  const initial = databaseModule.getDatabase();
  registry.initializeDerivedMetricRegistry(initial);
  databaseModule.closeDatabaseConnection();
  const database = databaseModule.getDatabase();
  const observedAt = new Date().toISOString();
  const insertEvaluation = database.prepare(`
    INSERT INTO derived_metric_evaluations (
      metric_scope, metric_key, definition_revision, status, failure_code,
      retained_last_good, value, unit, source_timestamp, evaluated_at, provenance_json
    ) VALUES (?, ?, 1, 'degraded', 'input-unavailable', 0, 10, 'kW', ?, ?, '{}')
  `);
  insertEvaluation.run("kn", "factoryCircuit.jungliTotalPower", observedAt, observedAt);
  insertEvaluation.run("cl", "factoryCircuit.guanyinTotalPower", observedAt, observedAt);
  database.prepare(`
    INSERT INTO topic_mappings (metric_scope, metric_key, topic, value_path, unit, enabled)
    VALUES ('kn', 'factoryCircuit.jungliTotalPower', 'legacy/kn-jungli-total', '$.value', 'kW', 1)
  `).run();
  database.prepare(`
    INSERT INTO topic_mappings (metric_scope, metric_key, topic, value_path, unit, enabled)
    VALUES ('cl', 'factoryCircuit.guanyinTotalPower', 'legacy/cl-guanyin-total', '$.value', 'kW', 0)
  `).run();
  database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES ('kn', 'factoryCircuit.jungliTotalPower', 99, 'kW', ?, 'good', '{}')
  `).run(observedAt);
  database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES ('cl', 'factoryCircuit.guanyinTotalPower', 88, 'kW', ?, 'degraded', ?)
  `).run(observedAt, JSON.stringify({ source: "derived-metric-registry" }));

  registry.initializeDerivedMetricRegistry(database);

  assert.equal(registry.readDerivedMetricEvaluation("kn", "factoryCircuit.jungliTotalPower", database), null);
  assert.equal(registry.readDerivedMetricEvaluation("cl", "factoryCircuit.guanyinTotalPower", database), null);
  assert.deepEqual(
    database.prepare(`
      SELECT value, raw_payload FROM live_metric_values
      WHERE metric_scope = 'kn' AND metric_key = 'factoryCircuit.jungliTotalPower'
    `).get(),
    { value: 99, raw_payload: "{}" }
  );
  assert.deepEqual(
    database.prepare(`
      SELECT value, raw_payload FROM live_metric_values
      WHERE metric_scope = 'cl' AND metric_key = 'factoryCircuit.guanyinTotalPower'
    `).get(),
    { value: 88, raw_payload: JSON.stringify({ source: "derived-metric-registry" }) }
  );
  assert.equal(
    resolveMetric(database, { metricScope: "kn", metricKey: "factoryCircuit.jungliTotalPower" }).value,
    99
  );
});

test("protects scoped Solar adapter identities but not global lookalikes", () => {
  const initial = databaseModule.getDatabase();
  registry.initializeDerivedMetricRegistry(initial);
  databaseModule.closeDatabaseConnection();
  const database = databaseModule.getDatabase();
  const observedAt = new Date().toISOString();
  const insertLive = database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES (?, ?, 10, 'kW', ?, 'good', ?)
  `);
  for (const [metricScope, metricKey] of [
    ["cl", "factoryGeneration.powerKw"],
    ["kn", "solarZone.roof.powerKw"],
    ["global", "factoryGeneration.powerKw"],
    ["global", "solarZone.roof.powerKw"]
  ] as const) {
    insertLive.run(metricScope, metricKey, observedAt, JSON.stringify({ source: "derived-metric-registry" }));
  }

  registry.initializeDerivedMetricRegistry(database);

  assert.deepEqual(
    database.prepare(`
      SELECT metric_scope, metric_key FROM live_metric_values
      WHERE metric_key IN ('factoryGeneration.powerKw', 'solarZone.roof.powerKw')
      ORDER BY metric_scope, metric_key
    `).all(),
    [
      { metric_scope: "cl", metric_key: "factoryGeneration.powerKw" },
      { metric_scope: "kn", metric_key: "solarZone.roof.powerKw" }
    ]
  );
});

test("catalog exposes only declared site scopes for managed Factory totals", () => {
  registry.initializeDerivedMetricRegistry();
  const jungli = catalogService.resolveServerPlaybackMetricCatalog("factory-circuit")
    .find(({ metricKey }) => metricKey === "totalPower");
  const guanyin = catalogService.resolveServerPlaybackMetricCatalog("factory-circuit-guanyin")
    .find(({ metricKey }) => metricKey === "totalPower");
  assert.deepEqual(jungli?.allowedScopes, ["inherit-device", "cl"]);
  assert.deepEqual(guanyin?.allowedScopes, ["inherit-device", "kn"]);
});

test("rejects empty, duplicate, and unknown site allowlists", () => {
  const database = databaseModule.getDatabase();
  registry.initializeDerivedMetricRegistry(database);
  for (const [index, siteScopes] of [[0, []], [1, ["cl", "cl"]], [2, ["global"]]] as const) {
    const definition = {
      ...customDefinition(`custom.invalidSiteAllowlist${index}`),
      siteScopes
    } as unknown as DerivedMetricDefinition;
    assert.throws(() => registry.saveDerivedMetricDefinition(definition, database), /validation failed/u);
  }
});

test("evaluates Jungli and Guanyin Factory Circuit totals from their page slot contracts", () => {
  const database = databaseModule.getDatabase();
  registry.initializeDerivedMetricRegistry(database);
  const insert = database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES (?, ?, ?, 'kW', '2026-08-30T08:00:00.000Z', 'good', '{}')
  `);
  const metricKeys = [
    "stamping", "body", "painting", "assembly", "utility", "office",
    "heavyVehicle", "edCoating"
  ].map((slot) => `factoryCircuit.${slot}Power`);
  metricKeys.forEach((metricKey, index) => {
    insert.run("cl", metricKey, index + 1);
    insert.run("kn", metricKey, (index + 1) * 10);
  });

  registry.evaluateDerivedMetrics(database, new Date("2026-08-30T08:00:10.000Z"));

  assert.equal(
    registry.readDerivedMetricEvaluation("cl", "factoryCircuit.jungliTotalPower", database)?.value,
    21
  );
  assert.equal(
    registry.readDerivedMetricEvaluation("kn", "factoryCircuit.guanyinTotalPower", database)?.value,
    360
  );
  assert.equal(registry.readDerivedMetricEvaluation("kn", "factoryCircuit.jungliTotalPower", database), null);
  assert.equal(registry.readDerivedMetricEvaluation("cl", "factoryCircuit.guanyinTotalPower", database), null);
});

test("evaluates a two-level site DAG in dependency order", () => {
  const database = databaseModule.getDatabase();
  registry.initializeDerivedMetricRegistry(database);
  registry.saveDerivedMetricDefinition(customDefinition("custom.doublePower"), database);
  registry.saveDerivedMetricDefinition({
    ...customDefinition("custom.quadPower", "upstream * 2"),
    inputs: [{ alias: "upstream", kind: "metric", metricKey: "custom.doublePower", scope: "output-site", unit: "kW" }]
  }, database);
  database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES ('cl', 'realTimePower', 12, 'kW', '2026-08-30T08:00:00.000Z', 'good', '{}')
  `).run();

  registry.evaluateDerivedMetrics(database, new Date("2026-08-30T08:00:10.000Z"));

  assert.equal(registry.readDerivedMetricEvaluation("cl", "custom.doublePower", database)?.value, 24);
  assert.equal(registry.readDerivedMetricEvaluation("cl", "custom.quadPower", database)?.value, 48);
});

test("evaluates only transitively affected nodes for a metric change", () => {
  const database = databaseModule.getDatabase();
  database.prepare(`
    INSERT INTO topic_mappings (metric_scope, metric_key, topic, value_path, unit, enabled)
    VALUES ('cl', 'custom.unrelatedSource', 'test/unrelated-source', '$.value', 'kW', 1)
  `).run();
  registry.initializeDerivedMetricRegistry(database);
  registry.saveDerivedMetricDefinition(customDefinition("custom.changedDouble"), database);
  registry.saveDerivedMetricDefinition({
    ...customDefinition("custom.changedQuad", "upstream * 2"),
    inputs: [{ alias: "upstream", kind: "metric", metricKey: "custom.changedDouble", scope: "output-site", unit: "kW" }]
  }, database);
  registry.saveDerivedMetricDefinition({
    ...customDefinition("custom.unrelated", "source * 3"),
    inputs: [{ alias: "source", kind: "metric", metricKey: "custom.unrelatedSource", scope: "cl", unit: "kW" }]
  }, database);
  const insertLive = database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES (?, ?, ?, 'kW', ?, 'good', '{}')
    ON CONFLICT(metric_scope, metric_key) DO UPDATE SET
      value = excluded.value,
      timestamp = excluded.timestamp,
      quality = excluded.quality,
      raw_payload = excluded.raw_payload
  `);
  insertLive.run("cl", "realTimePower", 12, "2026-08-30T08:00:00.000Z");
  insertLive.run("cl", "custom.unrelatedSource", 5, "2026-08-30T08:00:00.000Z");
  registry.evaluateDerivedMetrics(database, new Date("2026-08-30T08:00:10.000Z"));

  const readEvaluationRow = (metricScope = "cl", metricKey = "custom.unrelated") => database.prepare(`
    SELECT * FROM derived_metric_evaluations
    WHERE metric_scope = ? AND metric_key = ?
  `).get(metricScope, metricKey);
  const readLiveRow = (metricScope = "cl", metricKey = "custom.unrelated") => database.prepare(`
    SELECT * FROM live_metric_values
    WHERE metric_scope = ? AND metric_key = ?
  `).get(metricScope, metricKey);
  const previousEvaluation = readEvaluationRow();
  const previousLive = readLiveRow();
  const previousKnEvaluations = ["custom.changedDouble", "custom.changedQuad"]
    .map((metricKey) => readEvaluationRow("kn", metricKey));

  insertLive.run("cl", "realTimePower", 13, "2026-08-30T08:00:20.000Z");
  registry.evaluateDerivedMetrics(database, new Date("2026-08-30T08:00:20.000Z"), {
    changedMetrics: [{ metricScope: "cl", metricKey: "realTimePower" }]
  });

  assert.equal(registry.readDerivedMetricEvaluation("cl", "custom.changedDouble", database)?.value, 26);
  assert.equal(registry.readDerivedMetricEvaluation("cl", "custom.changedQuad", database)?.value, 52);
  assert.deepEqual(readEvaluationRow(), previousEvaluation);
  assert.deepEqual(readLiveRow(), previousLive);
  assert.deepEqual(
    ["custom.changedDouble", "custom.changedQuad"].map((metricKey) => readEvaluationRow("kn", metricKey)),
    previousKnEvaluations
  );
});

test("evaluates only setting-dependent chains when a calculation setting changes", () => {
  const database = databaseModule.getDatabase();
  registry.initializeDerivedMetricRegistry(database);
  registry.saveDerivedMetricDefinition({
    ...customDefinition("custom.settingDouble", "factor * 2"),
    inputs: [{
      alias: "factor",
      kind: "calculation-setting",
      settingKey: "carbonEmissionFactor",
      unit: "kg/kWh"
    }],
    outputUnit: "kg/kWh",
    precision: 6
  }, database);
  registry.saveDerivedMetricDefinition({
    ...customDefinition("custom.settingQuad", "upstream * 2"),
    inputs: [{
      alias: "upstream",
      kind: "metric",
      metricKey: "custom.settingDouble",
      scope: "output-site",
      unit: "kg/kWh"
    }],
    outputUnit: "kg/kWh",
    precision: 6
  }, database);
  registry.saveDerivedMetricDefinition({
    ...customDefinition("custom.settingUnrelated", "tariff * 2"),
    inputs: [{
      alias: "tariff",
      kind: "calculation-setting",
      settingKey: "estimatedTariffPerKwh",
      unit: "TWD/kWh"
    }],
    outputUnit: "TWD/kWh",
    precision: 6
  }, database);

  registry.evaluateDerivedMetrics(database, new Date("2026-08-30T08:00:10.000Z"));
  const readUnrelatedRows = () => database.prepare(`
    SELECT * FROM derived_metric_evaluations
    WHERE metric_key = 'custom.settingUnrelated'
    ORDER BY metric_scope
  `).all();
  const previousUnrelatedRows = readUnrelatedRows();

  database.prepare(`
    UPDATE calculation_settings
    SET carbon_emission_factor = 0.5, revision = revision + 1
    WHERE id = 1
  `).run();
  registry.evaluateDerivedMetrics(database, new Date("2026-08-30T08:00:20.000Z"), {
    changedSettings: ["carbonEmissionFactor"]
  });

  assert.equal(registry.readDerivedMetricEvaluation("cl", "custom.settingDouble", database)?.value, 1);
  assert.equal(registry.readDerivedMetricEvaluation("cl", "custom.settingQuad", database)?.value, 2);
  assert.deepEqual(readUnrelatedRows(), previousUnrelatedRows);
});

test("resolves an explicitly global metric input under the global output scope", () => {
  const database = databaseModule.getDatabase();
  database.prepare(`
    INSERT INTO topic_mappings (metric_scope, metric_key, topic, value_path, unit, enabled)
    VALUES ('global', 'custom.globalSource', 'test/global-source', '$.value', 'kW', 1)
  `).run();
  database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES ('global', 'custom.globalSource', 7, 'kW', '2026-08-30T08:00:00.000Z', 'good', '{}')
  `).run();
  registry.initializeDerivedMetricRegistry(database);
  registry.saveDerivedMetricDefinition({
    ...customDefinition("custom.globalMetric", "source * 2"),
    inputs: [{ alias: "source", kind: "metric", metricKey: "custom.globalSource", scope: "global", unit: "kW" }],
    metricKey: "custom.globalMetric",
    name: "Global Metric",
    outputScopePolicy: "global"
  }, database);

  registry.evaluateDerivedMetrics(database, new Date("2026-08-30T08:00:10.000Z"));

  assert.equal(
    registry.readDerivedMetricEvaluation("global", "custom.globalMetric", database)?.value,
    14
  );
  assert.equal(registry.readDerivedMetricEvaluation("cl", "custom.globalMetric", database), null);
});

test("previews a candidate against the current registry DAG without persisting it", () => {
  const database = databaseModule.getDatabase();
  registry.initializeDerivedMetricRegistry(database);
  registry.saveDerivedMetricDefinition(customDefinition("custom.doublePower"), database);
  database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES ('cl', 'realTimePower', 12, 'kW', '2026-08-30T08:00:00.000Z', 'good', '{}')
  `).run();

  const preview = registry.previewDerivedMetricDefinition({
    ...customDefinition("custom.quadPower", "upstream * 2"),
    inputs: [{ alias: "upstream", kind: "metric", metricKey: "custom.doublePower", scope: "output-site", unit: "kW" }]
  }, "cl", database, new Date("2026-08-30T08:00:10.000Z"));

  assert.equal(preview.status, "ready");
  assert.equal(preview.value, 48);
  assert.equal(
    registry.listDerivedMetricDefinitions(database).some(({ metricKey }) => metricKey === "custom.quadPower"),
    false
  );
  assert.equal(registry.readDerivedMetricEvaluation("cl", "custom.quadPower", database), null);
});

test("rejects cyclic edits atomically and leaves the prior definition active", () => {
  const database = databaseModule.getDatabase();
  registry.initializeDerivedMetricRegistry(database);
  registry.saveDerivedMetricDefinition(customDefinition("custom.a"), database);
  registry.saveDerivedMetricDefinition({
    ...customDefinition("custom.b", "a * 1"),
    inputs: [{ alias: "a", kind: "metric", metricKey: "custom.a", scope: "output-site", unit: "kW" }]
  }, database);

  assert.throws(() => registry.saveDerivedMetricDefinition({
    ...customDefinition("custom.a", "b * 1"),
    inputs: [{ alias: "b", kind: "metric", metricKey: "custom.b", scope: "output-site", unit: "kW" }]
  }, database), (error: unknown) => {
    assert.equal((error as { code?: string }).code, "derived_metric_validation_failed");
    return true;
  });
  assert.equal(registry.readDerivedMetricDefinition("custom.a", database).expression, "source * 2");
});

test("preview is read-only and unavailable fallback removes a failed current value", () => {
  const database = databaseModule.getDatabase();
  registry.initializeDerivedMetricRegistry(database);
  const definition = customDefinition("custom.preview");
  const preview = registry.previewDerivedMetricDefinition(definition, "cl", database);
  assert.equal(preview.status, "unavailable");
  assert.equal(registry.listDerivedMetricDefinitions(database).some(({ metricKey }) => metricKey === definition.metricKey), false);
});

test("rejects unallowlisted settings and scoped source collisions", () => {
  const database = databaseModule.getDatabase();
  registry.initializeDerivedMetricRegistry(database);
  assert.throws(() => registry.saveDerivedMetricDefinition({
    ...customDefinition("custom.secret"),
    expression: "secret",
    inputs: [{ alias: "secret", kind: "calculation-setting", settingKey: "mqttPassword", unit: "" }]
  }, database), /validation failed/u);

  database.prepare(`
    INSERT INTO topic_mappings (metric_scope, metric_key, topic, value_path, unit, enabled)
    VALUES ('cl', 'custom.collision', 'test/collision', '$.value', 'kW', 1)
  `).run();
  assert.throws(
    () => registry.saveDerivedMetricDefinition(customDefinition("custom.collision"), database),
    /validation failed/u
  );

  assert.throws(() => registry.saveDerivedMetricDefinition({
    ...customDefinition("custom.unknown"),
    inputs: [{
      alias: "source",
      kind: "metric",
      metricKey: "missingMetric",
      scope: "output-site",
      unit: "kW"
    }]
  }, database), (error: unknown) => {
    assert.equal(
      (error as { errors?: Array<{ code: string }> }).errors?.some(({ code }) => code === "unknown-input"),
      true
    );
    return true;
  });

  registry.saveDerivedMetricDefinition({
    ...customDefinition("custom.scopedSolarSource"),
    inputs: [{
      alias: "source",
      kind: "metric",
      metricKey: "factoryGeneration.powerKw",
      scope: "output-site",
      unit: "kW"
    }]
  }, database);
  registry.saveDerivedMetricDefinition({
    ...customDefinition("custom.explicitKnSolarSource"),
    inputs: [{
      alias: "source",
      kind: "metric",
      metricKey: "solarZone.roof.powerKw",
      scope: "kn",
      unit: "kW"
    }]
  }, database);
  assert.throws(() => registry.saveDerivedMetricDefinition({
    ...customDefinition("custom.globalSolarSource"),
    inputs: [{
      alias: "source",
      kind: "metric",
      metricKey: "factoryGeneration.powerKw",
      scope: "global",
      unit: "kW"
    }]
  }, database), (error: unknown) => {
    assert.equal(
      (error as { errors?: Array<{ code: string }> }).errors?.some(({ code }) => code === "unknown-input"),
      true
    );
    return true;
  });
});

test("rejects enabled topic mappings that collide with managed definitions", () => {
  const database = databaseModule.getDatabase();
  database.prepare(`
    INSERT INTO topic_mappings (metric_scope, metric_key, topic, value_path, unit, enabled)
    VALUES ('cl', 'selfConsumptionRatio', 'test/self-consumption-ratio', '$.value', '%', 1)
  `).run();

  const snapshot = registry.initializeDerivedMetricRegistry(database);
  assert.equal(snapshot.nodes.some(({ nodeId }) => nodeId === "cl:selfConsumptionRatio"), false);
  assert.equal(
    registry.readDerivedMetricRegistryDiagnostics(database).find(({ metricKey }) => metricKey === "selfConsumptionRatio")?.errors
      .some(({ code }) => code === "metric-key-conflict"),
    true,
  );
});

test("fails soft on stored unknown inputs while retaining valid definitions and reporting exclusions", () => {
  const database = databaseModule.getDatabase();
  database.prepare(`
    INSERT INTO derived_metric_definitions (
      metric_key, name, description, output_scope_policy, expression, output_unit,
      precision, fallback_policy, acceptance_policy, enabled, managed, revision,
      created_at, updated_at
    ) VALUES (?, 'Stored invalid', 'stored test', 'site', 'source * 2', 'kW', 1, 'unavailable', NULL, 1, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run("custom.storedUnknown");
  database.prepare(`
    INSERT INTO derived_metric_inputs (
      derived_metric_key, alias, input_kind, metric_key, scope_selector, setting_key, unit, sort_order
    ) VALUES (?, 'source', 'metric', 'missingStoredMetric', 'output-site', NULL, 'kW', 0)
  `).run("custom.storedUnknown");

  const snapshot = registry.initializeDerivedMetricRegistry(database);
  assert.equal(snapshot.nodes.some(({ nodeId }) => nodeId === "cl:custom.storedUnknown"), false);
  assert.equal(snapshot.nodes.length > 0, true);
  const diagnostic = registry.readDerivedMetricRegistryDiagnostics(database).find(({ metricKey }) => metricKey === "custom.storedUnknown");
  assert.equal(diagnostic?.errors.some(({ code }) => code === "unknown-input"), true);
});

test("retires stored evaluations and catalog entries for definitions excluded on restart", () => {
  const database = databaseModule.getDatabase();
  registry.initializeDerivedMetricRegistry(database);
  const metricKey = "custom.storedRestart";
  registry.saveDerivedMetricDefinition(customDefinition(metricKey), database);
  database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES ('cl', 'realTimePower', 12, 'kW', '2026-08-30T08:00:00.000Z', 'good', '{}')
  `).run();
  registry.evaluateDerivedMetrics(database, new Date("2026-08-30T08:00:10.000Z"));
  assert.equal(registry.readDerivedMetricEvaluation("cl", metricKey, database)?.value, 24);
  assert.equal(
    database.prepare(`
      SELECT value FROM live_metric_values WHERE metric_scope = ? AND metric_key = ?
    `).pluck().get("cl", metricKey),
    24
  );
  assert.equal(
    catalogService.resolveServerPlaybackMetricCatalog("overview").some(({ metricKey: key }) => key === metricKey),
    true
  );

  database.prepare(`
    INSERT INTO topic_mappings (metric_scope, metric_key, topic, value_path, unit, enabled)
    VALUES ('cl', ?, 'legacy/stored-restart', '$.value', 'kW', 0)
  `).run(metricKey);

  database.prepare(`
    UPDATE derived_metric_inputs SET metric_key = ? WHERE derived_metric_key = ?
  `).run("missingStoredMetric", metricKey);
  databaseModule.closeDatabaseConnection();
  const reopened = databaseModule.getDatabase();
  const snapshot = registry.initializeDerivedMetricRegistry(reopened);

  assert.equal(snapshot.nodes.some(({ nodeId }) => nodeId === `cl:${metricKey}`), false);
  assert.equal(registry.readDerivedMetricEvaluation("cl", metricKey, reopened), null);
  assert.equal(
    reopened.prepare(`
      SELECT value FROM live_metric_values WHERE metric_scope = ? AND metric_key = ?
    `).pluck().get("cl", metricKey),
    24
  );
  assert.equal(
    catalogService.resolveServerPlaybackMetricCatalog("overview").some(({ metricKey: key }) => key === metricKey),
    false
  );
  assert.equal(
    registry.readDerivedMetricRegistryDiagnostics(reopened)
      .find(({ metricKey: key }) => key === metricKey)
      ?.errors.some(({ code }) => code === "unknown-input"),
    true
  );
});

test("fails soft on stored cycles while retaining the acyclic registry", () => {
  const database = databaseModule.getDatabase();
  for (const [metricKey, inputMetricKey] of [
    ["custom.storedCycleA", "custom.storedCycleB"],
    ["custom.storedCycleB", "custom.storedCycleA"]
  ]) {
    database.prepare(`
      INSERT INTO derived_metric_definitions (
        metric_key, name, description, output_scope_policy, expression, output_unit,
        precision, fallback_policy, acceptance_policy, enabled, managed, revision,
        created_at, updated_at
      ) VALUES (?, ?, 'stored test', 'site', 'source * 2', 'kW', 1, 'unavailable', NULL, 1, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(metricKey, metricKey);
    database.prepare(`
      INSERT INTO derived_metric_inputs (
        derived_metric_key, alias, input_kind, metric_key, scope_selector, setting_key, unit, sort_order
      ) VALUES (?, 'source', 'metric', ?, 'output-site', NULL, 'kW', 0)
    `).run(metricKey, inputMetricKey);
  }

  const snapshot = registry.initializeDerivedMetricRegistry(database);
  assert.equal(snapshot.nodes.some(({ nodeId }) => nodeId.includes("custom.storedCycle")), false);
  for (const metricKey of ["custom.storedCycleA", "custom.storedCycleB"]) {
    assert.equal(
      registry.readDerivedMetricRegistryDiagnostics(database).find(({ metricKey: key }) => key === metricKey)?.errors
        .some(({ code }) => code === "cycle"),
      true,
    );
  }
});

test("persists setting revision and bounded transitive provenance", () => {
  const database = databaseModule.getDatabase();
  registry.initializeDerivedMetricRegistry(database);
  database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES ('cl', 'factoryGeneration.todayMwh', 1, 'MWh', '2026-08-30T08:00:00.000Z', 'good', '{"timestamp":"2026-08-30T08:00:00.000Z"}')
  `).run();
  registry.evaluateDerivedMetrics(database, new Date("2026-08-30T08:00:10.000Z"));
  const co2 = registry.readDerivedMetricEvaluation("cl", "todayCo2Reduction", database);
  assert.equal(co2?.value, 0.467);
  assert.equal(co2?.outputUnit, "t");
  assert.deepEqual(
    database.prepare(`
      SELECT value, unit FROM live_metric_values
      WHERE metric_scope = 'cl' AND metric_key = 'todayCo2Reduction'
    `).get(),
    { value: 0.467, unit: "t" }
  );
  assert.equal(co2?.dependencies.find(({ settingKey }) => settingKey === "carbonEmissionFactor")?.settingRevision, "1");

  registry.saveDerivedMetricDefinition({
    ...customDefinition("custom.co2Double", "co2 * 2"),
    inputs: [{ alias: "co2", kind: "metric", metricKey: "todayCo2Reduction", scope: "output-site", unit: "t" }],
    outputUnit: "t"
  }, database);
  const nested = registry.readDerivedMetricEvaluation("cl", "custom.co2Double", database);
  assert.equal(nested?.dependencies[0]?.upstream?.some(({ settingKey }) => settingKey === "carbonEmissionFactor"), true);
});

test("converts output scale changes for retain-last-good and cumulative acceptance", () => {
  const database = databaseModule.getDatabase();
  const metricKey = "custom.scaleEnergy";
  database.prepare(`
    UPDATE calculation_settings SET carbon_emission_factor = 1, revision = revision + 1 WHERE id = 1
  `).run();
  database.prepare(`
    INSERT INTO topic_mappings (metric_scope, metric_key, topic, value_path, unit, enabled)
    VALUES ('cl', 'custom.scaleEnergySource', 'test/scale-energy', '$.value', 'kWh', 1)
  `).run();
  const sourceTimestamp = new Date().toISOString();
  const upsert = database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES ('cl', 'custom.scaleEnergySource', ?, 'kWh', ?, 'good', '{}')
    ON CONFLICT(metric_scope, metric_key) DO UPDATE SET value = excluded.value, unit = excluded.unit
  `);
  upsert.run(1000, sourceTimestamp);
  registry.initializeDerivedMetricRegistry(database);
  const definition: DerivedMetricDefinition = {
    ...customDefinition(metricKey, "energy * factor"),
    acceptancePolicy: "cumulative-nondecreasing",
    fallbackPolicy: "retain-last-good",
    inputs: [
      { alias: "energy", kind: "metric", metricKey: "custom.scaleEnergySource", scope: "output-site", unit: "kWh" },
      { alias: "factor", kind: "calculation-setting", settingKey: "carbonEmissionFactor", unit: "kg/kWh" }
    ],
    outputUnit: "t",
    precision: 6
  };
  registry.saveDerivedMetricDefinition(definition, database);
  assert.equal(registry.readDerivedMetricEvaluation("cl", metricKey, database)?.status, "ready");
  assert.equal(registry.readDerivedMetricEvaluation("cl", metricKey, database)?.value, 1);

  database.prepare(`
    DELETE FROM live_metric_values WHERE metric_scope = 'cl' AND metric_key = 'custom.scaleEnergySource'
  `).run();
  registry.saveDerivedMetricDefinition({ ...definition, outputUnit: "kg" }, database);
  const retainedKg = registry.readDerivedMetricEvaluation("cl", metricKey, database);
  assert.equal(retainedKg?.status, "degraded");
  assert.equal(retainedKg?.retainedLastGood, true);
  assert.equal(retainedKg?.value, 1000);
  assert.deepEqual(
    database.prepare(`
      SELECT value, unit FROM live_metric_values WHERE metric_scope = 'cl' AND metric_key = ?
    `).get(metricKey),
    { value: 1000, unit: "kg" }
  );

  upsert.run(1000, sourceTimestamp);
  registry.saveDerivedMetricDefinition(definition, database);
  const convertedBack = registry.readDerivedMetricEvaluation("cl", metricKey, database);
  assert.equal(convertedBack?.status, "ready");
  assert.equal(convertedBack?.value, 1);
});

test("normalizes stored live reading units before conversion", () => {
  const database = databaseModule.getDatabase();
  const observedAt = new Date().toISOString();
  const cases = [
    { metricKey: "custom.lowercaseEnergy", sourceKey: "custom.lowercaseEnergySource", storedUnit: "kwh", declaredUnit: "kWh", value: 3, expected: 6 },
    { metricKey: "custom.uppercasePower", sourceKey: "custom.uppercasePowerSource", storedUnit: "KW", declaredUnit: "kW", value: 4, expected: 8 }
  ];

  for (const { metricKey, sourceKey, storedUnit, declaredUnit, value, expected } of cases) {
    database.prepare(`
      INSERT INTO topic_mappings (metric_scope, metric_key, topic, value_path, unit, enabled)
      VALUES ('cl', ?, ?, '$.value', ?, 1)
    `).run(sourceKey, `test/${sourceKey}`, declaredUnit);
    database.prepare(`
      INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
      VALUES ('cl', ?, ?, ?, ?, 'good', '{}')
    `).run(sourceKey, value, storedUnit, observedAt);
    registry.initializeDerivedMetricRegistry(database);
    registry.saveDerivedMetricDefinition({
      ...customDefinition(metricKey, "source * 2"),
      inputs: [{ alias: "source", kind: "metric", metricKey: sourceKey, scope: "output-site", unit: declaredUnit }],
      outputUnit: declaredUnit
    }, database);
    const evaluation = registry.readDerivedMetricEvaluation("cl", metricKey, database);
    assert.equal(evaluation?.status, "ready");
    assert.equal(evaluation?.value, expected);
  }
});

test("does not adopt the declared unit for a unitless stored reading", () => {
  const database = databaseModule.getDatabase();
  const metricKey = "custom.unitlessReading";
  const sourceKey = "custom.unitlessReadingSource";
  database.prepare(`
    INSERT INTO topic_mappings (metric_scope, metric_key, topic, value_path, unit, enabled)
    VALUES ('cl', ?, 'test/unitless-reading', '$.value', NULL, 1)
  `).run(sourceKey);
  database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES ('cl', ?, 12, NULL, ?, 'good', '{}')
  `).run(sourceKey, new Date().toISOString());
  registry.initializeDerivedMetricRegistry(database);
  registry.saveDerivedMetricDefinition({
    ...customDefinition(metricKey, "source * 2"),
    fallbackPolicy: "unavailable",
    inputs: [{ alias: "source", kind: "metric", metricKey: sourceKey, scope: "output-site", unit: "MWh" }],
    outputUnit: "MWh"
  }, database);

  const evaluation = registry.readDerivedMetricEvaluation("cl", metricKey, database);
  assert.equal(evaluation?.status, "unavailable");
  assert.equal(evaluation?.failureCode, "invalid-input");
  assert.equal(evaluation?.value, null);
  assert.equal(
    database.prepare("SELECT value FROM live_metric_values WHERE metric_scope = ? AND metric_key = ?")
      .pluck().get("cl", metricKey),
    undefined
  );
});

test("retains the last complete global generation when one site source becomes stale", () => {
  const database = databaseModule.getDatabase();
  registry.initializeDerivedMetricRegistry(database);
  const upsert = database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES (?, 'factoryGeneration.todayMwh', ?, 'MWh', ?, 'good', ?)
    ON CONFLICT(metric_scope, metric_key) DO UPDATE SET
      value = excluded.value,
      timestamp = excluded.timestamp,
      raw_payload = excluded.raw_payload
  `);
  const current = "2026-08-30T08:00:00.000Z";
  upsert.run("cl", 1, current, JSON.stringify({ timestamp: current }));
  upsert.run("kn", 2, current, JSON.stringify({ timestamp: current }));
  registry.evaluateDerivedMetrics(database, new Date("2026-08-30T08:00:10.000Z"));
  assert.equal(registry.readDerivedMetricEvaluation("global", "todayGeneration", database)?.value, 3);

  const stale = "2026-08-29T06:00:00.000Z";
  upsert.run("cl", 5, current, JSON.stringify({ timestamp: current }));
  upsert.run("kn", 2, current, JSON.stringify({ timestamp: stale }));
  registry.evaluateDerivedMetrics(database, new Date("2026-08-30T08:00:20.000Z"));
  const retained = registry.readDerivedMetricEvaluation("global", "todayGeneration", database);
  assert.equal(retained?.value, 3);
  assert.equal(retained?.status, "degraded");
  assert.equal(retained?.retainedLastGood, true);
  assert.equal(retained?.failureCode, "input-stale");
  assert.equal(retained?.dependencies.some(({ metricScope }) => metricScope === "kn"), true);
});

test("retains global generation and records an unavailable KN dependency", () => {
  const database = databaseModule.getDatabase();
  registry.initializeDerivedMetricRegistry(database);
  const upsert = database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES (?, 'factoryGeneration.todayMwh', ?, 'MWh', ?, 'good', ?)
    ON CONFLICT(metric_scope, metric_key) DO UPDATE SET
      value = excluded.value,
      timestamp = excluded.timestamp,
      raw_payload = excluded.raw_payload
  `);
  const current = "2026-08-30T08:00:00.000Z";
  upsert.run("cl", 1, current, JSON.stringify({ timestamp: current }));
  upsert.run("kn", 2, current, JSON.stringify({ timestamp: current }));
  registry.evaluateDerivedMetrics(database, new Date("2026-08-30T08:00:10.000Z"));
  assert.equal(registry.readDerivedMetricEvaluation("global", "todayGeneration", database)?.value, 3);

  database.prepare(`
    DELETE FROM live_metric_values
    WHERE metric_scope = 'kn' AND metric_key = 'factoryGeneration.todayMwh'
  `).run();
  registry.evaluateDerivedMetrics(database, new Date("2026-08-30T08:00:20.000Z"));

  const retained = registry.readDerivedMetricEvaluation("global", "todayGeneration", database);
  assert.equal(retained?.status, "degraded");
  assert.equal(retained?.retainedLastGood, true);
  assert.equal(retained?.failureCode, "input-unavailable");
  assert.deepEqual(
    retained?.dependencies.find(({ alias }) => alias === "knValue"),
    {
      alias: "knValue",
      kind: "metric",
      metricKey: "factoryGeneration.todayMwh",
      metricScope: "kn",
      unit: "MWh",
      value: null
    }
  );
});

test("adds enabled custom definitions to the widget catalog by semantic key", () => {
  registry.initializeDerivedMetricRegistry();
  registry.saveDerivedMetricDefinition(customDefinition("custom.widgetPower"));
  const entry = catalogService.resolveServerPlaybackMetricCatalog("overview")
    .find(({ metricKey }) => metricKey === "custom.widgetPower");
  assert.deepEqual(entry?.allowedScopes, ["inherit-device", "cl", "kn"]);
  assert.equal(entry?.dependencyKeys.includes("custom.widgetPower"), true);
  assert.equal(entry?.sourceClass, "derived-metric");
});

test("unavailable fallback clears a previously materialized value", () => {
  const database = databaseModule.getDatabase();
  registry.initializeDerivedMetricRegistry(database);
  registry.saveDerivedMetricDefinition(customDefinition("custom.unavailable"), database);
  database.prepare(`
   INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run("cl", "realTimePower", 12, "kW", "2026-08-30T08:00:00.000Z", "good", "{}");

  registry.evaluateDerivedMetrics(database, new Date("2026-08-30T08:00:10.000Z"));
  assert.equal(registry.readDerivedMetricEvaluation("cl", "custom.unavailable", database)?.value, 24);
  assert.equal(
    database.prepare(`
     SELECT value FROM live_metric_values
      WHERE metric_scope = ? AND metric_key = ?
    `).pluck().get("cl", "custom.unavailable"),
    24
  );

  database.prepare(`
   DELETE FROM live_metric_values
    WHERE metric_scope = ? AND metric_key = ?
  `).run("cl", "realTimePower");
  registry.evaluateDerivedMetrics(database, new Date("2026-08-30T08:00:20.000Z"));

  const unavailable = registry.readDerivedMetricEvaluation("cl", "custom.unavailable", database);
  assert.equal(unavailable?.status, "unavailable");
  assert.equal(unavailable?.value, null);
  assert.equal(unavailable?.timestamp, null);
  assert.equal(
    database.prepare(`
     SELECT value FROM live_metric_values
      WHERE metric_scope = ? AND metric_key = ?
    `).pluck().get("cl", "custom.unavailable"),
    undefined
  );
});

test("rejects a direct cross-scope cycle without replacing the active snapshot", () => {
  const database = databaseModule.getDatabase();
  registry.initializeDerivedMetricRegistry(database);
  registry.saveDerivedMetricDefinition(customDefinition("custom.crossSite", "source * 2"), database);
  registry.saveDerivedMetricDefinition({
    ...customDefinition("custom.crossGlobal", "siteValue * 2"),
    inputs: [{ alias: "siteValue", kind: "metric", metricKey: "custom.crossSite", scope: "cl", unit: "kW" }],
    metricKey: "custom.crossGlobal",
    name: "Cross-scope Global",
    outputScopePolicy: "global"
  }, database);
  database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES ('cl', 'realTimePower', 3, 'kW', '2026-08-30T08:00:00.000Z', 'good', '{}')
  `).run();
  registry.evaluateDerivedMetrics(database, new Date("2026-08-30T08:00:10.000Z"));
  const priorRevision = database.prepare("SELECT revision FROM derived_metric_registry_state WHERE id = 1").pluck().get();

  assert.throws(() => registry.saveDerivedMetricDefinition({
    ...customDefinition("custom.crossSite", "globalValue * 1"),
    inputs: [{ alias: "globalValue", kind: "metric", metricKey: "custom.crossGlobal", scope: "global", unit: "kW" }]
  }, database), /validation failed/u);

  assert.equal(database.prepare("SELECT revision FROM derived_metric_registry_state WHERE id = 1").pluck().get(), priorRevision);
  assert.equal(registry.readDerivedMetricDefinition("custom.crossSite", database).expression, "source * 2");
  registry.evaluateDerivedMetrics(database, new Date("2026-08-30T08:00:20.000Z"));
  assert.equal(registry.readDerivedMetricEvaluation("cl", "custom.crossSite", database)?.value, 6);
  assert.equal(registry.readDerivedMetricEvaluation("global", "custom.crossGlobal", database)?.value, 12);
});

test("indexes reverse dependencies for each expanded site node", () => {
  const database = databaseModule.getDatabase();
  registry.initializeDerivedMetricRegistry(database);
  registry.saveDerivedMetricDefinition(customDefinition("custom.reverseUpstream"), database);
  registry.saveDerivedMetricDefinition({
    ...customDefinition("custom.reverseDownstream", "upstream * 2"),
    inputs: [{ alias: "upstream", kind: "metric", metricKey: "custom.reverseUpstream", scope: "output-site", unit: "kW" }]
  }, database);

  const snapshot = registry.initializeDerivedMetricRegistry(database);
  assert.deepEqual(snapshot.reverseMetricDependencies.get("cl:custom.reverseUpstream"), ["cl:custom.reverseDownstream"]);
  assert.deepEqual(snapshot.reverseMetricDependencies.get("kn:custom.reverseUpstream"), ["kn:custom.reverseDownstream"]);
});

test("rejects an indirect cross-scope cycle without replacing the active snapshot", () => {
  const database = databaseModule.getDatabase();
  registry.initializeDerivedMetricRegistry(database);
  registry.saveDerivedMetricDefinition(customDefinition("custom.crossA", "source * 2"), database);
  registry.saveDerivedMetricDefinition({
    ...customDefinition("custom.crossB", "a * 2"),
    inputs: [{ alias: "a", kind: "metric", metricKey: "custom.crossA", scope: "cl", unit: "kW" }],
    metricKey: "custom.crossB",
    name: "Cross-scope B",
    outputScopePolicy: "global"
  }, database);
  registry.saveDerivedMetricDefinition({
    ...customDefinition("custom.crossC", "b * 2"),
    inputs: [{ alias: "b", kind: "metric", metricKey: "custom.crossB", scope: "global", unit: "kW" }],
    metricKey: "custom.crossC",
    name: "Cross-scope C"
  }, database);
  database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES ('cl', 'realTimePower', 2, 'kW', '2026-08-30T08:00:00.000Z', 'good', '{}')
  `).run();
  registry.evaluateDerivedMetrics(database, new Date("2026-08-30T08:00:10.000Z"));

  assert.throws(() => registry.saveDerivedMetricDefinition({
    ...customDefinition("custom.crossA", "c * 1"),
    inputs: [{ alias: "c", kind: "metric", metricKey: "custom.crossC", scope: "cl", unit: "kW" }]
  }, database), /validation failed/u);

  assert.equal(registry.readDerivedMetricDefinition("custom.crossA", database).expression, "source * 2");
  registry.evaluateDerivedMetrics(database, new Date("2026-08-30T08:00:20.000Z"));
  assert.equal(registry.readDerivedMetricEvaluation("cl", "custom.crossA", database)?.value, 4);
  assert.equal(registry.readDerivedMetricEvaluation("global", "custom.crossB", database)?.value, 8);
  assert.equal(registry.readDerivedMetricEvaluation("cl", "custom.crossC", database)?.value, 16);
});

test("keeps the compiled runtime snapshot immutable", () => {
  const database = databaseModule.getDatabase();
  const snapshot = registry.initializeDerivedMetricRegistry(database);

  assert.throws(() => (snapshot.nodes as unknown as unknown[]).pop(), TypeError);
  assert.throws(
    () => (snapshot.definitions as unknown as Map<string, unknown>).set("custom.mutated", {}),
    TypeError
  );
  assert.throws(() => {
    (snapshot.nodes[0] as unknown as { metricScope: string }).metricScope = "global";
  }, TypeError);
});

test("atomically swaps activation revisions and preserves prior runtime after failed edits", () => {
  const database = databaseModule.getDatabase();
  registry.initializeDerivedMetricRegistry(database);
  database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES ('cl', 'realTimePower', 4, 'kW', '2026-08-30T08:00:00.000Z', 'good', '{}')
  `).run();
  const initialRevision = database.prepare("SELECT revision FROM derived_metric_registry_state WHERE id = 1").pluck().get() as number;

  const created = registry.saveDerivedMetricDefinition(customDefinition("custom.activation"), database);
  assert.equal(created.revision, 1);
  assert.equal(database.prepare("SELECT revision FROM derived_metric_registry_state WHERE id = 1").pluck().get(), initialRevision + 1);
  assert.equal(registry.readDerivedMetricEvaluation("cl", "custom.activation", database)?.value, 8);

  const updated = registry.saveDerivedMetricDefinition({ ...created, expression: "source * 3" }, database);
  assert.equal(updated.revision, 2);
  assert.equal(registry.readDerivedMetricEvaluation("cl", "custom.activation", database)?.value, 12);

  const disabled = registry.setDerivedMetricEnabled("custom.activation", false, database);
  assert.equal(disabled.enabled, false);
  assert.equal(disabled.revision, 3);
  assert.equal(database.prepare("SELECT revision FROM derived_metric_registry_state WHERE id = 1").pluck().get(), initialRevision + 3);
  assert.equal(
    registry.evaluateDerivedMetrics(database).some(({ metricKey }) => metricKey === "custom.activation"),
    false
  );
  const enabled = registry.setDerivedMetricEnabled("custom.activation", true, database);
  assert.equal(enabled.enabled, true);
  assert.equal(enabled.revision, 4);
  assert.equal(registry.readDerivedMetricEvaluation("cl", "custom.activation", database)?.value, 12);

  const priorRevision = database.prepare("SELECT revision FROM derived_metric_registry_state WHERE id = 1").pluck().get();
  const failedCandidates: DerivedMetricDefinition[] = [
    { ...enabled, expression: "source +" },
    { ...enabled, outputUnit: "MWh" },
    {
      ...enabled,
      expression: "self * 1",
      inputs: [{ alias: "self", kind: "metric", metricKey: "custom.activation", scope: "output-site", unit: "kW" }]
    }
  ];
  for (const candidate of failedCandidates) {
    assert.throws(() => registry.saveDerivedMetricDefinition(candidate, database), /validation failed/u);
    assert.equal(database.prepare("SELECT revision FROM derived_metric_registry_state WHERE id = 1").pluck().get(), priorRevision);
    assert.equal(registry.readDerivedMetricDefinition("custom.activation", database).expression, "source * 3");
    assert.equal(registry.readDerivedMetricEvaluation("cl", "custom.activation", database)?.value, 12);
  }
});

test("clears removed materializations when activation starts without a cached registry", () => {
  let database = databaseModule.getDatabase();
  registry.initializeDerivedMetricRegistry(database);
  const observedAt = new Date().toISOString();
  database
    .prepare(
      `INSERT INTO live_metric_values
        (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
       VALUES (?, ?, ?, ?, ?, 'good', '{}')`,
    )
    .run("cl", "realTimePower", 6, "kW", observedAt);

  const metricKey = "custom.cacheAbsent";
  const created = registry.saveDerivedMetricDefinition(customDefinition(metricKey), database);
  assert.equal(created.enabled, true);
  assert.equal(registry.readDerivedMetricEvaluation("cl", metricKey, database)?.value, 12);
  assert.ok(
    database
      .prepare("SELECT value FROM live_metric_values WHERE metric_scope = ? AND metric_key = ?")
      .get("cl", metricKey),
  );

  databaseModule.closeDatabaseConnection();
  database = databaseModule.getDatabase();

  const disabled = registry.setDerivedMetricEnabled(metricKey, false, database);
  assert.equal(disabled.enabled, false);
  assert.equal(registry.readDerivedMetricEvaluation("cl", metricKey, database), null);
  assert.equal(
    database
      .prepare("SELECT value FROM live_metric_values WHERE metric_scope = ? AND metric_key = ?")
      .get("cl", metricKey),
    undefined,
  );
});

test("rolls back failed activation without retaining a temporary uncached snapshot", () => {
  let database = databaseModule.getDatabase();
  registry.initializeDerivedMetricRegistry(database);
  const observedAt = new Date().toISOString();
  database
    .prepare(
      `INSERT INTO live_metric_values
        (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
       VALUES (?, ?, ?, ?, ?, 'good', '{}')`,
    )
    .run("cl", "realTimePower", 6, "kW", observedAt);

  const metricKey = "custom.uncachedFailure";
  registry.saveDerivedMetricDefinition(customDefinition(metricKey), database);
  const beforeDefinition = registry.readDerivedMetricDefinition(metricKey, database);
  const beforeEvaluation = registry.readDerivedMetricEvaluation("cl", metricKey, database);
  const beforeRevision = database
    .prepare("SELECT revision FROM derived_metric_registry_state WHERE id = 1")
    .pluck()
    .get();
  const liveMetric = database
    .prepare("SELECT value FROM live_metric_values WHERE metric_scope = ? AND metric_key = ?")
    .pluck()
    .get("cl", metricKey);

  databaseModule.closeDatabaseConnection();
  database = databaseModule.getDatabase();
  database.exec(`
    CREATE TRIGGER fail_registry_activation_evaluation
    BEFORE INSERT ON derived_metric_evaluations
    BEGIN
      SELECT RAISE(ABORT, 'activation evaluation failure');
    END;
  `);

  assert.throws(() => registry.setDerivedMetricEnabled(metricKey, false, database));
  database.exec("DROP TRIGGER fail_registry_activation_evaluation");

  assert.deepEqual(registry.readDerivedMetricDefinition(metricKey, database), beforeDefinition);
  assert.deepEqual(
    database
      .prepare("SELECT status, value, source_timestamp FROM derived_metric_evaluations WHERE metric_scope = ? AND metric_key = ?")
      .get("cl", metricKey),
    { status: beforeEvaluation?.status, value: beforeEvaluation?.value, source_timestamp: beforeEvaluation?.timestamp },
  );
  assert.equal(
    database.prepare("SELECT revision FROM derived_metric_registry_state WHERE id = 1").pluck().get(),
    beforeRevision,
  );
  assert.equal(
    database
      .prepare("SELECT value FROM live_metric_values WHERE metric_scope = ? AND metric_key = ?")
      .pluck()
      .get("cl", metricKey),
    liveMetric,
  );

  database.prepare("UPDATE derived_metric_definitions SET enabled = 0 WHERE metric_key = ?").run(metricKey);
  assert.equal(registry.readDerivedMetricDefinition(metricKey, database)?.enabled, false);
  registry.setDerivedMetricEnabled(metricKey, false, database);
  assert.deepEqual(
    database
      .prepare("SELECT status, value, source_timestamp FROM derived_metric_evaluations WHERE metric_scope = ? AND metric_key = ?")
      .get("cl", metricKey),
    { status: beforeEvaluation?.status, value: beforeEvaluation?.value, source_timestamp: beforeEvaluation?.timestamp },
  );
  assert.equal(
    database
      .prepare("SELECT value FROM live_metric_values WHERE metric_scope = ? AND metric_key = ?")
      .pluck()
      .get("cl", metricKey),
    liveMetric,
  );
});

test("rolls back activation definition, revision, snapshot, and materialized rows when evaluation fails", () => {
  const database = databaseModule.getDatabase();
  registry.initializeDerivedMetricRegistry(database);
  database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES ('cl', 'realTimePower', 4, 'kW', '2026-08-30T08:00:00.000Z', 'good', '{}')
  `).run();

  const created = registry.saveDerivedMetricDefinition(customDefinition("custom.activationFailure"), database);
  const updated = registry.saveDerivedMetricDefinition({ ...created, expression: "source * 3" }, database);
  const priorRevision = database.prepare("SELECT revision FROM derived_metric_registry_state WHERE id = 1").pluck().get();

  database.exec(`
    CREATE TRIGGER fail_derived_metric_activation
    BEFORE INSERT ON derived_metric_evaluations
    BEGIN
      SELECT RAISE(ABORT, 'forced evaluation failure');
    END
  `);
  assert.throws(
    () => registry.saveDerivedMetricDefinition({ ...updated, expression: "source * 4" }, database),
    /forced evaluation failure/u
  );
  database.exec("DROP TRIGGER fail_derived_metric_activation");

  assert.equal(database.prepare("SELECT revision FROM derived_metric_registry_state WHERE id = 1").pluck().get(), priorRevision);
  assert.equal(registry.readDerivedMetricDefinition("custom.activationFailure", database).expression, "source * 3");
  assert.equal(registry.readDerivedMetricEvaluation("cl", "custom.activationFailure", database)?.value, 12);
  assert.equal(
    database.prepare("SELECT value FROM live_metric_values WHERE metric_scope = 'cl' AND metric_key = 'custom.activationFailure'").pluck().get(),
    12
  );
  registry.evaluateDerivedMetrics(database, new Date("2026-08-30T08:00:20.000Z"));
  assert.equal(registry.readDerivedMetricEvaluation("cl", "custom.activationFailure", database)?.value, 12);

  database.exec(`
    CREATE TRIGGER fail_derived_metric_activation
    BEFORE INSERT ON derived_metric_evaluations
    BEGIN
      SELECT RAISE(ABORT, 'forced evaluation failure');
    END
  `);
  assert.throws(
    () => registry.setDerivedMetricEnabled("custom.activationFailure", false, database),
    /forced evaluation failure/u
  );
  database.exec("DROP TRIGGER fail_derived_metric_activation");

  assert.equal(database.prepare("SELECT revision FROM derived_metric_registry_state WHERE id = 1").pluck().get(), priorRevision);
  assert.equal(registry.readDerivedMetricDefinition("custom.activationFailure", database).enabled, true);
  assert.equal(registry.readDerivedMetricEvaluation("cl", "custom.activationFailure", database)?.value, 12);
  assert.equal(
    database.prepare("SELECT value FROM live_metric_values WHERE metric_scope = 'cl' AND metric_key = 'custom.activationFailure'").pluck().get(),
    12
  );
  registry.evaluateDerivedMetrics(database, new Date("2026-08-30T08:00:30.000Z"));
  assert.equal(registry.readDerivedMetricEvaluation("cl", "custom.activationFailure", database)?.value, 12);
});

test("rejects display preferences, secrets, env paths, config paths, and arbitrary DB fields as setting inputs", () => {
  const database = databaseModule.getDatabase();
  registry.initializeDerivedMetricRegistry(database);
  const forbiddenSettingKeys = [
    "co2AutoConvertSmallToKg",
    "mqttPassword",
    "apiSecret",
    "process.env.CARBON_EMISSION_FACTOR",
    "config.calculation.carbonEmissionFactor",
    "calculation_settings.carbon_emission_factor"
  ];

  forbiddenSettingKeys.forEach((settingKey, index) => {
    const metricKey = `custom.forbiddenSetting${index}`;
    assert.throws(() => registry.saveDerivedMetricDefinition({
      ...customDefinition(metricKey, "forbidden"),
      inputs: [{ alias: "forbidden", kind: "calculation-setting", settingKey, unit: "" }]
    }, database), (error: unknown) => {
      assert.equal(
        (error as { errors?: Array<{ code: string }> }).errors?.some(({ code }) => code === "unknown-setting"),
        true
      );
      return true;
    });
    assert.equal(registry.listDerivedMetricDefinitions(database).some(({ metricKey: key }) => key === metricKey), false);
  });
});

test("resolves explicit metric inputs through MetricResolver without cross-scope fallback", () => {
  const database = databaseModule.getDatabase();
  registry.initializeDerivedMetricRegistry(database);
  registry.saveDerivedMetricDefinition({
    ...customDefinition("custom.scopeIsolation", "source * 2"),
    inputs: [{ alias: "source", kind: "metric", metricKey: "factoryGeneration.todayMwh", scope: "cl", unit: "MWh" }],
    metricKey: "custom.scopeIsolation",
    name: "Scope Isolation",
    outputScopePolicy: "global",
    outputUnit: "MWh"
  }, database);
  database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES ('kn', 'factoryGeneration.todayMwh', 7, 'MWh', '2026-08-30T08:00:00.000Z', 'good', '{}')
  `).run();

  registry.evaluateDerivedMetrics(database, new Date("2026-08-30T08:00:10.000Z"));

  const evaluation = registry.readDerivedMetricEvaluation("global", "custom.scopeIsolation", database);
  assert.equal(evaluation?.status, "unavailable");
  assert.equal(evaluation?.dependencies[0]?.metricScope, "cl");
  assert.equal(evaluation?.dependencies[0]?.value, null);
});

test("propagates worst freshness and oldest metric timestamp across dependencies", () => {
  const database = databaseModule.getDatabase();
  registry.initializeDerivedMetricRegistry(database);
  registry.saveDerivedMetricDefinition({
    ...customDefinition("custom.freshnessAggregate", "left + right"),
    inputs: [
      { alias: "left", kind: "metric", metricKey: "factoryCircuit.stampingPower", scope: "output-site", unit: "kW" },
      { alias: "right", kind: "metric", metricKey: "factoryCircuit.bodyPower", scope: "output-site", unit: "kW" }
    ],
    metricKey: "custom.freshnessAggregate",
    name: "Freshness Aggregate"
  }, database);
  const oldestTimestamp = "2026-08-30T07:59:00.000Z";
  database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES
      ('cl', 'factoryCircuit.stampingPower', 3, 'kW', '2026-08-30T08:00:09.000Z', 'good', '{}'),
      ('cl', 'factoryCircuit.bodyPower', 4, 'kW', ?, 'good', '{}')
  `).run(oldestTimestamp);

  registry.evaluateDerivedMetrics(database, new Date("2026-08-30T08:00:10.000Z"));

  const evaluation = registry.readDerivedMetricEvaluation("cl", "custom.freshnessAggregate", database);
  assert.equal(evaluation?.status, "degraded");
  assert.equal(evaluation?.freshnessState, "stale");
  assert.equal(evaluation?.timestamp, oldestTimestamp);
  assert.deepEqual(
    evaluation?.dependencies.map(({ metricKey, metricScope, timestamp, value }) => ({
      metricKey,
      metricScope,
      timestamp,
      value
    })),
    [
      { metricKey: "factoryCircuit.stampingPower", metricScope: "cl", timestamp: "2026-08-30T08:00:09.000Z", value: 3 },
      { metricKey: "factoryCircuit.bodyPower", metricScope: "cl", timestamp: oldestTimestamp, value: 4 }
    ]
  );
});

test("preserves nested MQTT and setting provenance without exposing credentials", () => {
  const database = databaseModule.getDatabase();
  registry.initializeDerivedMetricRegistry(database);
  const brokerPassword = "broker-password-sentinel";
  const brokerUsername = "broker-username-sentinel";
  database.prepare("UPDATE mqtt_settings SET password = ?, username = ?").run(brokerPassword, brokerUsername);
  const sourceTimestamp = "2026-08-30T08:00:09.000Z";
  database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES ('cl', 'factoryCircuit.stampingPower', 4, 'kW', ?, 'good', '{}')
  `).run(sourceTimestamp);
  registry.saveDerivedMetricDefinition({
    ...customDefinition("custom.provenanceSource", "source * factor"),
    inputs: [
      { alias: "source", kind: "metric", metricKey: "factoryCircuit.stampingPower", scope: "output-site", unit: "kW" },
      { alias: "factor", kind: "calculation-setting", settingKey: "treeEquivalentFactor", unit: "" }
    ],
    outputUnit: "kW"
  }, database);
  registry.evaluateDerivedMetrics(database, new Date("2026-08-30T08:00:10.000Z"));
  registry.saveDerivedMetricDefinition({
    ...customDefinition("custom.provenanceNested", "upstream * 2"),
    inputs: [{ alias: "upstream", kind: "metric", metricKey: "custom.provenanceSource", scope: "output-site", unit: "kW" }]
  }, database);
  registry.evaluateDerivedMetrics(database, new Date("2026-08-30T08:00:10.000Z"));

  const evaluation = registry.readDerivedMetricEvaluation("cl", "custom.provenanceNested", database);
  const direct = evaluation?.dependencies[0];
  const source = direct?.upstream?.[0];
  assert.equal(evaluation?.status, "ready");
  assert.equal(direct?.metricKey, "custom.provenanceSource");
  assert.equal(direct?.metricScope, "cl");
  assert.equal(evaluation?.definitionRevision, 1);
  const setting = direct?.upstream?.find(({ kind }) => kind === "calculation-setting");
  const mqtt = direct?.upstream?.find(({ metricKey }) => metricKey === "factoryCircuit.stampingPower");
  assert.deepEqual(Object.keys(direct ?? {}).sort(), [
    "alias", "kind", "metricKey", "metricScope", "timestamp", "unit", "upstream", "value"
  ]);
  assert.deepEqual(Object.keys(setting ?? {}).sort(), [
    "alias", "kind", "settingKey", "settingRevision", "unit", "value"
  ]);
  assert.deepEqual(Object.keys(mqtt ?? {}).sort(), [
    "alias", "kind", "metricKey", "metricScope", "sourceTopic", "timestamp", "unit", "value"
  ]);
  assert.deepEqual(
    {
      settingKey: setting?.settingKey,
      settingRevision: setting?.settingRevision,
      unit: setting?.unit,
      value: setting?.value
    },
    { settingKey: "treeEquivalentFactor", settingRevision: "1", unit: "", value: 0.16 }
  );
  assert.deepEqual(
    {
      metricKey: mqtt?.metricKey,
      metricScope: mqtt?.metricScope,
      sourceTopic: mqtt?.sourceTopic,
      timestamp: mqtt?.timestamp,
      unit: mqtt?.unit,
      value: mqtt?.value
    },
    {
      metricKey: "factoryCircuit.stampingPower",
      metricScope: "cl",
      sourceTopic: "factory/power/stamping",
      timestamp: sourceTimestamp,
      unit: "kW",
      value: 4
    }
  );
  const serialized = JSON.stringify(evaluation).toLowerCase();
  for (const forbidden of [brokerPassword, brokerUsername, "password", "username", "broker_host", "client_id", "secret"]) {
    assert.equal(serialized.includes(forbidden.toLowerCase()), false, forbidden);
  }
});

test("bounds transitive provenance depth", () => {
  const database = databaseModule.getDatabase();
  registry.initializeDerivedMetricRegistry(database);
  const depth = 40;
  for (let index = 0; index < depth; index += 1) {
    const metricKey = `custom.provenanceChain${String(index).padStart(2, "0")}`;
    registry.saveDerivedMetricDefinition({
      ...customDefinition(metricKey, index === 0 ? "source * 2" : "upstream * 2"),
      inputs: [{
        alias: index === 0 ? "source" : "upstream",
        kind: "metric",
        metricKey: index === 0 ? "realTimePower" : `custom.provenanceChain${String(index - 1).padStart(2, "0")}`,
        scope: "output-site",
        unit: "kW"
      }]
    }, database);
  }
  database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES ('cl', 'realTimePower', 2, 'kW', '2026-08-30T08:00:00.000Z', 'good', '{}')
  `).run();
  registry.evaluateDerivedMetrics(database, new Date("2026-08-30T08:00:10.000Z"));

  const evaluation = registry.readDerivedMetricEvaluation("cl", `custom.provenanceChain${String(depth - 1).padStart(2, "0")}`, database);
  assert.equal(evaluation?.status, "ready");
  let dependency = evaluation?.dependencies[0];
  let nestedDepth = 0;
  while (dependency?.upstream?.[0]) {
    nestedDepth += 1;
    dependency = dependency.upstream[0];
  }
  assert.ok(nestedDepth <= 32);
});

test("bounds total transitive provenance nodes across fan-out", () => {
  const database = databaseModule.getDatabase();
  registry.initializeDerivedMetricRegistry(database);
  const leafKeys = Array.from({ length: 8 }, (_, index) => `custom.provenanceFanoutLeaf${String(index).padStart(2, "0")}`);
  const branchKeys = Array.from({ length: 8 }, (_, index) => `custom.provenanceFanoutBranch${String(index).padStart(2, "0")}`);

  leafKeys.forEach((metricKey) => {
    registry.saveDerivedMetricDefinition({
      ...customDefinition(metricKey, "source * 2"),
      inputs: [{ alias: "source", kind: "metric", metricKey: "realTimePower", scope: "output-site", unit: "kW" }]
    }, database);
  });
  branchKeys.forEach((metricKey, branchIndex) => {
    const aliases = Array.from({ length: 4 }, (_, index) => `input${index}`);
    registry.saveDerivedMetricDefinition({
      ...customDefinition(metricKey, aliases.join(" + ")),
      inputs: aliases.map((alias, index) => ({
        alias,
        kind: "metric" as const,
        metricKey: leafKeys[(branchIndex * 4 + index) % leafKeys.length]!,
        scope: "output-site" as const,
        unit: "kW"
      }))
    }, database);
  });
  const aliases = Array.from({ length: branchKeys.length }, (_, index) => `branch${index}`);
  const finalMetricKey = "custom.provenanceFanoutFinal";
  registry.saveDerivedMetricDefinition({
    ...customDefinition(finalMetricKey, aliases.join(" + ")),
    inputs: aliases.map((alias, index) => ({
      alias,
      kind: "metric" as const,
      metricKey: branchKeys[index]!,
      scope: "output-site" as const,
      unit: "kW"
    }))
  }, database);
  database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES ('cl', 'realTimePower', 2, 'kW', '2026-08-30T08:00:00.000Z', 'good', '{}')
  `).run();

  registry.evaluateDerivedMetrics(database, new Date("2026-08-30T08:00:10.000Z"));

  const evaluation = registry.readDerivedMetricEvaluation("cl", finalMetricKey, database);
  assert.equal(evaluation?.status, "ready");
  const countNodes = (dependencies: DerivedMetricDependencyIdentity[]): number => dependencies.reduce(
    (count, dependency) => count + 1 + (dependency.upstream ? countNodes(dependency.upstream) : 0),
    0
  );
  assert.ok(countNodes(evaluation?.dependencies ?? []) <= branchKeys.length + 32);
  assert.deepEqual(
    evaluation?.dependencies.map(({ metricKey }) => metricKey),
    branchKeys
  );
});

test("retains all 64 legal direct dependencies within the provenance byte limit", () => {
  const database = databaseModule.getDatabase();
  registry.initializeDerivedMetricRegistry(database);
  const aliases = Array.from({ length: 64 }, (_, index) => `a${index}`);
  registry.saveDerivedMetricDefinition({
    ...customDefinition("custom.provenanceSixtyFourDirect", aliases.join(" + ")),
    inputs: aliases.map((alias) => ({
      alias,
      kind: "metric" as const,
      metricKey: "realTimePower",
      scope: "output-site" as const,
      unit: "kW"
    }))
  }, database);
  database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES ('cl', 'realTimePower', 2, 'kW', '2026-08-30T08:00:00.000Z', 'good', '{}')
  `).run();
  registry.evaluateDerivedMetrics(database, new Date("2026-08-30T08:00:10.000Z"));

  const evaluation = registry.readDerivedMetricEvaluation("cl", "custom.provenanceSixtyFourDirect", database);
  assert.equal(evaluation?.status, "ready");
  assert.deepEqual(evaluation?.dependencies.map(({ alias }) => alias), aliases);
  const persisted = database.prepare(`
    SELECT provenance_json FROM derived_metric_evaluations
    WHERE metric_scope = 'cl' AND metric_key = 'custom.provenanceSixtyFourDirect'
  `).get() as { provenance_json: string };
  assert.ok(Buffer.byteLength(persisted.provenance_json, "utf8") <= 256 * 1024);
});

test("rejects derived definitions with more than 64 inputs", () => {
  const database = databaseModule.getDatabase();
  registry.initializeDerivedMetricRegistry(database);
  const tooManyAliases = Array.from({ length: 65 }, (_, index) => `a${index}`);
  assert.throws(() => registry.saveDerivedMetricDefinition({
    ...customDefinition("custom.provenanceSixtyFiveDirect", tooManyAliases.join(" + ")),
    inputs: tooManyAliases.map((alias) => ({
      alias,
      kind: "metric" as const,
      metricKey: "realTimePower",
      scope: "output-site" as const,
      unit: "kW"
    }))
  }, database), (error: unknown) => {
    const typed = error as { errors?: Array<{ code: string }> };
    assert.equal(typed.errors?.some(({ code }) => code === "expression-limit"), true);
    return true;
  });
  assert.equal(
    registry.listDerivedMetricDefinitions(database).some(({ metricKey }) => metricKey === "custom.provenanceSixtyFiveDirect"),
    false
  );
});

test("rejects overlong definition and input identities", () => {
  const database = databaseModule.getDatabase();
  registry.initializeDerivedMetricRegistry(database);
  const aliases = Array.from({ length: 64 }, (_, index) => `a${String(index).padStart(2, "0")}${"x".repeat(126)}`);
  const metricKeys = Array.from({ length: 64 }, (_, index) => `custom.${String(index).padStart(2, "0")}${"m".repeat(120)}`);
  const definitionKey = `custom.${"d".repeat(122)}`;
  assert.throws(() => registry.saveDerivedMetricDefinition({
    ...customDefinition(definitionKey, aliases.join(" + ")),
    inputs: aliases.map((alias, index) => ({
      alias,
      kind: "metric" as const,
      metricKey: metricKeys[index]!,
      scope: "output-site" as const,
      unit: "kW"
    }))
  }, database), (error: unknown) => {
    const typed = error as { errors?: Array<{ code: string; message: string }> };
    assert.equal(typed.errors?.some(({ code, message }) => code === "invalid-definition" && message.includes("128")), true);
    return true;
  });
  assert.equal(registry.listDerivedMetricDefinitions(database).some(({ metricKey }) => metricKey === definitionKey), false);
});

test("omits overlong MQTT topics while preserving direct metric identity", () => {
  const database = databaseModule.getDatabase();
  registry.initializeDerivedMetricRegistry(database);
  database.prepare(`
    UPDATE topic_mappings
    SET topic = ?
    WHERE metric_scope = 'cl' AND metric_key = 'factoryCircuit.stampingPower'
  `).run(`factory/${"x".repeat(300_000)}`);
  database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES ('cl', 'factoryCircuit.stampingPower', 4, 'kW', '2026-08-30T08:00:09.000Z', 'good', '{}')
  `).run();
  registry.saveDerivedMetricDefinition({
    ...customDefinition("custom.longTopicProvenance", "source * 2"),
    inputs: [{ alias: "source", kind: "metric", metricKey: "factoryCircuit.stampingPower", scope: "output-site", unit: "kW" }]
  }, database);
  registry.evaluateDerivedMetrics(database, new Date("2026-08-30T08:00:10.000Z"));

  const persisted = database.prepare(`
    SELECT provenance_json FROM derived_metric_evaluations
    WHERE metric_scope = 'cl' AND metric_key = 'custom.longTopicProvenance'
  `).get() as { provenance_json: string };
  assert.ok(Buffer.byteLength(persisted.provenance_json, "utf8") <= 256 * 1024);
  const dependency = (JSON.parse(persisted.provenance_json) as { dependencies: DerivedMetricDependencyIdentity[] }).dependencies[0]!;
  assert.equal(dependency.metricKey, "factoryCircuit.stampingPower");
  assert.equal(dependency.metricScope, "cl");
  assert.equal("sourceTopic" in dependency, false);
  const evaluation = registry.readDerivedMetricEvaluation("cl", "custom.longTopicProvenance", database);
  assert.equal(evaluation?.dependencies[0]?.metricKey, "factoryCircuit.stampingPower");
  assert.equal(evaluation?.dependencies[0]?.metricScope, "cl");
});

test("bounds oversized persisted provenance without dropping direct identities", () => {
  const database = databaseModule.getDatabase();
  registry.initializeDerivedMetricRegistry(database);
  registry.saveDerivedMetricDefinition(customDefinition("custom.legacyOversized"), database);
  const dependencies: DerivedMetricDependencyIdentity[] = Array.from({ length: 4 }, (_, branch) => ({
    alias: `root${branch}`,
    kind: "metric",
    metricKey: `legacy.root${branch}`,
    metricScope: "cl",
    unit: "kW",
    value: branch,
    password: `legacy-password-${branch}`,
    brokerPassword: `legacy-broker-password-${branch}`,
    secret: `legacy-secret-${branch}`,
    upstream: Array.from({ length: 12 }, (_, leaf) => ({
      alias: `root${branch}Leaf${leaf}`,
      kind: "metric" as const,
      metricKey: `legacy.root${branch}.leaf${leaf}`,
      metricScope: "cl" as const,
      sourceTopic: `legacy/topic/${branch}/${leaf}`,
      unit: "kW",
      value: leaf,
      password: `legacy-leaf-password-${branch}-${leaf}`,
      brokerPassword: `legacy-leaf-broker-password-${branch}-${leaf}`,
      secret: `legacy-leaf-secret-${branch}-${leaf}`
    }))
  }));
  database.prepare(`
    UPDATE derived_metric_evaluations
    SET provenance_json = ?
    WHERE metric_scope = 'cl' AND metric_key = 'custom.legacyOversized'
  `).run(JSON.stringify({ dependencies }));

  const evaluation = registry.readDerivedMetricEvaluation("cl", "custom.legacyOversized", database);
  const countNodes = (items: DerivedMetricDependencyIdentity[]): number => items.reduce(
    (count, dependency) => count + 1 + (dependency.upstream ? countNodes(dependency.upstream) : 0),
    0
  );
  assert.deepEqual(
    evaluation?.dependencies.map(({ alias }) => alias),
    ["root0", "root1", "root2", "root3"]
  );
  assert.deepEqual(Object.keys(evaluation?.dependencies[0] ?? {}).sort(), [
    "alias", "kind", "metricKey", "metricScope", "unit", "upstream", "value"
  ]);
  assert.deepEqual(Object.keys(evaluation?.dependencies[0]?.upstream?.[0] ?? {}).sort(), [
    "alias", "kind", "metricKey", "metricScope", "sourceTopic", "unit", "value"
  ]);
  const serialized = JSON.stringify(evaluation);
  for (const forbidden of ["legacy-password", "legacy-broker-password", "legacy-secret", "password", "brokerPassword", "secret"]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
  assert.ok(countNodes(evaluation?.dependencies ?? []) <= 4 + 32);
});

test("fails closed before parsing oversized persisted provenance", () => {
  const database = databaseModule.getDatabase();
  registry.initializeDerivedMetricRegistry(database);
  registry.saveDerivedMetricDefinition(customDefinition("custom.oversizedInvalidProvenance"), database);
  const oversizedInvalidJson = `{"${"x".repeat(256 * 1024)}}`;
  database.prepare(`
    UPDATE derived_metric_evaluations
    SET provenance_json = ?
    WHERE metric_scope = 'cl' AND metric_key = 'custom.oversizedInvalidProvenance'
  `).run(oversizedInvalidJson);

  let dependencies: DerivedMetricDependencyIdentity[] = [];
  assert.doesNotThrow(() => {
    dependencies = registry.readDerivedMetricEvaluation("cl", "custom.oversizedInvalidProvenance", database)?.dependencies ?? [];
  });
  assert.deepEqual(dependencies, []);
});
