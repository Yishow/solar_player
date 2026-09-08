import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import {
  isEnergyFlowRole, isMeterMeasurementKind, parseDecimalString, validateMeterSourceWrite,
  type MappingPreviewDraft, type MeterSourceDefinition
} from "@solar-display/shared";
import { saveMeterSource, syncSourceTopicMapping } from "./meterSourceCatalogService.js";
import { assertUnownedMetricDestination } from "./metricDestinationOwnershipService.js";
import { canonicalJson } from "./authoringCanonicalJson.js";

const TOKEN_TTL_MS = 10 * 60 * 1000;

function conflict(code: string): never {
  throw Object.assign(new Error(code), { code, statusCode: 409 });
}

function reviewedDraft(draft: MappingPreviewDraft) {
  const source = draft?.source;
  if (!source || !draft.topic || /[+#\u0000]/u.test(draft.topic)) conflict("SOURCE_REVIEW_REQUIRED");
  if (!validateMeterSourceWrite(source).ok
    || (source.metricScope !== "cl" && source.metricScope !== "kn")
    || !isMeterMeasurementKind(source.measurementKind) || !isEnergyFlowRole(source.energyFlowRole)
    || source.reviewStatus !== "reviewed" || typeof source.enabled !== "boolean"
    || !Number.isInteger(source.sourceRevision) || source.sourceRevision < 1
    || !["meterId", "channelId", "metricKey", "epochId", "inputUnit"].every((key) => typeof source[key as keyof typeof source] === "string" && String(source[key as keyof typeof source]).trim())
    || !["source-required", "allow-receive-time-estimate"].includes(source.timestampPolicy)
    || source.channelId !== draft.channelId || source.metricScope !== draft.metricScope
    || source.measurementKind !== draft.measurementKind || source.energyFlowRole !== draft.energyFlowRole
    || source.timestampPolicy !== draft.timestampPolicy
    || !Array.isArray(draft.selector?.path) || !draft.selector.path.every((part) => typeof part === "string")
    || (draft.selector.tagEquals !== undefined && typeof draft.selector.tagEquals !== "string")) {
    conflict("PREVIEW_DRAFT_MISMATCH");
  }
  if (parseDecimalString(source.scaleDecimal) <= 0n) conflict("PREVIEW_DRAFT_MISMATCH");
  return JSON.parse(canonicalJson({ ...draft, source, topic: draft.topic })) as MappingPreviewDraft & {
    source: NonNullable<MappingPreviewDraft["source"]>; topic: string;
  };
}

function targetSnapshot(database: Database.Database, draft: ReturnType<typeof reviewedDraft>) {
  const { metricScope, metricKey, channelId } = draft.source;
  return canonicalJson({
    mappings: database.prepare("SELECT * FROM topic_mappings WHERE metric_scope = ? AND metric_key = ? ORDER BY id").all(metricScope, metricKey),
    sources: database.prepare("SELECT * FROM meter_sources WHERE metric_scope = ? AND (metric_key = ? OR channel_id = ?) ORDER BY meter_id, channel_id, source_revision, epoch_id").all(metricScope, metricKey, channelId)
  });
}

export function previewGuidedMapping(database: Database.Database, draft: MappingPreviewDraft) {
  const canonicalDraft = reviewedDraft(draft);
  assertUnownedMetricDestination(database, {
    metricKey: canonicalDraft.source.metricKey,
    metricScope: canonicalDraft.source.metricScope
  });
  const previewToken = randomUUID();
  const now = new Date();
  database.prepare(`
    INSERT INTO mapping_preview_tokens (preview_token, canonical_draft_json, created_at, expires_at, target_snapshot_json)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    previewToken,
    canonicalJson(canonicalDraft),
    now.toISOString(),
    new Date(now.getTime() + TOKEN_TTL_MS).toISOString(),
    targetSnapshot(database, canonicalDraft)
  );
  return { canonicalDraft, previewToken };
}

/**
 * Upserts the transport half of a mapping (topic, value path, selector) and then
 * hands the enabled/unit pair to the one synchronization responsibility shared
 * with the existing source-management path. The saved source — not the request
 * flag — decides that state, so an insert can never be enabled on its own.
 */
export function persistAppliedSelector(
  database: Database.Database,
  draft: MappingPreviewDraft,
  saved: MeterSourceDefinition,
  topic: string
) {
  const selectorJson = JSON.stringify(draft.selector);
  const valuePath = draft.selector.path.join(".");
  const existing = database.prepare(`
    SELECT id FROM topic_mappings WHERE metric_scope = ? AND metric_key = ? LIMIT 1
  `).get(draft.metricScope, saved.metricKey) as { id: number } | undefined;
  if (existing) {
    database.prepare(`
      UPDATE topic_mappings SET topic = ?, value_path = ?, selector_json = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(topic, valuePath, selectorJson, existing.id);
  } else {
    database.prepare(`
      INSERT INTO topic_mappings (metric_scope, metric_key, topic, unit, value_path, selector_json, multiplier, offset, decimal_places, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, 0, 3, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(draft.metricScope, saved.metricKey, topic, saved.inputUnit, valuePath, selectorJson, saved.enabled ? 1 : 0);
  }
  syncSourceTopicMapping(database, draft.metricScope, saved);
}

export function applyGuidedMapping(
  database: Database.Database,
  input: {
    canonicalDraft: MappingPreviewDraft;
    idempotencyKey: string;
    meterId: string;
    previewToken: string;
    source: Parameters<typeof saveMeterSource>[1];
    topic?: string;
  }
) {
  if (!input.idempotencyKey?.trim()) conflict("IDEMPOTENCY_KEY_REQUIRED");
  const requestJson = canonicalJson(input);
  return database.transaction(() => {
    const receipt = database.prepare("SELECT request_json, result_json FROM mapping_apply_receipts WHERE idempotency_key = ?")
      .get(input.idempotencyKey) as { request_json: string; result_json: string } | undefined;
    if (receipt) {
      if (receipt.request_json !== requestJson) conflict("IDEMPOTENCY_CONFLICT");
      const replayed = JSON.parse(receipt.result_json) as { applied: true; channelId: string; source: MeterSourceDefinition };
      // A receipt replays a committed write; it is not a pass to keep activating a
      // destination another authority has claimed since. This redoes no write.
      assertUnownedMetricDestination(database, {
        metricKey: replayed.source.metricKey,
        metricScope: replayed.source.metricScope
      });
      return replayed;
    }
    const stored = database.prepare(`
      SELECT canonical_draft_json, expires_at, target_snapshot_json FROM mapping_preview_tokens WHERE preview_token = ?
    `).get(input.previewToken) as { canonical_draft_json: string; expires_at: string; target_snapshot_json: string | null } | undefined;
    if (!stored || Date.parse(stored.expires_at) <= Date.now()) conflict("PREVIEW_EXPIRED");
    const draft = reviewedDraft(input.canonicalDraft);
    if (stored.canonical_draft_json !== canonicalJson(draft)
      || canonicalJson(input.source) !== canonicalJson(draft.source)
      || input.meterId !== draft.source.meterId
      || (input.topic !== undefined && input.topic !== draft.topic)) conflict("PREVIEW_DRAFT_MISMATCH");
    if (stored.target_snapshot_json !== targetSnapshot(database, draft)) conflict("PREVIEW_STALE");
    // Ownership is re-evaluated here because a valid token only proves the draft
    // was reviewed, not that the destination is still free to take.
    assertUnownedMetricDestination(database, {
      metricKey: draft.source.metricKey,
      metricScope: draft.source.metricScope
    });
    const mapping = database.prepare("SELECT topic, selector_json FROM topic_mappings WHERE metric_scope = ? AND metric_key = ? LIMIT 1")
      .get(draft.metricScope, draft.source.metricKey) as { topic: string; selector_json: string | null } | undefined;
    let previousSelector: unknown = null;
    try { previousSelector = mapping?.selector_json ? JSON.parse(mapping.selector_json) : null; } catch { /* Invalid legacy selectors require a new revision. */ }
    const transportChanged = Boolean(mapping && (mapping.topic !== draft.topic || canonicalJson(previousSelector) !== canonicalJson(draft.selector)));
    const saved = saveMeterSource(database, draft.source, {
      actor: "management", reason: "reviewed-mqtt-mapping-apply", transportChanged
    });
    persistAppliedSelector(database, draft, saved, draft.topic);
    const result = { applied: true as const, channelId: draft.channelId, source: saved };
    database.prepare("INSERT INTO mapping_apply_receipts (idempotency_key, request_json, result_json, created_at) VALUES (?, ?, ?, ?)")
      .run(input.idempotencyKey, requestJson, JSON.stringify(result), new Date().toISOString());
    return result;
  }).immediate();
}
