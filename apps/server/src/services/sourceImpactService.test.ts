import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";
import type Database from "better-sqlite3";
import type { DerivedMetricDefinition } from "@solar-display/shared";
import { readMetricUsage } from "./metricUsageService.js";
import { readSourceImpact } from "./sourceImpactService.js";

/**
 * The blocking set and the structural expectation set are separate contracts. The cast states the
 * shape this suite requires so the assertions, not the declared type, decide whether it is met.
 */
type SourceImpactWithExpectations = ReturnType<typeof readSourceImpact> & {
  registeredExpectations: Array<{ consumerType: string; metricKey: string; pageId: string }>;
};

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-source-impact-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");

const [{ closeDatabaseConnection, getDatabase }, { migrateDatabase }, { seedDatabase }, { saveDerivedMetricDefinition }] = await Promise.all([
  import("../db/index.js"),
  import("../db/migrate.js"),
  import("../db/seed.js"),
  import("./derivedMetricRegistryService.js")
]);

beforeEach(() => {
  closeDatabaseConnection();
  rmSync(process.env.DATABASE_PATH!, { force: true });
  migrateDatabase();
  seedDatabase();
});

after(() => {
  closeDatabaseConnection();
  rmSync(tempDir, { force: true, recursive: true });
});

test("U2-R5-S02 live and draft bindings block deletion until resolved", () => {
  const database = getDatabase();
  database.prepare(`
    INSERT INTO display_page_stage_configs (page_key, stage, config_json, version, updated_at)
    VALUES ('overview', 'draft', ?, 2, ?)
    ON CONFLICT(page_key, stage) DO UPDATE SET config_json = excluded.config_json
  `).run(JSON.stringify({
    regions: { dataBindings: { power: { itemId: "power", dataBinding: { metricKey: "todayGeneration", scope: "kn", sourceType: "metric" } } } }
  }), new Date().toISOString());
  const blocked = readSourceImpact(database, { metricKey: "todayGeneration", metricScope: "kn" });
  assert.equal(blocked.canMutate, false);
  assert.equal(blocked.consumers.some((row) => row.kind === "draft"), true);
  const allowed = readSourceImpact(database, { confirmResolved: true, metricKey: "todayGeneration", metricScope: "kn" });
  assert.equal(allowed.canMutate, true);
});

test("U2-R5 a destination carrying only registered expectations stays mutable and still discloses them", () => {
  const database = getDatabase();
  // The premise of this case: the display code registers this destination, but nothing an operator
  // can edit references it. Without these two checks the case could pass for the wrong reason.
  const usage = readMetricUsage(database, { metricKey: "todayGeneration", scope: "kn" });
  assert.ok(usage.length > 0, "the fixture must carry at least one registered expectation");
  assert.equal(
    usage.filter((row) => row.consumerType === "widget").length,
    0,
    "the fixture must have no published widget binding, so only registered expectations remain"
  );

  const impact = readSourceImpact(database, {
    metricKey: "todayGeneration",
    metricScope: "kn"
  }) as SourceImpactWithExpectations;

  assert.equal(impact.canMutate, true, "an expectation no operator action can clear must not block mutation");
  assert.equal(impact.unknown, false);
  assert.deepEqual(impact.consumers, [], "the blocking set holds only references an operator can resolve");
  assert.ok(Array.isArray(impact.registeredExpectations), "structural expectations are reported as their own set");
  assert.ok(impact.registeredExpectations.length > 0, "the registered expectations must still be disclosed");
  for (const expectation of impact.registeredExpectations) {
    assert.equal(expectation.metricKey, "todayGeneration");
    assert.ok(
      ["story", "readiness"].includes(expectation.consumerType),
      `a structural expectation must name its consumer type, got: ${expectation.consumerType}`
    );
    assert.ok(
      typeof expectation.pageId === "string" && expectation.pageId.length > 0,
      "each structural expectation names the page that expects the destination"
    );
  }
});

test("U2-R5 an unreadable lookup reports both sets as empty rather than omitting either", () => {
  const database = getDatabase();
  // Only the impact read consults this table, so its absence is a lookup failure and nothing else.
  database.exec("DROP TABLE display_page_stage_configs");

  const impact = readSourceImpact(database, {
    metricKey: "todayGeneration",
    metricScope: "kn"
  }) as SourceImpactWithExpectations;

  assert.deepEqual(
    {
      canMutate: impact.canMutate,
      unknown: impact.unknown,
      consumers: impact.consumers,
      registeredExpectations: impact.registeredExpectations
    },
    { canMutate: false, unknown: true, consumers: [], registeredExpectations: [] },
    "an unknown impact reports empty sets and still refuses the mutation"
  );
});

function writeDraftConfig(database: Database.Database, configJson: string, pageKey = "source-impact-draft") {
  database.prepare(`
    INSERT INTO display_page_stage_configs (page_key, stage, config_json, version, updated_at)
    VALUES (?, 'draft', ?, 1, ?)
    ON CONFLICT(page_key, stage) DO UPDATE SET config_json = excluded.config_json
  `).run(pageKey, configJson, new Date().toISOString());
}

function draftImpact(database: Database.Database, metricScope: "cl" | "kn" | "global" | "all") {
  return readSourceImpact(database, { metricKey: "reviewScopedPower", metricScope });
}

const derivedInputMetricKey = "sourceImpactDerivedInput";

function registerDerivedInputSource(database: Database.Database) {
  for (const scope of ["cl", "kn", "global"] as const) {
    database.prepare(`
      INSERT INTO topic_mappings (metric_scope, metric_key, topic, unit, enabled)
      VALUES (?, ?, ?, 'kW', 1)
    `).run(scope, derivedInputMetricKey, `source-impact/${scope}`);
  }
}

function saveDerivedInputDefinition(
  database: Database.Database,
  metricKey: string,
  scope: "output-site" | "cl" | "kn" | "global",
  options: { enabled?: boolean; siteScopes?: readonly ("cl" | "kn")[] } = {}
) {
  const definition: DerivedMetricDefinition = {
    description: "source impact test definition",
    enabled: options.enabled ?? true,
    expression: "source * 2",
    fallbackPolicy: "unavailable",
    inputs: [{ alias: "source", kind: "metric", metricKey: derivedInputMetricKey, scope, unit: "kW" }],
    managed: false,
    metricKey,
    name: metricKey,
    outputScopePolicy: "site",
    outputUnit: "kW",
    precision: 1,
    revision: 0,
    ...(options.siteScopes ? { siteScopes: [...options.siteScopes] } : {})
  };
  return saveDerivedMetricDefinition(definition, database);
}

test("D3 derived input impact follows explicit and narrowed output-site scopes", () => {
  const database = getDatabase();
  registerDerivedInputSource(database);
  saveDerivedInputDefinition(database, "custom.explicitKnImpact", "kn");
  saveDerivedInputDefinition(database, "custom.outputSiteKnImpact", "output-site", { siteScopes: ["kn"] });

  const cl = readSourceImpact(database, { metricKey: derivedInputMetricKey, metricScope: "cl" });
  assert.equal(cl.unknown, false);
  assert.equal(cl.canMutate, true);
  assert.deepEqual(cl.consumers, []);

  const kn = readSourceImpact(database, { metricKey: derivedInputMetricKey, metricScope: "kn" });
  assert.equal(kn.unknown, false);
  assert.equal(kn.canMutate, false);
  assert.deepEqual(
    kn.consumers.filter((consumer) => consumer.kind === "derived").map((consumer) => consumer.metricKey).sort(),
    ["custom.explicitKnImpact", "custom.outputSiteKnImpact"]
  );
});

test("D3 derived input impact preserves the complete scope matrix and disabled definitions", () => {
  const database = getDatabase();
  registerDerivedInputSource(database);
  const definitions = [
    ["custom.explicitClImpact", "cl"],
    ["custom.explicitKnImpact", "kn"],
    ["custom.explicitGlobalImpact", "global"],
    ["custom.outputSiteKnImpact", "output-site", { siteScopes: ["kn"] }],
    ["custom.outputSiteDefaultImpact", "output-site"],
    ["custom.disabledKnImpact", "kn", { enabled: false }]
  ] as const;
  for (const [metricKey, scope, options] of definitions) {
    saveDerivedInputDefinition(database, metricKey, scope, options);
  }

  const expectedByScope: Record<"cl" | "kn" | "global" | "all", readonly string[]> = {
    cl: ["custom.explicitClImpact", "custom.outputSiteDefaultImpact"],
    kn: ["custom.disabledKnImpact", "custom.explicitKnImpact", "custom.outputSiteDefaultImpact", "custom.outputSiteKnImpact"],
    global: ["custom.explicitGlobalImpact"],
    all: [
      "custom.disabledKnImpact", "custom.explicitClImpact", "custom.explicitGlobalImpact",
      "custom.explicitKnImpact", "custom.outputSiteDefaultImpact", "custom.outputSiteKnImpact"
    ]
  };
  for (const scope of ["cl", "kn", "global", "all"] as const) {
    const impact = readSourceImpact(database, { metricKey: derivedInputMetricKey, metricScope: scope });
    assert.equal(impact.unknown, false, scope);
    assert.equal(impact.canMutate, expectedByScope[scope].length === 0, scope);
    assert.deepEqual(
      impact.consumers.filter((consumer) => consumer.kind === "derived").map((consumer) => consumer.metricKey).sort(),
      [...expectedByScope[scope]],
      scope
    );
  }
});

function assertUnknownDerivedImpact(
  database: Database.Database,
  metricKey = derivedInputMetricKey,
  metricScope: "cl" | "kn" | "global" | "all" = "all"
) {
  const impact = readSourceImpact(database, { metricKey, metricScope }) as SourceImpactWithExpectations;
  assert.deepEqual(
    {
      canMutate: impact.canMutate,
      unknown: impact.unknown,
      consumers: impact.consumers,
      registeredExpectations: impact.registeredExpectations
    },
    { canMutate: false, unknown: true, consumers: [], registeredExpectations: [] }
  );
}

function derivedInputRows(database: Database.Database) {
  return database.prepare(`
    SELECT derived_metric_key, metric_key, scope_selector
    FROM derived_metric_inputs
    WHERE metric_key = ?
    ORDER BY derived_metric_key
  `).all(derivedInputMetricKey);
}

test("D4 a matching derived input with a missing owner remains unknown", () => {
  const database = getDatabase();
  registerDerivedInputSource(database);
  database.pragma("foreign_keys = OFF");
  database.prepare(`
    INSERT INTO derived_metric_inputs (
      derived_metric_key, alias, input_kind, metric_key, scope_selector, unit, sort_order
    ) VALUES ('custom.missingOwnerImpact', 'source', 'metric', ?, 'kn', 'kW', 0)
  `).run(derivedInputMetricKey);
  database.pragma("foreign_keys = ON");
  const before = JSON.stringify(derivedInputRows(database));

  assertUnknownDerivedImpact(database, derivedInputMetricKey, "kn");
  assert.equal(JSON.stringify(derivedInputRows(database)), before);
});

test("D4 a matching derived input with an invalid selector remains unknown", () => {
  const database = getDatabase();
  registerDerivedInputSource(database);
  saveDerivedInputDefinition(database, "custom.invalidSelectorImpact", "kn");
  database.pragma("ignore_check_constraints = ON");
  database.prepare(`
    UPDATE derived_metric_inputs SET scope_selector = 'unsupported'
    WHERE derived_metric_key = 'custom.invalidSelectorImpact'
  `).run();
  database.pragma("ignore_check_constraints = OFF");
  const before = JSON.stringify(derivedInputRows(database));

  assertUnknownDerivedImpact(database, derivedInputMetricKey, "kn");
  assert.equal(JSON.stringify(derivedInputRows(database)), before);
});

test("D4 invalid output-site evidence remains unknown without normalizing stored bytes", () => {
  const database = getDatabase();
  registerDerivedInputSource(database);
  for (const [index, siteScopesJson] of ["not-json", "[]", '["mars"]'].entries()) {
    database.prepare("DELETE FROM derived_metric_inputs").run();
    database.prepare("DELETE FROM derived_metric_definitions").run();
    const metricKey = `custom.invalidSiteScopesImpact${index}`;
    saveDerivedInputDefinition(database, metricKey, "output-site");
    database.prepare("UPDATE derived_metric_definitions SET site_scopes_json = ? WHERE metric_key = ?")
      .run(siteScopesJson, metricKey);
    const before = (database.prepare(
      "SELECT site_scopes_json FROM derived_metric_definitions WHERE metric_key = ?"
    ).get(metricKey) as { site_scopes_json: string }).site_scopes_json;

    assertUnknownDerivedImpact(database);
    const after = (database.prepare(
      "SELECT site_scopes_json FROM derived_metric_definitions WHERE metric_key = ?"
    ).get(metricKey) as { site_scopes_json: string }).site_scopes_json;
    assert.equal(after, before, `corrupt site scope fixture ${index} must retain its raw bytes`);
  }
});

test("D4 a readable absence of derived inputs remains known-empty", () => {
  const database = getDatabase();
  const impact = readSourceImpact(database, { metricKey: "sourceImpactWithoutDerivedInput", metricScope: "cl" });
  assert.equal(impact.unknown, false);
  assert.equal(impact.canMutate, true);
  assert.deepEqual(impact.consumers, []);
});

test("D1 draft impact matches metric key and configured scope", () => {
  const database = getDatabase();
  writeDraftConfig(database, JSON.stringify({
    regions: {
      dataBindings: {
        power: {
          itemId: "power",
          dataBinding: { metricKey: "reviewScopedPower", scope: "kn", sourceType: "metric" }
        }
      }
    }
  }));

  const cases: Array<["cl" | "kn" | "global" | "all", boolean]> = [
    ["cl", false], ["kn", true], ["global", false], ["all", true]
  ];
  for (const [scope, expectedMatch] of cases) {
    const impact = draftImpact(database, scope);
    assert.equal(impact.unknown, false, scope);
    assert.equal(impact.canMutate, !expectedMatch, scope);
    assert.equal(impact.consumers.length, expectedMatch ? 1 : 0, scope);
    if (expectedMatch) {
      assert.deepEqual(impact.consumers[0], {
        kind: "draft", itemId: "power", metricKey: "reviewScopedPower", pageId: "source-impact-draft"
      });
    }
  }
});

test("D1 global draft scope is excluded from site queries and included by global/all", () => {
  const database = getDatabase();
  writeDraftConfig(database, JSON.stringify({
    dataBindings: {
      global: {
        itemId: "global",
        dataBinding: { metricKey: "reviewScopedPower", scope: "global", sourceType: "metric" }
      }
    }
  }), "source-impact-global-draft");

  for (const scope of ["cl", "kn"] as const) {
    const impact = draftImpact(database, scope);
    assert.equal(impact.unknown, false, scope);
    assert.equal(impact.canMutate, true, scope);
    assert.deepEqual(impact.consumers, []);
  }
  for (const scope of ["global", "all"] as const) {
    const impact = draftImpact(database, scope);
    assert.equal(impact.unknown, false, scope);
    assert.equal(impact.canMutate, false, scope);
    assert.deepEqual(impact.consumers.map((consumer) => consumer.itemId), ["global"]);
  }
});

test("D1 inherited and omitted legacy draft scopes remain conservative for site queries", () => {
  const database = getDatabase();
  for (const [label, dataBinding] of [
    ["inherited", { metricKey: "reviewScopedPower", scope: "inherit-device", sourceType: "metric" }],
    ["legacy", { metricKey: "reviewScopedPower", sourceType: "metric" }]
  ] as const) {
    writeDraftConfig(database, JSON.stringify({ dataBindings: { [label]: { itemId: label, dataBinding } } }), label);
  }

  for (const scope of ["cl", "kn"] as const) {
    const impact = draftImpact(database, scope);
    assert.equal(impact.unknown, false, scope);
    assert.equal(impact.canMutate, false, scope);
    assert.deepEqual(
      impact.consumers.map((consumer) => consumer.itemId),
      ["inherited", "legacy"].sort()
    );
  }
  const global = draftImpact(database, "global");
  assert.equal(global.unknown, false);
  assert.equal(global.canMutate, true);
  assert.deepEqual(global.consumers, []);
  const all = draftImpact(database, "all");
  assert.equal(all.unknown, false);
  assert.equal(all.canMutate, false);
  assert.equal(all.consumers.length, 2);
});

test("D2 malformed draft dependency surfaces are unknown and preserve config bytes", () => {
  const database = getDatabase();
  const unreadable = [
    "{not-json",
    "[]",
    JSON.stringify({ regions: [] }),
    JSON.stringify({ dataBindings: [] }),
    JSON.stringify({ dataBindings: { power: [] } }),
    JSON.stringify({ dataBindings: { power: { dataBinding: [] } } }),
    JSON.stringify({ dataBindings: { power: { dataBinding: {} } } }),
    JSON.stringify({ dataBindings: { power: { dataBinding: { metricKey: "reviewScopedPower", scope: "site" } } } })
  ];

  for (const [index, configJson] of unreadable.entries()) {
    const pageKey = "unreadable-draft";
    writeDraftConfig(database, configJson, pageKey);
    const before = (database.prepare(
      "SELECT config_json FROM display_page_stage_configs WHERE page_key = ? AND stage = 'draft'"
    ).get(pageKey) as { config_json: string }).config_json;
    const impact = draftImpact(database, "all");
    assert.deepEqual(
      {
        canMutate: impact.canMutate,
        unknown: impact.unknown,
        consumers: impact.consumers,
        registeredExpectations: impact.registeredExpectations
      },
      { canMutate: false, unknown: true, consumers: [], registeredExpectations: [] },
      `unreadable fixture ${index}`
    );
    const after = (database.prepare(
      "SELECT config_json FROM display_page_stage_configs WHERE page_key = ? AND stage = 'draft'"
    ).get(pageKey) as { config_json: string }).config_json;
    assert.equal(after, before, `unreadable fixture ${index} must retain its original bytes`);
  }
});

test("D2 valid empty and supported legacy draft forms remain known-empty or readable", () => {
  const database = getDatabase();
  writeDraftConfig(database, JSON.stringify({ regions: {} }), "empty-regions");
  writeDraftConfig(database, JSON.stringify({ dataBindings: {} }), "empty-bindings");
  writeDraftConfig(database, JSON.stringify({ title: "unrelated config" }), "missing-bindings");
  writeDraftConfig(database, JSON.stringify({
    dataBindings: {
      legacy: { itemId: "legacy", dataBinding: { metricKey: "reviewScopedPower", sourceType: "metric" } }
    }
  }), "legacy-binding");

  for (const scope of ["cl", "kn"] as const) {
    const impact = draftImpact(database, scope);
    assert.equal(impact.unknown, false, scope);
    assert.equal(impact.canMutate, false, scope);
    assert.deepEqual(impact.consumers.map((consumer) => consumer.itemId), ["legacy"]);
  }
  const global = draftImpact(database, "global");
  assert.equal(global.unknown, false);
  assert.equal(global.canMutate, true);
  assert.deepEqual(global.consumers, []);
});
