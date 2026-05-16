import { createHash } from "node:crypto";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import type { FastifyPluginAsync } from "fastify";
import type { BrandProfile } from "@solar-display/shared";
import { config } from "../config.js";
import { getDatabase } from "../db/index.js";

type BrandProfileRow = {
  id: number;
  name: string;
  brand_name_zh: string;
  brand_name_en: string;
  product_title_zh: string;
  product_title_en: string;
  slogan_zh: string;
  slogan_en: string;
  logo_filename: string | null;
  logo_mime_type: string | null;
  logo_width: number | null;
  logo_height: number | null;
  logo_file_size: number | null;
  is_active: number;
  created_at: string | null;
  updated_at: string | null;
};

type BrandUpdateBody = Partial<{
  name: string;
  brandNameZh: string;
  brandNameEn: string;
  productTitleZh: string;
  productTitleEn: string;
  sloganZh: string;
  sloganEn: string;
  logoWidth: number;
  logoHeight: number;
}>;

type BrandCreateBody = BrandUpdateBody & { name: string };

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".svg"]);
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml"
]);
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

function serializeRow(row: BrandProfileRow): BrandProfile {
  return {
    id: row.id,
    name: row.name,
    brandNameZh: row.brand_name_zh,
    brandNameEn: row.brand_name_en,
    productTitleZh: row.product_title_zh,
    productTitleEn: row.product_title_en,
    sloganZh: row.slogan_zh,
    sloganEn: row.slogan_en,
    logoFilename: row.logo_filename,
    logoMimeType: row.logo_mime_type,
    logoWidth: row.logo_width,
    logoHeight: row.logo_height,
    logoFileSize: row.logo_file_size,
    logoUrl: row.logo_filename ? `/uploads/brand/${row.logo_filename}` : null,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function clearLogoMetadata(id: number) {
  getDatabase()
    .prepare(
      `UPDATE brand_profiles
          SET logo_filename = NULL,
              logo_mime_type = NULL,
              logo_width = NULL,
              logo_height = NULL,
              logo_file_size = NULL,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`
    )
    .run(id);
}

function repairMissingLogoMetadata(row: BrandProfileRow): BrandProfileRow {
  if (!row.logo_filename) {
    return row;
  }

  const filePath = resolve(config.brandUploadsDir, row.logo_filename);
  if (existsSync(filePath)) {
    return row;
  }

  clearLogoMetadata(row.id);
  return {
    ...row,
    logo_filename: null,
    logo_mime_type: null,
    logo_width: null,
    logo_height: null,
    logo_file_size: null
  };
}

function getAllProfiles(): BrandProfileRow[] {
  return getDatabase()
    .prepare(
      `SELECT id, name, brand_name_zh, brand_name_en, product_title_zh, product_title_en,
              slogan_zh, slogan_en, logo_filename, logo_mime_type, logo_width, logo_height,
              logo_file_size, is_active, created_at, updated_at
         FROM brand_profiles
         ORDER BY is_active DESC, id ASC`
    )
    .all()
    .map((row) => repairMissingLogoMetadata(row as BrandProfileRow)) as BrandProfileRow[];
}

function getProfileById(id: number): BrandProfileRow | undefined {
  const row = getDatabase()
    .prepare(
      `SELECT id, name, brand_name_zh, brand_name_en, product_title_zh, product_title_en,
              slogan_zh, slogan_en, logo_filename, logo_mime_type, logo_width, logo_height,
              logo_file_size, is_active, created_at, updated_at
         FROM brand_profiles WHERE id = ?`
    )
    .get(id) as BrandProfileRow | undefined;

  return row ? repairMissingLogoMetadata(row) : undefined;
}

function ensureBrandDir() {
  mkdirSync(config.brandUploadsDir, { recursive: true });
}

function deleteLogoFile(filename: string) {
  const filePath = resolve(config.brandUploadsDir, filename);
  if (existsSync(filePath)) {
    rmSync(filePath);
  }
}

function generateLogoFilename(originalName: string): string {
  const ext = extname(originalName).toLowerCase();
  const hash = createHash("sha256")
    .update(`${Date.now()}-${originalName}-${Math.random()}`)
    .digest("hex")
    .slice(0, 16);
  return `brand-${hash}${ext}`;
}

function badRequest(reply: { status: (code: number) => { send: (body: unknown) => unknown } }, message: string) {
  return reply.status(400).send({
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  });
}

function notFound(reply: { status: (code: number) => { send: (body: unknown) => unknown } }) {
  return reply.status(404).send({
    success: false,
    error: "Brand profile not found",
    timestamp: new Date().toISOString()
  });
}

const brandRoute: FastifyPluginAsync = async (app) => {
  await app.register(import("@fastify/multipart"), {
    limits: { fileSize: MAX_FILE_SIZE, files: 1 }
  });

  // ---------- GET /api/brand/profiles ----------
  app.get("/api/brand/profiles", async () => ({
    success: true,
    data: getAllProfiles().map(serializeRow),
    timestamp: new Date().toISOString()
  }));

  // ---------- GET /api/brand/profiles/active ----------
  app.get("/api/brand/profiles/active", async (_request, reply) => {
    const row = getDatabase()
      .prepare(
        `SELECT id, name, brand_name_zh, brand_name_en, product_title_zh, product_title_en,
                slogan_zh, slogan_en, logo_filename, logo_mime_type, logo_width, logo_height,
                logo_file_size, is_active, created_at, updated_at
           FROM brand_profiles WHERE is_active = 1 ORDER BY id ASC LIMIT 1`
      )
      .get() as BrandProfileRow | undefined;
    if (!row) return notFound(reply);

    return {
      success: true,
      data: serializeRow(repairMissingLogoMetadata(row)),
      timestamp: new Date().toISOString()
    };
  });

  // ---------- POST /api/brand/profiles ----------
  app.post<{ Body: BrandCreateBody }>("/api/brand/profiles", async (request, reply) => {
    const body = request.body ?? ({} as BrandCreateBody);
    if (!body.name || body.name.trim().length === 0) {
      return badRequest(reply, "name is required");
    }
    const db = getDatabase();
    const result = db
      .prepare(
        `INSERT INTO brand_profiles (
           name, brand_name_zh, brand_name_en, product_title_zh, product_title_en,
           slogan_zh, slogan_en, is_active, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      )
      .run(
        body.name.trim(),
        body.brandNameZh ?? "",
        body.brandNameEn ?? "",
        body.productTitleZh ?? "",
        body.productTitleEn ?? "",
        body.sloganZh ?? "",
        body.sloganEn ?? ""
      );
    const created = getProfileById(result.lastInsertRowid as number);
    if (!created) return badRequest(reply, "Failed to create profile");
    return reply.status(201).send({
      success: true,
      data: serializeRow(created),
      timestamp: new Date().toISOString()
    });
  });

  // ---------- PUT /api/brand/profiles/:id ----------
  app.put<{ Params: { id: string }; Body: BrandUpdateBody }>(
    "/api/brand/profiles/:id",
    async (request, reply) => {
      const id = Number.parseInt(request.params.id, 10);
      if (!Number.isFinite(id)) return badRequest(reply, "Invalid profile id");
      const existing = getProfileById(id);
      if (!existing) return notFound(reply);
      const body = request.body ?? {};
      getDatabase()
        .prepare(
          `UPDATE brand_profiles SET
              name = COALESCE(?, name),
              brand_name_zh = COALESCE(?, brand_name_zh),
              brand_name_en = COALESCE(?, brand_name_en),
              product_title_zh = COALESCE(?, product_title_zh),
              product_title_en = COALESCE(?, product_title_en),
              slogan_zh = COALESCE(?, slogan_zh),
              slogan_en = COALESCE(?, slogan_en),
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`
        )
        .run(
          body.name ?? null,
          body.brandNameZh ?? null,
          body.brandNameEn ?? null,
          body.productTitleZh ?? null,
          body.productTitleEn ?? null,
          body.sloganZh ?? null,
          body.sloganEn ?? null,
          id
        );
      const updated = getProfileById(id);
      return {
        success: true,
        data: serializeRow(updated!),
        timestamp: new Date().toISOString()
      };
    }
  );

  // ---------- DELETE /api/brand/profiles/:id ----------
  app.delete<{ Params: { id: string } }>(
    "/api/brand/profiles/:id",
    async (request, reply) => {
      const id = Number.parseInt(request.params.id, 10);
      if (!Number.isFinite(id)) return badRequest(reply, "Invalid profile id");
      const existing = getProfileById(id);
      if (!existing) return notFound(reply);
      if (existing.is_active === 1) {
        return badRequest(reply, "無法刪除目前啟用中的品牌設定");
      }
      const db = getDatabase();
      const remaining = (db.prepare("SELECT COUNT(*) as c FROM brand_profiles").get() as { c: number }).c;
      if (remaining <= 1) {
        return badRequest(reply, "至少需保留一個品牌設定");
      }
      db.prepare("DELETE FROM brand_profiles WHERE id = ?").run(id);
      if (existing.logo_filename) deleteLogoFile(existing.logo_filename);
      return {
        success: true,
        data: { id },
        timestamp: new Date().toISOString()
      };
    }
  );

  // ---------- POST /api/brand/profiles/:id/activate ----------
  app.post<{ Params: { id: string } }>(
    "/api/brand/profiles/:id/activate",
    async (request, reply) => {
      const id = Number.parseInt(request.params.id, 10);
      if (!Number.isFinite(id)) return badRequest(reply, "Invalid profile id");
      const existing = getProfileById(id);
      if (!existing) return notFound(reply);
      const db = getDatabase();
      db.transaction(() => {
        db.prepare("UPDATE brand_profiles SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE is_active = 1").run();
        db.prepare("UPDATE brand_profiles SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
      })();
      return {
        success: true,
        data: serializeRow(getProfileById(id)!),
        timestamp: new Date().toISOString()
      };
    }
  );

  // ---------- POST /api/brand/profiles/:id/logo ----------
  app.post<{ Params: { id: string } }>(
    "/api/brand/profiles/:id/logo",
    async (request, reply) => {
      const id = Number.parseInt(request.params.id, 10);
      if (!Number.isFinite(id)) return badRequest(reply, "Invalid profile id");
      const existing = getProfileById(id);
      if (!existing) return notFound(reply);

      const data = await request.file();
      if (!data) return badRequest(reply, "No file uploaded");

      const ext = extname(data.filename).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        return badRequest(reply, "僅支援 .png、.jpg、.jpeg、.webp、.svg");
      }
      if (data.mimetype && !ALLOWED_MIME.has(data.mimetype)) {
        return badRequest(reply, `不支援的 MIME 類型：${data.mimetype}`);
      }

      const buffer = await data.toBuffer();
      if (buffer.length > MAX_FILE_SIZE) {
        return badRequest(reply, "檔案需小於 2 MB");
      }

      ensureBrandDir();
      const filename = generateLogoFilename(data.filename);
      writeFileSync(resolve(config.brandUploadsDir, filename), buffer);

      const fields = (data.fields ?? {}) as Record<string, { value?: string } | undefined>;
      const widthRaw = fields.width?.value;
      const heightRaw = fields.height?.value;
      const width = widthRaw ? Number.parseInt(widthRaw, 10) : null;
      const height = heightRaw ? Number.parseInt(heightRaw, 10) : null;

      const oldLogo = existing.logo_filename;

      getDatabase()
        .prepare(
          `UPDATE brand_profiles SET
              logo_filename = ?, logo_mime_type = ?, logo_width = ?, logo_height = ?,
              logo_file_size = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`
        )
        .run(
          filename,
          data.mimetype ?? null,
          Number.isFinite(width) ? width : null,
          Number.isFinite(height) ? height : null,
          buffer.length,
          id
        );

      if (oldLogo && oldLogo !== filename) deleteLogoFile(oldLogo);

      return {
        success: true,
        data: serializeRow(getProfileById(id)!),
        timestamp: new Date().toISOString()
      };
    }
  );

  // ---------- DELETE /api/brand/profiles/:id/logo ----------
  app.delete<{ Params: { id: string } }>(
    "/api/brand/profiles/:id/logo",
    async (request, reply) => {
      const id = Number.parseInt(request.params.id, 10);
      if (!Number.isFinite(id)) return badRequest(reply, "Invalid profile id");
      const existing = getProfileById(id);
      if (!existing) return notFound(reply);
      if (existing.logo_filename) deleteLogoFile(existing.logo_filename);
      getDatabase()
        .prepare(
          `UPDATE brand_profiles SET
              logo_filename = NULL, logo_mime_type = NULL,
              logo_width = NULL, logo_height = NULL, logo_file_size = NULL,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`
        )
        .run(id);
      return {
        success: true,
        data: serializeRow(getProfileById(id)!),
        timestamp: new Date().toISOString()
      };
    }
  );
};

export default brandRoute;
