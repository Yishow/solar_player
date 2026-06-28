import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-topic-names-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");

const [{ migrateDatabase }, { getDatabase }] = await Promise.all([
  import("../migrate.js"),
  import("../index.js")
]);

after(() => {
  rmSync(tempDir, { force: true, recursive: true });
});

test("014_topic_display_names adds name_zh and name_en columns to topic_mappings", () => {
  migrateDatabase();

  const columns = (
    getDatabase().prepare("PRAGMA table_info(topic_mappings)").all() as Array<{ name: string }>
  ).map((column) => column.name);

  assert.equal(columns.includes("name_zh"), true);
  assert.equal(columns.includes("name_en"), true);
});

test("migrateDatabase is idempotent when re-run", () => {
  assert.doesNotThrow(() => {
    migrateDatabase();
    migrateDatabase();
  });

  const nameColumns = (
    getDatabase().prepare("PRAGMA table_info(topic_mappings)").all() as Array<{ name: string }>
  ).filter((column) => column.name === "name_zh" || column.name === "name_en");

  assert.equal(nameColumns.length, 2);
});
