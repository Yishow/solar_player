import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, rmSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";
import type { BrandProfile } from "@solar-display/shared";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-brand-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
process.env.UPLOADS_DIR = join(tempDir, "uploads", "images");
process.env.BRAND_UPLOADS_DIR = join(tempDir, "uploads", "brand");

const [{ buildApp }, { migrateDatabase }, { seedDatabase }, { getDatabase }] = await Promise.all([
  import("../app.js"),
  import("../db/migrate.js"),
  import("../db/seed.js"),
  import("../db/index.js")
]);

function clearBrandProfiles() {
  const db = getDatabase();
  db.prepare("DELETE FROM brand_profiles").run();
  db.prepare(
    `INSERT INTO brand_profiles (
       name, brand_name_zh, brand_name_en, product_title_zh, product_title_en,
       slogan_zh, slogan_en, is_active, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
  ).run(
    "預設品牌",
    "國瑞汽車",
    "KUOZUI MOTORS",
    "國瑞汽車中廠綠能展示播放器",
    "KUOZUI GREEN ENERGY DISPLAY PLAYER",
    "永續，從現在開始",
    "/ Sustainability Starts with Us"
  );

  const uploadsDir = process.env.BRAND_UPLOADS_DIR ?? join(tempDir, "uploads", "brand");
  if (existsSync(uploadsDir)) {
    for (const file of readdirSync(uploadsDir)) {
      unlinkSync(join(uploadsDir, file));
    }
  }
}

function createMinimalPng(): Buffer {
  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
  ]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(1, 0);
  ihdrData.writeUInt32BE(1, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 2;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrCrc = Buffer.from([0x90, 0x77, 0x53, 0xde]);
  const ihdr = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x0d]),
    Buffer.from("IHDR"),
    ihdrData,
    ihdrCrc
  ]);
  const idatData = Buffer.from([0x78, 0x9c, 0x62, 0x60, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01]);
  const idatCrc = Buffer.from([0xe8, 0x03, 0x8e, 0x15]);
  const idat = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x0a]),
    Buffer.from("IDAT"),
    idatData,
    idatCrc
  ]);
  const iend = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x00]),
    Buffer.from("IEND"),
    Buffer.from([0xae, 0x42, 0x60, 0x82])
  ]);
  return Buffer.concat([pngHeader, ihdr, idat, iend]);
}

function buildMultipartBody(
  filename: string,
  mimeType: string,
  content: Buffer,
  fields: Record<string, string> = {}
): { payload: Buffer; contentType: string } {
  const boundary = `----FastifyFormBoundary${Date.now()}`;
  const contentTypeHeader = `multipart/form-data; boundary=${boundary}`;
  const bodyParts: Buffer[] = [];

  for (const [key, value] of Object.entries(fields)) {
    bodyParts.push(Buffer.from(`--${boundary}\r\n`));
    bodyParts.push(Buffer.from(`Content-Disposition: form-data; name="${key}"\r\n\r\n`));
    bodyParts.push(Buffer.from(`${value}\r\n`));
  }

  bodyParts.push(Buffer.from(`--${boundary}\r\n`));
  bodyParts.push(Buffer.from(`Content-Disposition: form-data; name="file"; filename="${filename}"\r\n`));
  bodyParts.push(Buffer.from(`Content-Type: ${mimeType}\r\n\r\n`));
  bodyParts.push(content);
  bodyParts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

  return {
    payload: Buffer.concat(bodyParts),
    contentType: contentTypeHeader
  };
}

after(() => {
  rmSync(tempDir, { force: true, recursive: true });
  delete process.env.UPLOADS_DIR;
  delete process.env.BRAND_UPLOADS_DIR;
});

test("GET /api/brand/profiles returns the seeded active brand profile", async () => {
  migrateDatabase();
  seedDatabase();
  clearBrandProfiles();

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/brand/profiles"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as { success: boolean; data: BrandProfile[] };
    assert.equal(body.success, true);
    assert.equal(body.data.length, 1);
    assert.equal(body.data[0]?.isActive, true);
    assert.equal(body.data[0]?.brandNameZh, "國瑞汽車");
  } finally {
    await app.close();
  }
});

test("POST /api/brand/profiles creates a non-active brand profile", async () => {
  migrateDatabase();
  seedDatabase();
  clearBrandProfiles();

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "POST",
      url: "/api/brand/profiles",
      payload: {
        name: "Red Brand",
        brandNameZh: "紅色品牌",
        brandNameEn: "RED BRAND"
      }
    });

    assert.equal(response.statusCode, 201);
    const body = response.json() as { success: boolean; data: BrandProfile };
    assert.equal(body.success, true);
    assert.equal(body.data.name, "Red Brand");
    assert.equal(body.data.isActive, false);
  } finally {
    await app.close();
  }
});

test("POST /api/brand/profiles/:id/activate switches the active profile", async () => {
  migrateDatabase();
  seedDatabase();
  clearBrandProfiles();

  const db = getDatabase();
  const created = db.prepare(
    `INSERT INTO brand_profiles (
       name, brand_name_zh, brand_name_en, product_title_zh, product_title_en,
       slogan_zh, slogan_en, is_active, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
  ).run(
    "Brand B",
    "品牌 B",
    "BRAND B",
    "",
    "",
    "",
    ""
  );

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "POST",
      url: `/api/brand/profiles/${created.lastInsertRowid}/activate`
    });

    assert.equal(response.statusCode, 200);
    const listResponse = await app.inject({
      method: "GET",
      url: "/api/brand/profiles"
    });
    const listBody = listResponse.json() as { data: BrandProfile[] };
    const active = listBody.data.find((profile) => profile.isActive);
    assert.equal(active?.id, Number(created.lastInsertRowid));
  } finally {
    await app.close();
  }
});

test("POST /api/brand/profiles/:id/logo stores the file and exposes it from /uploads/brand", async () => {
  migrateDatabase();
  seedDatabase();
  clearBrandProfiles();

  const db = getDatabase();
  const activeId = (db.prepare("SELECT id FROM brand_profiles WHERE is_active = 1").get() as { id: number }).id;
  const app = await buildApp();

  try {
    const pngBuffer = createMinimalPng();
    const { payload, contentType } = buildMultipartBody("brand.png", "image/png", pngBuffer, {
      width: "512",
      height: "512"
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/brand/profiles/${activeId}/logo`,
      headers: { "content-type": contentType },
      payload
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as { success: boolean; data: BrandProfile };
    assert.equal(body.success, true);
    assert.equal(body.data.logoWidth, 512);
    assert.equal(body.data.logoHeight, 512);
    assert.ok(body.data.logoFilename);

    const assetResponse = await app.inject({
      method: "GET",
      url: `/uploads/brand/${body.data.logoFilename}`
    });
    assert.equal(assetResponse.statusCode, 200);
  } finally {
    await app.close();
  }
});

test("DELETE /api/brand/profiles/:id/logo clears database fields and removes the uploaded file", async () => {
  migrateDatabase();
  seedDatabase();
  clearBrandProfiles();

  const db = getDatabase();
  const activeId = (db.prepare("SELECT id FROM brand_profiles WHERE is_active = 1").get() as { id: number }).id;
  const app = await buildApp();

  try {
    const pngBuffer = createMinimalPng();
    const { payload, contentType } = buildMultipartBody("brand.png", "image/png", pngBuffer, {
      width: "512",
      height: "512"
    });

    const uploadResponse = await app.inject({
      method: "POST",
      url: `/api/brand/profiles/${activeId}/logo`,
      headers: { "content-type": contentType },
      payload
    });

    assert.equal(uploadResponse.statusCode, 200);
    const uploadBody = uploadResponse.json() as { success: boolean; data: BrandProfile };
    const logoFilename = uploadBody.data.logoFilename;
    assert.ok(logoFilename);

    const logoPath = join(process.env.BRAND_UPLOADS_DIR ?? "", logoFilename);
    assert.equal(existsSync(logoPath), true);

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/api/brand/profiles/${activeId}/logo`
    });

    assert.equal(deleteResponse.statusCode, 200);
    const deleteBody = deleteResponse.json() as { success: boolean; data: BrandProfile };
    assert.equal(deleteBody.success, true);
    assert.equal(deleteBody.data.logoFilename, null);
    assert.equal(deleteBody.data.logoWidth, null);
    assert.equal(deleteBody.data.logoHeight, null);
    assert.equal(deleteBody.data.logoFileSize, null);
    assert.equal(existsSync(logoPath), false);
  } finally {
    await app.close();
  }
});
