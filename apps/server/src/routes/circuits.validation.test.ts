import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-circuit-validation-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
const databasePath = process.env.DATABASE_PATH;

const [
  { buildApp },
  { closeDatabaseConnection, getDatabase },
  { migrateDatabase },
  { seedDatabase }
] = await Promise.all([
  import("../app.js"),
  import("../db/index.js"),
  import("../db/migrate.js"),
  import("../db/seed.js")
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

test("circuit create rejects missing name and non-boolean enabled without writing", async () => {
  const database = getDatabase();
  const beforeCount = (
    database.prepare("SELECT COUNT(*) AS count FROM circuit_configs").get() as { count: number }
  ).count;
  const app = await buildApp();

  try {
    const missingName = await app.inject({
      method: "POST",
      payload: { ratedCapacity: 100 },
      url: "/api/circuits"
    });
    assert.equal(missingName.statusCode, 400);

    const fakeBoolean = await app.inject({
      method: "POST",
      payload: { enabled: "false", nameZh: "錯誤布林" },
      url: "/api/circuits"
    });
    assert.equal(fakeBoolean.statusCode, 400);

    const afterCount = (
      database.prepare("SELECT COUNT(*) AS count FROM circuit_configs").get() as { count: number }
    ).count;
    assert.equal(afterCount, beforeCount);
  } finally {
    await app.close();
  }
});

test("circuit update and delete reject an ID with trailing characters", async () => {
  const app = await buildApp();

  try {
    const update = await app.inject({
      method: "PUT",
      payload: { nameZh: "不應更新" },
      url: "/api/circuits/1abc"
    });
    assert.equal(update.statusCode, 400);

    const remove = await app.inject({
      method: "DELETE",
      url: "/api/circuits/1abc"
    });
    assert.equal(remove.statusCode, 400);
  } finally {
    await app.close();
  }
});

test("circuit reorder rejects malformed items before applying any order changes", async () => {
  const database = getDatabase();
  const before = database
    .prepare("SELECT id, display_order FROM circuit_configs ORDER BY id")
    .all();
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "PUT",
      payload: { circuits: [{ id: 1, displayOrder: -1 }] },
      url: "/api/circuits/reorder"
    });
    assert.equal(response.statusCode, 400);

    const afterRows = database
      .prepare("SELECT id, display_order FROM circuit_configs ORDER BY id")
      .all();
    assert.deepEqual(afterRows, before);
  } finally {
    await app.close();
  }
});
