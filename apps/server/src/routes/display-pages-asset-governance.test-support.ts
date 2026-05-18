import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, beforeEach } from "node:test";

export const tempDir = mkdtempSync(join(tmpdir(), "solar-display-display-pages-assets-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
process.env.UPLOADS_DIR = join(tempDir, "uploads", "images");

export const databasePath = process.env.DATABASE_PATH;
export const uploadsDir = process.env.UPLOADS_DIR;

export const [
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

function createMinimalPng() {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xde, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9c, 0x63, 0x60, 0x00, 0x00, 0x00,
    0x02, 0x00, 0x01, 0xe5, 0x27, 0xd4, 0xa2, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82
  ]);
}

export function seedManagedImageAsset(filename = "overview-managed-hero.png") {
  const database = getDatabase();
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }
  writeFileSync(join(uploadsDir, filename), createMinimalPng());

  const result = database
    .prepare(
      `
        INSERT INTO image_assets (
          filename,
          original_name,
          title,
          mime_type,
          file_size,
          width,
          height,
          aspect_ratio,
          included_in_slideshow,
          is_cover,
          display_duration,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `
    )
    .run(filename, filename, "Overview Hero", "image/png", 68, 1, 1, 1);

  return {
    assetId: Number(result.lastInsertRowid),
    filename
  };
}

beforeEach(() => {
  closeDatabaseConnection();
  rmSync(databasePath, { force: true });
  rmSync(`${databasePath}-shm`, { force: true });
  rmSync(`${databasePath}-wal`, { force: true });
  rmSync(tempDir, { force: true, recursive: true });
  mkdirSync(tempDir, { recursive: true });
  migrateDatabase();
  seedDatabase();
});

after(() => {
  closeDatabaseConnection();
  rmSync(tempDir, { force: true, recursive: true });
});
