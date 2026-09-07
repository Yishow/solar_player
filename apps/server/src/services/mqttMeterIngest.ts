import type Database from "better-sqlite3";
import {
  compileSelector,
  extractBySelector,
  extractDecimalLexeme,
  type MappingSelector,
  type MeterIngestResult,
  type MeterSourceDefinition
} from "@solar-display/shared";
import {
  ingestMeterReading,
  type MeterReadingStore
} from "./meterReadingService.js";

export type MqttPacketEvidence = {
  dup?: boolean;
  qos?: number;
  retain?: boolean;
};

type MeterSourceRow = {
  channel_id: string;
  display_name_en: string | null;
  display_name_zh: string | null;
  enabled: number;
  energy_flow_role: MeterSourceDefinition["energyFlowRole"];
  epoch_id: string;
  expected_cadence_seconds: number | null;
  input_unit: string;
  measurement_kind: MeterSourceDefinition["measurementKind"];
  meter_id: string;
  metric_key: string;
  metric_scope: "cl" | "kn";
  review_status: MeterSourceDefinition["reviewStatus"];
  scale_decimal: string;
  source_revision: number;
  source_timestamp_time_zone: string | null;
  timestamp_policy: MeterSourceDefinition["timestampPolicy"];
  boundary_max_age_seconds: number;
};

function parsePayload(rawPayload: string): unknown {
  try {
    // Validate before quoting number tokens; retain the original decimal text
    // on every supported Node version, without using a rounded JS number.
    JSON.parse(rawPayload);
    const decimalJson = rawPayload.replace(/"(?:\\.|[^"\\])*"|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
      (token, number: string | undefined) => number === undefined ? token : JSON.stringify(number));
    return JSON.parse(decimalJson) as unknown;
  } catch {
    return rawPayload.trim();
  }
}

function extractSourceTimestampEvidence(payload: unknown, selector: MappingSelector | null) {
  const paths = selector?.timestampPath && selector.timestampPath.length > 0
    ? [{ path: selector.timestampPath, label: selector.timestampPath.join(".") }]
    : ["sourceTimestamp", "timestamp", "ts", "time"].map((key) => ({ path: [key], label: key }));
  for (const candidate of paths) {
    let value: unknown;
    try {
      value = extractBySelector(payload, {
        path: candidate.path,
        tagEquals: selector?.tagEquals
      });
      if (value === undefined && selector?.tagEquals && !selector.timestampPath) {
        value = extractBySelector(payload, { path: candidate.path });
      }
    } catch {
      continue;
    }
    if (typeof value === "string" && value.trim() !== "") {
      return { value, path: candidate.label };
    }
  }
  return { value: null, path: selector?.timestampPath?.join(".") ?? null };
}

function rowToDefinition(row: MeterSourceRow): MeterSourceDefinition {
  return {
    channelId: row.channel_id,
    displayNameEn: row.display_name_en,
    displayNameZh: row.display_name_zh,
    enabled: row.enabled === 1,
    energyFlowRole: row.energy_flow_role,
    epochId: row.epoch_id,
    expectedCadenceSeconds: row.expected_cadence_seconds,
    inputUnit: row.input_unit,
    measurementKind: row.measurement_kind,
    meterId: row.meter_id,
    metricKey: row.metric_key,
    metricScope: row.metric_scope,
    reviewStatus: row.review_status,
    scaleDecimal: row.scale_decimal,
    sourceRevision: row.source_revision,
    sourceTimestampTimeZone: row.source_timestamp_time_zone,
    timestampPolicy: row.timestamp_policy,
    boundaryMaxAgeSeconds: row.boundary_max_age_seconds
  };
}

export function lookupEnabledMeterSource(
  database: Database.Database,
  metricScope: string,
  metricKey: string
): MeterSourceDefinition | null {
  if (metricScope !== "cl" && metricScope !== "kn") {
    return null;
  }
  const row = database.prepare(`
    SELECT meter_id, channel_id, metric_scope, metric_key, measurement_kind, energy_flow_role,
      input_unit, scale_decimal, source_revision, epoch_id, enabled, review_status,
      source_timestamp_time_zone, timestamp_policy, expected_cadence_seconds,
      boundary_max_age_seconds, display_name_zh, display_name_en
    FROM meter_sources
    WHERE metric_scope = ? AND metric_key = ? AND enabled = 1 AND review_status = 'reviewed'
    ORDER BY source_revision DESC
    LIMIT 1
  `).get(metricScope, metricKey) as MeterSourceRow | undefined;
  if (!row || typeof row.meter_id !== "string") {
    return null;
  }
  return rowToDefinition(row);
}

function selectorFromMapping(mapping: { value_path: string | null; selector_json?: string | null }) {
  if (mapping.selector_json !== undefined && mapping.selector_json !== null) {
    try {
      const parsed = JSON.parse(mapping.selector_json) as Partial<MappingSelector>;
      if (Array.isArray(parsed.path)) {
        return {
          path: parsed.path,
          tagEquals: parsed.tagEquals,
          selectorVersion: typeof parsed.selectorVersion === "number" ? parsed.selectorVersion : 1,
          timestampPath: Array.isArray(parsed.timestampPath) ? parsed.timestampPath : undefined
        };
      }
    } catch {
      return null;
    }
    return null;
  }
  return compileSelector(mapping.value_path ?? "value");
}

export type MappedMeterIngestResult = MeterIngestResult & {
  handled: true;
  selectorVersion: number | null;
  sourceTimestampPath: string | null;
};

function rejectedMapping(
  selector: MappingSelector,
  reason: string
): MappedMeterIngestResult {
  return {
    handled: true,
    diagnostics: [reason],
    liveValueKwh: null,
    liveUpdated: false,
    normalizedValueKwh: null,
    readingId: null,
    reason,
    selectorVersion: selector.selectorVersion ?? null,
    sourceTimestamp: null,
    sourceTimestampPath: selector.timestampPath?.join(".") ?? null,
    sourceTimestampRaw: null,
    status: "quarantined",
    timestampQuality: "unknown"
  };
}

export function ingestMappedMeterReading(
  database: Database.Database,
  mapping: { metric_key: string; metric_scope: string; value_path: string | null; selector_json?: string | null },
  rawPayload: string,
  packet: MqttPacketEvidence | undefined,
  receivedAt = new Date().toISOString(),
  store: MeterReadingStore = {}
): MappedMeterIngestResult | null {
  const definition = lookupEnabledMeterSource(database, mapping.metric_scope, mapping.metric_key);
  if (!definition) {
    const registered = database.prepare("SELECT 1 FROM meter_sources WHERE metric_scope = ? AND metric_key = ? LIMIT 1")
      .get(mapping.metric_scope, mapping.metric_key);
    return registered ? rejectedMapping({ path: [] }, "SOURCE_NOT_ACTIVE") : null;
  }
  if (definition.measurementKind === "power-gauge") return null;
  const payload = parsePayload(rawPayload);
  const selector = selectorFromMapping(mapping);
  if (!selector) {
    return rejectedMapping({ path: [] }, "SELECTOR_INVALID");
  }
  let extracted: unknown;
  try {
    extracted = extractBySelector(payload, selector);
  } catch {
    return rejectedMapping(selector, "SELECTOR_AMBIGUOUS");
  }
  const rawValueDecimal = extractDecimalLexeme(extracted);
  if (!rawValueDecimal) {
    return rejectedMapping(selector, "SELECTOR_NO_MATCH");
  }
  const timestampEvidence = extractSourceTimestampEvidence(payload, selector);
  const result = ingestMeterReading(database, definition, {
    dup: packet?.dup ?? null,
    origin: "mqtt",
    qos: packet?.qos ?? null,
    rawValueDecimal,
    receivedAt,
    retain: packet?.retain ?? null,
    selectorVersion: selector.selectorVersion ?? null,
    sourceTimestamp: timestampEvidence.value,
    sourceTimestampPath: timestampEvidence.path
  }, store);
  return {
    ...result,
    handled: true,
    selectorVersion: result.selectorVersion ?? selector.selectorVersion ?? null,
    sourceTimestampPath: result.sourceTimestampPath ?? timestampEvidence.path
  };
}
