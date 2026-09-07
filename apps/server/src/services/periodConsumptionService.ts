import type Database from "better-sqlite3";
import {
  buildMonthlyConsumptionSeries,
  monthBoundaryInProfileZone,
  resolvePeriodConsumption,
  periodWindow,
  type FreshnessPolicy,
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
  const profiles = [...storedProfiles].sort((a, b) => Date.parse(a.effectiveFrom) - Date.parse(b.effectiveFrom) || a.revision - b.revision);
  const profile = options.profileRevision === undefined
    ? profiles.filter((candidate) => Date.parse(candidate.effectiveFrom) <= periodWindow(period, candidate.siteTimeZone).startMs).at(-1) ?? profiles[0]
    : profiles.find((candidate) => candidate.revision === options.profileRevision);
  if (!profile) {
    throw Object.assign(new Error("UNKNOWN_PROFILE_REVISION"), { code: "UNKNOWN_PROFILE_REVISION" });
  }
  const window = periodWindow(period, profile.siteTimeZone);
  const through = Math.min(window.endMs, Date.parse(asOf));
  const newerProfiles = profiles.filter((candidate) => candidate.revision !== profile.revision
    && (Date.parse(candidate.effectiveFrom) > Date.parse(profile.effectiveFrom)
      || (Date.parse(candidate.effectiveFrom) === Date.parse(profile.effectiveFrom) && candidate.revision > profile.revision))
    && Date.parse(candidate.effectiveFrom) < through);
  const boundary = newerProfiles[0];
  const result = resolvePeriodConsumption({
    asOf,
    meterIds: options.meterIds ?? profile.siteTotal.memberChannelIds,
    period,
    profile,
    samples,
    freshnessPolicy,
    timeZone: options.timeZone,
    start: options.start,
    end: options.end
  });
  if (through >= window.startMs && (boundary || Date.parse(profile.effectiveFrom) > window.startMs)) {
    return { ...result, valueKwh: null, observedDeltaKwh: null, quality: result.quality === "invalid" ? "invalid" as const : "partial" as const,
      profileRevisionBoundaries: [profile, ...newerProfiles]
        .map((candidate) => ({ profileRevision: candidate.revision, effectiveFrom: candidate.effectiveFrom, siteTimeZone: candidate.siteTimeZone })),
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

export function resolveDailyConsumptionSeries(
  database: Database.Database,
  scope: "cl" | "kn",
  month: string,
  asOf: string
) {
  const profile = getActiveProfile(database, scope);
  if (!profile) {
    return null;
  }
  const [yearPart, monthPart] = month.split("-");
  const year = Number(yearPart);
  const monthNumber = Number(monthPart);
  if (!/^\d{4}-\d{2}$/.test(month) || !Number.isInteger(year) || !Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) {
    return null;
  }
  const profiles = listPersistedProfiles(database, scope);
  const samples = loadAcceptedSamples(database, scope);
  const freshnessPolicy = readFreshnessPolicy(database).policy;
  const monthResult = resolveWithEvidence(profiles, samples, { kind: "month", month: monthNumber, year }, asOf, freshnessPolicy);
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const points = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const result = resolveWithEvidence(profiles, samples, { day, kind: "day", month: monthNumber, year }, asOf, freshnessPolicy);
    points.push({
      date: `${month}-${String(day).padStart(2, "0")}`,
      valueKwh: result.quality === "exact" || result.quality === "estimated-boundary" ? result.valueKwh : null,
      quality: result.quality,
      profileRevision: result.profileRevision,
      siteTimeZone: result.siteTimeZone
    });
  }
  return {
    profileRevision: monthResult.profileRevision,
    siteTimeZone: monthResult.siteTimeZone,
    ...buildMonthlyConsumptionSeries(points, month)
  };
}

export function monthKeyFromProfile(asOf: string, profile: Pick<SiteEnergyProfileV1, "siteTimeZone">) {
  return monthBoundaryInProfileZone(asOf, profile.siteTimeZone);
}
