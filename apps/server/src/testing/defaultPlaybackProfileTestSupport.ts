import type Database from "better-sqlite3";

export function attachDefaultPlaybackPageForTest(
  database: Database.Database,
  pageKey: string,
  state: {
    displayOrder: number;
    durationSeconds: number;
    enabled: boolean;
  }
) {
  const result = database
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
        SELECT
          profile.id,
          registry.id,
          ?,
          ?,
          ?,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        FROM playback_profiles AS profile
        INNER JOIN display_page_registry AS registry ON registry.page_key = ?
        WHERE profile.profile_key = 'default'
          AND profile.is_default = 1
        ON CONFLICT(profile_id, page_id) DO NOTHING
      `
    )
    .run(state.enabled ? 1 : 0, state.displayOrder, state.durationSeconds, pageKey);

  if (result.changes !== 1) {
    throw new Error(`Failed to attach Default Playback Profile page fixture: ${pageKey}`);
  }
}

export function updateDefaultPlaybackPageForTest(
  database: Database.Database,
  pageKey: string,
  update: {
    displayOrder?: number;
    durationSeconds?: number;
    enabled?: boolean;
  }
) {
  const current = database
    .prepare(
      `
        SELECT
          profile_page.enabled,
          profile_page.display_order,
          profile_page.duration_seconds
        FROM playback_profile_pages AS profile_page
        INNER JOIN playback_profiles AS profile ON profile.id = profile_page.profile_id
        INNER JOIN display_page_registry AS registry ON registry.id = profile_page.page_id
        WHERE profile.profile_key = 'default'
          AND profile.is_default = 1
          AND registry.page_key = ?
      `
    )
    .get(pageKey) as
    | { display_order: number; duration_seconds: number; enabled: number }
    | undefined;

  if (!current) {
    throw new Error(`Default Playback Profile page fixture is missing: ${pageKey}`);
  }

  database
    .prepare(
      `
        UPDATE playback_profile_pages
        SET enabled = ?,
            display_order = ?,
            duration_seconds = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE profile_id = (
          SELECT id FROM playback_profiles WHERE profile_key = 'default' AND is_default = 1
        )
          AND page_id = (SELECT id FROM display_page_registry WHERE page_key = ?)
      `
    )
    .run(
      update.enabled === undefined ? current.enabled : update.enabled ? 1 : 0,
      update.displayOrder ?? current.display_order,
      update.durationSeconds ?? current.duration_seconds,
      pageKey
    );
}

export function setOnlyDefaultPlaybackPagesEnabledForTest(
  database: Database.Database,
  pageKeys: string[]
) {
  const placeholders = pageKeys.map(() => "?").join(", ");
  database
    .prepare(
      `
        UPDATE playback_profile_pages
        SET enabled = CASE
          WHEN page_id IN (
            SELECT id
            FROM display_page_registry
            WHERE page_key IN (${placeholders || "NULL"})
          ) THEN 1
          ELSE 0
        END,
        updated_at = CURRENT_TIMESTAMP
        WHERE profile_id = (
          SELECT id FROM playback_profiles WHERE profile_key = 'default' AND is_default = 1
        )
      `
    )
    .run(...pageKeys);
}

export function updateDefaultPlaybackSettingsForTest(
  database: Database.Database,
  update: {
    autoplay?: boolean;
    brightness?: number;
    enforceFreshRuntimeData?: boolean;
    transitionSpeed?: number;
    transitionType?: "fade" | "slide" | "none";
  }
) {
  const current = database
    .prepare(
      `
        SELECT autoplay, brightness, enforce_fresh_runtime_data, transition_speed, transition_type
        FROM playback_profile_settings
        WHERE profile_id = (
          SELECT id FROM playback_profiles WHERE profile_key = 'default' AND is_default = 1
        )
      `
    )
    .get() as {
      autoplay: number;
      brightness: number;
      enforce_fresh_runtime_data: number;
      transition_speed: number;
      transition_type: "fade" | "slide" | "none";
    } | undefined;

  if (!current) {
    throw new Error("Default Playback Profile settings fixture is missing");
  }

  database
    .prepare(
      `
        UPDATE playback_profile_settings
        SET autoplay = ?,
            brightness = ?,
            enforce_fresh_runtime_data = ?,
            transition_speed = ?,
            transition_type = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE profile_id = (
          SELECT id FROM playback_profiles WHERE profile_key = 'default' AND is_default = 1
        )
      `
    )
    .run(
      update.autoplay === undefined ? current.autoplay : update.autoplay ? 1 : 0,
      update.brightness ?? current.brightness,
      update.enforceFreshRuntimeData === undefined
        ? current.enforce_fresh_runtime_data
        : update.enforceFreshRuntimeData
          ? 1
          : 0,
      update.transitionSpeed ?? current.transition_speed,
      update.transitionType ?? current.transition_type
    );
}
