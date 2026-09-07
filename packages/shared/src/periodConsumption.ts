import { DEFAULT_BOUNDARY_MAX_AGE_SECONDS, formatDecimalString, parseDecimalString, parseSourceTimestamp, subtractDecimalString } from "./meterReading.js";
import { aggregateFreshnessResults, createDefaultFreshnessPolicy, evaluateFreshness, type FreshnessPolicy, type FreshnessResult, type FreshnessState } from "./freshnessPolicy.js";
import { profileMemberChannelIds, rejectCalendarOverride, type SiteEnergyProfileV1 } from "./siteEnergyProfile.js";

export type PeriodKind = "day" | "month" | "year";

export type PeriodSelection = {
  kind: PeriodKind;
  year: number;
  month?: number;
  day?: number;
};

export type PeriodSample = {
  channelId: string;
  epochId?: string;
  meterId?: string;
  sourceTimestamp: string | null;
  receivedAt?: string;
  timestampQuality?: string;
  readingId?: string;
  measurementKind?: "cumulative-energy" | "interval-energy" | "power-gauge" | "unknown";
  boundaryMaxAgeSeconds?: number;
  rolloverModulus?: string | number | null;
  sourceRevision?: number;
  valueKwh: string;
};

export type PeriodConsumptionQuality = "exact" | "estimated-boundary" | "partial" | "unavailable" | "invalid";

export type DailyCoverage = {
  coveredDays: number;
  totalDays: number;
  isComplete: boolean;
};

export type DefinitionRevisionItem = {
  channelId: string;
  epochId: string;
  meterId: string;
  sourceRevision: number;
};

export type PeriodConsumptionResult = {
  profileRevisionBoundaries?: Array<{ profileRevision: number; effectiveFrom: string; siteTimeZone: string }>;
  meterIds?: string[];
  periodStart?: string;
  periodEnd?: string;
  calculatedThrough?: string;
  dailyCoverage?: DailyCoverage;
  observedDeltaKwh?: string | null;
  freshness?: "fresh" | "stale" | "unavailable";
  freshnessState?: FreshnessState;
  baselineSampleIds?: string[];
  endSampleIds?: string[];
  boundaryOffsets?: Array<{ channelId: string; startSeconds: number | null; endSeconds: number | null; startTimestamp: string | null; endTimestamp: string | null }>;
  issues?: string[];
  calculationVersion?: string;
  provenance?: { profileRevision: number; siteTimeZone: string; sourceRevisions: string[]; rollover?: boolean; reviewContext?: string };
  profileRevision: number;
  quality: PeriodConsumptionQuality;
  siteTimeZone: string;
  valueKwh: string | null;
};
function pad(value: number) {
  return String(value).padStart(2, "0");
}

function civilUtcMs(local: string, timeZone: string) {
  const parsed = parseSourceTimestamp(local, timeZone);
  if (!parsed.instant) throw Object.assign(new Error("PERIOD_BOUNDARY_INVALID"), { code: "PERIOD_BOUNDARY_INVALID" });
  return Date.parse(parsed.instant);
}

function nextCivilDate(year: number, month: number, day: number) {
  const utc = new Date(Date.UTC(year, month - 1, day + 1));
  return { day: utc.getUTCDate(), month: utc.getUTCMonth() + 1, year: utc.getUTCFullYear() };
}

export function periodWindow(period: PeriodSelection, siteTimeZone: string) {
  if (period.kind === "day") {
    const month = period.month ?? 1;
    const day = period.day ?? 1;
    const next = nextCivilDate(period.year, month, day);
    return {
      endMs: civilUtcMs(`${next.year}-${pad(next.month)}-${pad(next.day)}T00:00:00`, siteTimeZone),
      startMs: civilUtcMs(`${period.year}-${pad(month)}-${pad(day)}T00:00:00`, siteTimeZone)
    };
  }
  if (period.kind === "month") {
    const month = period.month ?? 1;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? period.year + 1 : period.year;
    return {
      endMs: civilUtcMs(`${nextYear}-${pad(nextMonth)}-01T00:00:00`, siteTimeZone),
      startMs: civilUtcMs(`${period.year}-${pad(month)}-01T00:00:00`, siteTimeZone)
    };
  }
  return {
    endMs: civilUtcMs(`${period.year + 1}-01-01T00:00:00`, siteTimeZone),
    startMs: civilUtcMs(`${period.year}-01-01T00:00:00`, siteTimeZone)
  };
}

function sampleMs(sample: PeriodSample) {
  return Date.parse(sample.sourceTimestamp ?? (sample.timestampQuality === "receive-time-estimated" ? sample.receivedAt ?? "" : ""));
}

function sampleIdentity(sample: PeriodSample) {
  if (sample.meterId === undefined && sample.sourceRevision === undefined && sample.epochId === undefined) {
    return `legacy:${sample.channelId}`;
  }
  return JSON.stringify([
    sample.channelId,
    sample.meterId ?? "unknown-meter",
    sample.sourceRevision === undefined ? "unknown-revision" : String(sample.sourceRevision),
    sample.epochId ?? "unknown-epoch"
  ]);
}

function sortByInstant(series: PeriodSample[]) {
  const sourceInstants = new Set(series.filter((sample) => sample.sourceTimestamp !== null)
    .map((sample) => JSON.stringify([sampleIdentity(sample), sampleMs(sample)])));
  return series
    .filter((sample) => Number.isFinite(sampleMs(sample))
      && (sample.sourceTimestamp !== null || !sourceInstants.has(JSON.stringify([sampleIdentity(sample), sampleMs(sample)]))))
    .sort((left, right) => sampleMs(left) - sampleMs(right));
}

function lastAtOrBefore(series: PeriodSample[], instantMs: number) {
  let found: PeriodSample | null = null;
  for (const sample of series) {
    const time = sampleMs(sample);
    if (Number.isFinite(time) && time <= instantMs) {
      found = sample;
    }
  }
  return found;
}

function resolveBoundaryMaxAgeMs(sample: PeriodSample | undefined, fallback?: number) {
  return (sample?.boundaryMaxAgeSeconds ?? fallback ?? DEFAULT_BOUNDARY_MAX_AGE_SECONDS) * 1000;
}

function evaluateDailyCoverage(
  period: PeriodSelection,
  siteTimeZone: string,
  meterIds: string[],
  samples: PeriodSample[],
  boundaryMaxAgeSeconds?: number
): DailyCoverage | undefined {
  if (period.kind !== "month") return undefined;
  const month = period.month ?? 1;
  const daysInMonth = new Date(Date.UTC(period.year, month, 0)).getUTCDate();
  let coveredDays = 0;
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dayWin = periodWindow({ day, kind: "day", month, year: period.year }, siteTimeZone);
    const dayCovered = meterIds.length > 0 && meterIds.every((meterId) => {
      const meterSamples = samples.filter((s) => s.channelId === meterId);
      const opening = lastAtOrBefore(meterSamples, dayWin.startMs);
      const closing = lastAtOrBefore(meterSamples, dayWin.endMs);
      if (!opening || !closing || opening === closing) return false;
      const maxAgeMs = resolveBoundaryMaxAgeMs(opening, boundaryMaxAgeSeconds);
      return dayWin.startMs - sampleMs(opening) <= maxAgeMs && dayWin.endMs - sampleMs(closing) <= maxAgeMs;
    });
    if (dayCovered) coveredDays += 1;
  }
  return { coveredDays, isComplete: coveredDays === daysInMonth, totalDays: daysInMonth };
}

function resultFor(profile: SiteEnergyProfileV1, quality: PeriodConsumptionQuality, valueKwh: string | null): PeriodConsumptionResult {
  return { profileRevision: profile.revision, quality, siteTimeZone: profile.siteTimeZone, valueKwh };
}

export function resolvePeriodConsumption(input: {
  asOf: string;
  boundaryMaxAgeSeconds?: number;
  definitionRevision?: DefinitionRevisionItem[];
  freshnessPolicy?: FreshnessPolicy;
  meterIds: string[];
  period: PeriodSelection;
  profile: SiteEnergyProfileV1;
  reviewContext?: string;
  rolloverModulus?: string | number | Record<string, string | number> | null;
  samples: PeriodSample[];
  timeZone?: string;
  start?: string;
  end?: string;
}): PeriodConsumptionResult {
  const override = rejectCalendarOverride({
    end: input.end,
    start: input.start,
    timeZone: input.timeZone
  });
  if (!override.ok) {
    throw Object.assign(new Error(override.message), { code: "CALENDAR_OVERRIDE_REJECTED" });
  }
  const allowed = new Set(profileMemberChannelIds(input.profile));
  for (const meterId of input.meterIds) {
    if (!allowed.has(meterId)) {
      throw Object.assign(new Error(`meterId ${meterId} is outside the profile membership`), { code: "METER_NOT_IN_PROFILE" });
    }
  }
  if (input.profile.revision < 1) {
    throw Object.assign(new Error("UNKNOWN_PROFILE_REVISION"), { code: "UNKNOWN_PROFILE_REVISION" });
  }
  const definitionMap = new Map<string, DefinitionRevisionItem>();
  if (input.definitionRevision) {
    for (const item of input.definitionRevision) definitionMap.set(item.channelId, item);
    for (const meterId of input.meterIds) {
      if (!definitionMap.has(meterId)) {
        throw Object.assign(new Error(`DEFINITION_REVISION_MISMATCH: meterId ${meterId} is not in definitionRevision`), { code: "DEFINITION_REVISION_MISMATCH" });
      }
    }
  }

  if (new Set(input.meterIds).size !== input.meterIds.length) {
    throw Object.assign(new Error("DUPLICATE_METER"), { code: "DUPLICATE_METER" });
  }
  const asOfMs = Date.parse(input.asOf);
  if (!Number.isFinite(asOfMs)) {
    throw Object.assign(new Error("INVALID_AS_OF"), { code: "INVALID_AS_OF" });
  }
  const normalizedModulus = new Map<string, bigint>();
  if (typeof input.rolloverModulus === "object" && input.rolloverModulus !== null) {
    for (const [k, v] of Object.entries(input.rolloverModulus)) {
      if (v !== null && v !== undefined) normalizedModulus.set(k, parseDecimalString(String(v)));
    }
  } else if (input.rolloverModulus !== null && input.rolloverModulus !== undefined) {
    const sharedMod = parseDecimalString(String(input.rolloverModulus));
    for (const meterId of input.meterIds) normalizedModulus.set(meterId, sharedMod);
  }
  const window = periodWindow(input.period, input.profile.siteTimeZone);
  const closeCapMs = Math.min(window.endMs, asOfMs);
  const issues: string[] = [];
  const baselineSampleIds: string[] = [];
  const endSampleIds: string[] = [];
  const boundaryOffsets: NonNullable<PeriodConsumptionResult["boundaryOffsets"]> = [];
  const sourceRevisions = new Set<string>();
  let total: string | null = null;
  let observed: string | null = null;
  let rolloverDetected = false;
  const state: { quality: PeriodConsumptionQuality } = { quality: "exact" };
  const freshnessPolicy = input.freshnessPolicy ?? createDefaultFreshnessPolicy();
  const freshnessResults: Array<{ metricKey: string; freshness: FreshnessResult }> = [];
  const degrade = (next: PeriodConsumptionQuality, issue: string) => {
    const ranks = { exact: 0, "estimated-boundary": 1, unavailable: 2, partial: 3, invalid: 4 };
    if (ranks[next] > ranks[state.quality]) state.quality = next;
    issues.push(issue);
  };
  for (const meterId of input.meterIds) {
    const series = sortByInstant(input.samples.filter((sample) => sample.channelId === meterId && sampleMs(sample) <= closeCapMs));
    const closing = lastAtOrBefore(series, closeCapMs);
    freshnessResults.push({ metricKey: meterId, freshness: evaluateFreshness({
      category: "cumulative", policy: freshnessPolicy, nowMs: asOfMs,
      sourceTimestamp: closing?.sourceTimestamp ?? null
    }) });
    if (!closing) {
      degrade("unavailable", `MISSING_OBSERVATIONS:${meterId}`);
      continue;
    }
    const maxAgeMs = resolveBoundaryMaxAgeMs(closing, input.boundaryMaxAgeSeconds);
    if (closing.measurementKind === "unknown") {
      degrade("invalid", `SOURCE_SEMANTICS_UNKNOWN:${meterId}`);
      continue;
    }
    if (closing.measurementKind === "power-gauge") {
      degrade("invalid", `POWER_GAUGE_NOT_ENERGY:${meterId}`);
      continue;
    }
    if (closing.measurementKind === "interval-energy") {
      // A timestamp alone does not prove an interval's start or complete coverage.
      const intervals = series.filter((sample) => sample.measurementKind === "interval-energy" && sampleMs(sample) >= window.startMs && sampleMs(sample) < window.endMs);
      for (const sample of intervals) {
        if (sample.valueKwh.startsWith("-")) degrade("invalid", `NEGATIVE_INTERVAL_ENERGY:${meterId}`);
        else observed = addDecimal(observed ?? "0", sample.valueKwh);
        sourceRevisions.add(sampleIdentity(sample));
      }
      degrade("partial", `INTERVAL_COVERAGE_UNPROVEN:${meterId}`);
      continue;
    }
    const identity = sampleIdentity(closing);
    const identitySeries = series.filter((sample) => sampleIdentity(sample) === identity);
    const opening = lastAtOrBefore(identitySeries, window.startMs);
    const contributing = series.filter((sample) => sampleMs(sample) >= (opening ? sampleMs(opening) : window.startMs));
    const canContribute = (s: PeriodSample) => sampleMs(s) >= window.startMs || (s === opening && window.startMs - sampleMs(s) <= resolveBoundaryMaxAgeMs(s, input.boundaryMaxAgeSeconds));
    const def = definitionMap.get(meterId);
    let channelObserved: string | null = null;
    let channelRollover = false;
    let previous: PeriodSample | undefined;
    for (const sample of contributing) {
      sourceRevisions.add(sampleIdentity(sample));
      if (def) {
        if (sample.meterId && sample.meterId !== def.meterId) degrade("partial", `DEFINITION_REVISION_MISMATCH:${meterId}`);
        if (sample.sourceRevision !== undefined && sample.sourceRevision !== def.sourceRevision) degrade("partial", `DEFINITION_REVISION_MISMATCH:${meterId}`);
        if (sample.epochId && sample.epochId !== def.epochId) degrade("partial", `DEFINITION_REVISION_MISMATCH:${meterId}`);
      }
      if (previous && sampleIdentity(previous) === sampleIdentity(sample)) {
        const prevNum = parseDecimalString(previous.valueKwh);
        const currNum = parseDecimalString(sample.valueKwh);
        if (currNum < prevNum) {
          const modNum = sample.rolloverModulus !== undefined && sample.rolloverModulus !== null
            ? parseDecimalString(String(sample.rolloverModulus))
            : normalizedModulus.get(meterId) ?? 0n;
          const rolloverDelta = (modNum - prevNum) + currNum;
          if (modNum > 0n && prevNum < modNum && currNum >= 0n && rolloverDelta >= 0n && rolloverDelta <= (modNum / 2n)) {
            const stepDelta = formatDecimalString(rolloverDelta);
            if (canContribute(previous)) channelObserved = addDecimal(channelObserved ?? "0", stepDelta);
            channelRollover = true;
            rolloverDetected = true;
            issues.push(`ROLLOVER:${meterId}`);
          } else {
            degrade("invalid", `UNEXPLAINED_DECREASE:${meterId}`);
          }
        } else {
          const delta = subtractDecimalString(sample.valueKwh, previous.valueKwh);
          if (canContribute(previous)) channelObserved = addDecimal(channelObserved ?? "0", delta);
        }
      }
      previous = sample;
    }
    if (channelObserved !== null) observed = addDecimal(observed ?? "0", channelObserved);
    if (opening?.readingId) baselineSampleIds.push(opening.readingId);
    if (closing.readingId) endSampleIds.push(closing.readingId);
    boundaryOffsets.push({
      channelId: meterId,
      startSeconds: opening ? (sampleMs(opening) - window.startMs) / 1000 : null,
      endSeconds: (sampleMs(closing) - closeCapMs) / 1000,
      startTimestamp: opening ? new Date(sampleMs(opening)).toISOString() : null,
      endTimestamp: new Date(sampleMs(closing)).toISOString()
    });
    if (!opening) {
      const globalOpening = lastAtOrBefore(series, window.startMs);
      if (globalOpening && sampleIdentity(globalOpening) !== identity) {
        degrade("partial", `UNPROVEN_CONTINUITY:${meterId}`);
      } else {
        degrade("partial", `MISSING_BASELINE:${meterId}`);
      }
      continue;
    }
    if (sampleMs(closing) <= sampleMs(opening)) {
      degrade("partial", `MISSING_ENDPOINT:${meterId}`);
      continue;
    }
    if (contributing.some((sample) => sampleIdentity(sample) !== identity)) {
      degrade("partial", `UNPROVEN_CONTINUITY:${meterId}`);
      continue;
    }
    if (window.startMs - sampleMs(opening) > resolveBoundaryMaxAgeMs(opening, input.boundaryMaxAgeSeconds) || closeCapMs - sampleMs(closing) > maxAgeMs) {
      degrade("partial", `STALE_BOUNDARY:${meterId}`);
      continue;
    }
    if (sampleMs(opening) < window.startMs || sampleMs(closing) < closeCapMs || contributing.some((sample) => sample.timestampQuality === "receive-time-estimated")) {
      degrade("estimated-boundary", `ESTIMATED_BOUNDARY:${meterId}`);
    }
    const delta = channelRollover && channelObserved !== null
      ? channelObserved
      : subtractDecimalString(closing.valueKwh, opening.valueKwh);
    if (!delta.startsWith("-")) total = addDecimal(total ?? "0", delta);
  }
  let freshnessState = aggregateFreshnessResults(freshnessResults).state;
  if (state.quality === "unavailable" && observed !== null) state.quality = "partial";
  if (asOfMs < window.startMs || input.meterIds.length === 0) {
    state.quality = "unavailable";
    freshnessState = "unavailable";
    total = null;
    observed = null;
  }
  const dailyCoverage = input.period.kind === "month"
    ? evaluateDailyCoverage(input.period, input.profile.siteTimeZone, input.meterIds, input.samples, input.boundaryMaxAgeSeconds)
    : undefined;
  return {
    ...resultFor(input.profile, state.quality, state.quality === "exact" || state.quality === "estimated-boundary" ? total : null),
    meterIds: [...input.meterIds].sort(),
    observedDeltaKwh: state.quality === "invalid" ? null : observed,
    dailyCoverage,
    freshness: freshnessState === "live" ? "fresh" : freshnessState === "unavailable" ? "unavailable" : "stale",
    freshnessState,
    periodStart: new Date(window.startMs).toISOString(),
    periodEnd: new Date(window.endMs).toISOString(),
    calculatedThrough: new Date(closeCapMs).toISOString(),
    baselineSampleIds,
    endSampleIds,
    boundaryOffsets,
    issues,
    calculationVersion: "e2-v3",
    provenance: {
      profileRevision: input.profile.revision,
      siteTimeZone: input.profile.siteTimeZone,
      sourceRevisions: [...sourceRevisions].sort(),
      ...(rolloverDetected ? { rollover: true } : {}),
      ...(input.reviewContext ? { reviewContext: input.reviewContext } : {})
    }
  };
}

function addDecimal(left: string, right: string) {
  return formatDecimalString(parseDecimalString(left) + parseDecimalString(right));
}
