import { createHash } from "node:crypto";
import type Database from "better-sqlite3";
import { meterIdentityKey, type PeriodConsumptionResult } from "@solar-display/shared";
import { canonicalJson } from "./authoringCanonicalJson.js";
import { loadAcceptedMeterReadings, type AcceptedMeterReadingRow } from "./meterReadingService.js";

export type ConsumptionProjection = PeriodConsumptionResult & {
  active: boolean;
  algorithmVersion: string;
  contextKey: string;
  createdAt: string;
  projectionId: string;
  range: "day" | "month" | "year";
  sampleChecksum: string;
  scope: "cl" | "kn";
  watermark: string | null;
};

function rowToProjection(row: Record<string, unknown>): ConsumptionProjection {
  return {
    ...(row.result_json ? JSON.parse(String(row.result_json)) as PeriodConsumptionResult : {}),
    contextKey: String(row.context_key ?? ""),
    active: Number(row.active) === 1,
    algorithmVersion: String(row.algorithm_version),
    createdAt: String(row.created_at),
    profileRevision: Number(row.profile_revision),
    projectionId: String(row.projection_id),
    quality: row.quality as ConsumptionProjection["quality"],
    range: row.range as ConsumptionProjection["range"],
    sampleChecksum: String(row.sample_checksum),
    scope: row.metric_scope as "cl" | "kn",
    siteTimeZone: String(row.site_time_zone),
    valueKwh: row.value_kwh === null ? null : String(row.value_kwh),
    watermark: row.watermark === null ? null : String(row.watermark)
  };
}

function projectionSamples(database: Database.Database, scope: "cl" | "kn", result?: PeriodConsumptionResult) {
  const rows = loadAcceptedMeterReadings(database, scope);
  if (!result?.periodStart || !result.calculatedThrough || !result.meterIds) return rows;
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

export function acceptedSampleChecksum(database: Database.Database, scope: "cl" | "kn", result?: PeriodConsumptionResult) {
  return createHash("sha256").update(JSON.stringify(projectionSamples(database, scope, result))).digest("hex");
}

export function acceptedWatermark(database: Database.Database, scope: "cl" | "kn", result?: PeriodConsumptionResult) {
  const times = projectionSamples(database, scope, result).map((row) => Date.parse(row.source_timestamp ?? row.received_at)).filter(Number.isFinite);
  return times.length ? new Date(times.reduce((latest, time) => Math.max(latest, time), -Infinity)).toISOString() : null;
}

export function projectionContextKey(result: PeriodConsumptionResult) {
  return result.periodStart && result.periodEnd
    ? JSON.stringify([result.periodStart, result.periodEnd, result.siteTimeZone, result.profileRevision, result.calculationVersion, result.meterIds, result.profileRevisionBoundaries])
    : "";
}

export function shadowProject(
  database: Database.Database,
  result: PeriodConsumptionResult,
  scope: "cl" | "kn",
  range: ConsumptionProjection["range"],
  checksum = acceptedSampleChecksum(database, scope, result),
  watermark = acceptedWatermark(database, scope, result)
) {
  const contextKey = projectionContextKey(result);
  const inputChecksum = acceptedSampleChecksum(database, scope, result);
  if (checksum !== inputChecksum) projectionError("PROJECTION_INPUT_CHANGED");
  const projectionId = createHash("sha256").update(canonicalJson({ result, scope, range, checksum, watermark, inputChecksum })).digest("hex");
  const current = readActiveProjection(database, scope, range, contextKey);
  const algorithmVersion = result.calculationVersion ?? "e2-v1";
  const createdAt = new Date().toISOString();
  database.prepare(`
    INSERT OR IGNORE INTO consumption_projections (
      projection_id, metric_scope, range, profile_revision, algorithm_version, quality,
      site_time_zone, value_kwh, watermark, sample_checksum, active, created_at,
      context_key, result_json, expected_active_id, input_checksum
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)
  `).run(
    projectionId,
    scope,
    range,
    result.profileRevision,
    algorithmVersion,
    result.quality,
    result.siteTimeZone,
    result.valueKwh,
    watermark,
    checksum,
    createdAt,
    contextKey,
    JSON.stringify(result),
    current?.projectionId ?? null,
    inputChecksum
  );
  return rowToProjection(database.prepare("SELECT * FROM consumption_projections WHERE projection_id = ?").get(projectionId) as Record<string, unknown>);
}

function projectionError(code: string): never {
  throw Object.assign(new Error(code), { code });
}

export function activateProjection(database: Database.Database, candidate: ConsumptionProjection) {
  return database.transaction(() => {
    const row = database.prepare("SELECT * FROM consumption_projections WHERE projection_id = ? AND metric_scope = ? AND range = ?")
      .get(candidate.projectionId, candidate.scope, candidate.range) as Record<string, unknown> | undefined;
    if (!row) projectionError("PROJECTION_NOT_FOUND");
    const stored = rowToProjection(row);
    const current = readActiveProjection(database, stored.scope, stored.range, stored.contextKey);
    if (current?.projectionId === stored.projectionId) return current;
    if ((current?.projectionId ?? null) !== row.expected_active_id) projectionError("PROJECTION_ACTIVATION_CONFLICT");
    if (row.input_checksum !== acceptedSampleChecksum(database, stored.scope, stored)) projectionError("PROJECTION_INPUT_CHANGED");
    if (current?.watermark && (!stored.watermark || Date.parse(stored.watermark) < Date.parse(current.watermark))) {
      projectionError("PROJECTION_WATERMARK_STALE");
    }
    if (current) database.prepare("UPDATE consumption_projections SET active = 0 WHERE projection_id = ?").run(current.projectionId);
    database.prepare("UPDATE consumption_projections SET active = 1, previous_active_id = ? WHERE projection_id = ?")
      .run(current?.projectionId ?? null, stored.projectionId);
    return readActiveProjection(database, stored.scope, stored.range, stored.contextKey);
  }).immediate();
}

export function rollbackProjection(database: Database.Database, scope: "cl" | "kn", range: ConsumptionProjection["range"], expectedActiveId?: string) {
  return database.transaction(() => {
    const candidates = database.prepare("SELECT * FROM consumption_projections WHERE metric_scope = ? AND range = ? AND active = 1")
      .all(scope, range) as Array<Record<string, unknown>>;
    if (!expectedActiveId && candidates.length > 1) projectionError("PROJECTION_CONTEXT_REQUIRED");
    const currentRow = expectedActiveId ? candidates.find((row) => row.projection_id === expectedActiveId) : candidates[0];
    const current = currentRow ? rowToProjection(currentRow) : null;
    if (expectedActiveId && current?.projectionId !== expectedActiveId) projectionError("PROJECTION_ACTIVATION_CONFLICT");
    if (!current) return null;
    const lineage = database.prepare("SELECT previous_active_id FROM consumption_projections WHERE projection_id = ?")
      .get(current.projectionId) as { previous_active_id: string | null };
    const previous = lineage.previous_active_id ? database.prepare("SELECT * FROM consumption_projections WHERE projection_id = ? AND metric_scope = ? AND range = ? AND context_key = ?")
      .get(lineage.previous_active_id, scope, range, current.contextKey) as Record<string, unknown> | undefined : undefined;
    if (!previous) return current;
    database.prepare("UPDATE consumption_projections SET active = 0 WHERE projection_id = ?").run(current.projectionId);
    database.prepare("UPDATE consumption_projections SET active = 1 WHERE projection_id = ?").run(previous.projection_id);
    return rowToProjection({ ...previous, active: 1 });
  }).immediate();
}

export function readActiveProjection(database: Database.Database, scope: "cl" | "kn", range: ConsumptionProjection["range"], contextKey?: string) {
  const row = database.prepare(`
    SELECT * FROM consumption_projections WHERE metric_scope = ? AND range = ? AND active = 1
      ${contextKey === undefined ? "" : "AND context_key = ?"}
    ORDER BY created_at DESC, rowid DESC LIMIT 1
  `).get(scope, range, ...(contextKey === undefined ? [] : [contextKey])) as Record<string, unknown> | undefined;
  return row ? rowToProjection(row) : null;
}

export function listProjections(database: Database.Database) {
  return (database.prepare(`SELECT * FROM consumption_projections ORDER BY created_at`).all() as Array<Record<string, unknown>>)
    .map(rowToProjection);
}
