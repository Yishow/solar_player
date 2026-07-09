import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";
import { buildApp } from "./app.js";
import { config } from "./config.js";
import { closeDatabaseConnection } from "./db/index.js";
import { migrateDatabase } from "./db/migrate.js";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-openapi-docs-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
process.env.UPLOADS_DIR = join(tempDir, "uploads", "images");
process.env.BRAND_UPLOADS_DIR = join(tempDir, "uploads", "brand");
const originalOpenapiPath = config.openapiPath;

after(() => {
  closeDatabaseConnection();
  config.openapiPath = originalOpenapiPath;
  rmSync(tempDir, { force: true, recursive: true });
  delete process.env.DATA_DIR;
  delete process.env.DATABASE_PATH;
  delete process.env.UPLOADS_DIR;
  delete process.env.BRAND_UPLOADS_DIR;
});

test("buildApp keeps runtime health available when the optional OpenAPI docs file is omitted", async () => {
  config.openapiPath = join(tempDir, "missing-openapi.yaml");
  migrateDatabase();

  const app = await buildApp();
  try {
    const response = await app.inject({
      method: "GET",
      url: "/health"
    });

    assert.equal(response.statusCode, 200);
  } finally {
    await app.close();
  }
});
