import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-display-pages-assets-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
process.env.UPLOADS_DIR = join(tempDir, "uploads", "images");
const databasePath = process.env.DATABASE_PATH;
const uploadsDir = process.env.UPLOADS_DIR;

const [{ buildApp }, { closeDatabaseConnection, getDatabase }, { migrateDatabase }, { seedDatabase }] =
  await Promise.all([
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

function seedManagedImageAsset() {
  const database = getDatabase();
  const filename = "overview-managed-hero.png";
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

test("draft config stores managed asset references and resolves runtime src on read", async () => {
  const app = await buildApp();
  const managedAsset = seedManagedImageAsset();

  try {
    const saveResponse = await app.inject({
      method: "PUT",
      url: "/api/display-pages/overview/draft",
      payload: {
        regions: {
          heroMedia: {
            alt: "Managed overview hero",
            assetId: managedAsset.assetId,
            src: "/should-not-persist.png"
          }
        }
      }
    });

    assert.equal(saveResponse.statusCode, 200);

    const storedRow = getDatabase()
      .prepare(
        "SELECT config_json FROM display_page_stage_configs WHERE page_key = ? AND stage = ?"
      )
      .get("overview", "draft") as { config_json: string };
    const storedConfig = JSON.parse(storedRow.config_json) as {
      heroMedia: { alt: string; assetId: number; src?: string };
    };

    assert.equal(storedConfig.heroMedia.assetId, managedAsset.assetId);
    assert.equal(storedConfig.heroMedia.alt, "Managed overview hero");
    assert.equal("src" in storedConfig.heroMedia, false);

    const readResponse = await app.inject({
      method: "GET",
      url: "/api/display-pages/overview/draft"
    });

    assert.equal(readResponse.statusCode, 200);
    const readBody = readResponse.json() as {
      config: {
        regions: {
          heroMedia: { alt: string; assetId: number; src?: string };
        };
      };
    };

    assert.equal(readBody.config.regions.heroMedia.assetId, managedAsset.assetId);
    assert.equal(readBody.config.regions.heroMedia.alt, "Managed overview hero");
    assert.equal(
      readBody.config.regions.heroMedia.src,
      `/uploads/images/${managedAsset.filename}`
    );
  } finally {
    await app.close();
  }
});

test("draft config surfaces a missing managed asset finding when the reference no longer resolves", async () => {
  const app = await buildApp();
  const managedAsset = seedManagedImageAsset();

  try {
    await app.inject({
      method: "PUT",
      url: "/api/display-pages/solar/draft",
      payload: {
        regions: {
          heroMedia: {
            alt: "Solar hero",
            assetId: managedAsset.assetId
          }
        }
      }
    });

    getDatabase().prepare("DELETE FROM image_assets WHERE id = ?").run(managedAsset.assetId);

    const readResponse = await app.inject({
      method: "GET",
      url: "/api/display-pages/solar/draft"
    });

    assert.equal(readResponse.statusCode, 200);
    const readBody = readResponse.json() as {
      config: {
        assetFindings?: Array<{
          assetId: number;
          bindingId: string;
          pageId: string;
          reason: string;
          status: string;
        }>;
      };
    };

    assert.deepEqual(readBody.config.assetFindings, [
      {
        assetId: managedAsset.assetId,
        bindingId: "heroMedia",
        message: "素材引用不存在，無法解析 binding heroMedia",
        pageId: "solar",
        reason: "missing-asset",
        status: "unhealthy"
      }
    ]);
  } finally {
    await app.close();
  }
});

test("draft validation reports missing managed asset references as warnings", async () => {
  const app = await buildApp();
  const managedAsset = seedManagedImageAsset();

  try {
    await app.inject({
      method: "PUT",
      url: "/api/display-pages/images/draft",
      payload: {
        regions: {
          mainStage: {
            alt: "Images stage",
            assetId: managedAsset.assetId
          }
        }
      }
    });

    getDatabase().prepare("DELETE FROM image_assets WHERE id = ?").run(managedAsset.assetId);

    const validateResponse = await app.inject({
      method: "POST",
      url: "/api/display-pages/images/validate"
    });

    assert.equal(validateResponse.statusCode, 200);
    const validateBody = validateResponse.json() as {
      validation: {
        findings: Array<{
          code: string;
          message: string;
          regionId?: string;
          severity: string;
        }>;
      };
    };

    assert.equal(
      validateBody.validation.findings.some(
        (finding) =>
          finding.code === "ASSET_REFERENCE_MISSING" &&
          finding.regionId === "mainStage" &&
          finding.severity === "warning"
      ),
      true
    );
  } finally {
    await app.close();
  }
});
