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

/**
 * A window the server has already resolved against the site's own calendar for a range that is not
 * one calendar period — the recent-seven-date week and the supported accounting total. It is not a
 * caller-supplied start/end override: `resolveAccountingSpanConsumption` is the only entry point
 * that accepts it, and it still refuses the public timeZone/start/end fields that E6 forbids.
 */
export type AccountingSpan = {
  endMs: number;
  kind: "span";
  spanOf: "week" | "total";
  startMs: number;
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

// Civil-to-UTC resolution scans candidate offsets through Intl, so a long range would repeat the
// same expensive boundary work for every profile and every daily window. The mapping is pure, so
// memoise it per (period, zone) and drop the whole index once it grows past a bounded size.
const periodWindowCache = new Map<string, { endMs: number; startMs: number }>();
const PERIOD_WINDOW_CACHE_LIMIT = 4096;

export function periodWindow(period: PeriodSelection, siteTimeZone: string) {
  const cacheKey = `${period.kind}|${period.year}|${period.month ?? ""}|${period.day ?? ""}|${siteTimeZone}`;
  const cached = periodWindowCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const window = Object.freeze(computePeriodWindow(period, siteTimeZone));
  if (periodWindowCache.size >= PERIOD_WINDOW_CACHE_LIMIT) {
    periodWindowCache.clear();
  }
  periodWindowCache.set(cacheKey, window);
  return window;
}

function computePeriodWindow(period: PeriodSelection, siteTimeZone: string) {
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

type PeriodEvaluationContext = {
  boundaryMaxAgeSeconds?: number;
  definitionMap: Map<string, DefinitionRevisionItem>;
  freshnessPolicy: FreshnessPolicy;
  meterIds: string[];
  normalizedModulus: Map<string, bigint>;
  samplesByChannel: Map<string, PeriodSample[]>;
};

type PeriodEvaluation = {
  baselineSampleIds: string[];
  boundaryOffsets: NonNullable<PeriodConsumptionResult["boundaryOffsets"]>;
  endSampleIds: string[];
  freshnessResults: Array<{ metricKey: string; freshness: FreshnessResult }>;
  issues: string[];
  observed: string | null;
  quality: PeriodConsumptionQuality;
  rolloverDetected: boolean;
  sourceRevisions: Set<string>;
  total: string | null;
};

/**
 * A long range asks for the same channel index once per date, and building it is O(n log n) in the
 * whole accepted-sample set — so a year of hourly readings paid that cost 365 times. The mapping is
 * a pure function of the sample array, the meter set and the as-of cap, so memoise it against the
 * array itself; a WeakMap keeps the index alive no longer than the samples it describes. Callers
 * must not mutate a sample array after handing it over, which is already true of every caller.
 */
const sampleIndexCache = new WeakMap<PeriodSample[], Map<string, Map<string, PeriodSample[]>>>();

function indexSamplesByChannel(
  samples: PeriodSample[],
  meterIds: string[],
  asOfMs: number,
  excludeReceivedAfterAsOf: boolean
) {
  const cacheKey = `${asOfMs}|${excludeReceivedAfterAsOf}|${meterIds.join("\u0000")}`;
  let byInputs = sampleIndexCache.get(samples);
  if (!byInputs) {
    byInputs = new Map();
    sampleIndexCache.set(samples, byInputs);
  }
  const cached = byInputs.get(cacheKey);
  if (cached) {
    return cached;
  }
  const index = buildSampleIndex(samples, meterIds, asOfMs, excludeReceivedAfterAsOf);
  byInputs.set(cacheKey, index);
  return index;
}

/**
 * One channel-keyed, instant-sorted index, built once per request and reused by the period total
 * and by every daily window. Sorting here also makes the result independent of input ordering.
 */
function buildSampleIndex(
  samples: PeriodSample[],
  meterIds: string[],
  asOfMs: number,
  excludeReceivedAfterAsOf: boolean
) {
  const index = new Map<string, PeriodSample[]>();
  for (const meterId of meterIds) {
    if (!index.has(meterId)) {
      index.set(meterId, sortByInstant(samples.filter((sample) => {
        if (sample.channelId !== meterId || !excludeReceivedAfterAsOf || sample.receivedAt === undefined) {
          return sample.channelId === meterId;
        }
        const receivedAtMs = Date.parse(sample.receivedAt);
        return Number.isFinite(receivedAtMs) && receivedAtMs <= asOfMs;
      })));
    }
  }
  return index;
}

/**
 * The single admissibility and delta calculation for one window. Daily coverage calls it with a
 * day window so a counted day obeys exactly the boundary-age, identity, revision, epoch,
 * measurement-kind, reset and as-of rules that its own daily consumption calculation obeys.
 */
function evaluatePeriod(
  context: PeriodEvaluationContext,
  window: { endMs: number; startMs: number },
  asOfMs: number
): PeriodEvaluation {
  const closeCapMs = Math.min(window.endMs, asOfMs);
  const issues: string[] = [];
  const baselineSampleIds: string[] = [];
  const endSampleIds: string[] = [];
  const boundaryOffsets: NonNullable<PeriodConsumptionResult["boundaryOffsets"]> = [];
  const sourceRevisions = new Set<string>();
  const freshnessResults: Array<{ metricKey: string; freshness: FreshnessResult }> = [];
  let total: string | null = null;
  let observed: string | null = null;
  let rolloverDetected = false;
  const state: { quality: PeriodConsumptionQuality } = { quality: "exact" };
  const degrade = (next: PeriodConsumptionQuality, issue: string) => {
    const ranks = { exact: 0, "estimated-boundary": 1, unavailable: 2, partial: 3, invalid: 4 };
    if (ranks[next] > ranks[state.quality]) state.quality = next;
    issues.push(issue);
  };
  for (const meterId of context.meterIds) {
    const series = (context.samplesByChannel.get(meterId) ?? []).filter((sample) => sampleMs(sample) <= closeCapMs);
    const closing = lastAtOrBefore(series, closeCapMs);
    freshnessResults.push({ metricKey: meterId, freshness: evaluateFreshness({
      category: "cumulative", policy: context.freshnessPolicy, nowMs: asOfMs,
      sourceTimestamp: closing?.sourceTimestamp ?? null
    }) });
    if (!closing) {
      degrade("unavailable", `MISSING_OBSERVATIONS:${meterId}`);
      continue;
    }
    const maxAgeMs = resolveBoundaryMaxAgeMs(closing, context.boundaryMaxAgeSeconds);
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
    const canContribute = (s: PeriodSample) => sampleMs(s) >= window.startMs || (s === opening && window.startMs - sampleMs(s) <= resolveBoundaryMaxAgeMs(s, context.boundaryMaxAgeSeconds));
    const def = context.definitionMap.get(meterId);
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
            : context.normalizedModulus.get(meterId) ?? 0n;
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
    if (window.startMs - sampleMs(opening) > resolveBoundaryMaxAgeMs(opening, context.boundaryMaxAgeSeconds) || closeCapMs - sampleMs(closing) > maxAgeMs) {
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
  return {
    baselineSampleIds,
    boundaryOffsets,
    endSampleIds,
    freshnessResults,
    issues,
    observed,
    quality: state.quality,
    rolloverDetected,
    sourceRevisions,
    total
  };
}

/**
 * A day counts toward coveredDays only when its own window has completed no later than asOf and
 * the shared evaluation can return a usable daily delta for it. totalDays keeps describing the
 * calendar month, so a known month total and an incomplete daily allocation stay independent.
 */
function evaluateDailyCoverage(
  context: PeriodEvaluationContext,
  period: PeriodSelection,
  siteTimeZone: string,
  asOfMs: number
): DailyCoverage {
  const month = period.month ?? 1;
  const daysInMonth = new Date(Date.UTC(period.year, month, 0)).getUTCDate();
  let coveredDays = 0;
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dayWindow = periodWindow({ day, kind: "day", month, year: period.year }, siteTimeZone);
    if (dayWindow.endMs > asOfMs) {
      continue;
    }
    const evaluation = evaluatePeriod(context, dayWindow, asOfMs);
    if (evaluation.total !== null && (evaluation.quality === "exact" || evaluation.quality === "estimated-boundary")) {
      coveredDays += 1;
    }
  }
  return { coveredDays, isComplete: coveredDays === daysInMonth, totalDays: daysInMonth };
}

function resultFor(profile: SiteEnergyProfileV1, quality: PeriodConsumptionQuality, valueKwh: string | null): PeriodConsumptionResult {
  return { profileRevision: profile.revision, quality, siteTimeZone: profile.siteTimeZone, valueKwh };
}

type PeriodConsumptionInput = {
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
};

type SpanConsumptionInput = Omit<PeriodConsumptionInput, "period"> & {
  accountingContext: "server-authorized-range";
  span: AccountingSpan;
};

function resolvePeriodConsumptionCore(
  input: Omit<PeriodConsumptionInput, "period">,
  window: { endMs: number; startMs: number },
  dailyCoveragePeriod: PeriodSelection | null,
  allowDraftRevision: boolean
): PeriodConsumptionResult {
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
  if (!allowDraftRevision && input.profile.revision < 1) {
    throw Object.assign(new Error("UNKNOWN_PROFILE_REVISION"), { code: "UNKNOWN_PROFILE_REVISION" });
  }
  if (allowDraftRevision && input.reviewContext !== "profile-draft") {
    throw Object.assign(new Error("INVALID_REVIEW_CONTEXT"), { code: "INVALID_REVIEW_CONTEXT" });
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
  const closeCapMs = Math.min(window.endMs, asOfMs);
  const context: PeriodEvaluationContext = {
    boundaryMaxAgeSeconds: input.boundaryMaxAgeSeconds,
    definitionMap,
    freshnessPolicy: input.freshnessPolicy ?? createDefaultFreshnessPolicy(),
    meterIds: input.meterIds,
    normalizedModulus,
    samplesByChannel: indexSamplesByChannel(input.samples, input.meterIds, asOfMs, allowDraftRevision)
  };
  const evaluation = evaluatePeriod(context, window, asOfMs);
  let quality = evaluation.quality;
  let total = evaluation.total;
  let observed = evaluation.observed;
  let freshnessState = aggregateFreshnessResults(evaluation.freshnessResults).state;
  if (quality === "unavailable" && observed !== null) quality = "partial";
  if (asOfMs < window.startMs || input.meterIds.length === 0) {
    quality = "unavailable";
    freshnessState = "unavailable";
    total = null;
    observed = null;
  }
  const dailyCoverage = dailyCoveragePeriod
    ? evaluateDailyCoverage(context, dailyCoveragePeriod, input.profile.siteTimeZone, asOfMs)
    : undefined;
  return {
    ...resultFor(input.profile, quality, quality === "exact" || quality === "estimated-boundary" ? total : null),
    meterIds: [...input.meterIds].sort(),
    observedDeltaKwh: quality === "invalid" ? null : observed,
    dailyCoverage,
    freshness: freshnessState === "live" ? "fresh" : freshnessState === "unavailable" ? "unavailable" : "stale",
    freshnessState,
    periodStart: new Date(window.startMs).toISOString(),
    periodEnd: new Date(window.endMs).toISOString(),
    calculatedThrough: new Date(closeCapMs).toISOString(),
    baselineSampleIds: evaluation.baselineSampleIds,
    endSampleIds: evaluation.endSampleIds,
    boundaryOffsets: evaluation.boundaryOffsets,
    issues: evaluation.issues,
    calculationVersion: "e2-v4",
    provenance: {
      profileRevision: input.profile.revision,
      siteTimeZone: input.profile.siteTimeZone,
      sourceRevisions: [...evaluation.sourceRevisions].sort(),
      ...(evaluation.rolloverDetected ? { rollover: true } : {}),
      ...(input.reviewContext ? { reviewContext: input.reviewContext } : {})
    }
  };
}

function calendarWindowOf(input: PeriodConsumptionInput) {
  return periodWindow(input.period, input.profile.siteTimeZone);
}

export function resolvePeriodConsumption(input: PeriodConsumptionInput): PeriodConsumptionResult {
  return resolvePeriodConsumptionCore(input, calendarWindowOf(input), input.period.kind === "month" ? input.period : null, false);
}

export function resolveReviewPeriodConsumption(
  input: PeriodConsumptionInput & { reviewContext: "profile-draft" }
): PeriodConsumptionResult {
  return resolvePeriodConsumptionCore(input, calendarWindowOf(input), input.period.kind === "month" ? input.period : null, true);
}

/**
 * The internal seam for server-authorized week and total windows. Every admissibility rule — meter
 * membership, boundary age, source identity, revision, epoch, rollover, as-of capping and quality
 * degradation — is the shared one; only the window's origin differs, and only a verified internal
 * accounting context may supply it.
 */
export function resolveAccountingSpanConsumption(input: SpanConsumptionInput): PeriodConsumptionResult {
  if (input.accountingContext !== "server-authorized-range") {
    throw Object.assign(new Error("INVALID_ACCOUNTING_CONTEXT"), { code: "INVALID_ACCOUNTING_CONTEXT" });
  }
  if (!Number.isFinite(input.span.startMs) || !Number.isFinite(input.span.endMs) || input.span.endMs <= input.span.startMs) {
    throw Object.assign(new Error("PERIOD_BOUNDARY_INVALID"), { code: "PERIOD_BOUNDARY_INVALID" });
  }
  return resolvePeriodConsumptionCore(input, { endMs: input.span.endMs, startMs: input.span.startMs }, null, false);
}

function addDecimal(left: string, right: string) {
  return formatDecimalString(parseDecimalString(left) + parseDecimalString(right));
}
