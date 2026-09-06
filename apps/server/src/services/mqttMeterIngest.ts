import type Database from "better-sqlite3";
import {
  compileSelector,
  extractBySelector,
  extractDecimalLexeme,
  type MeterSourceDefinition
} from "@solar-display/shared";
import { ingestMeterReading } from "./meterReadingService.js";

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
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parsePayload(rawPayload: string): unknown {
  try {
    return JSON.parse(rawPayload) as unknown;
  } catch {
    return rawPayload.trim();
  }
}

function extractSourceTimestamp(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }
  for (const key of ["sourceTimestamp", "timestamp", "ts", "time"]) {
    const value = payload[key];
    if (typeof value === "string" && value.trim() !== "") {
      return value;
    }
  }
  return null;
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
    timestampPolicy: row.timestamp_policy
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
  try {
    const row = database.prepare(`
      SELECT meter_id, channel_id, metric_scope, metric_key, measurement_kind, energy_flow_role,
        input_unit, scale_decimal, source_revision, epoch_id, enabled, review_status,
        source_timestamp_time_zone, timestamp_policy, expected_cadence_seconds, display_name_zh, display_name_en
      FROM meter_sources
      WHERE metric_scope = ? AND metric_key = ? AND enabled = 1
      ORDER BY source_revision DESC
      LIMIT 1
    `).get(metricScope, metricKey) as MeterSourceRow | undefined;
    if (!row || typeof row.meter_id !== "string") {
      return null;
    }
    return rowToDefinition(row);
  } catch {
    return null;
  }
}

function selectorFromMapping(mapping: { value_path: string | null; selector_json?: string | null }) {
  if (mapping.selector_json) {
    try {
      const parsed = JSON.parse(mapping.selector_json) as { path?: string[]; tagEquals?: string };
      if (Array.isArray(parsed.path)) {
        return { path: parsed.path, tagEquals: parsed.tagEquals };
      }
    } catch {
      // Fall back to value_path.
    }
  }
  return compileSelector(mapping.value_path ?? "value");
}

export function ingestMappedMeterReading(
  database: Database.Database,
  mapping: { metric_key: string; metric_scope: string; value_path: string | null; selector_json?: string | null },
  rawPayload: string,
  packet: MqttPacketEvidence | undefined,
  receivedAt = new Date().toISOString()
) {
  const definition = lookupEnabledMeterSource(database, mapping.metric_scope, mapping.metric_key);
  if (!definition || definition.measurementKind === "power-gauge") {
    return null;
  }
  const payload = parsePayload(rawPayload);
  const selector = selectorFromMapping(mapping);
  let extracted: unknown;
  try {
    extracted = extractBySelector(payload, selector);
  } catch {
    return null;
  }
  const rawValueDecimal = extractDecimalLexeme(extracted) ?? (typeof payload === "string" ? extractDecimalLexeme(payload) : null);
  if (!rawValueDecimal) {
    return null;
  }
  return ingestMeterReading(database, definition, {
    dup: packet?.dup ?? null,
    origin: "mqtt",
    qos: packet?.qos ?? null,
    rawValueDecimal,
    receivedAt,
    retain: packet?.retain ?? null,
    sourceTimestamp: extractSourceTimestamp(payload)
  });
}
