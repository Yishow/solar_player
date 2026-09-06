import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";
import { readSourceImpact } from "./sourceImpactService.js";

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
