import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-metrics-inventory-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");

const [{ buildApp }, { migrateDatabase }, { seedDatabase }, { getDatabase, closeDatabaseConnection }] = await Promise.all([
  import("../app.js"),
  import("../db/migrate.js"),
  import("../db/seed.js"),
  import("../db/index.js")
]);

after(() => {
  closeDatabaseConnection();
  rmSync(tempDir, { force: true, recursive: true });
});

test("GET /api/data-hub/metrics keeps same semantic key distinct across CL, KN, and global", async () => {
  migrateDatabase();
  seedDatabase();
  const database = getDatabase();
  database.prepare("DELETE FROM live_metric_values WHERE metric_key = ?").run("inventory.same");
  database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality)
    VALUES
      ('cl', 'inventory.same', 12, 'kW', '2026-08-31T00:00:00.000Z', 'good'),
      ('kn', 'inventory.same', 34, 'kW', '2026-08-31T00:01:00.000Z', 'good'),
      ('global', 'inventory.same', 46, 'kW', '2026-08-31T00:02:00.000Z', 'good')
  `).run();
  database.prepare(`
    INSERT INTO topic_mappings (metric_scope, metric_key, topic, value_path, unit, enabled)
    VALUES ('cl', 'inventory.waiting', 'factory/cl/waiting', '$.value', 'kW', 1)
  `).run();

  const app = await buildApp();
  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/data-hub/metrics?scope=all"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      metrics: Array<{ metricKey: string; metricScope: string; value: number | null }>;
    };
    assert.deepEqual(
      body.metrics
        .filter(({ metricKey }) => metricKey === "inventory.same")
        .map(({ metricScope, value }) => [metricScope, value]),
      [["cl", 12], ["global", 46], ["kn", 34]]
    );
    const waiting = body.metrics.find(({ metricKey }) => metricKey === "inventory.waiting") as
      | { provenance?: { sourceTopic?: string | null }; value: number | null }
      | undefined;
    assert.equal(waiting?.value, null);
    assert.equal(waiting?.provenance?.sourceTopic, "factory/cl/waiting");

    const invalidScope = await app.inject({
      method: "GET",
      url: "/api/data-hub/metrics?scope=all-sites"
    });
    assert.equal(invalidScope.statusCode, 400);
    assert.equal(invalidScope.json().code, "INVALID_METRIC_SCOPE");

    const denied = await app.inject({
      method: "GET",
      remoteAddress: "198.51.100.24",
      url: "/api/data-hub/metrics?scope=all"
    });
    assert.equal(denied.statusCode, 403);
  } finally {
    await app.close();
  }
});

test("GET /api/data-hub/metrics redacts URL host, path, and query details from source topics", async () => {
  migrateDatabase();
  seedDatabase();
  const database = getDatabase();
  const privateTopic = "https://inventory-user:inventory-password@192.0.2.44/internal/metrics?token=inventory-token&query=inventory-query";
  database.prepare(`
    INSERT INTO topic_mappings (metric_scope, metric_key, topic, value_path, unit, enabled)
    VALUES ('cl', 'inventory.privateUrl', ?, '$.value', 'kW', 1)
  `).run(privateTopic);
  database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES ('cl', 'inventory.privateUrl', 22, 'kW', '2026-08-31T00:00:00.000Z', 'good', ?)
  `).run(JSON.stringify({ error: "inventory raw exception", token: "inventory-raw-token" }));

  const app = await buildApp();
  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/data-hub/metrics?scope=cl"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      metrics: Array<{ metricKey: string; provenance?: { sourceTopic?: string | null } }>;
    };
    const privateRow = body.metrics.find(({ metricKey }) => metricKey === "inventory.privateUrl");
    assert.equal(privateRow?.provenance?.sourceTopic, "https://[REDACTED]");
    const serialized = JSON.stringify(body);
    for (const leakedValue of [
      "inventory-user",
      "inventory-password",
      "192.0.2.44",
      "/internal/metrics",
      "inventory-token",
      "inventory-query",
      "inventory raw exception",
      "inventory-raw-token"
    ]) {
      assert.equal(serialized.includes(leakedValue), false, leakedValue);
    }
  } finally {
    await app.close();
  }
});
