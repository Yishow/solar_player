import type Database from "better-sqlite3";
import {
  DEFAULT_BOUNDARY_MAX_AGE_SECONDS,
  inventoryLegacyMapping,
  physicalIdentityChanged,
  validateMeterSourceWrite,
  type MeterSourceDefinition
} from "@solar-display/shared";

export type MeterSourceSaveContext = {
  actor: string;
  reason: string;
  transportChanged?: boolean;
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
  metric_scope: MeterSourceDefinition["metricScope"];
  review_status: MeterSourceDefinition["reviewStatus"];
  scale_decimal: string;
  source_revision: number;
  source_timestamp_time_zone: string | null;
  timestamp_policy: MeterSourceDefinition["timestampPolicy"];
  boundary_max_age_seconds: number;
};

const SOURCE_COLUMNS = `
  meter_id, channel_id, metric_scope, metric_key, measurement_kind, energy_flow_role,
  input_unit, scale_decimal, source_revision, epoch_id, enabled, review_status,
  source_timestamp_time_zone, timestamp_policy, expected_cadence_seconds,
  boundary_max_age_seconds, display_name_zh, display_name_en
`;

function lifecycleConflict(code: string, message = code): never {
  throw Object.assign(new Error(message), { code, statusCode: 409 });
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

function readLatestMeterSource(database: Database.Database, scope: "cl" | "kn", channelId: string) {
  return database.prepare(`
    SELECT ${SOURCE_COLUMNS}
    FROM meter_sources
    WHERE metric_scope = ? AND channel_id = ?
    ORDER BY source_revision DESC, rowid DESC
    LIMIT 1
  `).get(scope, channelId) as MeterSourceRow | undefined;
}

function readSourceRows(database: Database.Database, scope: "cl" | "kn", channelId: string) {
  return database.prepare(`
    SELECT source_revision, epoch_id
    FROM meter_sources
    WHERE metric_scope = ? AND channel_id = ?
  `).all(scope, channelId) as Array<{ source_revision: number; epoch_id: string }>;
}

function readPersistedSource(database: Database.Database, draft: MeterSourceDefinition) {
  return database.prepare(`
    SELECT ${SOURCE_COLUMNS}
    FROM meter_sources
    WHERE metric_scope = ? AND meter_id = ? AND channel_id = ?
      AND source_revision = ? AND epoch_id = ?
  `).get(
    draft.metricScope,
    draft.meterId,
    draft.channelId,
    draft.sourceRevision,
    draft.epochId
  ) as MeterSourceRow | undefined;
}

function insertMeterSource(database: Database.Database, draft: MeterSourceDefinition) {
  database.prepare(`
    INSERT INTO meter_sources (
      meter_id, channel_id, metric_scope, metric_key, measurement_kind, energy_flow_role,
      input_unit, scale_decimal, source_revision, epoch_id, enabled, review_status,
      source_timestamp_time_zone, timestamp_policy, expected_cadence_seconds,
      boundary_max_age_seconds, display_name_zh, display_name_en, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    draft.boundaryMaxAgeSeconds ?? DEFAULT_BOUNDARY_MAX_AGE_SECONDS,
    draft.displayNameZh ?? null,
    draft.displayNameEn ?? null,
    new Date().toISOString()
  );
  const saved = readPersistedSource(database, draft);
  if (!saved) throw new Error("E1_SOURCE_WRITE_FAILED");
  return rowToDefinition(saved);
}

function requireAuditContext(
  context: MeterSourceSaveContext | undefined,
  isInitial: boolean,
  requiresApproval: boolean
) {
  if (!context && isInitial && !requiresApproval) {
    return { actor: "internal", reason: "source-registration" };
  }
  if (!context || typeof context.actor !== "string" || !context.actor.trim()
    || typeof context.reason !== "string" || !context.reason.trim()) {
    lifecycleConflict("E1_SOURCE_AUDIT_CONTEXT_REQUIRED", "E1_SOURCE_AUDIT_CONTEXT_REQUIRED: 來源變更需要操作者與原因。");
  }
  return { actor: context.actor.trim(), reason: context.reason.trim() };
}

function assertEnabledMetricOwnership(database: Database.Database, draft: MeterSourceDefinition) {
  if (!draft.enabled) {
    return;
  }
  const conflict = database.prepare(`
    SELECT 1 AS present
    FROM meter_sources
    WHERE metric_scope = ? AND metric_key = ? AND enabled = 1 AND channel_id <> ?
    LIMIT 1
  `).get(draft.metricScope, draft.metricKey, draft.channelId) as { present: number } | undefined;
  if (conflict) {
    lifecycleConflict("E1_SOURCE_METRIC_KEY_CONFLICT", "E1_SOURCE_METRIC_KEY_CONFLICT: 同一 scope 的 enabled metricKey 已由其他 channel 擁有。");
  }
}

function writeAudit(
  database: Database.Database,
  before: MeterSourceDefinition | null,
  after: MeterSourceDefinition,
  context: { actor: string; reason: string }
) {
  database.prepare(`
    INSERT INTO meter_source_audit (
      metric_scope, channel_id, meter_id, source_revision, epoch_id,
      actor, reason, before_json, after_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    after.metricScope,
    after.channelId,
    after.meterId,
    after.sourceRevision,
    after.epochId,
    context.actor,
    context.reason,
    before ? JSON.stringify(before) : null,
    JSON.stringify(after),
    new Date().toISOString()
  );
}

type TopicMappingRow = {
  metric_key: string;
  unit: string | null;
};

export function listMeterSources(database: Database.Database, scope: "cl" | "kn") {
  return (database.prepare(`
    SELECT ${SOURCE_COLUMNS}
    FROM meter_sources AS source
    WHERE source.metric_scope = ? AND source.enabled = 1
      AND source.rowid = (
        SELECT latest.rowid
        FROM meter_sources AS latest
        WHERE latest.metric_scope = source.metric_scope
          AND latest.channel_id = source.channel_id
        ORDER BY latest.source_revision DESC, latest.rowid DESC
        LIMIT 1
      )
    ORDER BY channel_id
  `).all(scope) as MeterSourceRow[]).map(rowToDefinition);
}

export function getMeterSource(database: Database.Database, scope: "cl" | "kn", channelId: string) {
  const row = readLatestMeterSource(database, scope, channelId);
  return row ? rowToDefinition(row) : null;
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

export function saveMeterSource(
  database: Database.Database,
  draft: Record<string, unknown> & MeterSourceDefinition,
  context?: MeterSourceSaveContext
) {
  const validation = validateMeterSourceWrite(draft);
  if (!validation.ok) {
    throw Object.assign(new Error(validation.message), {
      fields: validation.fields,
      code: validation.code,
      statusCode: 422
    });
  }

  return database.transaction(() => {
    const latestRow = readLatestMeterSource(database, draft.metricScope, draft.channelId);
    const latest = latestRow ? rowToDefinition(latestRow) : null;
    const persistedDraft = {
      ...draft,
      boundaryMaxAgeSeconds: draft.boundaryMaxAgeSeconds
        ?? latest?.boundaryMaxAgeSeconds
        ?? DEFAULT_BOUNDARY_MAX_AGE_SECONDS
    };
    const auditContext = requireAuditContext(
      context,
      latest === null,
      persistedDraft.timestampPolicy === "allow-receive-time-estimate"
    );
    assertEnabledMetricOwnership(database, persistedDraft);

    if (!latest) {
      const persisted = insertMeterSource(database, persistedDraft);
      writeAudit(database, null, persisted, auditContext);
      return persisted;
    }

    const lineageRows = readSourceRows(database, persistedDraft.metricScope, persistedDraft.channelId);
    if (persistedDraft.sourceRevision < latest.sourceRevision) {
      lifecycleConflict("E1_SOURCE_REVISION_STALE", "E1_SOURCE_REVISION_STALE: 來源 revision 必須大於 lineage 最新版本。");
    }

    const identityChanged = physicalIdentityChanged(latest, persistedDraft);
    const meterReplaced = latest.meterId !== persistedDraft.meterId;
    const metricKeyChanged = latest.metricKey !== persistedDraft.metricKey;
    const epochChanged = latest.epochId !== persistedDraft.epochId;
    const transportChanged = context?.transportChanged === true;
    const requiresRevision = identityChanged || metricKeyChanged || epochChanged || transportChanged;

    if (!requiresRevision) {
      if (persistedDraft.sourceRevision !== latest.sourceRevision) {
        lifecycleConflict("E1_SOURCE_REVISION_UNEXPECTED", "E1_SOURCE_REVISION_UNEXPECTED: 未變更來源語意時只能更新 lineage 最新 revision。");
      }
      database.prepare(`
        UPDATE meter_sources
        SET enabled = ?, review_status = ?, expected_cadence_seconds = ?, boundary_max_age_seconds = ?,
          display_name_zh = ?, display_name_en = ?
        WHERE metric_scope = ? AND meter_id = ? AND channel_id = ?
          AND source_revision = ? AND epoch_id = ?
      `).run(
        persistedDraft.enabled ? 1 : 0,
        persistedDraft.reviewStatus,
        persistedDraft.expectedCadenceSeconds,
        persistedDraft.boundaryMaxAgeSeconds,
        persistedDraft.displayNameZh ?? null,
        persistedDraft.displayNameEn ?? null,
        latest.metricScope,
        latest.meterId,
        latest.channelId,
        latest.sourceRevision,
        latest.epochId
      );
      const saved = readPersistedSource(database, latest);
      if (!saved) throw new Error("E1_SOURCE_WRITE_FAILED");
      const persisted = rowToDefinition(saved);
      writeAudit(database, latest, persisted, auditContext);
      return persisted;
    }

    if (persistedDraft.sourceRevision === latest.sourceRevision) {
      lifecycleConflict("E1_SOURCE_REVISION_REUSED", "E1_SOURCE_REVISION_REUSED: 來源語意或 transport 變更必須使用更高 revision。");
    }
    if (lineageRows.some((row) => row.source_revision === persistedDraft.sourceRevision)) {
      lifecycleConflict("E1_SOURCE_REVISION_REUSED", "E1_SOURCE_REVISION_REUSED: 來源 revision 已存在於此 lineage。");
    }
    if (meterReplaced && lineageRows.some((row) => row.epoch_id === persistedDraft.epochId)) {
      lifecycleConflict("E1_SOURCE_EPOCH_REUSED", "E1_SOURCE_EPOCH_REUSED: 更換實體電錶必須使用未重用的 epoch。");
    }
    if (epochChanged && lineageRows.some((row) => row.epoch_id === persistedDraft.epochId)) {
      lifecycleConflict("E1_SOURCE_EPOCH_REUSED", "E1_SOURCE_EPOCH_REUSED: 來源 epoch 已存在於此 lineage。");
    }

    database.prepare(`
      UPDATE meter_sources
      SET enabled = 0
      WHERE metric_scope = ? AND channel_id = ?
    `).run(persistedDraft.metricScope, persistedDraft.channelId);
    const persisted = insertMeterSource(database, persistedDraft);
    writeAudit(database, latest, persisted, auditContext);
    return persisted;
  }).immediate();
}

export function syncSourceTopicMapping(
  database: Database.Database,
  scope: string,
  saved: MeterSourceDefinition,
  previousMetricKey?: string
) {
  if (previousMetricKey && previousMetricKey !== saved.metricKey) {
    const activeOwner = database.prepare(`
      SELECT 1 AS present
      FROM meter_sources
      WHERE metric_scope = ? AND metric_key = ? AND enabled = 1
      LIMIT 1
    `).get(scope, previousMetricKey) as { present: number } | undefined;
    if (!activeOwner) {
      database.prepare("UPDATE topic_mappings SET enabled = 0 WHERE metric_scope = ? AND metric_key = ?")
        .run(scope, previousMetricKey);
    }
  }
  database.prepare("UPDATE topic_mappings SET enabled = ?, unit = ? WHERE metric_scope = ? AND metric_key = ?")
    .run(saved.enabled ? 1 : 0, saved.inputUnit, scope, saved.metricKey);
}

export function checkLegacyMappingMeterSourceConflict(
  database: Database.Database,
  existingMappings: Map<string, { topic: string; unit: string | null; value_path: string | null; enabled: number; multiplier: number | null }>,
  resolvedTopics: Array<{ metricScope: string; metricKey: string; topic: string; unit?: string | null; valuePath?: string | null; enabled?: boolean; multiplier?: number | null }>,
  canonicalizeMetricUnit: (unit: string | undefined) => string | null,
  resolveMultiplier: (input: number | undefined, existing: number) => number
): boolean {
  const registered = database.prepare("SELECT DISTINCT metric_scope, metric_key FROM meter_sources")
    .all() as Array<{ metric_scope: string; metric_key: string }>;
  for (const source of registered) {
    const current = existingMappings.get(`${source.metric_scope}:${source.metric_key}`);
    const next = resolvedTopics.find((topic) => topic.metricScope === source.metric_scope && topic.metricKey === source.metric_key);
    if (!current && !next) continue;
    if (!current || !next || next.topic !== current.topic
      || canonicalizeMetricUnit(next.unit ?? undefined) !== canonicalizeMetricUnit(current.unit ?? undefined)
      || (next.valuePath?.trim() || null) !== current.value_path
      || resolveMultiplier(next.multiplier ?? undefined, current.multiplier ?? 1) !== (current.multiplier ?? 1)
      || (next.enabled === false ? 0 : 1) !== current.enabled) {
      return true;
    }
  }
  return false;
}
