import {
  KN_ENGINEERING_IDS,
  type KnEngineeringId
} from "./engineeringSources.js";

export interface EngineeringDailyResultItem {
  engineeringId: KnEngineeringId;
  dateStr: string; // YYYY-MM-DD
  periodStart: string;
  periodEnd: string;
  value: number | null;
  periodStatus: "preliminary" | "final" | "withdrawn";
  coverage: "complete" | "partial" | "unknown";
  quality: "valid" | "partial" | "invalid" | "unknown";
  dataRevision: number;
}

export interface PeriodAggregationOptions {
  expectedEngineeringIds?: KnEngineeringId[];
}

export interface EngineeringPeriodSummary {
  periodDays: number;
  totalKWh: number | null;
  coverage: "complete" | "partial" | "unknown";
  isComplete: boolean;
  missingEngineeringIds: KnEngineeringId[];
  itemsByEngineering: Record<KnEngineeringId, number | null>;
  sharesByEngineering: Record<KnEngineeringId, number | null>;
  zeroBasis: boolean;
}

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

export function aggregateEngineeringPeriodResults(
  results: EngineeringDailyResultItem[],
  options: PeriodAggregationOptions = {}
): EngineeringPeriodSummary {
  const expectedIds = options.expectedEngineeringIds || [...KN_ENGINEERING_IDS];
  const itemsByEngineering: Record<string, number | null> = {};
  const hasValidComplete: Record<string, boolean> = {};

  for (const id of expectedIds) {
    itemsByEngineering[id] = null;
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

  let totalKWh = 0;
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

    let engSum = 0;
    let engineeringHasObservedValue = false;
    for (const item of effectiveByDate.values()) {
      const isUsable =
        item.periodStatus === "final" &&
        item.coverage === "complete" &&
        item.quality === "valid" &&
        item.value !== null;

      if (!isUsable) {
        missingSet.add(id);
        hasValidComplete[id] = false;
      }

      if (
        item.value !== null
        && item.periodStatus !== "withdrawn"
        && item.quality !== "invalid"
        && Number.isFinite(item.value)
      ) {
        engSum += item.value;
        engineeringHasObservedValue = true;
        hasObservedValue = true;
      }
    }
    itemsByEngineering[id] = engineeringHasObservedValue ? engSum : null;
    totalKWh += engSum;
  }

  const isComplete = missingSet.size === 0;
  const coverage = isComplete ? "complete" : "partial";
  const missingEngineeringIds = Array.from(missingSet);

  const sharesByEngineering: Record<string, number | null> = {};
  const resolvedTotalKWh = hasObservedValue ? totalKWh : null;
  const zeroBasis = resolvedTotalKWh === 0;

  for (const id of expectedIds) {
    if (zeroBasis || !isComplete) {
      sharesByEngineering[id] = null;
    } else {
      sharesByEngineering[id] = (itemsByEngineering[id] ?? 0) / (resolvedTotalKWh ?? 1);
    }
  }

  return {
    periodDays: new Set(results.map((item) => item.dateStr)).size,
    totalKWh: resolvedTotalKWh,
    coverage,
    isComplete,
    missingEngineeringIds,
    itemsByEngineering: itemsByEngineering as Record<KnEngineeringId, number | null>,
    sharesByEngineering: sharesByEngineering as Record<KnEngineeringId, number | null>,
    zeroBasis
  };
}
