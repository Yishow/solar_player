import {
  KN_ENGINEERING_IDS,
  type KnEngineeringId
} from "./engineeringSources.js";
import { formatDecimalString, parseDecimalString } from "./meterReading.js";

export interface EngineeringDailyResultItem {
  engineeringId: KnEngineeringId;
  dateStr: string; // YYYY-MM-DD
  periodStart: string;
  periodEnd: string;
  value: string | number | null;
  periodStatus: "preliminary" | "final" | "withdrawn";
  coverage: "complete" | "partial" | "unknown";
  quality: "valid" | "partial" | "invalid" | "unknown";
  dataRevision: number;
}

export interface PeriodAggregationOptions {
  expectedEngineeringIds?: KnEngineeringId[];
  expectedDateStrs?: string[];
}

export interface EngineeringPeriodSummary {
  periodDays: number;
  totalKWh: number | null;
  totalKWhDecimal: string | null;
  coverage: "complete" | "partial" | "unknown";
  isComplete: boolean;
  missingEngineeringIds: KnEngineeringId[];
  itemsByEngineering: Record<KnEngineeringId, number | null>;
  itemsByEngineeringDecimal: Record<KnEngineeringId, string | null>;
  sharesByEngineering: Record<KnEngineeringId, number | null>;
  zeroBasis: boolean;
}

export type AccountingPeriodResult = {
  providerKind: "physical" | "engineering";
  periodStart: string;
  periodEnd: string;
  siteTimeZone: string;
  profileRevision: number;
  valueKwh: string | null;
  quality: "valid" | "partial" | "invalid" | "unavailable";
  coverage: "complete" | "partial" | "unknown";
  missingIdentities: string[];
  revisionFingerprint: string;
  engineeringValuesKwh?: Partial<Record<KnEngineeringId, string | null>>;
  engineeringShares?: Partial<Record<KnEngineeringId, number | null>>;
  issues?: string[];
};

export type EngineeringAccountingPeriodResultInput = {
  periodStart: string;
  periodEnd: string;
  siteTimeZone: string;
  profileRevision: number;
  revisionFingerprint: string;
  summary: EngineeringPeriodSummary;
  issues?: string[];
};

type TaipeiDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function readTaipeiDateParts(timestamp: string): TaipeiDateParts | null {
  const instant = Date.parse(timestamp);
  if (!Number.isFinite(instant)) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).formatToParts(new Date(instant));
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  ) as Partial<TaipeiDateParts>;

  if (
    !Number.isInteger(values.year)
    || !Number.isInteger(values.month)
    || !Number.isInteger(values.day)
    || !Number.isInteger(values.hour)
    || !Number.isInteger(values.minute)
    || !Number.isInteger(values.second)
  ) {
    return null;
  }

  return values as TaipeiDateParts;
}

/** Returns true only for one complete half-open local day in Asia/Taipei. */
export function isTaipeiLocalDayInterval(periodStart: string, periodEnd: string): boolean {
  const start = readTaipeiDateParts(periodStart);
  const end = readTaipeiDateParts(periodEnd);
  if (!start || !end) {
    return false;
  }

  if (
    start.hour !== 0 || start.minute !== 0 || start.second !== 0
    || end.hour !== 0 || end.minute !== 0 || end.second !== 0
  ) {
    return false;
  }

  const startDate = Date.UTC(start.year, start.month - 1, start.day);
  const endDate = Date.UTC(end.year, end.month - 1, end.day);
  return endDate - startDate === 24 * 60 * 60 * 1000
    && Date.parse(periodEnd) - Date.parse(periodStart) === 24 * 60 * 60 * 1000;
}

function parseEngineeringValue(value: EngineeringDailyResultItem["value"]): bigint | null {
  if (value === null || (typeof value === "number" && !Number.isFinite(value))) {
    return null;
  }
  try {
    return parseDecimalString(String(value));
  } catch {
    return null;
  }
}

export function aggregateEngineeringPeriodResults(
  results: EngineeringDailyResultItem[],
  options: PeriodAggregationOptions = {}
): EngineeringPeriodSummary {
  const requestedIds = new Set(options.expectedEngineeringIds || [...KN_ENGINEERING_IDS]);
  const expectedIds = KN_ENGINEERING_IDS.filter((id) => requestedIds.has(id));
  const expectedDateStrs = options.expectedDateStrs === undefined
    ? undefined
    : [...new Set(options.expectedDateStrs)].sort();
  const itemsByEngineering: Record<string, number | null> = {};
  const itemsByEngineeringDecimal: Record<string, string | null> = {};
  const hasValidComplete: Record<string, boolean> = {};

  for (const id of expectedIds) {
    itemsByEngineering[id] = null;
    itemsByEngineeringDecimal[id] = null;
    hasValidComplete[id] = true;
  }

  const missingSet = new Set<KnEngineeringId>();

  // Group by engineeringId
  const byId = new Map<KnEngineeringId, EngineeringDailyResultItem[]>();
  for (const r of results) {
    if (!byId.has(r.engineeringId)) {
      byId.set(r.engineeringId, []);
    }
    byId.get(r.engineeringId)!.push(r);
  }

  let totalKWhDecimal = 0n;
  let hasObservedValue = false;

  for (const id of expectedIds) {
    const list = byId.get(id) || [];
    if (list.length === 0) {
      missingSet.add(id);
      hasValidComplete[id] = false;
      continue;
    }

    // A report revision replaces the earlier result for the same engineering day.
    const effectiveByDate = new Map<string, EngineeringDailyResultItem>();
    for (const item of list) {
      const current = effectiveByDate.get(item.dateStr);
      if (!current || item.dataRevision > current.dataRevision) {
        effectiveByDate.set(item.dateStr, item);
      }
    }

    let engSumDecimal = 0n;
    let engineeringHasObservedValue = false;
    const effectiveItems = expectedDateStrs !== undefined && expectedDateStrs.length > 0
      ? expectedDateStrs.map((dateStr) => effectiveByDate.get(dateStr)).filter(
        (item): item is EngineeringDailyResultItem => item !== undefined
      )
      : [...effectiveByDate.values()];
    if (expectedDateStrs !== undefined && expectedDateStrs.length > 0) {
      for (const dateStr of expectedDateStrs) {
        if (!effectiveByDate.has(dateStr)) {
          missingSet.add(id);
          hasValidComplete[id] = false;
        }
      }
    }
    for (const item of effectiveItems) {
      const decimalValue = parseEngineeringValue(item.value);
      const isUsable =
        item.periodStatus === "final" &&
        item.coverage === "complete" &&
        item.quality === "valid" &&
        decimalValue !== null;

      if (!isUsable) {
        missingSet.add(id);
        hasValidComplete[id] = false;
      }

      if (
        decimalValue !== null
        && item.periodStatus !== "withdrawn"
        && item.quality !== "invalid"
      ) {
        engSumDecimal += decimalValue;
        engineeringHasObservedValue = true;
        hasObservedValue = true;
      }
    }
    const engineeringValueDecimal = engineeringHasObservedValue
      ? formatDecimalString(engSumDecimal)
      : null;
    itemsByEngineeringDecimal[id] = engineeringValueDecimal;
    itemsByEngineering[id] = engineeringValueDecimal === null ? null : Number(engineeringValueDecimal);
    totalKWhDecimal += engSumDecimal;
  }

  const isComplete = missingSet.size === 0;
  const coverage = isComplete ? "complete" : "partial";
  const missingEngineeringIds = Array.from(missingSet);

  const sharesByEngineering: Record<string, number | null> = {};
  const resolvedTotalKWhDecimal = hasObservedValue ? formatDecimalString(totalKWhDecimal) : null;
  const resolvedTotalKWh = resolvedTotalKWhDecimal === null ? null : Number(resolvedTotalKWhDecimal);
  const zeroBasis = resolvedTotalKWhDecimal === "0";

  for (const id of expectedIds) {
    if (zeroBasis || !isComplete) {
      sharesByEngineering[id] = null;
    } else {
      const engineeringValueDecimal = itemsByEngineeringDecimal[id];
      sharesByEngineering[id] = engineeringValueDecimal === null || resolvedTotalKWhDecimal === null
        ? null
        : Number(engineeringValueDecimal) / Number(resolvedTotalKWhDecimal);
    }
  }

  return {
    periodDays: expectedDateStrs !== undefined && expectedDateStrs.length > 0
      ? expectedDateStrs.length
      : new Set(results.map((item) => item.dateStr)).size,
    totalKWh: resolvedTotalKWh,
    totalKWhDecimal: resolvedTotalKWhDecimal,
    coverage,
    isComplete,
    missingEngineeringIds,
    itemsByEngineering: itemsByEngineering as Record<KnEngineeringId, number | null>,
    itemsByEngineeringDecimal: itemsByEngineeringDecimal as Record<KnEngineeringId, string | null>,
    sharesByEngineering: sharesByEngineering as Record<KnEngineeringId, number | null>,
    zeroBasis
  };
}

export function toEngineeringAccountingPeriodResult(
  input: EngineeringAccountingPeriodResultInput
): AccountingPeriodResult {
  const { summary } = input;
  const hasUsableValue = summary.totalKWhDecimal !== null;
  const missingIdentities = [...summary.missingEngineeringIds];
  const issues = [
    ...(input.issues ?? []),
    ...missingIdentities.map((engineeringId) => `MISSING_ENGINEERING_IDENTITY:${engineeringId}`)
  ];
  return {
    providerKind: "engineering",
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    siteTimeZone: input.siteTimeZone,
    profileRevision: input.profileRevision,
    valueKwh: summary.totalKWhDecimal,
    quality: hasUsableValue ? (summary.isComplete ? "valid" : "partial") : "unavailable",
    coverage: hasUsableValue ? (summary.isComplete ? "complete" : "partial") : "unknown",
    missingIdentities,
    revisionFingerprint: input.revisionFingerprint,
    engineeringValuesKwh: { ...summary.itemsByEngineeringDecimal },
    engineeringShares: { ...summary.sharesByEngineering },
    ...(issues.length > 0 ? { issues: [...new Set(issues)] } : {})
  };
}
