import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-seed-assets-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
process.env.UPLOADS_DIR = join(tempDir, "uploads", "images");

const [{ migrateDatabase }, { getDatabase }, { bootstrapDisplaySeedAssets }] = await Promise.all([
  import("../db/migrate.js"),
  import("../db/index.js"),
  import("./displaySeedAssetBootstrapService.js")
]);

const sourceDir = join(tempDir, "source");
const sourceFile = join(sourceDir, "overview-seed.png");
const manifest = [
  {
    category: "background" as const,
    description: "Overview 預設背景",
    key: "overview.hero",
    mimeType: "image/png",
    sourcePath: sourceFile,
    targetFilename: "display-seed-overview-hero.png",
    title: "Overview Hero Seed",
    usageScope: "page-only" as const
  }
];

after(() => {
  rmSync(tempDir, { force: true, recursive: true });
  delete process.env.DATA_DIR;
  delete process.env.DATABASE_PATH;
  delete process.env.UPLOADS_DIR;
});

test("bootstrapDisplaySeedAssets creates file-backed catalog rows from a seed manifest", () => {
  migrateDatabase();
  rmSync(sourceDir, { force: true, recursive: true });
  mkdirSync(sourceDir, { recursive: true });
  writeFileSync(sourceFile, Buffer.from("seed-image"));

  const result = bootstrapDisplaySeedAssets({ manifest });
  const row = getDatabase()
    .prepare("SELECT * FROM image_assets WHERE original_name = ?")
    .get("display-seed:overview.hero") as {
      category: string;
      description: string | null;
      filename: string;
      file_size: number;
      mime_type: string;
      title: string;
      usage_scope: string;
    } | undefined;

  assert.equal(result.created, 1);
  assert.equal(result.reused, 0);
  assert.ok(row);
  assert.equal(row.filename, "display-seed-overview-hero.png");
  assert.equal(row.title, "Overview Hero Seed");
  assert.equal(row.description, "內建種子素材 · Overview 預設背景");
  assert.equal(row.category, "background");
  assert.equal(row.usage_scope, "page-only");
  assert.equal(row.mime_type, "image/png");
  assert.equal(row.file_size, 10);
  assert.equal(existsSync(join(process.env.UPLOADS_DIR!, "display-seed-overview-hero.png")), true);
});

test("bootstrapDisplaySeedAssets is idempotent and preserves operator metadata and uploads", () => {
  const database = getDatabase();
  database
    .prepare("UPDATE image_assets SET title = ?, description = ? WHERE original_name = ?")
    .run("Operator label", "Operator note", "display-seed:overview.hero");
  database
    .prepare(
      `
        INSERT INTO image_assets (
          category, usage_scope, filename, original_name, title, description,
          mime_type, file_size, display_duration, included_in_slideshow,
          is_cover, created_at, updated_at
        ) VALUES ('icon', 'both', 'operator-upload.png', 'operator-upload.png',
          'Operator upload', NULL, 'image/png', 3, 10, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `
    )
    .run();

  const result = bootstrapDisplaySeedAssets({ manifest });
  const rows = database
    .prepare("SELECT title, description FROM image_assets WHERE original_name = ?")
    .all("display-seed:overview.hero") as Array<{ description: string | null; title: string }>;
  const upload = database
    .prepare("SELECT title FROM image_assets WHERE filename = ?")
    .get("operator-upload.png") as { title: string } | undefined;

  assert.equal(result.created, 0);
  assert.equal(result.reused, 1);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], {
    description: "Operator note",
    title: "Operator label"
  });
  assert.deepEqual(upload, { title: "Operator upload" });
});
