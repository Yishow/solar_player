import type Database from "better-sqlite3";
import type { SiteEnergyProfileV1, SiteEnergyScope } from "@solar-display/shared";

export function getActiveProfile(database: Database.Database, scope: SiteEnergyScope) {
  const row = database.prepare(`
    SELECT * FROM site_energy_profiles WHERE metric_scope = ? AND active = 1 ORDER BY revision DESC LIMIT 1
  `).get(scope) as Record<string, unknown> | undefined;
  return row ? deserialize(row) : null;
}

export function listPersistedProfiles(database: Database.Database, scope: SiteEnergyScope) {
  return (database.prepare("SELECT * FROM site_energy_profiles WHERE metric_scope = ? ORDER BY revision")
    .all(scope) as Array<Record<string, unknown>>).map(deserialize);
}

function deserialize(row: Record<string, unknown>): SiteEnergyProfileV1 {
  return {
    departments: JSON.parse(String(row.departments_json)),
    effectiveFrom: String(row.effective_from),
    metricScope: row.metric_scope as SiteEnergyScope,
    profileId: String(row.profile_id),
    revision: Number(row.revision),
    schemaVersion: 1,
    shareBasis: JSON.parse(String(row.share_basis_json)),
    siteTimeZone: String(row.site_time_zone),
    siteTotal: JSON.parse(String(row.site_total_json)),
    status: row.status as SiteEnergyProfileV1["status"]
  };
}
