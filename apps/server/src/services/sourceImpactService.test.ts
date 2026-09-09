import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";
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
