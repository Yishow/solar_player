import type Database from "better-sqlite3";
import { meterIdentityKey, type PeriodConsumptionResult, type PeriodSample } from "@solar-display/shared";
import {
  findLatestAcceptedInstantMs,
  listAcceptedReadingIdentities,
  loadAcceptedMeterReadings,
  loadAcceptedMeterReadingsForIdentityWindow,
  loadAcceptedMeterReadingsInWindow,
  type AcceptedMeterReadingRow,
  type AcceptedReadingIdentity
} from "./meterReadingService.js";

export type AccountingEvidenceRequest = {
  channelIds: readonly string[];
  /** The earliest instant any requested window opens or is capped at. */
  fromMs: number;
  scope: "cl" | "kn";
  /** The latest instant any requested window is resolved through. */
  throughMs: number;
};

export type AccountingEvidenceSelection = Readonly<{
  /** The bounds could not be trusted, so the whole scope was read as before. */
  fullLoad: boolean;
  /** Rows read from the database before any in-memory filtering. */
  materializedRowCount: number;
  /** Queries issued against accepted readings for this selection. */
  queryCount: number;
  rows: readonly AcceptedMeterReadingRow[];
}>;

function freezeSelection(
  rows: AcceptedMeterReadingRow[],
  materializedRowCount: number,
  queryCount: number,
  fullLoad: boolean
): AccountingEvidenceSelection {
  return Object.freeze({ fullLoad, materializedRowCount, queryCount, rows: Object.freeze(rows) });
}

/** Resolver samples in the one order every accounting read has always used. */
export function toPeriodSamples(rows: readonly AcceptedMeterReadingRow[]): PeriodSample[] {
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

// The instant the bounded reads are keyed on, as SQLite evaluates it.
function readingInstantMs(row: AcceptedMeterReadingRow) {
  return Date.parse(row.source_timestamp ?? row.received_at);
}

// The instant the shared resolver places a reading at; NaN when it cannot.
function calculationInstantMs(row: AcceptedMeterReadingRow) {
  return Date.parse(row.source_timestamp ?? (row.timestamp_quality === "receive-time-estimated" ? row.received_at : ""));
}

function hasIdentity(row: AcceptedMeterReadingRow, identity: AcceptedReadingIdentity) {
  return row.meter_id === identity.meterId && row.source_revision === identity.sourceRevision && row.epoch_id === identity.epochId;
}

/**
 * The evidence the shared period resolver needs for every window that opens at
 * or after `fromMs` and resolves through at most `throughMs`, without the rest
 * of the scope's history.
 *
 * One read covers the requested span. For each channel the resolver may also
 * need readings from before it: the newest reading at or before a window when
 * nothing inside the span precedes it, and the opening of an identity that could
 * close a window but has no reading there yet. Those are found by an index seek
 * and read from that instant onward, so a stale baseline is kept however old it
 * is, while history older than every needed baseline is never read. Readings
 * whose instant SQLite cannot evaluate make the bounds untrustworthy, so the
 * selection then falls back to the whole scope.
 */
export function selectCalculationEvidence(
  database: Database.Database,
  request: AccountingEvidenceRequest
): AccountingEvidenceSelection {
  const { fromMs, scope, throughMs } = request;
  const channelIds = [...new Set(request.channelIds)];
  let queryCount = 0;
  const readWholeScope = () => {
    queryCount += 1;
    const rows = loadAcceptedMeterReadings(database, scope);
    return freezeSelection(rows, rows.length, queryCount, true);
  };
  if (!Number.isFinite(fromMs) || !Number.isFinite(throughMs)) {
    return readWholeScope();
  }
  if (channelIds.length === 0) {
    return freezeSelection([], 0, queryCount, false);
  }

  queryCount += 1;
  const spanRows = loadAcceptedMeterReadingsInWindow(database, scope, channelIds, fromMs, throughMs);
  if (spanRows.some((row) => !Number.isFinite(readingInstantMs(row)))) {
    return readWholeScope();
  }
  const rows = new Map(spanRows.map((row) => [row.reading_id, row]));
  let materializedRowCount = spanRows.length;
  for (const channelId of channelIds) {
    const trusted = spanRows.filter((row) => {
      const instant = calculationInstantMs(row);
      return row.channel_id === channelId && instant >= fromMs && instant <= throughMs;
    });
    const anchors: number[] = [];
    const identities = listAcceptedReadingIdentities(database, scope, channelId);
    // listAcceptedReadingIdentities performs one index seek per identity plus
    // the final seek that proves exhaustion.
    queryCount += identities.length + 1;
    for (const identity of identities) {
      if (trusted.some((row) => hasIdentity(row, identity) && calculationInstantMs(row) <= fromMs)) {
        continue;
      }
      queryCount += 1;
      const latest = findLatestAcceptedInstantMs(database, scope, channelId, fromMs, { calculationEligible: true, identity });
      if (latest !== null) anchors.push(latest);
    }
    if (anchors.length === 0) {
      continue;
    }
    queryCount += 1;
    const earlier = loadAcceptedMeterReadingsInWindow(database, scope, [channelId], Math.min(...anchors), fromMs - 1);
    materializedRowCount += earlier.length;
    for (const row of earlier) rows.set(row.reading_id, row);
  }

  return freezeSelection([...rows.values()], materializedRowCount, queryCount, false);
}

/**
 * The projection fingerprint rule, unchanged: the member-channel readings from
 * periodStart through calculatedThrough, plus each full identity's newest reading
 * before periodStart. Without that metadata the whole scope is the fingerprint.
 * `rows` must arrive in reading_id order: of equally new prior readings the first
 * one wins, exactly as it always has.
 */
export function filterProjectionFingerprintRows(
  scope: "cl" | "kn",
  rows: readonly AcceptedMeterReadingRow[],
  result?: PeriodConsumptionResult
): AcceptedMeterReadingRow[] {
  if (!result?.periodStart || !result.calculatedThrough || !result.meterIds) return [...rows];
  const members = new Set(result.meterIds);
  const start = Date.parse(result.periodStart);
  const through = Date.parse(result.calculatedThrough);
  const baselines = new Map<string, AcceptedMeterReadingRow>();
  const instant = (row: AcceptedMeterReadingRow) => Date.parse(row.source_timestamp ?? row.received_at);
  const selected = rows.filter((row) => {
    if (!members.has(row.channel_id) || instant(row) > through) return false;
    if (instant(row) >= start) return true;
    const identity = meterIdentityKey({
      metricScope: scope,
      meterId: row.meter_id,
      channelId: row.channel_id,
      sourceRevision: row.source_revision,
      epochId: row.epoch_id
    });
    const prior = baselines.get(identity);
    if (!prior || instant(row) > instant(prior)) baselines.set(identity, row);
    return false;
  });
  return [...selected, ...baselines.values()].sort((a, b) => a.reading_id.localeCompare(b.reading_id));
}

// SQLite's default BINARY collation, which is the order the full-scope read returns.
function byReadingId(a: AcceptedMeterReadingRow, b: AcceptedMeterReadingRow) {
  return a.reading_id < b.reading_id ? -1 : a.reading_id > b.reading_id ? 1 : 0;
}

/**
 * The rows a projection's input checksum and watermark are computed from, read
 * once. It reads the projected span of the member channels, then, for every
 * identity that has ever reported on them, every tie at its newest instant
 * before the span — exactly enough for the unchanged fingerprint rule to pick
 * the same baseline it would pick from the whole scope.
 */
export function selectProjectionFingerprintEvidence(
  database: Database.Database,
  scope: "cl" | "kn",
  result?: PeriodConsumptionResult
): AccountingEvidenceSelection {
  let queryCount = 0;
  const readWholeScope = () => {
    queryCount += 1;
    const rows = loadAcceptedMeterReadings(database, scope);
    return freezeSelection(filterProjectionFingerprintRows(scope, rows, result), rows.length, queryCount, true);
  };
  if (!result?.periodStart || !result.calculatedThrough || !result.meterIds) {
    return readWholeScope();
  }
  const startMs = Date.parse(result.periodStart);
  const throughMs = Date.parse(result.calculatedThrough);
  if (!Number.isFinite(startMs) || !Number.isFinite(throughMs)) {
    return readWholeScope();
  }
  const channelIds = [...new Set(result.meterIds)];

  queryCount += 1;
  const spanRows = loadAcceptedMeterReadingsInWindow(database, scope, channelIds, startMs, throughMs);
  if (spanRows.some((row) => !Number.isFinite(readingInstantMs(row)))) {
    return readWholeScope();
  }
  const candidates = new Map(spanRows.map((row) => [row.reading_id, row]));
  let materializedRowCount = spanRows.length;
  for (const channelId of channelIds) {
    const identities = listAcceptedReadingIdentities(database, scope, channelId);
    queryCount += identities.length + 1;
    for (const identity of identities) {
      queryCount += 1;
      const latest = findLatestAcceptedInstantMs(database, scope, channelId, startMs - 1, { calculationEligible: false, identity });
      if (latest === null) {
        continue;
      }
      queryCount += 1;
      const prior = loadAcceptedMeterReadingsForIdentityWindow(database, scope, channelId, identity, latest, latest);
      materializedRowCount += prior.length;
      for (const row of prior) candidates.set(row.reading_id, row);
    }
  }

  const ordered = [...candidates.values()].sort(byReadingId);
  return freezeSelection(filterProjectionFingerprintRows(scope, ordered, result), materializedRowCount, queryCount, false);
}
