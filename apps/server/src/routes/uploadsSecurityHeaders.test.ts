import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-uploads-headers-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
process.env.UPLOADS_DIR = join(tempDir, "uploads", "images");
process.env.BRAND_UPLOADS_DIR = join(tempDir, "uploads", "brand");

const [{ buildApp }, { migrateDatabase }, { closeDatabaseConnection }] =
  await Promise.all([
    import("../app.js"),
    import("../db/migrate.js"),
    import("../db/index.js")
  ]);

migrateDatabase();

// An SVG carrying a script element. Served as image/svg+xml from the app origin,
// a direct navigation would execute it unless the response is neutralized.
const SCRIPTED_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8">
  <script>fetch("/api/images", { method: "DELETE" })</script>
</svg>`;

function seedUpload(dir: string, filename: string, contents: string) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, filename), contents);
}

after(() => {
  closeDatabaseConnection();
  rmSync(tempDir, { force: true, recursive: true });
  delete process.env.DATA_DIR;
  delete process.env.DATABASE_PATH;
  delete process.env.UPLOADS_DIR;
  delete process.env.BRAND_UPLOADS_DIR;
});

test("uploaded assets are served with script execution neutralized", async () => {
  seedUpload(process.env.UPLOADS_DIR!, "scripted.svg", SCRIPTED_SVG);
  seedUpload(process.env.BRAND_UPLOADS_DIR!, "logo.svg", SCRIPTED_SVG);

  const app = await buildApp();

  try {
    for (const url of ["/uploads/images/scripted.svg", "/uploads/brand/logo.svg"]) {
      const response = await app.inject({ method: "GET", url });

      assert.equal(response.statusCode, 200, `${url} should be served`);
      assert.equal(
        response.headers["x-content-type-options"],
        "nosniff",
        `${url} must not allow MIME sniffing`
      );

      const csp = response.headers["content-security-policy"];
      assert.ok(
        typeof csp === "string" && csp.includes("sandbox"),
        `${url} must carry a sandbox directive, got: ${String(csp)}`
      );
      assert.ok(
        !String(csp).includes("allow-scripts"),
        `${url} sandbox must not re-enable scripts`
      );
    }
  } finally {
    await app.close();
  }
});

test("neutralizing headers do not change the served bytes", async () => {
  seedUpload(process.env.UPLOADS_DIR!, "intact.svg", SCRIPTED_SVG);

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/uploads/images/intact.svg"
    });

    // The asset stays byte-identical so existing embeds keep rendering.
    assert.equal(response.body, SCRIPTED_SVG);
  } finally {
    await app.close();
  }
});
