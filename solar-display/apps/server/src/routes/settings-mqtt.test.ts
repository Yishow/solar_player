import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-mqtt-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");

const [{ buildApp }, { migrateDatabase }, { seedDatabase }] = await Promise.all([
  import("../app.js"),
  import("../db/migrate.js"),
  import("../db/seed.js")
]);

after(() => {
  rmSync(tempDir, { force: true, recursive: true });
});

test("GET /api/settings/mqtt masks password and exposes status", async () => {
  migrateDatabase();
  seedDatabase();

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/settings/mqtt"
    });

    assert.equal(response.statusCode, 200);

    const body = response.json() as {
      settings: { password: string };
      status: { connected: boolean };
    };

    assert.equal(body.settings.password, "****");
    assert.equal(typeof body.status.connected, "boolean");
  } finally {
    await app.close();
  }
});
