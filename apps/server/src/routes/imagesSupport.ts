import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync
} from "node:fs";
import { extname, resolve } from "node:path";
import type {
  ImageAsset,
  ManagedAssetCategory,
  ManagedAssetUsageScope
} from "@solar-display/shared";
import { config } from "../config.js";
import { getDatabase } from "../db/index.js";

export type ImageAssetRow = {
  category: ManagedAssetCategory;
  usage_scope: ManagedAssetUsageScope;
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

export type ImageUpdateBody = {
  title?: string;
  description?: string;
  aspectRatio?: number;
  includedInSlideshow?: boolean;
  isCover?: boolean;
  displayDuration?: number;
  category?: ManagedAssetCategory;
  usageScope?: ManagedAssetUsageScope;
};

export type ImageReorderItem = {
  id: number;
  displayOrder: number;
};

export type ImageReorderBody = {
  images: ImageReorderItem[];
};

export const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".svg"]);
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function serializeImageRow(row: ImageAssetRow): ImageAsset {
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
    displayOrder: row.display_order,
    category: row.category,
    usageScope: row.usage_scope
  };
}

export function getAllImages(): ImageAssetRow[] {
  return getDatabase()
    .prepare(
      `
        SELECT
          id, category, usage_scope, filename, original_name, title, description,
          mime_type, file_size, width, height, aspect_ratio,
          included_in_slideshow, is_cover, display_duration,
          display_order, created_at, updated_at
        FROM image_assets
        ORDER BY display_order ASC, id ASC
      `
    )
    .all() as ImageAssetRow[];
}

export function getImageById(id: number): ImageAssetRow | undefined {
  return getDatabase()
    .prepare(
      `
        SELECT
          id, category, usage_scope, filename, original_name, title, description,
          mime_type, file_size, width, height, aspect_ratio,
          included_in_slideshow, is_cover, display_duration,
          display_order, created_at, updated_at
        FROM image_assets
        WHERE id = ?
      `
    )
    .get(id) as ImageAssetRow | undefined;
}

export function ensureUploadsDir() {
  mkdirSync(config.uploadsDir, { recursive: true });
}

export function getStorageUsage() {
  ensureUploadsDir();
  if (!existsSync(config.uploadsDir)) {
    return { fileCount: 0, usedBytes: 0 };
  }

  let usedBytes = 0;
  let fileCount = 0;
  for (const file of readdirSync(config.uploadsDir)) {
    const filePath = resolve(config.uploadsDir, file);
    try {
      const stat = statSync(filePath);
      if (stat.isFile()) {
        usedBytes += stat.size;
        fileCount += 1;
      }
    } catch {
      // ignore files we cannot stat
    }
  }

  return { fileCount, usedBytes };
}

export function deleteImageFile(filename: string) {
  const filePath = resolve(config.uploadsDir, filename);
  if (existsSync(filePath)) {
    rmSync(filePath);
  }
}

export function generateUniqueFilename(originalName: string) {
  const ext = extname(originalName).toLowerCase();
  const hash = createHash("sha256")
    .update(`${Date.now()}-${originalName}-${Math.random()}`)
    .digest("hex")
    .slice(0, 16);
  return `${hash}${ext}`;
}
