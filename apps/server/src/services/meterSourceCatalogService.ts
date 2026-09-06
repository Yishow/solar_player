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
