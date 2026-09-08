import type Database from "better-sqlite3";
import {
  dominantFreshnessState,
  profileMemberChannelIds,
  resolveDepartmentShares,
  resolvePeriodConsumption,
  resolveShareBasisIds,
  type DepartmentShare,
  type FreshnessState,
  type PeriodConsumptionQuality,
  type PeriodConsumptionResult,
  type PeriodSelection,
  type SiteEnergyProfileV1
} from "@solar-display/shared";
import { loadEffectivePeriodContext, profileRevisionBoundariesOf } from "./periodConsumptionService.js";

export type PersistedDepartmentShares = {
  calculatedThrough: string;
  freshness: "fresh" | "stale" | "unavailable";
  freshnessState: FreshnessState;
  issues: string[];
  periodEnd: string;
  periodStart: string;
  profileRevision: number;
  profileRevisionBoundaries?: Array<{ profileRevision: number; effectiveFrom: string; siteTimeZone: string }>;
  quality: PeriodConsumptionQuality;
  shares: DepartmentShare[];
  siteTimeZone: string;
  unallocatedKwh: string | null;
};

const qualityRank: Record<PeriodConsumptionQuality, number> = {
  exact: 0,
  "estimated-boundary": 1,
  unavailable: 2,
  partial: 3,
  invalid: 4
};

/**
 * Numerators, the site total and an explicitly selected denominator are all required reads.
 * A meter-set share basis may name channels that belong to no department and are not part of
 * the site total, so the union — not the site-total/department loop — is the read set.
 */
function requiredChannelIds(profile: SiteEnergyProfileV1) {
  const allowed = new Set(profileMemberChannelIds(profile));
  const required = new Set<string>();
  for (const channelId of [
    ...profile.siteTotal.memberChannelIds,
    ...profile.departments.flatMap((department) => department.memberChannelIds),
    ...resolveShareBasisIds(profile)
  ]) {
    if (allowed.has(channelId)) {
      required.add(channelId);
    }
  }
  return [...required];
}

/**
 * Only the numerators and the selected denominator decide the reported ratios, so only their
 * quality, issues and freshness may degrade the share result. A site-total channel that no
 * department and no denominator uses is still read, but it must not turn a fully proven ratio
 * into a partial one.
 */
function contributingChannelIds(profile: SiteEnergyProfileV1) {
  return new Set([
    ...profile.departments.flatMap((department) => department.memberChannelIds),
    ...resolveShareBasisIds(profile)
  ]);
}

function unavailableShares(profile: SiteEnergyProfileV1) {
  return profile.departments.map((department) => ({
    departmentId: department.departmentId,
    nameZh: department.nameZh,
    ratio: null,
    valueKwh: null
  }));
}

export function resolvePersistedDepartmentShares(
  database: Database.Database,
  scope: "cl" | "kn",
  period: PeriodSelection,
  asOf: string
): PersistedDepartmentShares | null {
  let context;
  try {
    context = loadEffectivePeriodContext(database, scope, period, asOf);
  } catch {
    return null;
  }
  const { profile } = context;

  const contributing = contributingChannelIds(profile);
  const periodDeltas: Record<string, string | undefined> = {};
  const issues: string[] = [];
  const freshnessStates: FreshnessState[] = [];
  let quality: PeriodConsumptionQuality = "exact";
  for (const channelId of requiredChannelIds(profile)) {
    let result: PeriodConsumptionResult;
    try {
      result = resolvePeriodConsumption({
        asOf,
        freshnessPolicy: context.freshnessPolicy,
        meterIds: [channelId],
        period,
        profile,
        samples: context.samples
      });
    } catch {
      if (contributing.has(channelId)) {
        quality = "invalid";
        issues.push(`CHANNEL_UNRESOLVED:${channelId}`);
      }
      continue;
    }
    if (result.valueKwh !== null && (result.quality === "exact" || result.quality === "estimated-boundary")) {
      periodDeltas[channelId] = result.valueKwh;
    }
    if (!contributing.has(channelId)) {
      continue;
    }
    if (qualityRank[result.quality] > qualityRank[quality]) {
      quality = result.quality;
    }
    issues.push(...(result.issues ?? []));
    if (result.freshnessState) {
      freshnessStates.push(result.freshnessState);
    }
  }

  const freshnessState = dominantFreshnessState(freshnessStates);
  const base = {
    calculatedThrough: new Date(context.throughMs).toISOString(),
    freshness: freshnessState === "live" ? "fresh" as const : freshnessState === "unavailable" ? "unavailable" as const : "stale" as const,
    freshnessState,
    periodEnd: new Date(context.window.endMs).toISOString(),
    periodStart: new Date(context.window.startMs).toISOString(),
    profileRevision: profile.revision,
    siteTimeZone: profile.siteTimeZone
  };

  if (context.crossesRevisionBoundary) {
    return {
      ...base,
      issues: [...issues, "PROFILE_REVISION_BOUNDARY"],
      profileRevisionBoundaries: profileRevisionBoundariesOf([profile, ...context.newerProfiles]),
      quality: quality === "invalid" ? "invalid" as const : "partial" as const,
      shares: unavailableShares(profile),
      unallocatedKwh: null
    };
  }

  const resolved = resolveDepartmentShares({ periodDeltas, profile });
  return {
    ...base,
    ...resolved,
    issues,
    quality: resolved.quality === "unavailable" ? "unavailable" as const : quality
  };
}
