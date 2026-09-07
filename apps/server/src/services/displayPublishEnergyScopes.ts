import type Database from "better-sqlite3";

// Include the configured playlist, desired rollout and devices still running an
// earlier playlist. Page content publication can affect all three consumers.
export function readAssignedEnergyScopes(database: Database.Database, pageKey: string): Array<"cl" | "kn"> {
  const rows = database.prepare(`
    SELECT DISTINCT groups.site_scope
    FROM device_groups AS groups
    WHERE groups.enabled = 1 AND (
      EXISTS (
        SELECT 1 FROM playback_profile_pages AS pages
        JOIN display_page_registry AS registry ON registry.id = pages.page_id
        WHERE pages.profile_id = groups.playback_profile_id AND pages.enabled = 1
          AND registry.page_key = ? AND registry.archived_at IS NULL
      ) OR EXISTS (
        SELECT 1 FROM playback_profile_versions AS versions,
          json_each(versions.snapshot_json, '$.pages') AS pages
        WHERE versions.id = groups.desired_profile_version_id
          AND json_extract(pages.value, '$.pageKey') = ?
          AND json_extract(pages.value, '$.enabled') = 1
      ) OR EXISTS (
        SELECT 1 FROM devices
        JOIN playback_profile_versions AS versions ON versions.id = devices.applied_profile_version_id,
          json_each(versions.snapshot_json, '$.pages') AS pages
        WHERE devices.group_id = groups.id AND devices.enabled = 1
          AND json_extract(pages.value, '$.pageKey') = ?
          AND json_extract(pages.value, '$.enabled') = 1
      )
    ) ORDER BY groups.site_scope
  `).all(pageKey, pageKey, pageKey) as Array<{ site_scope: "cl" | "kn" }>;
  return rows.map((row) => row.site_scope);
}
