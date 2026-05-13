import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { extname, resolve } from "node:path";
import type { FastifyPluginAsync } from "fastify";
import type { ImageAsset } from "@solar-display/shared";
import { config } from "../config.js";
import { getDatabase } from "../db/index.js";

// ---------- types ----------

type ImageAssetRow = {
  id: number;
  filename: string | null;
  original_name: string | null;
  title: string | null;
  description: string | null;
  mime_type: string | null;
  file_size: number | null;
  width: number | null;
  height: number | null;
  aspect_ratio: number | null;
  included_in_slideshow: number;
  is_cover: number;
  display_duration: number;
  display_order: number | null;
  created_at: string | null;
  updated_at: string | null;
};

type ImageUpdateBody = {
  title?: string;
  description?: string;
  includedInSlideshow?: boolean;
  isCover?: boolean;
  displayDuration?: number;
};

type ImageReorderItem = {
  id: number;
  displayOrder: number;
};

type ImageReorderBody = {
  images: ImageReorderItem[];
};

// ---------- helpers ----------

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function serializeImageRow(row: ImageAssetRow): ImageAsset {
  return {
    id: row.id,
    filename: row.filename,
    originalName: row.original_name,
    title: row.title,
    description: row.description,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    width: row.width,
    height: row.height,
    aspectRatio: row.aspect_ratio,
    includedInSlideshow: row.included_in_slideshow === 1,
    isCover: row.is_cover === 1,
    displayDuration: row.display_duration,
    displayOrder: row.display_order
  };
}

function getAllImages(): ImageAssetRow[] {
  const database = getDatabase();
  return database
    .prepare(
      `
        SELECT
          id, filename, original_name, title, description,
          mime_type, file_size, width, height, aspect_ratio,
          included_in_slideshow, is_cover, display_duration,
          display_order, created_at, updated_at
        FROM image_assets
        ORDER BY display_order ASC, id ASC
      `
    )
    .all() as ImageAssetRow[];
}

function getImageById(id: number): ImageAssetRow | undefined {
  const database = getDatabase();
  return database
    .prepare(
      `
        SELECT
          id, filename, original_name, title, description,
          mime_type, file_size, width, height, aspect_ratio,
          included_in_slideshow, is_cover, display_duration,
          display_order, created_at, updated_at
        FROM image_assets
        WHERE id = ?
      `
    )
    .get(id) as ImageAssetRow | undefined;
}

function ensureUploadsDir() {
  mkdirSync(config.uploadsDir, { recursive: true });
}

function getStorageUsage(): { usedBytes: number; fileCount: number } {
  ensureUploadsDir();

  if (!existsSync(config.uploadsDir)) {
    return { usedBytes: 0, fileCount: 0 };
  }

  const files = readdirSync(config.uploadsDir);
  let usedBytes = 0;
  let fileCount = 0;

  for (const file of files) {
    const filePath = resolve(config.uploadsDir, file);
    try {
      const stat = statSync(filePath);
      if (stat.isFile()) {
        usedBytes += stat.size;
        fileCount += 1;
      }
    } catch {
      // skip files we cannot stat
    }
  }

  return { usedBytes, fileCount };
}

function deleteImageFile(filename: string) {
  const filePath = resolve(config.uploadsDir, filename);
  if (existsSync(filePath)) {
    rmSync(filePath);
  }
}

function generateUniqueFilename(originalName: string): string {
  const ext = extname(originalName).toLowerCase();
  const hash = createHash("sha256")
    .update(`${Date.now()}-${originalName}-${Math.random()}`)
    .digest("hex")
    .slice(0, 16);
  return `${hash}${ext}`;
}

// ---------- route plugin ----------

const imagesRoute: FastifyPluginAsync = async (app) => {
  // Register multipart plugin for file upload handling
  await app.register(import("@fastify/multipart"), {
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: 1
    }
  });

  // ---------- GET /api/images ----------
  app.get("/api/images", async () => {
    const rows = getAllImages();
    return {
      success: true,
      data: rows.map(serializeImageRow),
      timestamp: new Date().toISOString()
    };
  });

  // ---------- POST /api/images ----------
  app.post("/api/images", async (request, reply) => {
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({
        success: false,
        error: "No file uploaded",
        timestamp: new Date().toISOString()
      });
    }

    const ext = extname(data.filename).toLowerCase();

    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return reply.status(400).send({
        success: false,
        error: "Invalid file type. Only .jpg, .jpeg, .png, .webp are allowed.",
        timestamp: new Date().toISOString()
      });
    }

    ensureUploadsDir();

    const uniqueFilename = generateUniqueFilename(data.filename);
    const filePath = resolve(config.uploadsDir, uniqueFilename);

    // Save file using toBuffer() then writeFileSync
    const buffer = await data.toBuffer();

    // Verify file size
    if (buffer.length > MAX_FILE_SIZE) {
      return reply.status(400).send({
        success: false,
        error: "File too large. Maximum size is 10MB.",
        timestamp: new Date().toISOString()
      });
    }

    writeFileSync(filePath, buffer);

    const mimeType = data.mimetype;
    const originalName = data.filename;

    // Insert into database
    const database = getDatabase();
    const result = database
      .prepare(
        `
          INSERT INTO image_assets (
            filename, original_name, title, description,
            mime_type, file_size, display_duration, display_order,
            included_in_slideshow, is_cover, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, 10, NULL, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `
      )
      .run(
        uniqueFilename,
        originalName,
        originalName.replace(extname(originalName), ""),
        null,
        mimeType,
        buffer.length
      );

    const inserted = getImageById(result.lastInsertRowid as number);

    if (!inserted) {
      deleteImageFile(uniqueFilename);
      return reply.status(500).send({
        success: false,
        error: "Failed to save image metadata",
        timestamp: new Date().toISOString()
      });
    }

    app.socketService.emitImagesUpdated({
      action: "created",
      image: serializeImageRow(inserted)
    });

    return reply.status(201).send({
      success: true,
      data: serializeImageRow(inserted),
      timestamp: new Date().toISOString()
    });
  });

  // ---------- PUT /api/images/:id ----------
  app.put<{ Params: { id: string }; Body: ImageUpdateBody }>(
    "/api/images/:id",
    async (request, reply) => {
      const id = Number.parseInt(request.params.id, 10);
      if (!Number.isFinite(id)) {
        return reply.status(400).send({
          success: false,
          error: "Invalid image ID",
          timestamp: new Date().toISOString()
        });
      }

      const existing = getImageById(id);
      if (!existing) {
        return reply.status(404).send({
          success: false,
          error: "Image not found",
          timestamp: new Date().toISOString()
        });
      }

      const body = request.body ?? {};

      const database = getDatabase();
      const updateImage = database.prepare(
        `
          UPDATE image_assets SET
            title = COALESCE(?, title),
            description = COALESCE(?, description),
            included_in_slideshow = COALESCE(?, included_in_slideshow),
            is_cover = COALESCE(?, is_cover),
            display_duration = COALESCE(?, display_duration),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `
      );
      const clearOtherCovers = database.prepare(
        "UPDATE image_assets SET is_cover = 0, updated_at = CURRENT_TIMESTAMP WHERE id != ?"
      );

      database.transaction(() => {
        if (body.isCover === true) {
          clearOtherCovers.run(id);
        }

        updateImage.run(
          body.title ?? null,
          body.description ?? null,
          body.includedInSlideshow === undefined
            ? undefined
            : body.includedInSlideshow
              ? 1
              : 0,
          body.isCover === undefined
            ? undefined
            : body.isCover
              ? 1
              : 0,
          body.displayDuration ?? undefined,
          id
        );
      })();

      const updated = getImageById(id);

      if (!updated) {
        return reply.status(500).send({
          success: false,
          error: "Failed to update image",
          timestamp: new Date().toISOString()
        });
      }

      app.socketService.emitImagesUpdated({
        action: "updated",
        image: serializeImageRow(updated)
      });

      return {
        success: true,
        data: serializeImageRow(updated),
        timestamp: new Date().toISOString()
      };
    }
  );

  // ---------- DELETE /api/images/:id ----------
  app.delete<{ Params: { id: string } }>(
    "/api/images/:id",
    async (request, reply) => {
      const id = Number.parseInt(request.params.id, 10);
      if (!Number.isFinite(id)) {
        return reply.status(400).send({
          success: false,
          error: "Invalid image ID",
          timestamp: new Date().toISOString()
        });
      }

      const existing = getImageById(id);
      if (!existing) {
        return reply.status(404).send({
          success: false,
          error: "Image not found",
          timestamp: new Date().toISOString()
        });
      }

      const database = getDatabase();
      database.prepare("DELETE FROM image_assets WHERE id = ?").run(id);

      // Delete the physical file
      if (existing.filename) {
        deleteImageFile(existing.filename);
      }

      app.socketService.emitImagesUpdated({
        action: "deleted",
        id
      });

      return {
        success: true,
        data: { id },
        timestamp: new Date().toISOString()
      };
    }
  );

  // ---------- PUT /api/images/reorder ----------
  app.put<{ Body: ImageReorderBody }>(
    "/api/images/reorder",
    async (request, reply) => {
      const body = request.body ?? { images: [] };
      const database = getDatabase();

      const updateOrder = database.prepare(
        "UPDATE image_assets SET display_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      );

      const transaction = database.transaction(
        (images: ImageReorderItem[]) => {
          for (const item of images) {
            updateOrder.run(item.displayOrder, item.id);
          }
        }
      );

      transaction(body.images);

      const updated = getAllImages();

      app.socketService.emitImagesUpdated({
        action: "reordered",
        images: updated.map(serializeImageRow)
      });

      return {
        success: true,
        data: updated.map(serializeImageRow),
        timestamp: new Date().toISOString()
      };
    }
  );

  // ---------- GET /api/images/storage-usage ----------
  app.get("/api/images/storage-usage", async () => {
    const { usedBytes, fileCount } = getStorageUsage();
    return {
      success: true,
      data: {
        usedBytes,
        usedMB: Number((usedBytes / (1024 * 1024)).toFixed(2)),
        fileCount
      },
      timestamp: new Date().toISOString()
    };
  });
};

export default imagesRoute;
