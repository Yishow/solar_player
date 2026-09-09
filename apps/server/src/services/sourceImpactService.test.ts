import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";
import type Database from "better-sqlite3";
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

const [{ closeDatabaseConnection, getDatabase }, { migrateDatabase }, { seedDatabase }] = await Promise.all([
  import("../db/index.js"),
  import("../db/migrate.js"),
  import("../db/seed.js")
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
