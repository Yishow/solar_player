import { createHash, randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type { PeriodConsumptionResult } from "@solar-display/shared";

export type ConsumptionProjection = PeriodConsumptionResult & {
  active: boolean;
  algorithmVersion: "e2-v1";
  createdAt: string;
  projectionId: string;
  range: "day" | "month" | "year";
  sampleChecksum: string;
  scope: "cl" | "kn";
  watermark: string | null;
};

function rowToProjection(row: Record<string, unknown>): ConsumptionProjection {
  return {
    active: Number(row.active) === 1,
    algorithmVersion: "e2-v1",
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

export function acceptedSampleChecksum(database: Database.Database, scope: "cl" | "kn") {
  const rows = database.prepare(`
    SELECT reading_id, normalized_value_kwh, source_timestamp
    FROM meter_readings_accepted
    WHERE metric_scope = ?
    ORDER BY source_timestamp, reading_id
  `).all(scope) as Array<{ normalized_value_kwh: string; reading_id: string; source_timestamp: string | null }>;
  return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
}

export function acceptedWatermark(database: Database.Database, scope: "cl" | "kn") {
  const row = database.prepare(`
    SELECT MAX(source_timestamp) AS watermark FROM meter_readings_accepted WHERE metric_scope = ?
  `).get(scope) as { watermark: string | null };
  return row.watermark;
}

export function shadowProject(
  database: Database.Database,
  result: PeriodConsumptionResult,
  scope: "cl" | "kn",
  range: ConsumptionProjection["range"],
  checksum = acceptedSampleChecksum(database, scope),
  watermark = acceptedWatermark(database, scope)
) {
  const next: ConsumptionProjection = {
    ...result,
    active: false,
    algorithmVersion: "e2-v1",
    createdAt: new Date().toISOString(),
    projectionId: randomUUID(),
    range,
    sampleChecksum: checksum,
    scope,
    watermark
  };
  database.prepare(`
    INSERT INTO consumption_projections (
      projection_id, metric_scope, range, profile_revision, algorithm_version, quality,
      site_time_zone, value_kwh, watermark, sample_checksum, active, created_at
    ) VALUES (?, ?, ?, ?, 'e2-v1', ?, ?, ?, ?, ?, 0, ?)
  `).run(
    next.projectionId,
    scope,
    range,
    result.profileRevision,
    result.quality,
    result.siteTimeZone,
    result.valueKwh,
    watermark,
    checksum,
    next.createdAt
  );
  return next;
}

export function activateProjection(database: Database.Database, candidate: ConsumptionProjection) {
  const current = readActiveProjection(database, candidate.scope, candidate.range);
  if (current && current.watermark && candidate.watermark && candidate.watermark < current.watermark) {
    throw Object.assign(new Error("PROJECTION_WATERMARK_STALE"), { code: "PROJECTION_WATERMARK_STALE" });
  }
  const tx = database.transaction(() => {
    database.prepare(`
      UPDATE consumption_projections SET active = 0 WHERE metric_scope = ? AND range = ?
    `).run(candidate.scope, candidate.range);
    database.prepare(`
      UPDATE consumption_projections SET active = 1 WHERE projection_id = ?
    `).run(candidate.projectionId);
  });
  tx();
  return readActiveProjection(database, candidate.scope, candidate.range);
}

export function rollbackProjection(database: Database.Database, scope: "cl" | "kn", range: ConsumptionProjection["range"]) {
  const current = readActiveProjection(database, scope, range);
  if (!current) {
    return null;
  }
  const previous = database.prepare(`
    SELECT * FROM consumption_projections
    WHERE metric_scope = ? AND range = ? AND projection_id != ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(scope, range, current.projectionId) as Record<string, unknown> | undefined;
  const tx = database.transaction(() => {
    database.prepare(`UPDATE consumption_projections SET active = 0 WHERE projection_id = ?`).run(current.projectionId);
    if (previous) {
      database.prepare(`UPDATE consumption_projections SET active = 1 WHERE projection_id = ?`).run(previous.projection_id);
    }
  });
  tx();
  return previous ? rowToProjection({ ...previous, active: 1 }) : null;
}

export function readActiveProjection(database: Database.Database, scope: "cl" | "kn", range: ConsumptionProjection["range"]) {
  const row = database.prepare(`
    SELECT * FROM consumption_projections WHERE metric_scope = ? AND range = ? AND active = 1
    ORDER BY created_at DESC LIMIT 1
  `).get(scope, range) as Record<string, unknown> | undefined;
  return row ? rowToProjection(row) : null;
}

export function listProjections(database: Database.Database) {
  return (database.prepare(`SELECT * FROM consumption_projections ORDER BY created_at`).all() as Array<Record<string, unknown>>)
    .map(rowToProjection);
}
