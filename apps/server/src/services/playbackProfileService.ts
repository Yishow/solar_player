import type { DisplayPageTemplateKey } from "@solar-display/shared";
import { getDatabase } from "../db/index.js";

export const DEFAULT_PLAYBACK_PROFILE_KEY = "default";

export type PlaybackProfileSettingsRow = {
  autoplay: number;
  brightness: number;
  idle_mode: string;
  idle_timeout: number;
  loop: number;
  orientation: string;
  repeat_days: string;
  schedule_enabled: number;
  schedule_end: string | null;
  schedule_start: string | null;
  start_page: number;
  updated_at: string | null;
};

export type PlaybackProfilePageRow = {
  archived_at: string | null;
  display_order: number;
  duration_seconds: number;
  enabled: number;
  id: number;
  label_en: string;
  label_zh: string;
  page_key: string;
  route_slug: string;
  template_key: DisplayPageTemplateKey;
};

export type PlaybackProfileSettingsWrite = Omit<PlaybackProfileSettingsRow, "updated_at">;

export type PlaybackProfilePageState = {
  displayOrder: number;
  durationSeconds: number;
  enabled: boolean;
};

export type PlaybackProfilePageStateUpdate = Partial<PlaybackProfilePageState>;

export function readDefaultPlaybackProfileId() {
  const row = getDatabase()
    .prepare(
      `
        SELECT id
        FROM playback_profiles
        WHERE profile_key = ? AND is_default = 1
        LIMIT 1
      `
    )
    .get(DEFAULT_PLAYBACK_PROFILE_KEY) as { id: number } | undefined;

  if (!row) {
    throw new Error("Default Playback Profile is not initialized");
  }

  return row.id;
}

export function readDefaultPlaybackSettingsRow(): PlaybackProfileSettingsRow {
  const row = getDatabase()
    .prepare(
      `
        SELECT
          settings.autoplay,
          settings.brightness,
          settings.idle_mode,
          settings.idle_timeout,
          settings.loop,
          settings.orientation,
          settings.repeat_days,
          settings.schedule_enabled,
          settings.schedule_end,
          settings.schedule_start,
          settings.start_page,
          settings.updated_at
        FROM playback_profile_settings AS settings
        INNER JOIN playback_profiles AS profile ON profile.id = settings.profile_id
        WHERE profile.profile_key = ? AND profile.is_default = 1
        LIMIT 1
      `
    )
    .get(DEFAULT_PLAYBACK_PROFILE_KEY) as PlaybackProfileSettingsRow | undefined;

  if (!row) {
    throw new Error("Default Playback Profile settings are not initialized");
  }

  return row;
}

export function writeDefaultPlaybackSettingsRow(settings: PlaybackProfileSettingsWrite) {
  const result = getDatabase()
    .prepare(
      `
        UPDATE playback_profile_settings
        SET
          autoplay = ?,
          loop = ?,
          start_page = ?,
          schedule_enabled = ?,
          schedule_start = ?,
          schedule_end = ?,
          repeat_days = ?,
          idle_mode = ?,
          idle_timeout = ?,
          brightness = ?,
          orientation = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE profile_id = ?
      `
    )
    .run(
      settings.autoplay,
      settings.loop,
      settings.start_page,
      settings.schedule_enabled,
      settings.schedule_start,
      settings.schedule_end,
      settings.repeat_days,
      settings.idle_mode,
      settings.idle_timeout,
      settings.brightness,
      settings.orientation,
      readDefaultPlaybackProfileId()
    );

  if (result.changes !== 1) {
    throw new Error("Failed to update Default Playback Profile settings");
  }
}

export function readDefaultPlaybackPageRows(options: { includeArchived?: boolean } = {}) {
  const defaultProfileId = readDefaultPlaybackProfileId();

  return getDatabase()
    .prepare(
      `
        SELECT
          registry.id,
          registry.page_key,
          registry.template_key,
          registry.route_slug,
          registry.label_zh,
          registry.label_en,
          profile_page.enabled,
          registry.archived_at,
          profile_page.display_order,
          profile_page.duration_seconds
        FROM playback_profile_pages AS profile_page
        INNER JOIN playback_profiles AS profile ON profile.id = profile_page.profile_id
        INNER JOIN display_page_registry AS registry ON registry.id = profile_page.page_id
        WHERE profile.id = ?
          AND (? = 1 OR registry.archived_at IS NULL)
        ORDER BY profile_page.display_order ASC, registry.id ASC
      `
    )
    .all(defaultProfileId, options.includeArchived ? 1 : 0) as PlaybackProfilePageRow[];
}

export function readDefaultPlaybackPageState(pageKey: string) {
  return getDatabase()
    .prepare(
      `
        SELECT
          profile_page.enabled,
          profile_page.display_order,
          profile_page.duration_seconds
        FROM playback_profile_pages AS profile_page
        INNER JOIN playback_profiles AS profile ON profile.id = profile_page.profile_id
        INNER JOIN display_page_registry AS registry ON registry.id = profile_page.page_id
        WHERE profile.profile_key = ?
          AND profile.is_default = 1
          AND registry.page_key = ?
        LIMIT 1
      `
    )
    .get(DEFAULT_PLAYBACK_PROFILE_KEY, pageKey) as
    | { display_order: number; duration_seconds: number; enabled: number }
    | undefined;
}

export function attachDisplayPageToDefaultProfile(
  pageId: number,
  state: PlaybackProfilePageState
) {
  getDatabase()
    .prepare(
      `
        INSERT INTO playback_profile_pages (
          profile_id,
          page_id,
          enabled,
          display_order,
          duration_seconds,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(profile_id, page_id) DO NOTHING
      `
    )
    .run(
      readDefaultPlaybackProfileId(),
      pageId,
      state.enabled ? 1 : 0,
      state.displayOrder,
      state.durationSeconds
    );
}

export function updateDefaultPlaybackPageState(
  pageKey: string,
  update: PlaybackProfilePageStateUpdate
) {
  const current = readDefaultPlaybackPageState(pageKey);
  if (!current) {
    throw new Error(`Default Playback Profile page is not initialized: ${pageKey}`);
  }

  const result = getDatabase()
    .prepare(
      `
        UPDATE playback_profile_pages
        SET
          enabled = ?,
          display_order = ?,
          duration_seconds = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE profile_id = ?
          AND page_id = (SELECT id FROM display_page_registry WHERE page_key = ?)
      `
    )
    .run(
      update.enabled === undefined ? current.enabled : update.enabled ? 1 : 0,
      update.displayOrder === undefined ? current.display_order : update.displayOrder,
      update.durationSeconds === undefined ? current.duration_seconds : update.durationSeconds,
      readDefaultPlaybackProfileId(),
      pageKey
    );

  if (result.changes !== 1) {
    throw new Error(`Failed to update Default Playback Profile page: ${pageKey}`);
  }
}

export function readNextDefaultPlaybackDisplayOrder() {
  const row = getDatabase()
    .prepare(
      `
        SELECT COALESCE(MAX(profile_page.display_order), 0) AS max_display_order
        FROM playback_profile_pages AS profile_page
        INNER JOIN playback_profiles AS profile ON profile.id = profile_page.profile_id
        WHERE profile.profile_key = ? AND profile.is_default = 1
      `
    )
    .get(DEFAULT_PLAYBACK_PROFILE_KEY) as { max_display_order: number | null } | undefined;

  return Math.max(1, (row?.max_display_order ?? 0) + 1);
}

export function countOtherActiveDefaultPlaybackPagesForTemplate(
  templateKey: DisplayPageTemplateKey,
  pageKey: string
) {
  const row = getDatabase()
    .prepare(
      `
        SELECT COUNT(*) AS total
        FROM playback_profile_pages AS profile_page
        INNER JOIN playback_profiles AS profile ON profile.id = profile_page.profile_id
        INNER JOIN display_page_registry AS registry ON registry.id = profile_page.page_id
        WHERE profile.profile_key = ?
          AND profile.is_default = 1
          AND registry.template_key = ?
          AND registry.page_key != ?
          AND profile_page.enabled = 1
          AND registry.archived_at IS NULL
      `
    )
    .get(DEFAULT_PLAYBACK_PROFILE_KEY, templateKey, pageKey) as { total: number } | undefined;

  return row?.total ?? 0;
}
