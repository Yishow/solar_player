import { createHash } from "node:crypto";
import type Database from "better-sqlite3";
import {
  KN_ENGINEERING_IDS,
  aggregateEngineeringPeriodResults,
  isKnEngineeringId,
  validateEngineeringPacket,
  type EngineeringDailyResultItem,
  type EngineeringDailyPacket,
  type EngineeringPeriodSummary,
  type KnEngineeringId
} from "@solar-display/shared";
import { getEffectiveEngineeringEnergySource } from "./engineeringSourceService.js";

export interface ReportAdmissionOutcome {
  accepted: boolean;
  status: "accepted" | "duplicate" | "conflict" | "rejected";
  dataRevision?: number;
  message?: string;
  code?: string;
}

export interface BatchImportOptions {
  explicitApprovalForOldReplay?: boolean;
}

export interface EngineeringPeriodResult {
  periodStart: string;
  periodEnd: string;
  results: EngineeringDailyResultItem[];
  summary: EngineeringPeriodSummary;
}

function taipeiDateKey(timestamp: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(timestamp));
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${read("year")}-${read("month")}-${read("day")}`;
}

export function readEngineeringPeriodResult(
  db: Database.Database,
  params: {
    periodStart: string;
    periodEnd: string;
    expectedEngineeringIds?: KnEngineeringId[];
  }
): EngineeringPeriodResult {
  const expectedEngineeringIds = params.expectedEngineeringIds ?? [...KN_ENGINEERING_IDS];
  const expectedSet = new Set(expectedEngineeringIds);
  const rows = db
    .prepare(
      `SELECT engineering_id, period_start, period_end, current_data_revision,
              period_status, coverage, quality, value
       FROM engineering_report_heads
       WHERE site = 'kn' AND measurement_kind = 'interval-energy'
         AND period_start >= ? AND period_end <= ?`
    )
    .all(params.periodStart, params.periodEnd) as Array<Record<string, unknown>>;

  const results = rows.flatMap((row): EngineeringDailyResultItem[] => {
    const engineeringId = row.engineering_id;
    if (!isKnEngineeringId(engineeringId) || !expectedSet.has(engineeringId)) {
      return [];
    }
    const value = row.value === null || row.value === undefined ? null : Number(row.value);
    return [{
      engineeringId,
      dateStr: taipeiDateKey(String(row.period_start)),
      periodStart: String(row.period_start),
      periodEnd: String(row.period_end),
      value: value === null || Number.isFinite(value) ? value : null,
      periodStatus: row.period_status as EngineeringDailyResultItem["periodStatus"],
      coverage: row.coverage as EngineeringDailyResultItem["coverage"],
      quality: row.quality as EngineeringDailyResultItem["quality"],
      dataRevision: Number(row.current_data_revision)
    }];
  });

  return {
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
    results,
    summary: aggregateEngineeringPeriodResults(results, { expectedEngineeringIds })
  };
}

export function computeReportDigest(packet: EngineeringDailyPacket): string {
  const normValue = packet.value === null ? "null" : String(packet.value);
  const raw = [
    packet.site,
    packet.engineeringId,
    packet.measurementKind,
    packet.periodStart,
    packet.periodEnd,
    normValue,
    packet.unit,
    packet.periodStatus,
    packet.coverage,
    packet.quality,
    packet.definitionRevision,
    packet.calendarRevision || 1,
    packet.reason || ""
  ].join("|");
  return createHash("sha256").update(raw).digest("hex");
}

export function admitDailyEngineeringReport(
  db: Database.Database,
  packet: EngineeringDailyPacket,
  options: { isProduction: boolean; allowReplayWindowBypass?: boolean } = { isProduction: true }
): ReportAdmissionOutcome {
  const engineeringId = packet && typeof packet === "object"
    ? (packet as { engineeringId?: unknown }).engineeringId
    : null;
  const registration = isKnEngineeringId(engineeringId)
    ? getEffectiveEngineeringEnergySource(db, engineeringId)
    : null;
  if (!registration) {
    return {
      accepted: false,
      status: "rejected",
      message: "No approved enabled engineering registration exists for this report",
      code: "UNREGISTERED_SOURCE"
    };
  }

  const gateRes = validateEngineeringPacket(packet, {
    isProduction: options.isProduction,
    expectedRegistration: registration
  });
  if (!gateRes.accepted || !gateRes.packet || gateRes.packet.measurementKind !== "interval-energy") {
    return {
      accepted: false,
      status: "rejected",
      message: gateRes.rejectionReason || "Packet rejected by engineering gate",
      code: gateRes.rejectionCode || "GATE_REJECTED"
    };
  }

  const daily = gateRes.packet as EngineeringDailyPacket;
  const startMs = Date.parse(daily.periodStart);
  const nowMs = Date.now();

  // Check the registration's bounded replay window.
  const replayWindowMs = Math.max(registration.replayWindowDays, 0) * 24 * 60 * 60 * 1000;
  if (!options.allowReplayWindowBypass && nowMs - startMs > replayWindowMs) {
    return {
      accepted: false,
      status: "rejected",
      message: "Report date exceeds the registered replay window without explicit approval",
      code: "WINDOW_EXCEEDED"
    };
  }

  // Reject future periods claiming final status
  const endMs = Date.parse(daily.periodEnd);
  if (endMs > nowMs && daily.periodStatus === "final") {
    return {
      accepted: false,
      status: "rejected",
      message: "Cannot admit future period with final status",
      code: "FUTURE_FINAL_FORBIDDEN"
    };
  }

  const digest = computeReportDigest(daily);

  return db.transaction((): ReportAdmissionOutcome => {
    // Check current head for this business key
    const head = db
      .prepare(
        `SELECT * FROM engineering_report_heads
         WHERE site = ? AND engineering_id = ? AND measurement_kind = ? AND period_start = ? AND period_end = ?`
      )
      .get(daily.site, daily.engineeringId, daily.measurementKind, daily.periodStart, daily.periodEnd) as any;

    if (head) {
      if (daily.dataRevision === head.current_data_revision) {
        // Read the current revision row to compare digest
        const currentRev = db
          .prepare("SELECT content_digest FROM engineering_report_revisions WHERE id = ?")
          .get(head.current_revision_id) as any;

        if (currentRev && currentRev.content_digest === digest) {
          // Idempotent repeat
          return { accepted: true, status: "duplicate", dataRevision: daily.dataRevision };
        } else {
          // Conflict: same revision, contradictory content
          return {
            accepted: false,
            status: "conflict",
            dataRevision: daily.dataRevision,
            message: `Conflict: revision ${daily.dataRevision} already committed with different content`,
            code: "REVISION_CONFLICT"
          };
        }
      } else if (daily.dataRevision < head.current_data_revision) {
        // Lower revision cannot rewind current state
        return {
          accepted: false,
          status: "rejected",
          dataRevision: daily.dataRevision,
          message: `Stale revision ${daily.dataRevision} rejected because head is at ${head.current_data_revision}`,
          code: "STALE_REVISION"
        };
      }
    }

    // Insert immutable revision
    const insRev = db.prepare(`
      INSERT INTO engineering_report_revisions (
        site, engineering_id, measurement_kind, period_start, period_end,
        data_revision, publisher_id, definition_revision, calendar_revision,
        unit, value, period_status, coverage, quality, published_at, reason,
        content_digest, received_at
      ) VALUES (
        @site, @engineering_id, @measurement_kind, @period_start, @period_end,
        @data_revision, @publisher_id, @definition_revision, @calendar_revision,
        @unit, @value, @period_status, @coverage, @quality, @published_at, @reason,
        @content_digest, CURRENT_TIMESTAMP
      )
    `);

    const revRes = insRev.run({
      site: daily.site,
      engineering_id: daily.engineeringId,
      measurement_kind: daily.measurementKind,
      period_start: daily.periodStart,
      period_end: daily.periodEnd,
      data_revision: daily.dataRevision,
      publisher_id: daily.publisherId,
      definition_revision: daily.definitionRevision,
      calendar_revision: daily.calendarRevision || 1,
      unit: daily.unit,
      value: daily.value === null ? null : String(daily.value),
      period_status: daily.periodStatus,
      coverage: daily.coverage,
      quality: daily.quality,
      published_at: daily.publishedAt,
      reason: daily.reason || null,
      content_digest: digest
    });

    const revisionId = Number(revRes.lastInsertRowid);

    // Upsert head
    db.prepare(`
      INSERT INTO engineering_report_heads (
        site, engineering_id, measurement_kind, period_start, period_end,
        current_data_revision, current_revision_id, period_status, coverage,
        quality, value, updated_at
      ) VALUES (
        @site, @engineering_id, @measurement_kind, @period_start, @period_end,
        @current_data_revision, @current_revision_id, @period_status, @coverage,
        @quality, @value, CURRENT_TIMESTAMP
      )
      ON CONFLICT(site, engineering_id, measurement_kind, period_start, period_end) DO UPDATE SET
        current_data_revision = @current_data_revision,
        current_revision_id = @current_revision_id,
        period_status = @period_status,
        coverage = @coverage,
        quality = @quality,
        value = @value,
        updated_at = CURRENT_TIMESTAMP
    `).run({
      site: daily.site,
      engineering_id: daily.engineeringId,
      measurement_kind: daily.measurementKind,
      period_start: daily.periodStart,
      period_end: daily.periodEnd,
      current_data_revision: daily.dataRevision,
      current_revision_id: revisionId,
      period_status: daily.periodStatus,
      coverage: daily.coverage,
      quality: daily.quality,
      value: daily.value === null ? null : String(daily.value)
    });

    // Record projection invalidation
    db.prepare(`
      INSERT INTO engineering_projection_invalidations (
        site, engineering_id, period_start, period_end, caused_by_revision
      ) VALUES (?, ?, ?, ?, ?)
    `).run(daily.site, daily.engineeringId, daily.periodStart, daily.periodEnd, daily.dataRevision);

    return {
      accepted: true,
      status: "accepted",
      dataRevision: daily.dataRevision
    };
  })();
}

export function batchImportDailyReports(
  db: Database.Database,
  records: any[],
  options: BatchImportOptions = {}
): { total: number; accepted: number; results: ReportAdmissionOutcome[] } {
  if (!Array.isArray(records)) {
    throw new Error("Batch import expects an array of records");
  }

  // Bounds: maximum 248 records (31 days * 8 engineerings)
  if (records.length > 248) {
    throw new Error(`Batch size exceeds maximum limit of 248 records (received ${records.length})`);
  }

  const payloadString = JSON.stringify(records);
  if (Buffer.byteLength(payloadString, "utf8") > 4 * 1024 * 1024) {
    throw new Error("Batch payload exceeds maximum limit of 4 MiB");
  }

  const results: ReportAdmissionOutcome[] = [];
  let acceptedCount = 0;

  for (const item of records) {
    const res = admitDailyEngineeringReport(db, item, {
      isProduction: true,
      allowReplayWindowBypass: Boolean(options.explicitApprovalForOldReplay)
    });
    results.push(res);
    if (res.accepted) {
      acceptedCount++;
    }
  }

  return { total: records.length, accepted: acceptedCount, results };
}

export function getEngineeringReportHistory(
  db: Database.Database,
  params: { site: string; engineeringId: KnEngineeringId; periodStart: string; periodEnd: string }
): any[] {
  return db
    .prepare(
      `SELECT * FROM engineering_report_revisions
       WHERE site = ? AND engineering_id = ? AND period_start = ? AND period_end = ?
       ORDER BY data_revision DESC`
    )
    .all(params.site, params.engineeringId, params.periodStart, params.periodEnd);
}
