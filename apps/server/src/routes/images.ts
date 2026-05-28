import { extname, resolve } from "node:path";
import { writeFileSync } from "node:fs";
import type { FastifyPluginAsync } from "fastify";
import type {
  ImageAsset,
  ManagedAssetCategory,
  ManagedAssetUsageScope
} from "@solar-display/shared";
import { getDatabase } from "../db/index.js";
import { readDisplayOpsAssetReferences } from "../services/displayOpsService.js";
import {
  deleteImagePlaylistEntriesForAsset,
  ensureImagePlaylistEntryForAsset
} from "../services/imagePlaylistService.js";
import {
  ALLOWED_EXTENSIONS,
  deleteImageFile,
  ensureUploadsDir,
  generateUniqueFilename,
  getAllImages,
  getImageById,
  getStorageUsage,
  MAX_FILE_SIZE,
  serializeImageRow,
  type ImageReorderBody,
  type ImageUpdateBody
} from "./imagesSupport.js";
import { config } from "../config.js";

const MANAGED_ASSET_CATEGORY_SET = new Set<ManagedAssetCategory>(["background", "object", "icon"]);
const MANAGED_ASSET_USAGE_SCOPE_SET = new Set<ManagedAssetUsageScope>(["both", "page-only", "shell-only"]);

function errorResponse(error: string) {
  return {
    success: false,
    error,
    timestamp: new Date().toISOString()
  };
}

function successResponse<T>(data: T) {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString()
  };
}

function summarizeImageUsage(assetId: number) {
  const references = readDisplayOpsAssetReferences(assetId);

  return {
    draftCount: references.draftCount,
    liveCount: references.liveCount,
    referenceCount: references.references.length
  };
}

function serializeImageCatalogRow(row: ReturnType<typeof getImageById> extends infer TResult
  ? Exclude<TResult, undefined>
  : never): ImageAsset {
  return {
    ...serializeImageRow(row),
    usageSummary: summarizeImageUsage(row.id)
  };
}

function readMultipartFieldValue(field: unknown) {
  if (!field || typeof field !== "object" || !("value" in field)) {
    return null;
  }

  return typeof field.value === "string" ? field.value : null;
}

function normalizeAssetCategory(value: string | null): ManagedAssetCategory {
  if (value && MANAGED_ASSET_CATEGORY_SET.has(value as ManagedAssetCategory)) {
    return value as ManagedAssetCategory;
  }

  return "background";
}

function normalizeAssetUsageScope(value: string | null): ManagedAssetUsageScope {
  if (value && MANAGED_ASSET_USAGE_SCOPE_SET.has(value as ManagedAssetUsageScope)) {
    return value as ManagedAssetUsageScope;
  }

  return "both";
}

function normalizeBooleanField(value: string | null, fallback: boolean) {
  if (value === "true" || value === "1") {
    return true;
  }

  if (value === "false" || value === "0") {
    return false;
  }

  return fallback;
}

const imagesRoute: FastifyPluginAsync = async (app) => {
  await app.register(import("@fastify/multipart"), {
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: 1
    }
  });

  app.get("/api/images", async () => successResponse(getAllImages().map(serializeImageCatalogRow)));

  app.post("/api/images", async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.status(400).send(errorResponse("No file uploaded"));
    }

    const ext = extname(data.filename).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return reply
        .status(400)
        .send(errorResponse("Invalid file type. Only .jpg, .jpeg, .png, .webp are allowed."));
    }

    ensureUploadsDir();
    const buffer = await data.toBuffer();
    if (buffer.length > MAX_FILE_SIZE) {
      return reply.status(400).send(errorResponse("File too large. Maximum size is 10MB."));
    }

    const category = normalizeAssetCategory(readMultipartFieldValue(data.fields.category));
    const usageScope = normalizeAssetUsageScope(readMultipartFieldValue(data.fields.usageScope));
    const includedInSlideshow = normalizeBooleanField(
      readMultipartFieldValue(data.fields.includedInSlideshow),
      false
    );
    const uniqueFilename = generateUniqueFilename(data.filename);
    writeFileSync(resolve(config.uploadsDir, uniqueFilename), buffer);

    const database = getDatabase();
    const result = database
      .prepare(
        `
          INSERT INTO image_assets (
            category, usage_scope, filename, original_name, title, description,
            mime_type, file_size, display_duration, display_order,
            included_in_slideshow, is_cover, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 10, NULL, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `
      )
      .run(
        category,
        usageScope,
        uniqueFilename,
        data.filename,
        data.filename.replace(extname(data.filename), ""),
        null,
        data.mimetype,
        buffer.length,
        includedInSlideshow ? 1 : 0
      );

    const inserted = getImageById(result.lastInsertRowid as number);
    if (!inserted) {
      deleteImageFile(uniqueFilename);
      return reply.status(500).send(errorResponse("Failed to save image metadata"));
    }

    if (includedInSlideshow) {
      ensureImagePlaylistEntryForAsset(inserted.id);
    }

    app.socketService.emitImagesUpdated({
      action: "created",
      image: serializeImageCatalogRow(inserted)
    });
    app.socketService.emitDisplaySync({
      generatedAt: new Date().toISOString(),
      reason: "image-created",
      scope: "images"
    });

    return reply.status(201).send(successResponse(serializeImageCatalogRow(inserted)));
  });

  app.put<{ Params: { id: string }; Body: ImageUpdateBody }>("/api/images/:id", async (request, reply) => {
    const id = Number.parseInt(request.params.id, 10);
    if (!Number.isFinite(id)) {
      return reply.status(400).send(errorResponse("Invalid image ID"));
    }

    const existing = getImageById(id);
    if (!existing) {
      return reply.status(404).send(errorResponse("Image not found"));
    }

    const body = request.body ?? {};
    const database = getDatabase();
    const updateImage = database.prepare(
      `
        UPDATE image_assets SET
          title = COALESCE(?, title),
          description = COALESCE(?, description),
          aspect_ratio = COALESCE(?, aspect_ratio),
          included_in_slideshow = COALESCE(?, included_in_slideshow),
          is_cover = COALESCE(?, is_cover),
          display_duration = COALESCE(?, display_duration),
          category = COALESCE(?, category),
          usage_scope = COALESCE(?, usage_scope),
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
        body.aspectRatio ?? undefined,
        body.includedInSlideshow === undefined ? undefined : body.includedInSlideshow ? 1 : 0,
        body.isCover === undefined ? undefined : body.isCover ? 1 : 0,
        body.displayDuration ?? undefined,
        body.category ?? undefined,
        body.usageScope ?? undefined,
        id
      );
    })();

    const updated = getImageById(id);
    if (!updated) {
      return reply.status(500).send(errorResponse("Failed to update image"));
    }

    app.socketService.emitImagesUpdated({
      action: "updated",
      image: serializeImageCatalogRow(updated)
    });
    app.socketService.emitDisplaySync({
      generatedAt: new Date().toISOString(),
      reason: "image-updated",
      scope: "images"
    });

    return successResponse(serializeImageCatalogRow(updated));
  });

  app.delete<{ Params: { id: string } }>("/api/images/:id", async (request, reply) => {
    const id = Number.parseInt(request.params.id, 10);
    if (!Number.isFinite(id)) {
      return reply.status(400).send(errorResponse("Invalid image ID"));
    }

    const existing = getImageById(id);
    if (!existing) {
      return reply.status(404).send(errorResponse("Image not found"));
    }

    const references = readDisplayOpsAssetReferences(id);
    if (references.blockingIssues.length > 0) {
      return reply.status(409).send({
        ...errorResponse("Image is still referenced by a live display surface or playlist runtime."),
        references
      });
    }

    deleteImagePlaylistEntriesForAsset(id);
    getDatabase().prepare("DELETE FROM image_assets WHERE id = ?").run(id);
    if (existing.filename) {
      deleteImageFile(existing.filename);
    }

    app.socketService.emitImagesUpdated({
      action: "deleted",
      id
    });
    app.socketService.emitDisplaySync({
      generatedAt: new Date().toISOString(),
      reason: "image-deleted",
      scope: "images"
    });

    return successResponse({ id });
  });

  app.put<{ Body: ImageReorderBody }>("/api/images/reorder", async (request) => {
    const database = getDatabase();
    const updateOrder = database.prepare(
      "UPDATE image_assets SET display_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    );

    database.transaction((items) => {
      for (const item of items) {
        updateOrder.run(item.displayOrder, item.id);
      }
    })(request.body?.images ?? []);

    const updated = getAllImages().map(serializeImageCatalogRow);
    app.socketService.emitImagesUpdated({
      action: "reordered",
      images: updated
    });
    app.socketService.emitDisplaySync({
      generatedAt: new Date().toISOString(),
      reason: "image-reordered",
      scope: "images"
    });

    return successResponse(updated);
  });

  app.get("/api/images/storage-usage", async () => {
    const { usedBytes, fileCount } = getStorageUsage();
    return successResponse({
      usedBytes,
      usedMB: Number((usedBytes / (1024 * 1024)).toFixed(2)),
      fileCount
    });
  });
};

export default imagesRoute;
