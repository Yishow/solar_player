import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  resolveActiveImagePlaylistEntry,
  resolveImagePlaylistEntries,
  type ImagePlaylistAssetInput,
  type ImagePlaylistEntryInput,
  type ImagePlaylistFallbackMode
} from "@solar-display/shared";
import { config } from "../config.js";
import { getDatabase } from "../db/index.js";

type ImageAssetRow = {
  description: string | null;
  display_duration: number | null;
  display_order: number | null;
  filename: string | null;
  height: number | null;
  id: number;
  is_cover: number;
  title: string | null;
  width: number | null;
};

type PlaylistRow = {
  area: string | null;
  asset_id: number | null;
  captured_at: string | null;
  description: string | null;
  display_order: number;
  duration_seconds: number;
  enabled: number;
  entry_id: string;
  fallback_mode: ImagePlaylistFallbackMode;
  tags_json: string | null;
  title: string | null;
};

type PlaylistUpdateInput = Partial<{
  area: string | null;
  assetId: number | null;
  capturedAt: string | null;
  description: string | null;
  displayOrder: number;
  durationSeconds: number;
  enabled: boolean;
  fallbackMode: ImagePlaylistFallbackMode;
  tags: string[];
  title: string | null;
}>;

type ReorderInput = Array<{
  displayOrder: number;
  durationSeconds?: number;
  enabled?: boolean;
  entryId: string;
}>;

function ensurePlaylistTable() {
  getDatabase().exec(`
    CREATE TABLE IF NOT EXISTS image_playlist_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id TEXT NOT NULL UNIQUE,
      asset_id INTEGER,
      enabled BOOLEAN NOT NULL DEFAULT 1,
      display_order INTEGER NOT NULL,
      duration_seconds INTEGER NOT NULL DEFAULT 10,
      title TEXT,
      area TEXT,
      captured_at TEXT,
      tags_json TEXT,
      description TEXT,
      fallback_mode TEXT NOT NULL DEFAULT 'display-placeholder',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function formatEntryId(index: number) {
  return `IMG-${String(index).padStart(2, "0")}`;
}

function readAssets() {
  return getDatabase()
    .prepare(
      `
        SELECT
          id,
          filename,
          title,
          description,
          width,
          height,
          display_duration,
          display_order,
          is_cover
        FROM image_assets
        ORDER BY display_order ASC, id ASC
      `
    )
    .all() as ImageAssetRow[];
}

function readPlaylistRows() {
  ensurePlaylistTable();
  return getDatabase()
    .prepare(
      `
        SELECT
          entry_id,
          asset_id,
          enabled,
          display_order,
          duration_seconds,
          title,
          area,
          captured_at,
          tags_json,
          description,
          fallback_mode
        FROM image_playlist_entries
        ORDER BY display_order ASC, entry_id ASC
      `
    )
    .all() as PlaylistRow[];
}

function parseTags(raw: string | null) {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function fileSource(filename: string | null) {
  if (!filename) {
    return null;
  }

  return existsSync(resolve(config.uploadsDir, filename)) ? `/uploads/images/${filename}` : null;
}

function ensureBootstrappedEntries() {
  ensurePlaylistTable();
  const database = getDatabase();
  const assets = readAssets();
  const existing = new Set(
    (database.prepare("SELECT asset_id FROM image_playlist_entries WHERE asset_id IS NOT NULL").all() as Array<{ asset_id: number }>).map((row) => row.asset_id)
  );
  const currentCount = Number(
    (database.prepare("SELECT COUNT(*) AS count FROM image_playlist_entries").get() as { count: number }).count
  );
  const insert = database.prepare(
    `
      INSERT INTO image_playlist_entries (
        entry_id,
        asset_id,
        enabled,
        display_order,
        duration_seconds,
        title,
        description,
        fallback_mode,
        tags_json,
        updated_at
      ) VALUES (?, ?, 1, ?, ?, ?, ?, 'display-placeholder', '[]', CURRENT_TIMESTAMP)
    `
  );

  let nextIndex = currentCount + 1;
  for (const asset of assets) {
    if (existing.has(asset.id)) {
      continue;
    }
    insert.run(
      formatEntryId(nextIndex),
      asset.id,
      asset.display_order ?? nextIndex,
      asset.display_duration ?? 10,
      asset.title,
      asset.description
    );
    nextIndex += 1;
  }
}

function resolveAssets() {
  return readAssets().map((asset) => ({
    assetId: String(asset.id),
    height: asset.height,
    source: fileSource(asset.filename),
    status: asset.filename === null ? "pending" : fileSource(asset.filename) ? "ready" : "pending",
    width: asset.width
  } satisfies ImagePlaylistAssetInput));
}

function resolveEntries() {
  ensureBootstrappedEntries();
  return readPlaylistRows().map((row) => ({
    area: row.area,
    assetId: row.asset_id === null ? null : String(row.asset_id),
    capturedAt: row.captured_at,
    description: row.description,
    displayOrder: row.display_order,
    durationSeconds: row.duration_seconds,
    enabled: row.enabled === 1,
    entryId: row.entry_id,
    fallbackMode: row.fallback_mode,
    tags: parseTags(row.tags_json),
    title: row.title
  } satisfies ImagePlaylistEntryInput));
}

function coverAssetSource() {
  const row = readAssets().find((asset) => asset.is_cover === 1);
  return row ? fileSource(row.filename) : null;
}

export function readImagePlaylist(activeIndex = 0) {
  const entries = resolveImagePlaylistEntries({
    assets: resolveAssets(),
    coverAssetSource: coverAssetSource(),
    entries: resolveEntries()
  });

  return {
    activeEntry: resolveActiveImagePlaylistEntry(entries, activeIndex),
    entries,
    generatedAt: new Date().toISOString()
  };
}

export function updateImagePlaylistEntry(entryId: string, input: PlaylistUpdateInput) {
  ensureBootstrappedEntries();
  getDatabase()
    .prepare(
      `
        UPDATE image_playlist_entries SET
          asset_id = COALESCE(?, asset_id),
          enabled = COALESCE(?, enabled),
          display_order = COALESCE(?, display_order),
          duration_seconds = COALESCE(?, duration_seconds),
          title = COALESCE(?, title),
          area = COALESCE(?, area),
          captured_at = COALESCE(?, captured_at),
          tags_json = COALESCE(?, tags_json),
          description = COALESCE(?, description),
          fallback_mode = COALESCE(?, fallback_mode),
          updated_at = CURRENT_TIMESTAMP
        WHERE entry_id = ?
      `
    )
    .run(
      input.assetId ?? undefined,
      input.enabled === undefined ? undefined : input.enabled ? 1 : 0,
      input.displayOrder ?? undefined,
      input.durationSeconds ?? undefined,
      input.title ?? undefined,
      input.area ?? undefined,
      input.capturedAt ?? undefined,
      input.tags === undefined ? undefined : JSON.stringify(input.tags),
      input.description ?? undefined,
      input.fallbackMode ?? undefined,
      entryId
    );
}

export function reorderImagePlaylist(entries: ReorderInput) {
  ensureBootstrappedEntries();
  const update = getDatabase().prepare(
    `
      UPDATE image_playlist_entries SET
        display_order = ?,
        enabled = COALESCE(?, enabled),
        duration_seconds = COALESCE(?, duration_seconds),
        updated_at = CURRENT_TIMESTAMP
      WHERE entry_id = ?
    `
  );
  getDatabase().transaction((items: ReorderInput) => {
    for (const item of items) {
      update.run(
        item.displayOrder,
        item.enabled === undefined ? undefined : item.enabled ? 1 : 0,
        item.durationSeconds ?? undefined,
        item.entryId
      );
    }
  })(entries);
}
