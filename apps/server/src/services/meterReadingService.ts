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

export type AcceptedReadingIdentity = {
  epochId: string;
  meterId: string;
  sourceRevision: number;
};

// Every accepted-reading read returns exactly this row shape, so a bounded read
// and the full-scope read can be compared, hashed and resolved interchangeably.
const ACCEPTED_READING_SELECT = `
    SELECT a.reading_id, a.meter_id, a.channel_id, a.source_revision, a.epoch_id, a.normalized_value_kwh,
      a.source_timestamp, a.received_at, a.timestamp_quality, COALESCE(a.measurement_kind, s.measurement_kind) AS measurement_kind,
      COALESCE(s.boundary_max_age_seconds, 300) AS boundary_max_age_seconds
    FROM meter_readings_accepted a
    LEFT JOIN meter_sources s ON s.metric_scope = a.metric_scope AND s.meter_id = a.meter_id
      AND s.channel_id = a.channel_id AND s.source_revision = a.source_revision AND s.epoch_id = a.epoch_id`;

/**
 * A reading's evidence instant in epoch milliseconds as SQLite evaluates it:
 * `Date.parse(source_timestamp ?? received_at)`. Both agree exactly on the ISO
 * 8601 forms ingest stores — a `Z` or `±HH:MM` offset and at most millisecond
 * precision. A string SQLite cannot evaluate yields NULL. The accepted-reading
 * instant indexes (migration 052) are built on this exact expression, which is
 * what lets the bounded reads below seek instead of scanning a whole scope.
 */
function acceptedReadingInstantMsSql(alias = "") {
  return `CAST(ROUND(unixepoch(COALESCE(${alias}source_timestamp, ${alias}received_at), 'subsec') * 1000) AS INTEGER)`;
}

// A reading the period calculation can place in time: it carries a source
// instant, or its receive time is explicitly marked as that instant's estimate.
const CALCULATION_ELIGIBLE_SQL = "(source_timestamp IS NOT NULL OR timestamp_quality = 'receive-time-estimated')";

/** Every accepted reading of a scope. Kept for callers that genuinely need the whole scope. */
export function loadAcceptedMeterReadings(database: Database.Database, scope: "cl" | "kn"): AcceptedMeterReadingRow[] {
  return database.prepare(`${ACCEPTED_READING_SELECT}
    WHERE a.metric_scope = ?
    ORDER BY a.reading_id
  `).all(scope) as AcceptedMeterReadingRow[];
}

/**
 * Accepted readings of `channelIds` whose evidence instant lies in
 * [fromMs, toMs], plus every reading of those channels whose instant SQLite
 * cannot evaluate — their presence tells the caller the bounds are not trustworthy.
 */
export function loadAcceptedMeterReadingsInWindow(
  database: Database.Database,
  scope: "cl" | "kn",
  channelIds: readonly string[],
  fromMs: number,
  toMs: number
): AcceptedMeterReadingRow[] {
  if (channelIds.length === 0) {
    return [];
  }
  const instant = acceptedReadingInstantMsSql("a.");
  const channels = `a.metric_scope = ? AND a.channel_id IN (${channelIds.map(() => "?").join(", ")})`;
  // Two branches rather than `IS NULL OR BETWEEN`: an OR over the instant leaves
  // the planner only the (scope, channel) prefix, which walks the channel's whole
  // history. Each branch here is its own bounded seek on the instant index.
  return database.prepare(`${ACCEPTED_READING_SELECT}
    WHERE ${channels} AND ${instant} BETWEEN ? AND ?
    UNION ALL${ACCEPTED_READING_SELECT}
    WHERE ${channels} AND ${instant} IS NULL
    ORDER BY reading_id
  `).all(scope, ...channelIds, fromMs, toMs, scope, ...channelIds) as AcceptedMeterReadingRow[];
}

/** One identity's accepted readings whose evidence instant lies in [fromMs, toMs]. */
export function loadAcceptedMeterReadingsForIdentityWindow(
  database: Database.Database,
  scope: "cl" | "kn",
  channelId: string,
  identity: AcceptedReadingIdentity,
  fromMs: number,
  toMs: number
): AcceptedMeterReadingRow[] {
  const instant = acceptedReadingInstantMsSql("a.");
  return database.prepare(`${ACCEPTED_READING_SELECT}
    WHERE a.metric_scope = ? AND a.channel_id = ? AND a.meter_id = ? AND a.source_revision = ? AND a.epoch_id = ?
      AND ${instant} BETWEEN ? AND ?
    ORDER BY a.reading_id
  `).all(scope, channelId, identity.meterId, identity.sourceRevision, identity.epochId, fromMs, toMs) as AcceptedMeterReadingRow[];
}

/**
 * The newest evidence instant at or before `atOrBeforeMs` on a channel,
 * optionally for one full identity. `calculationEligible` skips readings the
 * period calculation cannot place in time. Null when there is none.
 */
export function findLatestAcceptedInstantMs(
  database: Database.Database,
  scope: "cl" | "kn",
  channelId: string,
  atOrBeforeMs: number,
  options: { calculationEligible: boolean; identity?: AcceptedReadingIdentity }
): number | null {
  const instant = acceptedReadingInstantMsSql();
  const { identity } = options;
  const row = database.prepare(`
    SELECT ${instant} AS instant_ms FROM meter_readings_accepted
    WHERE metric_scope = ? AND channel_id = ?
      ${identity ? "AND meter_id = ? AND source_revision = ? AND epoch_id = ?" : ""}
      AND ${instant} <= ?
      ${options.calculationEligible ? `AND ${CALCULATION_ELIGIBLE_SQL}` : ""}
    ORDER BY ${instant} DESC
    LIMIT 1
  `).get(
    scope,
    channelId,
    ...(identity ? [identity.meterId, identity.sourceRevision, identity.epochId] : []),
    atOrBeforeMs
  ) as { instant_ms: number } | undefined;
  return row?.instant_ms ?? null;
}

/**
 * The distinct full identities with a calculation-eligible reading at exactly
 * `instantMs` on a channel, in identity order — every identity tied at that
 * instant, found by a seek on the instant index without reading the rows.
 */
export function listCalculationEligibleIdentitiesAt(
  database: Database.Database,
  scope: "cl" | "kn",
  channelId: string,
  instantMs: number
): AcceptedReadingIdentity[] {
  const instant = acceptedReadingInstantMsSql();
  // Deduplicated and ordered here rather than in SQL: a DISTINCT or ORDER BY on
  // the identity columns lets the planner walk the identity index across the
  // channel's whole history instead of seeking the one instant.
  const rows = database.prepare(`
    SELECT meter_id, source_revision, epoch_id FROM meter_readings_accepted
    WHERE metric_scope = ? AND channel_id = ? AND ${instant} = ? AND ${CALCULATION_ELIGIBLE_SQL}
  `).all(scope, channelId, instantMs) as Array<{ epoch_id: string; meter_id: string; source_revision: number }>;
  const identities = new Map<string, AcceptedReadingIdentity>();
  for (const row of rows) {
    identities.set(`${row.meter_id}\u0000${row.source_revision}\u0000${row.epoch_id}`, {
      epochId: row.epoch_id,
      meterId: row.meter_id,
      sourceRevision: row.source_revision
    });
  }
  const byBinary = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0);
  return [...identities.values()].sort((left, right) =>
    byBinary(left.meterId, right.meterId)
    || left.sourceRevision - right.sourceRevision
    || byBinary(left.epochId, right.epochId));
}

/** Every full identity that has ever reported on a channel, in identity order. */
export function listAcceptedReadingIdentities(
  database: Database.Database,
  scope: "cl" | "kn",
  channelId: string
): AcceptedReadingIdentity[] {
  // Stepping to the next identity key keeps this an index seek per identity
  // rather than a scan of every reading the channel has ever accepted.
  const next = database.prepare(`
    SELECT meter_id, source_revision, epoch_id FROM meter_readings_accepted
    WHERE metric_scope = ? AND channel_id = ? AND (meter_id, source_revision, epoch_id) > (?, ?, ?)
    ORDER BY meter_id, source_revision, epoch_id
    LIMIT 1
  `);
  const identities: AcceptedReadingIdentity[] = [];
  let key: [string, number, string] = ["", Number.MIN_SAFE_INTEGER, ""];
  for (;;) {
    const row = next.get(scope, channelId, ...key) as { epoch_id: string; meter_id: string; source_revision: number } | undefined;
    if (!row) {
      return identities;
    }
    identities.push({ epochId: row.epoch_id, meterId: row.meter_id, sourceRevision: row.source_revision });
    key = [row.meter_id, row.source_revision, row.epoch_id];
  }
}
