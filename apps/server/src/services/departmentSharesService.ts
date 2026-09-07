import type Database from "better-sqlite3";
import {
  profileMemberChannelIds,
  resolveDepartmentShares,
  resolvePeriodConsumption,
  type PeriodSelection,
  type PeriodSample,
  type SiteEnergyProfileV1
} from "@solar-display/shared";
import { loadAcceptedSamples } from "./periodConsumptionService.js";
import { getActiveProfile } from "./siteEnergyProfileService.js";

function periodDelta(profile: SiteEnergyProfileV1, samples: PeriodSample[], channelIds: string[], period: PeriodSelection, asOf: string) {
  const allowed = new Set(profileMemberChannelIds(profile));
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
        periodDeltas[channelId] = periodDelta(profile, samples, [channelId], period, asOf);
      }
    }
  }
  return {
    profileRevision: profile.revision,
    siteTimeZone: profile.siteTimeZone,
    ...resolveDepartmentShares({ periodDeltas, profile })
  };
}
