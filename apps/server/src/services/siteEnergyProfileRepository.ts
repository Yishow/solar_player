import type Database from "better-sqlite3";
import type {
  SiteEnergyProfile,
  SiteEnergyProfileV1,
  SiteEnergyProfileV2,
  SiteEnergyScope
} from "@solar-display/shared";

const V2_PROVIDER_KIND_KEY = "providerKind";

export type SerializedSiteEnergyProfile = {
  schemaVersion: SiteEnergyProfile["schemaVersion"];
  siteTotalJson: string;
  departmentsJson: string;
  shareBasisJson: string;
};

export function serializeSiteEnergyProfile(profile: SiteEnergyProfile): SerializedSiteEnergyProfile {
  const siteTotal = profile.schemaVersion === 2
    ? { ...profile.siteTotal, [V2_PROVIDER_KIND_KEY]: profile.providerKind }
    : profile.siteTotal;
  return {
    departmentsJson: JSON.stringify(profile.departments),
    schemaVersion: profile.schemaVersion,
    shareBasisJson: JSON.stringify(profile.shareBasis),
    siteTotalJson: JSON.stringify(siteTotal)
  };
}

export function getActiveProfile(database: Database.Database, scope: SiteEnergyScope): SiteEnergyProfile | null {
  const row = database.prepare(`
    SELECT * FROM site_energy_profiles WHERE metric_scope = ? AND active = 1 ORDER BY revision DESC LIMIT 1
  `).get(scope) as Record<string, unknown> | undefined;
  return row ? deserialize(row) : null;
}

export function listPersistedProfiles(database: Database.Database, scope: SiteEnergyScope): SiteEnergyProfile[] {
  return (database.prepare("SELECT * FROM site_energy_profiles WHERE metric_scope = ? ORDER BY revision")
    .all(scope) as Array<Record<string, unknown>>).map(deserialize);
}

function unsupportedProfileVersion(version: unknown): never {
  const error = new Error(`Unsupported persisted profile schemaVersion ${String(version)}.`);
  Object.assign(error, { code: "PROFILE_VERSION_UNSUPPORTED", field: "schemaVersion" });
  throw error;
}

function deserialize(row: Record<string, unknown>): SiteEnergyProfile {
  const schemaVersion = Number(row.schema_version);
  const common = {
    effectiveFrom: String(row.effective_from),
    metricScope: row.metric_scope as SiteEnergyScope,
    profileId: String(row.profile_id),
    revision: Number(row.revision),
    siteTimeZone: String(row.site_time_zone),
    status: row.status as SiteEnergyProfile["status"]
  };
  if (schemaVersion === 1) {
    return {
      ...common,
      departments: JSON.parse(String(row.departments_json)),
      schemaVersion: 1,
      shareBasis: JSON.parse(String(row.share_basis_json)),
      siteTotal: JSON.parse(String(row.site_total_json))
    } as SiteEnergyProfileV1;
  }
  if (schemaVersion === 2) {
    const storedSiteTotal = JSON.parse(String(row.site_total_json)) as Record<string, unknown>;
    const providerKind = storedSiteTotal[V2_PROVIDER_KIND_KEY];
    if (providerKind !== "physical" && providerKind !== "engineering") {
      const error = new Error("Persisted V2 profile is missing a valid providerKind.");
      Object.assign(error, { code: "PROFILE_PROVIDER_INVALID", field: "providerKind" });
      throw error;
    }
    const { [V2_PROVIDER_KIND_KEY]: _providerKind, ...siteTotal } = storedSiteTotal;
    return {
      ...common,
      departments: JSON.parse(String(row.departments_json)),
      providerKind,
      schemaVersion: 2,
      shareBasis: JSON.parse(String(row.share_basis_json)),
      siteTotal
    } as SiteEnergyProfileV2;
  }
  return unsupportedProfileVersion(row.schema_version);
}
