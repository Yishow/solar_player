import type Database from "better-sqlite3";
import {
  monthBoundaryInProfileZone,
  type FreshnessPolicy,
  type PeriodConsumptionQuality,
  type PeriodSample,
  type PeriodSelection,
  type SiteEnergyProfileV1
} from "@solar-display/shared";
import { readFreshnessPolicy } from "./freshnessPolicyService.js";
import {
  resolvePeriodFromEvidence,
  selectEffectivePeriod,
  selectEvidenceSamples
} from "./periodConsumptionService.js";
import { listPersistedV1Profiles } from "./accountingPeriodService.js";

export type DailyConsumptionPoint = {
  date: string;
  profileRevision: number;
  quality: PeriodConsumptionQuality;
  siteTimeZone: string;
  valueKwh: string | null;
};

/** Every calendar date key of `YYYY-MM`, ascending. Returns [] for a malformed month key. */
export function monthDateKeys(month: string): string[] {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) {
    return [];
  }
  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  if (monthNumber < 1 || monthNumber > 12) {
    return [];
  }
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return Array.from({ length: daysInMonth }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`);
}

/** The day period a `YYYY-MM-DD` key names, or null for a key the daily series skips. */
function dailyPeriodOf(date: string): PeriodSelection | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    return null;
  }
  const period: PeriodSelection = { day: Number(match[3]), kind: "day", month: Number(match[2]), year: Number(match[1]) };
  if (period.month! < 1 || period.month! > 12 || period.day! < 1 || period.day! > 31) {
    return null;
  }
  return period;
}

function dailyConsumptionPoint(
  profiles: SiteEnergyProfileV1[],
  samples: PeriodSample[],
  freshnessPolicy: FreshnessPolicy,
  date: string,
  asOf: string
): DailyConsumptionPoint | null {
  const period = dailyPeriodOf(date);
  if (!period) {
    return null;
  }
  try {
    const result = resolvePeriodFromEvidence(profiles, samples, period, asOf, freshnessPolicy);
    return {
      date,
      profileRevision: result.profileRevision,
      quality: result.quality,
      siteTimeZone: result.siteTimeZone,
      valueKwh: result.quality === "exact" || result.quality === "estimated-boundary" ? result.valueKwh : null
    };
  } catch {
    return null;
  }
}

/**
 * Canonical consumption for an explicit set of dates. The caller owns the date set so a range
 * contract (day/week/month/year/total) is never rewritten into the current month; profiles,
 * samples and the freshness policy are loaded once for the whole set.
 */
export function resolveDailyConsumptionPoints(
  database: Database.Database,
  scope: "cl" | "kn",
  dates: string[],
  asOf: string
): DailyConsumptionPoint[] | null {
  const profiles = listPersistedV1Profiles(database, scope);
  if (profiles.length === 0) {
    return null;
  }
  if (dates.length === 0) {
    return [];
  }
  // Each date resolves against its own effective profile; one bounded read covers them all.
  const selections = dates.flatMap((date) => {
    const period = dailyPeriodOf(date);
    if (!period) {
      return [];
    }
    try {
      return [selectEffectivePeriod(profiles, period, asOf)];
    } catch {
      return [];
    }
  });
  const channelIds = selections.flatMap((selection) => selection.profile.siteTotal.memberChannelIds);
  const samples = selectEvidenceSamples(database, scope, channelIds, selections);
  const freshnessPolicy = readFreshnessPolicy(database).policy;
  return resolveDailyPointsFromEvidence(profiles, samples, freshnessPolicy, dates, asOf);
}

/** The one daily-point resolution, over whichever evidence the caller selected. */
export function resolveDailyPointsFromEvidence(
  profiles: SiteEnergyProfileV1[],
  samples: PeriodSample[],
  freshnessPolicy: FreshnessPolicy,
  dates: string[],
  asOf: string
): DailyConsumptionPoint[] {
  return dates
    .map((date) => dailyConsumptionPoint(profiles, samples, freshnessPolicy, date, asOf))
    .filter((point): point is DailyConsumptionPoint => point !== null);
}

export function monthKeyFromProfile(asOf: string, profile: Pick<SiteEnergyProfileV1, "siteTimeZone">) {
  return monthBoundaryInProfileZone(asOf, profile.siteTimeZone);
}
