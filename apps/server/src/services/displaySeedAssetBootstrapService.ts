import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { basename, extname, isAbsolute, resolve } from "node:path";
import { config } from "../config.js";
import { getDatabase } from "../db/index.js";
import { displaySeedAssetManifest, type DisplaySeedAssetManifestEntry } from "./displaySeedAssetManifest.js";

type BootstrapOptions = {
  manifest?: DisplaySeedAssetManifestEntry[];
  projectRoot?: string;
  uploadsDir?: string;
};

type ExistingSeedAssetRow = {
  id: number;
};

const MIME_TYPE_BY_EXTENSION: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

function resolveManifestSourcePath(entry: DisplaySeedAssetManifestEntry, projectRoot: string) {
  return isAbsolute(entry.sourcePath) ? entry.sourcePath : resolve(projectRoot, entry.sourcePath);
}

function resolveMimeType(entry: DisplaySeedAssetManifestEntry) {
  return entry.mimeType ?? MIME_TYPE_BY_EXTENSION[extname(entry.targetFilename).toLowerCase()] ?? "application/octet-stream";
}

function formatSeedDescription(entry: DisplaySeedAssetManifestEntry) {
  return entry.description ? `內建種子素材 · ${entry.description}` : "內建種子素材";
}

function assertSafeTargetFilename(filename: string) {
  if (basename(filename) !== filename) {
    throw new Error(`Invalid display seed asset filename: ${filename}`);
  }
}

export function bootstrapDisplaySeedAssets(options: BootstrapOptions = {}) {
  const manifest = options.manifest ?? displaySeedAssetManifest;
  const projectRoot = options.projectRoot ?? config.projectRoot;
  const uploadsDir = options.uploadsDir ?? config.uploadsDir;
  const database = getDatabase();
  const findExisting = database.prepare(`
    SELECT id
    FROM image_assets
    WHERE original_name = ? OR filename = ?
    LIMIT 1
  `);
  const insertSeedAsset = database.prepare(`
    INSERT INTO image_assets (
      category, usage_scope, filename, original_name, title, description,
      mime_type, file_size, display_duration, display_order,
      included_in_slideshow, is_cover, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 10, ?, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);
  const updateSeedAsset = database.prepare(`
    UPDATE image_assets SET
      filename = COALESCE(filename, ?),
      original_name = CASE
        WHEN original_name IS NULL OR original_name NOT LIKE 'display-seed:%' THEN ?
        ELSE original_name
      END,
      title = COALESCE(title, ?),
      description = COALESCE(description, ?),
      mime_type = COALESCE(mime_type, ?),
      file_size = COALESCE(file_size, ?),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND (
        filename IS NULL
        OR original_name IS NULL
        OR original_name NOT LIKE 'display-seed:%'
        OR title IS NULL
        OR description IS NULL
        OR mime_type IS NULL
        OR file_size IS NULL
      )
  `);
  const readNextDisplayOrder = database.prepare("SELECT COALESCE(MAX(display_order), 0) + 1 AS nextOrder FROM image_assets");

  mkdirSync(uploadsDir, { recursive: true });

  let created = 0;
  let reused = 0;

  database.transaction(() => {
    for (const entry of manifest) {
      assertSafeTargetFilename(entry.targetFilename);

      const sourcePath = resolveManifestSourcePath(entry, projectRoot);
      const targetPath = resolve(uploadsDir, entry.targetFilename);
      if (!existsSync(sourcePath)) {
        throw new Error(`Missing display seed asset source: ${entry.sourcePath}`);
      }

      if (!existsSync(targetPath)) {
        copyFileSync(sourcePath, targetPath);
      }

      const fileStat = statSync(targetPath);
      const seedOriginalName = `display-seed:${entry.key}`;
      const seedDescription = formatSeedDescription(entry);
      const existing = findExisting.get(seedOriginalName, entry.targetFilename) as ExistingSeedAssetRow | undefined;

      if (existing) {
        updateSeedAsset.run(
          entry.targetFilename,
          seedOriginalName,
          entry.title,
          seedDescription,
          resolveMimeType(entry),
          fileStat.size,
          existing.id
        );
        reused += 1;
        continue;
      }

      const nextOrder = (readNextDisplayOrder.get() as { nextOrder: number }).nextOrder;
      insertSeedAsset.run(
        entry.category,
        entry.usageScope,
        entry.targetFilename,
        seedOriginalName,
        entry.title,
        seedDescription,
        resolveMimeType(entry),
        fileStat.size,
        nextOrder
      );
      created += 1;
    }
  })();

  return {
    created,
    reused,
    total: manifest.length
  };
}
