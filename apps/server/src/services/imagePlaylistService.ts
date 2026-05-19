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
  included_in_slideshow: number;
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

type ReadImagePlaylistOptions = {
  bootstrapEntries?: boolean;
};

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

function hasPlaylistTable() {
  return Boolean(
    getDatabase()
      .prepare(
        `
          SELECT name
          FROM sqlite_master
          WHERE type = 'table' AND name = 'image_playlist_entries'
        `
      )
      .get()
  );
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
          included_in_slideshow,
          is_cover
        FROM image_assets
        ORDER BY display_order ASC, id ASC
      `
    )
    .all() as ImageAssetRow[];
}

function readPlaylistRows(options?: { ensureTable?: boolean }) {
  if (options?.ensureTable === false && !hasPlaylistTable()) {
    return [];
  }

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
  const existingEntries = database.prepare(
    `
      SELECT asset_id, entry_id
      FROM image_playlist_entries
      WHERE asset_id IS NOT NULL
      ORDER BY entry_id ASC
    `
  ).all() as Array<{ asset_id: number; entry_id: string }>;
  const existing = new Set(existingEntries.map((row) => row.asset_id));
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'display-placeholder', '[]', CURRENT_TIMESTAMP)
    `
  );

  let nextIndex = existingEntries.reduce((max, row) => {
    const match = /^IMG-(\d+)$/.exec(row.entry_id);
    const sequence = match?.[1];
    if (!sequence) {
      return max;
    }

    return Math.max(max, Number.parseInt(sequence, 10));
  }, 0) + 1;
  for (const asset of assets) {
    if (existing.has(asset.id)) {
      continue;
    }
    insert.run(
      formatEntryId(nextIndex),
      asset.id,
      asset.included_in_slideshow,
      asset.display_order ?? nextIndex,
      asset.display_duration ?? 10,
      asset.title,
      asset.description
    );
    nextIndex += 1;
  }
}

function syncImageAssetSlideshowState(assetIds: Iterable<number | null>) {
  const ids = [...new Set(
    Array.from(assetIds).filter((assetId): assetId is number => typeof assetId === "number")
  )];

  if (ids.length === 0 || !hasPlaylistTable()) {
    return;
  }

  const selectEnabledCount = getDatabase().prepare(
    `
      SELECT COUNT(*) AS count
      FROM image_playlist_entries
      WHERE asset_id = ? AND enabled = 1
    `
  );
  const updateAsset = getDatabase().prepare(
    `
      UPDATE image_assets
      SET included_in_slideshow = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `
  );

  for (const assetId of ids) {
    const enabledCount = Number((selectEnabledCount.get(assetId) as { count: number }).count);
    updateAsset.run(enabledCount > 0 ? 1 : 0, assetId);
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

function resolveEntries(options?: ReadImagePlaylistOptions) {
  if (options?.bootstrapEntries === false) {
    return readPlaylistRows({ ensureTable: false }).map((row) => ({
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
  } else {
    ensureBootstrappedEntries();
  }

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

function buildResolvedImagePlaylist(
  activeIndex = 0,
  options?: ReadImagePlaylistOptions
) {
  const playlistRows = resolveEntries(options);
  const entries = resolveImagePlaylistEntries({
    assets: resolveAssets(),
    coverAssetSource: coverAssetSource(),
    entries: playlistRows
  });

  return {
    activeEntry: resolveActiveImagePlaylistEntry(entries, activeIndex),
    entries,
    generatedAt: new Date().toISOString(),
    hasPlaylistRows: playlistRows.length > 0
  };
}

export function readImagePlaylist(activeIndex = 0) {
  return buildResolvedImagePlaylist(activeIndex);
}

export function readImagePlaylistSnapshot(activeIndex = 0, options?: ReadImagePlaylistOptions) {
  return buildResolvedImagePlaylist(activeIndex, options);
}

export function readImagePlaylistGovernanceSnapshot(options?: ReadImagePlaylistOptions) {
  const entries = resolveEntries(options);

  return {
    entries,
    generatedAt: new Date().toISOString(),
    hasPlaylistRows: entries.length > 0
  };
}

export function deleteImagePlaylistEntriesForAsset(assetId: number) {
  if (!hasPlaylistTable()) {
    return;
  }

  getDatabase()
    .prepare(
      `
        DELETE FROM image_playlist_entries
        WHERE asset_id = ?
      `
    )
    .run(assetId);
}

export function bootstrapImagePlaylistGovernance() {
  ensureBootstrappedEntries();
  syncImageAssetSlideshowState(
    readAssets().map((asset) => asset.id)
  );
  return readImagePlaylistGovernanceSnapshot({
    bootstrapEntries: false
  });
}

export function updateImagePlaylistEntry(entryId: string, input: PlaylistUpdateInput) {
  ensureBootstrappedEntries();
  const previousRow = getDatabase()
    .prepare(
      `
        SELECT
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
        WHERE entry_id = ?
      `
    )
    .get(entryId) as PlaylistRow | undefined;
  if (!previousRow) {
    return;
  }
  getDatabase()
    .prepare(
      `
        UPDATE image_playlist_entries SET
          asset_id = ?,
          enabled = ?,
          display_order = ?,
          duration_seconds = ?,
          title = ?,
          area = ?,
          captured_at = ?,
          tags_json = ?,
          description = ?,
          fallback_mode = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE entry_id = ?
      `
    )
    .run(
      input.assetId === undefined ? previousRow.asset_id : input.assetId,
      input.enabled === undefined ? previousRow.enabled : input.enabled ? 1 : 0,
      input.displayOrder ?? previousRow.display_order,
      input.durationSeconds ?? previousRow.duration_seconds,
      input.title === undefined ? previousRow.title : input.title,
      input.area === undefined ? previousRow.area : input.area,
      input.capturedAt === undefined ? previousRow.captured_at : input.capturedAt,
      input.tags === undefined ? previousRow.tags_json : JSON.stringify(input.tags),
      input.description === undefined ? previousRow.description : input.description,
      input.fallbackMode ?? previousRow.fallback_mode,
      entryId
    );

  const nextRow = getDatabase()
    .prepare(
    `
      SELECT asset_id
      FROM image_playlist_entries
      WHERE entry_id = ?
    `
    )
    .get(entryId) as { asset_id: number | null } | undefined;
  syncImageAssetSlideshowState([previousRow.asset_id, nextRow?.asset_id ?? null]);
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
  syncImageAssetSlideshowState(
    (getDatabase()
      .prepare(
        `
          SELECT DISTINCT asset_id
          FROM image_playlist_entries
          WHERE asset_id IS NOT NULL
        `
      )
      .all() as Array<{ asset_id: number }>).map((row) => row.asset_id)
  );
}
