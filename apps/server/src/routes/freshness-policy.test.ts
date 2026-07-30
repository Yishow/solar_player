import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-freshness-policy-routes-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
process.env.UPLOADS_DIR = join(tempDir, "uploads", "images");
const databasePath = process.env.DATABASE_PATH;

const [
  { buildApp },
  { closeDatabaseConnection },
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
  delete process.env.DATA_DIR;
  delete process.env.DATABASE_PATH;
  delete process.env.UPLOADS_DIR;
});

test("GET and PUT /api/freshness-policy manage the global policy", async () => {
  const app = await buildApp();
  try {
    const before = await app.inject({ method: "GET", url: "/api/freshness-policy" });
    assert.equal(before.statusCode, 200);
    const policy = before.json<{ policy: Record<string, unknown> }>().policy;

    const updated = await app.inject({
      method: "PUT",
      payload: {
        ...policy,
        cumulative: {
          delayedAfterMs: 900_000,
          staleAfterMs: 4_500_000,
          historicalAfterMs: 90_000_000
        }
      },
      url: "/api/freshness-policy"
    });
    assert.equal(updated.statusCode, 200);
    assert.equal(
      updated.json<{ policy: { cumulative: { delayedAfterMs: number } } }>()
        .policy.cumulative.delayedAfterMs,
      900_000
    );
  } finally {
    await app.close();
  }
});

test("invalid policy returns 400 and leaves the previous policy active", async () => {
  const app = await buildApp();
  try {
    const before = (
      await app.inject({ method: "GET", url: "/api/freshness-policy" })
    ).json<{ policy: { realtime: { delayedAfterMs: number } } }>();
    const invalid = await app.inject({
      method: "PUT",
      payload: {
        ...(await app.inject({ method: "GET", url: "/api/freshness-policy" })).json<{
          policy: Record<string, unknown>;
        }>().policy,
        realtime: {
          delayedAfterMs: 90_000,
          staleAfterMs: 90_000,
          historicalAfterMs: 1_800_000
        }
      },
      url: "/api/freshness-policy"
    });
    assert.equal(invalid.statusCode, 400);
    assert.equal(invalid.json<{ code: string }>().code, "freshness_policy_invalid");

    const after = (
      await app.inject({ method: "GET", url: "/api/freshness-policy" })
    ).json<{ policy: { realtime: { delayedAfterMs: number } } }>();
    assert.equal(
      after.policy.realtime.delayedAfterMs,
      before.policy.realtime.delayedAfterMs
    );
  } finally {
    await app.close();
  }
});
