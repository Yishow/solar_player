import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import {
  admitMeterReading,
  meterIdentityKey,
  normalizeEnergyToKwhDecimal,
  parseSourceTimestamp,
  type MeterIngestResult,
  type MeterReadingSample,
  type MeterSourceDefinition
} from "@solar-display/shared";

export type MeterReadingStore = {
  emitMeterReadingsChanged?: (identity: string) => void;
};

function hashPayload(sample: MeterReadingSample, normalized: string) {
  return `${sample.rawValueDecimal}|${normalized}|${sample.sourceTimestamp ?? ""}`;
}

export function ingestMeterReading(
  database: Database.Database,
  definition: MeterSourceDefinition,
  sample: MeterReadingSample,
  store: MeterReadingStore = {}
): MeterIngestResult {
  const admission = admitMeterReading(definition, sample);
  if (admission.status === "quarantined") {
    persistQuarantine(database, definition, sample, admission.reason ?? "QUARANTINED");
    return admission;
  }

  let normalized: string;
  try {
    normalized = definition.measurementKind === "power-gauge"
      ? sample.rawValueDecimal
      : normalizeEnergyToKwhDecimal(sample.rawValueDecimal, definition.inputUnit, definition.scaleDecimal);
  } catch {
    persistQuarantine(database, definition, sample, "UNSUPPORTED_UNIT");
    return {
      diagnostics: ["UNSUPPORTED_UNIT"],
      liveValueKwh: readLive(database, definition),
      readingId: null,
      reason: "UNSUPPORTED_UNIT",
      status: "quarantined",
      timestampQuality: admission.timestampQuality
    };
  }

  const parsed = parseSourceTimestamp(sample.sourceTimestamp, definition.sourceTimestampTimeZone);
  const sourceTimestamp = admission.timestampQuality === "source" ? parsed.instant : null;
  const payloadHash = hashPayload({ ...sample, sourceTimestamp }, normalized);
  const identity = meterIdentityKey(definition);
  const live = readLiveRow(database, definition);

  if (sourceTimestamp && live) {
    const accepted = database.prepare(`
      SELECT reading_id, normalized_value_kwh FROM meter_readings_accepted
      WHERE metric_scope = ? AND meter_id = ? AND channel_id = ? AND source_revision = ? AND epoch_id = ? AND source_timestamp = ?
    `).get(definition.metricScope, definition.meterId, definition.channelId, definition.sourceRevision, definition.epochId, sourceTimestamp) as
      | { reading_id: string; normalized_value_kwh: string }
      | undefined;
    if (accepted) {
      if (accepted.normalized_value_kwh === normalized) {
        return {
          diagnostics: [],
          liveValueKwh: live.live_value_kwh,
          readingId: accepted.reading_id,
          reason: null,
          status: "duplicate",
          timestampQuality: admission.timestampQuality
        };
      }
      persistQuarantine(database, definition, sample, "TIMESTAMP_COLLISION");
      return {
        diagnostics: ["TIMESTAMP_COLLISION"],
        liveValueKwh: live.live_value_kwh,
        readingId: null,
        reason: "TIMESTAMP_COLLISION",
        status: "conflict",
        timestampQuality: admission.timestampQuality
      };
    }
  }

  const readingId = randomUUID();
  const now = sample.receivedAt;
  database.prepare(`
    INSERT INTO meter_readings_accepted (
      reading_id, metric_scope, meter_id, channel_id, source_revision, epoch_id,
      raw_value_decimal, normalized_value_kwh, source_timestamp, received_at,
      timestamp_quality, origin, retain, dup, qos, payload_hash, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    readingId,
    definition.metricScope,
    definition.meterId,
    definition.channelId,
    definition.sourceRevision,
    definition.epochId,
    sample.rawValueDecimal,
    normalized,
    sourceTimestamp,
    now,
    admission.timestampQuality,
    sample.origin,
    sample.retain === null ? null : Number(sample.retain),
    sample.dup === null ? null : Number(sample.dup),
    sample.qos,
    payloadHash,
    now
  );

  const isLate = Boolean(
    sourceTimestamp
    && live?.last_source_timestamp
    && sourceTimestamp < live.last_source_timestamp
  );
  if (!isLate) {
    database.prepare(`
      INSERT INTO meter_live_state (
        metric_scope, meter_id, channel_id, source_revision, epoch_id,
        live_value_kwh, last_accepted_at, last_source_timestamp, baseline_kwh
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(metric_scope, meter_id, channel_id, source_revision, epoch_id) DO UPDATE SET
        live_value_kwh = excluded.live_value_kwh,
        last_accepted_at = excluded.last_accepted_at,
        last_source_timestamp = excluded.last_source_timestamp
    `).run(
      definition.metricScope,
      definition.meterId,
      definition.channelId,
      definition.sourceRevision,
      definition.epochId,
      normalized,
      now,
      sourceTimestamp,
      live?.baseline_kwh ?? normalized
    );
  }

  if (!isLate) {
    store.emitMeterReadingsChanged?.(identity);
  }

  return {
    diagnostics: isLate ? ["LATE_EVENT_SAVED"] : [],
    liveValueKwh: isLate ? live?.live_value_kwh ?? normalized : normalized,
    readingId,
    reason: null,
    status: "accepted",
    timestampQuality: admission.timestampQuality
  };
}

function persistQuarantine(
  database: Database.Database,
  definition: MeterSourceDefinition,
  sample: MeterReadingSample,
  reason: string
) {
  database.prepare(`
    INSERT INTO meter_readings_quarantine (
      quarantine_id, metric_scope, meter_id, channel_id, source_revision, epoch_id,
      reason, raw_value_decimal, source_timestamp, received_at, retain, dup, qos, origin, payload_hash, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    randomUUID(),
    definition.metricScope,
    definition.meterId,
    definition.channelId,
    definition.sourceRevision,
    definition.epochId,
    reason,
    sample.rawValueDecimal,
    sample.sourceTimestamp,
    sample.receivedAt,
    sample.retain === null ? null : Number(sample.retain),
    sample.dup === null ? null : Number(sample.dup),
    sample.qos,
    sample.origin,
    null,
    sample.receivedAt
  );
}

function readLiveRow(database: Database.Database, definition: MeterSourceDefinition) {
  return database.prepare(`
    SELECT live_value_kwh, last_accepted_at, last_source_timestamp, baseline_kwh
    FROM meter_live_state
    WHERE metric_scope = ? AND meter_id = ? AND channel_id = ? AND source_revision = ? AND epoch_id = ?
  `).get(definition.metricScope, definition.meterId, definition.channelId, definition.sourceRevision, definition.epochId) as
    | { live_value_kwh: string; last_accepted_at: string; last_source_timestamp: string | null; baseline_kwh: string }
    | undefined;
}

function readLive(database: Database.Database, definition: MeterSourceDefinition) {
  return readLiveRow(database, definition)?.live_value_kwh ?? null;
}

export function countAcceptedReadings(database: Database.Database, definition: MeterSourceDefinition) {
  const row = database.prepare(`
    SELECT COUNT(*) AS count FROM meter_readings_accepted
    WHERE metric_scope = ? AND meter_id = ? AND channel_id = ? AND source_revision = ? AND epoch_id = ?
  `).get(definition.metricScope, definition.meterId, definition.channelId, definition.sourceRevision, definition.epochId) as { count: number };
  return row.count;
}

export function readLiveState(database: Database.Database, definition: MeterSourceDefinition) {
  return readLiveRow(database, definition) ?? null;
}

export function seedAcceptedReading(
  database: Database.Database,
  definition: MeterSourceDefinition,
  valueKwh: string,
  sourceTimestamp: string,
  receivedAt: string
) {
  ingestMeterReading(database, definition, {
    dup: false,
    origin: "mqtt",
    qos: 1,
    rawValueDecimal: valueKwh,
    receivedAt,
    retain: false,
    sourceTimestamp
  });
}
