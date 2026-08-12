import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-mqtt-settings-validation-"));
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

test("invalid dataMode is rejected before stored MQTT settings are changed", async () => {
  const database = getDatabase();
  database.prepare("UPDATE mqtt_settings SET data_mode = 'mock'").run();
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "PUT",
      payload: { dataMode: "banana" },
      url: "/api/settings/mqtt"
    });

    assert.equal(response.statusCode, 400);
    assert.match(response.json().error, /dataMode/);
    assert.equal(
      (database.prepare("SELECT data_mode FROM mqtt_settings LIMIT 1").get() as { data_mode: string }).data_mode,
      "mock"
    );
  } finally {
    await app.close();
  }
});

test("invalid MQTT port and timeout are rejected on save and connection test", async () => {
  const app = await buildApp();

  try {
    const invalidPort = await app.inject({
      method: "PUT",
      payload: { port: 70_000 },
      url: "/api/settings/mqtt"
    });
    assert.equal(invalidPort.statusCode, 400);

    const invalidTimeout = await app.inject({
      method: "POST",
      payload: { messageTimeout: 0 },
      url: "/api/settings/mqtt/test"
    });
    assert.equal(invalidTimeout.statusCode, 400);
  } finally {
    await app.close();
  }
});
