import { createHash } from "node:crypto";
import type Database from "better-sqlite3";
import {
  KN_ENGINEERING_IDS,
  aggregateEngineeringPeriodResults,
  isKnEngineeringId,
  toEngineeringAccountingPeriodResult,
  type AccountingPeriodResult,
  type EngineeringDailyResultItem,
  type EngineeringPeriodSummary,
  type KnEngineeringId
} from "@solar-display/shared";
import { getEffectiveEngineeringEnergySource } from "./engineeringSourceService.js";

export interface EngineeringPeriodResult {
  periodStart: string;
  periodEnd: string;
  results: EngineeringDailyResultItem[];
  revisionFingerprint: string;
  summary: EngineeringPeriodSummary;
}

export function taipeiDateKey(timestamp: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(timestamp));
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${read("year")}-${read("month")}-${read("day")}`;
}

export function requestedTaipeiDateStrs(periodStart: string, periodEnd: string): string[] {
  const startMs = Date.parse(periodStart);
  const endMs = Date.parse(periodEnd);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return [];
  }
  const startKey = taipeiDateKey(new Date(startMs).toISOString());
  const endKey = taipeiDateKey(new Date(endMs - 1).toISOString());
  const startValues = startKey.split("-").map(Number);
  const endValues = endKey.split("-").map(Number);
  if (startValues.length !== 3 || endValues.length !== 3
    || startValues.some((value) => !Number.isInteger(value))
    || endValues.some((value) => !Number.isInteger(value))) {
    return [];
  }
  const [startYear, startMonth, startDay] = startValues as [number, number, number];
  const [endYear, endMonth, endDay] = endValues as [number, number, number];
  const cursorStart = Date.UTC(startYear, startMonth - 1, startDay);
  const cursorEnd = Date.UTC(endYear, endMonth - 1, endDay);
  if (!Number.isFinite(cursorStart) || !Number.isFinite(cursorEnd) || cursorEnd < cursorStart) {
    return [];
  }
  const dates: string[] = [];
  for (let cursor = cursorStart; cursor <= cursorEnd; cursor += 24 * 60 * 60 * 1000) {
    const date = new Date(cursor);
    dates.push(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`);
  }
  return dates;
}

export type EffectiveEngineeringReportRow = {
  engineeringId: string;
  periodStart: string;
  periodEnd: string;
  dataRevision: number;
  periodStatus: EngineeringDailyResultItem["periodStatus"];
  coverage: EngineeringDailyResultItem["coverage"];
  quality: EngineeringDailyResultItem["quality"];
  value: string | null;
  contentDigest: string;
};

export type EngineeringRegistrationEvidence = {
  engineeringId: string;
  sourceRef: string | null;
  mode: string | null;
  configurationRevision: number | null;
  definitionRevision: number | null;
  calendarRevision: number | null;
  approvedPublisherId: string | null;
  enabled: boolean | null;
  reviewStatus: string | null;
};

export function readEffectiveEngineeringReportRows(
  db: Database.Database,
  periodStart: string,
  periodEnd: string
): EffectiveEngineeringReportRow[] {
  const rows = db
    .prepare(
      `SELECT revision.engineering_id,
              revision.period_start,
              revision.period_end,
              revision.data_revision,
              revision.period_status,
              revision.coverage,
              revision.quality,
              revision.value,
              revision.content_digest
       FROM engineering_report_heads AS head
       JOIN engineering_report_revisions AS revision
         ON revision.id = head.current_revision_id
        AND revision.site = head.site
        AND revision.engineering_id = head.engineering_id
        AND revision.measurement_kind = head.measurement_kind
        AND revision.period_start = head.period_start
        AND revision.period_end = head.period_end
       WHERE head.site = 'kn'
         AND head.measurement_kind = 'interval-energy'
         AND head.period_start >= ?
         AND head.period_end <= ?`
    )
    .all(periodStart, periodEnd) as Array<Record<string, unknown>>;

  return rows.map((row) => ({
    engineeringId: String(row.engineering_id),
    periodStart: String(row.period_start),
    periodEnd: String(row.period_end),
    dataRevision: Number(row.data_revision),
    periodStatus: row.period_status as EffectiveEngineeringReportRow["periodStatus"],
    coverage: row.coverage as EffectiveEngineeringReportRow["coverage"],
    quality: row.quality as EffectiveEngineeringReportRow["quality"],
    value: row.value === null || row.value === undefined ? null : String(row.value),
    contentDigest: String(row.content_digest)
  }));
}

export function readEngineeringRegistrationEvidence(
  db: Database.Database,
  expectedEngineeringIds: readonly KnEngineeringId[]
): EngineeringRegistrationEvidence[] {
  const ids = [...new Set(expectedEngineeringIds)];
  if (ids.length === 0) return [];
  return ids.map((engineeringId) => {
    const source = getEffectiveEngineeringEnergySource(db, engineeringId);
    return source
      ? {
        engineeringId,
        sourceRef: source.sourceRef,
        mode: source.mode,
        configurationRevision: source.configurationRevision,
        definitionRevision: source.definitionRevision,
        calendarRevision: source.calendarRevision,
        approvedPublisherId: source.approvedPublisherId,
        enabled: source.enabled,
        reviewStatus: source.reviewStatus
      }
      : {
        engineeringId,
        sourceRef: null,
        mode: null,
        configurationRevision: null,
        definitionRevision: null,
        calendarRevision: null,
        approvedPublisherId: null,
        enabled: null,
        reviewStatus: null
      };
  });
}

function compareEngineeringHead(left: EffectiveEngineeringReportRow, right: EffectiveEngineeringReportRow): number {
  const leftKey = [left.engineeringId, left.periodStart, left.periodEnd, left.dataRevision, left.contentDigest]
    .map(String)
    .join("|");
  const rightKey = [right.engineeringId, right.periodStart, right.periodEnd, right.dataRevision, right.contentDigest]
    .map(String)
    .join("|");
  return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
}

function compareEngineeringRegistration(
  left: EngineeringRegistrationEvidence,
  right: EngineeringRegistrationEvidence
): number {
  return left.engineeringId < right.engineeringId ? -1 : left.engineeringId > right.engineeringId ? 1 : 0;
}

function readEngineeringPeriodEvidence(
  db: Database.Database,
  params: {
    periodStart: string;
    periodEnd: string;
    expectedEngineeringIds?: readonly KnEngineeringId[];
  }
) {
  const expectedEngineeringIds = params.expectedEngineeringIds ?? [...KN_ENGINEERING_IDS];
  const expectedSet = new Set(expectedEngineeringIds);
  return {
    expectedEngineeringIds,
    heads: readEffectiveEngineeringReportRows(db, params.periodStart, params.periodEnd)
      .filter((head) => expectedSet.has(head.engineeringId as KnEngineeringId)),
    registrations: readEngineeringRegistrationEvidence(db, expectedEngineeringIds)
  };
}

function buildEngineeringPeriodFingerprint(input: {
  periodStart: string;
  periodEnd: string;
  profileRevision: number;
  heads: EffectiveEngineeringReportRow[];
  registrations: EngineeringRegistrationEvidence[];
}): string {
  const canonical = {
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    profileRevision: input.profileRevision,
    registrations: [...input.registrations].sort(compareEngineeringRegistration).map((registration) => ({
      engineeringId: registration.engineeringId,
      sourceRef: registration.sourceRef,
      mode: registration.mode,
      configurationRevision: registration.configurationRevision,
      definitionRevision: registration.definitionRevision,
      calendarRevision: registration.calendarRevision,
      approvedPublisherId: registration.approvedPublisherId,
      enabled: registration.enabled,
      reviewStatus: registration.reviewStatus
    })),
    heads: [...input.heads].sort(compareEngineeringHead).map((head) => ({
      site: "kn",
      engineeringId: head.engineeringId,
      measurementKind: "interval-energy",
      periodStart: head.periodStart,
      periodEnd: head.periodEnd,
      dataRevision: head.dataRevision,
      periodStatus: head.periodStatus,
      coverage: head.coverage,
      quality: head.quality,
      contentDigest: head.contentDigest
    }))
  };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

export function computeEngineeringPeriodFingerprint(
  db: Database.Database,
  params: {
    periodStart: string;
    periodEnd: string;
    profileRevision?: number;
    expectedEngineeringIds?: readonly KnEngineeringId[];
  }
): string {
  const evidence = readEngineeringPeriodEvidence(db, params);
  return buildEngineeringPeriodFingerprint({
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
    profileRevision: params.profileRevision ?? 0,
    heads: evidence.heads,
    registrations: evidence.registrations
  });
}

export function readEngineeringPeriodResult(
  db: Database.Database,
  params: {
    periodStart: string;
    periodEnd: string;
    profileRevision?: number;
    expectedEngineeringIds?: readonly KnEngineeringId[];
  }
): EngineeringPeriodResult {
  const evidence = readEngineeringPeriodEvidence(db, params);
  const expectedDateStrs = requestedTaipeiDateStrs(params.periodStart, params.periodEnd);

  const results = evidence.heads
    .sort(compareEngineeringHead)
    .flatMap((row): EngineeringDailyResultItem[] => {
    const engineeringId = row.engineeringId;
    if (!isKnEngineeringId(engineeringId)) {
      return [];
    }
    return [{
      engineeringId,
      dateStr: taipeiDateKey(row.periodStart),
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      value: row.value,
      periodStatus: row.periodStatus,
      coverage: row.coverage,
      quality: row.quality,
      dataRevision: row.dataRevision
    }];
  });

  return {
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
    results,
    revisionFingerprint: buildEngineeringPeriodFingerprint({
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      profileRevision: params.profileRevision ?? 0,
      heads: evidence.heads,
      registrations: evidence.registrations
    }),
    summary: aggregateEngineeringPeriodResults(results, {
      expectedDateStrs,
      expectedEngineeringIds: [...evidence.expectedEngineeringIds]
    })
  };
}

export function adaptEngineeringPeriodResult(
  period: EngineeringPeriodResult,
  input: { siteTimeZone: string; profileRevision: number }
): AccountingPeriodResult {
  const issues = new Set<string>();
  for (const item of period.results) {
    if (item.periodStatus === "withdrawn") {
      issues.add(`WITHDRAWN_ENGINEERING_IDENTITY:${item.engineeringId}`);
    }
    if (item.quality === "invalid") {
      issues.add(`INVALID_ENGINEERING_IDENTITY:${item.engineeringId}`);
    }
    if (item.coverage !== "complete") {
      issues.add(`PARTIAL_ENGINEERING_IDENTITY:${item.engineeringId}`);
    }
  }
  return toEngineeringAccountingPeriodResult({
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    profileRevision: input.profileRevision,
    revisionFingerprint: period.revisionFingerprint,
    siteTimeZone: input.siteTimeZone,
    summary: period.summary,
    issues: [...issues].sort()
  });
}

export function readEngineeringAccountingPeriodResult(
  db: Database.Database,
  params: {
    periodStart: string;
    periodEnd: string;
    siteTimeZone: string;
    profileRevision: number;
    expectedEngineeringIds?: readonly KnEngineeringId[];
  }
): AccountingPeriodResult {
  return adaptEngineeringPeriodResult(readEngineeringPeriodResult(db, params), params);
}
