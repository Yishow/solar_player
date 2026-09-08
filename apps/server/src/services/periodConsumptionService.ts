import type Database from "better-sqlite3";
import {
  monthBoundaryInProfileZone,
  resolveAccountingSpanConsumption,
  resolvePeriodConsumption,
  periodWindow,
  type AccountingSpan,
  type FreshnessPolicy,
  type PeriodConsumptionResult,
  type PeriodConsumptionQuality,
  type PeriodSelection,
  type PeriodSample,
  type SiteEnergyProfileV1
} from "@solar-display/shared";
import { readFreshnessPolicy } from "./freshnessPolicyService.js";
import { getActiveProfile, listPersistedProfiles } from "./siteEnergyProfileRepository.js";
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
  if (range === "year") {
    return { kind: "year", year: parts.year };
  }
  // week and total are not one calendar period; they resolve through `rangeSpanFromRange` so that
  // `total` can never be answered with the current year's window.
  return null;
}

function civilDayWindow(year: number, month: number, day: number, siteTimeZone: string) {
  const civil = new Date(Date.UTC(year, month - 1, day));
  return periodWindow(
    { day: civil.getUTCDate(), kind: "day", month: civil.getUTCMonth() + 1, year: civil.getUTCFullYear() },
    siteTimeZone
  );
}

/**
 * The server's authorized window for the two ranges that are not a calendar period.
 *
 * `week` keeps the established "today and the previous six dates" selection — it is deliberately
 * not a Monday-start calendar week.
 *
 * `total` starts at the site's currently effective accounting profile, never at the current year's
 * start and never at an inferred installation date. Anchoring on the active revision is what makes
 * the span provable: an earlier anchor would cross every later profile revision, so a site that has
 * ever edited its accounting setup could never report a total again. The result therefore means
 * "cumulative on the accounting basis in force", and its `periodStart` is the honest span the
 * consumers must display alongside the number.
 *
 * Both end at the end of today in the site calendar, so the shared resolver caps them at the same
 * as-of instant the calendar ranges use. Returns null when no start can be identified.
 */
export function rangeSpanFromRange(
  range: "week" | "total",
  asOf: string,
  activeProfile: SiteEnergyProfileV1,
  siteTimeZone: string
): AccountingSpan | null {
  const parts = calendarPartsInProfileZone(asOf, siteTimeZone);
  const today = civilDayWindow(parts.year, parts.month, parts.day, siteTimeZone);
  if (range === "week") {
    const weekStart = civilDayWindow(parts.year, parts.month, parts.day - 6, siteTimeZone);
    return { endMs: today.endMs, kind: "span", spanOf: "week", startMs: weekStart.startMs };
  }
  const startMs = Date.parse(activeProfile.effectiveFrom);
  if (!Number.isFinite(startMs) || startMs >= today.endMs) {
    return null;
  }
  return { endMs: today.endMs, kind: "span", spanOf: "total", startMs };
}

/**
 * How one requested range resolves: a calendar period for day/month/year, or a server-authorized
 * span for week/total. Site total, department shares and the daily curve all resolve through this
 * one authority, so no two consumers of the same range can report different boundaries.
 */
export type RangeWindow =
  | { kind: "period"; period: PeriodSelection }
  | { kind: "span"; span: AccountingSpan };

export function rangeWindowFor(
  range: "day" | "week" | "month" | "year" | "total",
  asOf: string,
  activeProfile: SiteEnergyProfileV1
): RangeWindow | null {
  const period = periodSelectionFromRange(range, asOf, activeProfile.siteTimeZone);
  if (period) {
    return { kind: "period", period };
  }
  const span = rangeSpanFromRange(range as "week" | "total", asOf, activeProfile, activeProfile.siteTimeZone);
  return span ? { kind: "span", span } : null;
}

function windowResolverFor(rangeWindow: RangeWindow) {
  return rangeWindow.kind === "period"
    ? (candidate: SiteEnergyProfileV1) => periodWindow(rangeWindow.period, candidate.siteTimeZone)
    : () => ({ endMs: rangeWindow.span.endMs, startMs: rangeWindow.span.startMs });
}

/** The shared consumption calculation for either kind of window; the rules are identical. */
export function resolveConsumptionForRangeWindow(
  rangeWindow: RangeWindow,
  input: {
    asOf: string;
    freshnessPolicy: FreshnessPolicy;
    meterIds: string[];
    profile: SiteEnergyProfileV1;
    samples: PeriodSample[];
  }
) {
  return rangeWindow.kind === "period"
    ? resolvePeriodConsumption({ ...input, period: rangeWindow.period })
    : resolveAccountingSpanConsumption({ ...input, accountingContext: "server-authorized-range", span: rangeWindow.span });
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
  return selectEffectiveForWindow(storedProfiles, (candidate) => periodWindow(period, candidate.siteTimeZone), asOf, options);
}

export function selectEffectiveRangeWindow(
  storedProfiles: SiteEnergyProfileV1[],
  rangeWindow: RangeWindow,
  asOf: string,
  options: { profileRevision?: number } = {}
): EffectivePeriodSelection {
  return selectEffectiveForWindow(storedProfiles, windowResolverFor(rangeWindow), asOf, options);
}

/**
 * One profile-selection and revision-boundary authority for both calendar periods and server
 * authorized spans; only the way the window is derived from a candidate profile differs.
 */
function selectEffectiveForWindow(
  storedProfiles: SiteEnergyProfileV1[],
  windowFor: (profile: SiteEnergyProfileV1) => { endMs: number; startMs: number },
  asOf: string,
  options: { profileRevision?: number } = {}
): EffectivePeriodSelection {
  const profiles = [...storedProfiles].sort((a, b) => Date.parse(a.effectiveFrom) - Date.parse(b.effectiveFrom) || a.revision - b.revision);
  const profile = options.profileRevision === undefined
    ? profiles.filter((candidate) => Date.parse(candidate.effectiveFrom) <= windowFor(candidate).startMs).at(-1) ?? profiles[0]
    : profiles.find((candidate) => candidate.revision === options.profileRevision);
  if (!profile) {
    throw Object.assign(new Error("UNKNOWN_PROFILE_REVISION"), { code: "UNKNOWN_PROFILE_REVISION" });
  }
  const window = windowFor(profile);
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
  rangeWindow: RangeWindow,
  asOf: string,
  options: { profileRevision?: number } = {}
): EffectivePeriodContext {
  return {
    ...selectEffectiveRangeWindow(listPersistedProfiles(database, scope), rangeWindow, asOf, options),
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
  return withRevisionBoundary(context, resolvePeriodConsumption({
    asOf,
    meterIds: options.meterIds ?? context.profile.siteTotal.memberChannelIds,
    period,
    profile: context.profile,
    samples,
    freshnessPolicy,
    timeZone: options.timeZone,
    start: options.start,
    end: options.end
  }));
}

/** A span reaches the same accumulated-delta, identity and quality core as a calendar period. */
function resolveSpanWithEvidence(
  storedProfiles: SiteEnergyProfileV1[], samples: PeriodSample[], span: AccountingSpan, asOf: string, freshnessPolicy: FreshnessPolicy
) {
  const rangeWindow: RangeWindow = { kind: "span", span };
  const context = selectEffectiveRangeWindow(storedProfiles, rangeWindow, asOf);
  return withRevisionBoundary(context, resolveConsumptionForRangeWindow(rangeWindow, {
    asOf,
    freshnessPolicy,
    meterIds: context.profile.siteTotal.memberChannelIds,
    profile: context.profile,
    samples
  }));
}

function withRevisionBoundary(context: EffectivePeriodSelection, result: ReturnType<typeof resolvePeriodConsumption>) {
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
    // A configured profile always answers with a canonical result, so the consumers can tell
    // "no supported measurement" apart from "no accounting profile" and never fall back to a
    // legacy counter. Spans are not cached as projections: that store only knows calendar ranges.
    return tryResolveSpanConsumption(database, scope, range as "week" | "total", asOf, profile);
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

/**
 * The span boundaries come from the active profile's calendar, but the profile a span actually
 * resolves against is still chosen by `selectEffectiveForWindow`. When those differ the span also
 * crosses a revision boundary, so it degrades to partial rather than reporting an exact number
 * measured on one calendar and labelled with another.
 */
function tryResolveSpanConsumption(
  database: Database.Database,
  scope: "cl" | "kn",
  range: "week" | "total",
  asOf: string,
  activeProfile: SiteEnergyProfileV1
) {
  const profiles = listPersistedProfiles(database, scope);
  if (profiles.length === 0) {
    return null;
  }
  const span = rangeSpanFromRange(range, asOf, activeProfile, activeProfile.siteTimeZone);
  if (!span) {
    // The requested cumulative beginning cannot be identified, so the span stays explicitly
    // unavailable instead of borrowing a calendar year that was never requested.
    return unavailableSpanResult(activeProfile, range, asOf);
  }
  try {
    return resolveSpanWithEvidence(profiles, loadAcceptedSamples(database, scope), span, asOf, readFreshnessPolicy(database).policy);
  } catch (error) {
    // A broken profile must stay distinguishable from "no evidence yet", so the raised code is
    // carried into the diagnostics instead of collapsing into one opaque reason.
    return unavailableSpanResult(activeProfile, range, asOf, (error as { code?: string })?.code);
  }
}

function unavailableSpanResult(
  profile: SiteEnergyProfileV1,
  range: "week" | "total",
  asOf: string,
  cause?: string
): PeriodConsumptionResult {
  return {
    calculatedThrough: asOf,
    issues: [`UNRESOLVED_ACCOUNTING_SPAN:${range}`, ...(cause ? [cause] : [])],
    profileRevision: profile.revision,
    quality: "unavailable" as const,
    siteTimeZone: profile.siteTimeZone,
    valueKwh: null
  };
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
