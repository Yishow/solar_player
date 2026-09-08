import type Database from "better-sqlite3";
import {
  monthBoundaryInProfileZone,
  resolvePeriodConsumption,
  periodWindow,
  type FreshnessPolicy,
  type PeriodConsumptionQuality,
  type PeriodSelection,
  type PeriodSample,
  type SiteEnergyProfileV1
} from "@solar-display/shared";
import { readFreshnessPolicy } from "./freshnessPolicyService.js";
import { getActiveProfile, listPersistedProfiles } from "./siteEnergyProfileService.js";
import { readActiveProjection, acceptedSampleChecksum, projectionContextKey } from "./consumptionProjectionService.js";

import { loadAcceptedMeterReadings } from "./meterReadingService.js";

export function loadAcceptedSamples(database: Database.Database, scope: "cl" | "kn"): PeriodSample[] {
  const rows = loadAcceptedMeterReadings(database, scope);
  return rows.slice().sort((a, b) => {
    const timeA = Date.parse(a.source_timestamp ?? a.received_at);
    const timeB = Date.parse(b.source_timestamp ?? b.received_at);
    return timeA - timeB || a.reading_id.localeCompare(b.reading_id);
  }).map((row) => ({
    readingId: row.reading_id,
    boundaryMaxAgeSeconds: row.boundary_max_age_seconds,
    channelId: row.channel_id,
    epochId: row.epoch_id,
    meterId: row.meter_id,
    sourceTimestamp: row.source_timestamp,
    receivedAt: row.received_at,
    timestampQuality: row.timestamp_quality,
    measurementKind: row.measurement_kind ?? "unknown",
    sourceRevision: row.source_revision,
    valueKwh: row.normalized_value_kwh
  }));
}

export function calendarPartsInProfileZone(instantUtc: string, siteTimeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: siteTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(instantUtc));
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    day: Number(read("day")),
    month: Number(read("month")),
    year: Number(read("year"))
  };
}

export function periodSelectionFromRange(
  range: "day" | "week" | "month" | "year" | "total",
  asOf: string,
  siteTimeZone: string
): PeriodSelection | null {
  const parts = calendarPartsInProfileZone(asOf, siteTimeZone);
  if (range === "day") {
    return { day: parts.day, kind: "day", month: parts.month, year: parts.year };
  }
  if (range === "month") {
    return { kind: "month", month: parts.month, year: parts.year };
  }
  if (range === "year" || range === "total") {
    return { kind: "year", year: parts.year };
  }
  return null;
}

export type EffectivePeriodSelection = {
  crossesRevisionBoundary: boolean;
  newerProfiles: SiteEnergyProfileV1[];
  profile: SiteEnergyProfileV1;
  profiles: SiteEnergyProfileV1[];
  throughMs: number;
  window: { endMs: number; startMs: number };
};

export type EffectivePeriodContext = EffectivePeriodSelection & {
  asOf: string;
  freshnessPolicy: FreshnessPolicy;
  samples: PeriodSample[];
};

export function profileRevisionBoundariesOf(profiles: SiteEnergyProfileV1[]) {
  return profiles.map((candidate) => ({
    profileRevision: candidate.revision,
    effectiveFrom: candidate.effectiveFrom,
    siteTimeZone: candidate.siteTimeZone
  }));
}

/**
 * Single authority for "which profile revision, calendar window and as-of instant does this
 * period resolve against". Every consumer of a period — site total, department shares and the
 * daily curve — must share this selection so one screen cannot mix two accounting bases.
 */
export function selectEffectivePeriod(
  storedProfiles: SiteEnergyProfileV1[],
  period: PeriodSelection,
  asOf: string,
  options: { profileRevision?: number } = {}
): EffectivePeriodSelection {
  const profiles = [...storedProfiles].sort((a, b) => Date.parse(a.effectiveFrom) - Date.parse(b.effectiveFrom) || a.revision - b.revision);
  const profile = options.profileRevision === undefined
    ? profiles.filter((candidate) => Date.parse(candidate.effectiveFrom) <= periodWindow(period, candidate.siteTimeZone).startMs).at(-1) ?? profiles[0]
    : profiles.find((candidate) => candidate.revision === options.profileRevision);
  if (!profile) {
    throw Object.assign(new Error("UNKNOWN_PROFILE_REVISION"), { code: "UNKNOWN_PROFILE_REVISION" });
  }
  const window = periodWindow(period, profile.siteTimeZone);
  const throughMs = Math.min(window.endMs, Date.parse(asOf));
  const newerProfiles = profiles.filter((candidate) => candidate.revision !== profile.revision
    && (Date.parse(candidate.effectiveFrom) > Date.parse(profile.effectiveFrom)
      || (Date.parse(candidate.effectiveFrom) === Date.parse(profile.effectiveFrom) && candidate.revision > profile.revision))
    && Date.parse(candidate.effectiveFrom) < throughMs);
  return {
    crossesRevisionBoundary: throughMs >= window.startMs
      && (newerProfiles.length > 0 || Date.parse(profile.effectiveFrom) > window.startMs),
    newerProfiles,
    profile,
    profiles,
    throughMs,
    window
  };
}

export function loadEffectivePeriodContext(
  database: Database.Database,
  scope: "cl" | "kn",
  period: PeriodSelection,
  asOf: string,
  options: { profileRevision?: number } = {}
): EffectivePeriodContext {
  return {
    ...selectEffectivePeriod(listPersistedProfiles(database, scope), period, asOf, options),
    asOf,
    freshnessPolicy: readFreshnessPolicy(database).policy,
    samples: loadAcceptedSamples(database, scope)
  };
}

export function resolvePersistedPeriodConsumption(
  database: Database.Database,
  scope: "cl" | "kn",
  period: PeriodSelection,
  asOf: string,
  options: { profileRevision?: number; meterIds?: string[]; timeZone?: string; start?: string; end?: string } = {}
) {
  return resolveWithEvidence(listPersistedProfiles(database, scope), loadAcceptedSamples(database, scope), period, asOf, readFreshnessPolicy(database).policy, options);
}

function resolveWithEvidence(
  storedProfiles: SiteEnergyProfileV1[], samples: PeriodSample[], period: PeriodSelection, asOf: string, freshnessPolicy: FreshnessPolicy,
  options: { profileRevision?: number; meterIds?: string[]; timeZone?: string; start?: string; end?: string } = {}
) {
  const context = selectEffectivePeriod(storedProfiles, period, asOf, options);
  const result = resolvePeriodConsumption({
    asOf,
    meterIds: options.meterIds ?? context.profile.siteTotal.memberChannelIds,
    period,
    profile: context.profile,
    samples,
    freshnessPolicy,
    timeZone: options.timeZone,
    start: options.start,
    end: options.end
  });
  if (context.crossesRevisionBoundary) {
    return { ...result, valueKwh: null, observedDeltaKwh: null, quality: result.quality === "invalid" ? "invalid" as const : "partial" as const,
      profileRevisionBoundaries: profileRevisionBoundariesOf([context.profile, ...context.newerProfiles]),
      issues: [...result.issues ?? [], "PROFILE_REVISION_BOUNDARY"] };
  }
  return result;
}

export function tryResolvePersistedPeriodConsumption(
  database: Database.Database,
  scope: string,
  range: "day" | "week" | "month" | "year" | "total",
  asOf: string
) {
  if (scope !== "cl" && scope !== "kn") {
    return null;
  }
  const profile = getActiveProfile(database, scope);
  if (!profile) {
    return null;
  }
  const period = periodSelectionFromRange(range, asOf, profile.siteTimeZone);
  if (!period) {
    return null;
  }
  try {
    const result = resolvePersistedPeriodConsumption(database, scope, period, asOf);
    const projectedRange = period.kind;
    const contextKey = projectionContextKey(result);
    const active = readActiveProjection(database, scope, projectedRange, contextKey);
    if (active && active.calculatedThrough === result.calculatedThrough && active.quality === result.quality
      && active.sampleChecksum === acceptedSampleChecksum(database, scope, result)) {
      return { ...active, freshness: result.freshness, freshnessState: result.freshnessState };
    }
    return result;
  } catch {
    return null;
  }
}

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

function dailyConsumptionPoint(
  profiles: SiteEnergyProfileV1[],
  samples: PeriodSample[],
  freshnessPolicy: FreshnessPolicy,
  date: string,
  asOf: string
): DailyConsumptionPoint | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    return null;
  }
  const period: PeriodSelection = { day: Number(match[3]), kind: "day", month: Number(match[2]), year: Number(match[1]) };
  if (period.month! < 1 || period.month! > 12 || period.day! < 1 || period.day! > 31) {
    return null;
  }
  try {
    const result = resolveWithEvidence(profiles, samples, period, asOf, freshnessPolicy);
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
  const profiles = listPersistedProfiles(database, scope);
  if (profiles.length === 0) {
    return null;
  }
  if (dates.length === 0) {
    return [];
  }
  const samples = loadAcceptedSamples(database, scope);
  const freshnessPolicy = readFreshnessPolicy(database).policy;
  return dates
    .map((date) => dailyConsumptionPoint(profiles, samples, freshnessPolicy, date, asOf))
    .filter((point): point is DailyConsumptionPoint => point !== null);
}

export function monthKeyFromProfile(asOf: string, profile: Pick<SiteEnergyProfileV1, "siteTimeZone">) {
  return monthBoundaryInProfileZone(asOf, profile.siteTimeZone);
}
