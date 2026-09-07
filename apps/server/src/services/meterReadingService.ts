import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import {
  admitMeterReading,
  meterIdentityKey,
  normalizeEnergyToKwhDecimal,
  parseSourceTimestamp,
  type MeterReadingChangeEvent,
  type MeterIngestResult,
  type MeterReadingSample,
  type MeterSourceDefinition
} from "@solar-display/shared";

export type MeterReadingStore = {
  emitMeterReadingsChanged?: (identity: string) => void;
  emitMeterReadingChange?: (event: MeterReadingChangeEvent) => void;
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
    return withEvidence(admission, sample, null, null, false);
  }

  let normalized: string;
  try {
    normalized = definition.measurementKind === "power-gauge"
      ? sample.rawValueDecimal
      : normalizeEnergyToKwhDecimal(sample.rawValueDecimal, definition.inputUnit, definition.scaleDecimal);
  } catch {
    persistQuarantine(database, definition, sample, "UNSUPPORTED_UNIT");
    return withEvidence({
      diagnostics: ["UNSUPPORTED_UNIT"],
      liveValueKwh: readLive(database, definition),
      readingId: null,
      reason: "UNSUPPORTED_UNIT",
      status: "quarantined",
      timestampQuality: admission.timestampQuality
    }, sample, null, null, false);
  }

  if (definition.energyFlowRole === "consumption" && definition.measurementKind !== "power-gauge"
    && (normalized.startsWith("-") || (sample.rawValueDecimal.trim().startsWith("-") && /[1-9]/.test(sample.rawValueDecimal)))) {
    const reason = "NEGATIVE_CONSUMPTION_READING";
    persistQuarantine(database, definition, sample, reason);
    return withEvidence({ ...admission, status: "quarantined", reason, diagnostics: [reason],
      liveValueKwh: readLive(database, definition), readingId: null }, sample, null, null, false);
  }

  const parsed = parseSourceTimestamp(sample.sourceTimestamp, definition.sourceTimestampTimeZone);
  const sourceTimestamp = admission.timestampQuality === "source" ? parsed.instant : null;
  const payloadHash = hashPayload(sample, normalized);
  const identity = meterIdentityKey(definition);
  let result: MeterIngestResult | null = null;
  let event: MeterReadingChangeEvent | null = null;

  database.transaction(() => {
    const live = readLiveRow(database, definition);
    const accepted = sourceTimestamp
      ? database.prepare(`
          SELECT reading_id, normalized_value_kwh FROM meter_readings_accepted
          WHERE metric_scope = ? AND meter_id = ? AND channel_id = ? AND source_revision = ? AND epoch_id = ? AND source_timestamp = ?
        `).get(
          definition.metricScope,
          definition.meterId,
          definition.channelId,
          definition.sourceRevision,
          definition.epochId,
          sourceTimestamp
        ) as { reading_id: string; normalized_value_kwh: string } | undefined
      : undefined;

    if (accepted) {
      if (accepted.normalized_value_kwh === normalized) {
        result = withEvidence({
          diagnostics: [],
          liveValueKwh: live?.live_value_kwh ?? null,
          readingId: accepted.reading_id,
          reason: null,
          status: "duplicate",
          timestampQuality: admission.timestampQuality
        }, sample, normalized, sourceTimestamp, false);
      } else {
        persistQuarantine(database, definition, sample, "TIMESTAMP_COLLISION");
        result = withEvidence({
          diagnostics: ["TIMESTAMP_COLLISION"],
          liveValueKwh: live?.live_value_kwh ?? null,
          readingId: null,
          reason: "TIMESTAMP_COLLISION",
          status: "conflict",
          timestampQuality: admission.timestampQuality
        }, sample, null, sourceTimestamp, false);
      }
      return;
    }

    const readingId = randomUUID();
    const now = sample.receivedAt;
    insertAcceptedReading(database, definition, sample, {
      readingId,
      normalized,
      sourceTimestamp,
      payloadHash,
      timestampQuality: admission.timestampQuality,
      createdAt: now
    });

    const isLate = Boolean(
      live
      && isEarlierInstant(sourceTimestamp ?? now, live.last_source_timestamp ?? live.last_accepted_at)
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

    result = withEvidence({
      diagnostics: isLate ? ["LATE_EVENT_SAVED"] : [],
      liveValueKwh: isLate ? live?.live_value_kwh ?? normalized : normalized,
      readingId,
      reason: null,
      status: "accepted",
      timestampQuality: admission.timestampQuality
    }, sample, normalized, sourceTimestamp, !isLate);
    event = {
      identity,
      metricScope: definition.metricScope,
      meterId: definition.meterId,
      channelId: definition.channelId,
      sourceRevision: definition.sourceRevision,
      epochId: definition.epochId,
      readingId,
      sourceTimestamp,
      receivedAt: sample.receivedAt,
      late: isLate
    };
  })();

  if (!result) {
    throw new Error("METER_READING_INGEST_EMPTY");
  }
  const committedEvent = event as MeterReadingChangeEvent | null;
  if (committedEvent) {
    if (!committedEvent.late) {
      store.emitMeterReadingsChanged?.(identity);
    }
    store.emitMeterReadingChange?.(committedEvent);
  }
  return result;
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
      reason, raw_value_decimal, source_timestamp, received_at, retain, dup, qos, origin,
      payload_hash, created_at, selector_version, selector_timestamp_path, source_timestamp_raw, measurement_kind
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    sample.receivedAt,
    sample.selectorVersion ?? null,
    sample.sourceTimestampPath ?? null,
    sample.sourceTimestamp,
    definition.measurementKind
  );
}

function insertAcceptedReading(
  database: Database.Database,
  definition: MeterSourceDefinition,
  sample: MeterReadingSample,
  values: {
    readingId: string;
    normalized: string;
    sourceTimestamp: string | null;
    payloadHash: string;
    timestampQuality: MeterIngestResult["timestampQuality"];
    createdAt: string;
  }
) {
  database.prepare(`
    INSERT INTO meter_readings_accepted (
      reading_id, metric_scope, meter_id, channel_id, source_revision, epoch_id,
      raw_value_decimal, normalized_value_kwh, source_timestamp, received_at, timestamp_quality,
      origin, retain, dup, qos, payload_hash, created_at, selector_version, selector_timestamp_path,
      source_timestamp_raw, measurement_kind
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    values.readingId,
    definition.metricScope,
    definition.meterId,
    definition.channelId,
    definition.sourceRevision,
    definition.epochId,
    sample.rawValueDecimal,
    values.normalized,
    values.sourceTimestamp,
    sample.receivedAt,
    values.timestampQuality,
    sample.origin,
    sample.retain === null ? null : Number(sample.retain),
    sample.dup === null ? null : Number(sample.dup),
    sample.qos,
    values.payloadHash,
    values.createdAt,
    sample.selectorVersion ?? null,
    sample.sourceTimestampPath ?? null,
    sample.sourceTimestamp,
    definition.measurementKind
  );
}

function withEvidence(
  result: MeterIngestResult,
  sample: MeterReadingSample,
  normalizedValueKwh: string | null,
  sourceTimestamp: string | null,
  liveUpdated: boolean
): MeterIngestResult {
  return {
    ...result,
    liveUpdated,
    normalizedValueKwh,
    selectorVersion: sample.selectorVersion ?? null,
    sourceTimestamp,
    sourceTimestampPath: sample.sourceTimestampPath ?? null,
    sourceTimestampRaw: sample.sourceTimestamp
  };
}

function isEarlierInstant(candidate: string, previous: string) {
  const candidateMs = Date.parse(candidate);
  const previousMs = Date.parse(previous);
  if (Number.isFinite(candidateMs) && Number.isFinite(previousMs)) {
    return candidateMs < previousMs;
  }
  return candidate < previous;
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

export type AcceptedMeterReadingRow = {
  reading_id: string;
  meter_id: string;
  channel_id: string;
  source_revision: number;
  epoch_id: string;
  normalized_value_kwh: string;
  source_timestamp: string | null;
  received_at: string;
  timestamp_quality: string;
  measurement_kind: "cumulative-energy" | "interval-energy" | "power-gauge" | "unknown" | null;
  boundary_max_age_seconds: number;
};

export function loadAcceptedMeterReadings(database: Database.Database, scope: "cl" | "kn"): AcceptedMeterReadingRow[] {
  return database.prepare(`
    SELECT a.reading_id, a.meter_id, a.channel_id, a.source_revision, a.epoch_id, a.normalized_value_kwh,
      a.source_timestamp, a.received_at, a.timestamp_quality, COALESCE(a.measurement_kind, s.measurement_kind) AS measurement_kind,
      COALESCE(s.boundary_max_age_seconds, 300) AS boundary_max_age_seconds
    FROM meter_readings_accepted a
    LEFT JOIN meter_sources s ON s.metric_scope = a.metric_scope AND s.meter_id = a.meter_id
      AND s.channel_id = a.channel_id AND s.source_revision = a.source_revision AND s.epoch_id = a.epoch_id
    WHERE a.metric_scope = ?
    ORDER BY a.reading_id
  `).all(scope) as AcceptedMeterReadingRow[];
}
