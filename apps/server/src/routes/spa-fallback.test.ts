import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-spa-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");

const webDistDir = join(tempDir, "web-dist");
mkdirSync(webDistDir, { recursive: true });
writeFileSync(
  join(webDistDir, "index.html"),
  "<!doctype html><html><body><div id=\"root\">spa-fallback</div></body></html>"
);

const [{ buildApp }, { migrateDatabase }, { seedDatabase }] = await Promise.all([
  import("../app.js"),
  import("../db/migrate.js"),
  import("../db/seed.js")
]);

after(() => {
  rmSync(tempDir, { force: true, recursive: true });
  delete process.env.WEB_DIST_DIR;
});

test("non-api SPA routes serve index.html instead of 500", async () => {
  process.env.WEB_DIST_DIR = webDistDir;
  migrateDatabase();
  seedDatabase();

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/solar",
      headers: {
        accept: "text/html"
      }
    });

    assert.equal(response.statusCode, 200);
    assert.match(response.body, /spa-fallback/);
  } finally {
    await app.close();
  }
});

test("missing static assets keep returning 404 instead of index.html", async () => {
  process.env.WEB_DIST_DIR = webDistDir;
  migrateDatabase();
  seedDatabase();

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/assets/missing.js",
      headers: {
        accept: "*/*"
      }
    });

    assert.equal(response.statusCode, 404);
  } finally {
    await app.close();
  }
});
