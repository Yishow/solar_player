import type Database from "better-sqlite3";
import {
  inventoryLegacyMapping,
  validateMeterSourceWrite,
  type MeterSourceDefinition
} from "@solar-display/shared";

type TopicMappingRow = {
  metric_key: string;
  unit: string | null;
};

export function listMeterSources(database: Database.Database, scope: "cl" | "kn") {
  return (database.prepare(`
    SELECT channel_id, meter_id, metric_key, display_name_zh, display_name_en
    FROM meter_sources
    WHERE metric_scope = ? AND enabled = 1
    ORDER BY channel_id
  `).all(scope) as Array<{
    channel_id: string;
    display_name_en: string | null;
    display_name_zh: string | null;
    meter_id: string;
    metric_key: string;
  }>).map((row) => ({
    channelId: row.channel_id,
    displayNameEn: row.display_name_en,
    displayNameZh: row.display_name_zh,
    meterId: row.meter_id,
    metricKey: row.metric_key
  }));
}

export function listReceivedTags(database: Database.Database, scope: "cl" | "kn") {
  try {
  return (database.prepare(`
    SELECT metric_key, topic, selector_json
    FROM topic_mappings
    WHERE metric_scope = ? AND enabled = 1
  `).all(scope) as Array<{ metric_key: string; selector_json: string | null; topic: string }>).map((row) => {
    let tag: string | null = null;
    try {
      const selector = row.selector_json ? JSON.parse(row.selector_json) as { tagEquals?: string } : null;
      tag = selector?.tagEquals ?? null;
    } catch {
      tag = null;
    }
    return {
      metricKey: row.metric_key,
      tag,
      topic: row.topic
    };
  });
  } catch {
    return [];
  }
}

export function inventoryTopicMappings(database: Database.Database) {
  const rows = database.prepare(`
    SELECT metric_key, unit FROM topic_mappings
  `).all() as TopicMappingRow[];
  return rows.map((row) => ({
    metricKey: row.metric_key,
    unit: row.unit,
    ...inventoryLegacyMapping(row.metric_key, row.unit)
  }));
}

export function saveMeterSource(database: Database.Database, draft: Record<string, unknown> & MeterSourceDefinition) {
  const validation = validateMeterSourceWrite(draft);
  if (!validation.ok) {
    throw Object.assign(new Error(validation.message), { fields: validation.fields, code: "E1_ACCOUNTING_FIELD_REJECTED" });
  }
  database.prepare(`
    INSERT INTO meter_sources (
      meter_id, channel_id, metric_scope, metric_key, measurement_kind, energy_flow_role,
      input_unit, scale_decimal, source_revision, epoch_id, enabled, review_status,
      source_timestamp_time_zone, timestamp_policy, expected_cadence_seconds, display_name_zh, display_name_en, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    draft.meterId,
    draft.channelId,
    draft.metricScope,
    draft.metricKey,
    draft.measurementKind,
    draft.energyFlowRole,
    draft.inputUnit,
    draft.scaleDecimal,
    draft.sourceRevision,
    draft.epochId,
    draft.enabled ? 1 : 0,
    draft.reviewStatus,
    draft.sourceTimestampTimeZone,
    draft.timestampPolicy,
    draft.expectedCadenceSeconds,
    draft.displayNameZh ?? null,
    draft.displayNameEn ?? null,
    new Date().toISOString()
  );
  return draft;
}
