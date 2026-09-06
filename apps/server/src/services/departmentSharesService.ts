import type Database from "better-sqlite3";
import {
  resolveDepartmentShares,
  resolvePeriodConsumption,
  type PeriodSelection,
  type SiteEnergyProfileV1
} from "@solar-display/shared";
import { getActiveProfile } from "./siteEnergyProfileService.js";

function loadAcceptedSamples(database: Database.Database, scope: "cl" | "kn") {
  return (database.prepare(`
    SELECT channel_id, source_timestamp, normalized_value_kwh
    FROM meter_readings_accepted
    WHERE metric_scope = ? AND source_timestamp IS NOT NULL
    ORDER BY source_timestamp
  `).all(scope) as Array<{ channel_id: string; source_timestamp: string; normalized_value_kwh: string }>).map((row) => ({
    channelId: row.channel_id,
    sourceTimestamp: row.source_timestamp,
    valueKwh: row.normalized_value_kwh
  }));
}

function periodDelta(profile: SiteEnergyProfileV1, samples: ReturnType<typeof loadAcceptedSamples>, channelIds: string[], period: PeriodSelection, asOf: string) {
  const allowed = new Set(profile.siteTotal.memberChannelIds);
  const usable = channelIds.filter((id) => allowed.has(id));
  if (usable.length === 0) {
    return undefined;
  }
  try {
    const result = resolvePeriodConsumption({
      asOf,
      meterIds: usable,
      period,
      profile,
      samples
    });
    return result.valueKwh ?? undefined;
  } catch {
    return undefined;
  }
}

export function resolvePersistedDepartmentShares(
  database: Database.Database,
  scope: "cl" | "kn",
  period: PeriodSelection,
  asOf: string
) {
  const profile = getActiveProfile(database, scope);
  if (!profile) {
    return null;
  }
  const samples = loadAcceptedSamples(database, scope);
  const periodDeltas: Record<string, string | undefined> = {};
  for (const channelId of profile.siteTotal.memberChannelIds) {
    periodDeltas[channelId] = periodDelta(profile, samples, [channelId], period, asOf);
  }
  for (const department of profile.departments) {
    for (const channelId of department.memberChannelIds) {
      if (periodDeltas[channelId] === undefined) {
        const isolatedProfile: SiteEnergyProfileV1 = {
          ...profile,
          siteTotal: {
            ...profile.siteTotal,
            memberChannelIds: Array.from(new Set([...profile.siteTotal.memberChannelIds, channelId]))
          }
        };
        periodDeltas[channelId] = periodDelta(isolatedProfile, samples, [channelId], period, asOf);
      }
    }
  }
  return {
    profileRevision: profile.revision,
    siteTimeZone: profile.siteTimeZone,
    ...resolveDepartmentShares({ periodDeltas, profile })
  };
}
