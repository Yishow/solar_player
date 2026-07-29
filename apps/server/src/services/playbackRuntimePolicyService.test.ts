import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-playback-runtime-policy-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
process.env.UPLOADS_DIR = join(tempDir, "uploads", "images");
const databasePath = process.env.DATABASE_PATH;

const [
  { closeDatabaseConnection, getDatabase },
  { migrateDatabase },
  { seedDatabase },
  { readGlobalPlaybackRuntimePolicyRow, writeGlobalPlaybackRuntimePolicyRow }
] = await Promise.all([
  import("../db/index.js"),
  import("../db/migrate.js"),
  import("../db/seed.js"),
  import("./playbackRuntimePolicyService.js")
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
  delete process.env.DATA_DIR;
  delete process.env.DATABASE_PATH;
  delete process.env.UPLOADS_DIR;
});

test("global Playback Runtime Policy persists transition and freshness enforcement", () => {
  writeGlobalPlaybackRuntimePolicyRow({
    enforce_fresh_runtime_data: 0,
    transition_speed: 420,
    transition_type: "slide"
  });

  const policy = readGlobalPlaybackRuntimePolicyRow();
  assert.deepEqual(
    {
      enforce_fresh_runtime_data: policy.enforce_fresh_runtime_data,
      transition_speed: policy.transition_speed,
      transition_type: policy.transition_type
    },
    {
      enforce_fresh_runtime_data: 0,
      transition_speed: 420,
      transition_type: "slide"
    }
  );
  assert.equal(typeof policy.updated_at, "string");
});

test("global Playback Runtime Policy reads fail explicitly when the singleton row is missing", () => {
  getDatabase().prepare("DELETE FROM playback_runtime_policy WHERE id = 1").run();

  assert.throws(
    () => readGlobalPlaybackRuntimePolicyRow(),
    /Global Playback Runtime Policy is not initialized/
  );
});
