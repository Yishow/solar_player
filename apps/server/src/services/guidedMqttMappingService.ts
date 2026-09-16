import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import {
  isEnergyFlowRole, isMeterMeasurementKind, parseDecimalString, validateMeterSourceWrite,
  type GuidedMappingBatchApplyResult, type GuidedMappingBatchPreviewResult,
  type MappingPreviewDraft, type MeterSourceDefinition
} from "@solar-display/shared";
import { getMeterSource, saveMeterSource, syncSourceTopicMapping } from "./meterSourceCatalogService.js";
import { assertUnownedMetricDestination } from "./metricDestinationOwnershipService.js";
import { assertDestructiveSourceMutationAllowed } from "./sourceImpactService.js";
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
  const previewToken = storePreviewToken(database, canonicalDraft);
  return { canonicalDraft, previewToken };
}

type BatchDraftInput = {
  canonicalDraft?: MappingPreviewDraft;
  draft?: MappingPreviewDraft;
  rowId?: string;
};

type NormalizedBatchDraft = {
  canonicalDraft: ReturnType<typeof reviewedDraft>;
  rowId: string;
};

const MAX_BATCH_ITEMS = 200;

function normalizeBatchDrafts(items: unknown): NormalizedBatchDraft[] {
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_BATCH_ITEMS) {
    conflict("MAPPING_BATCH_INVALID");
  }
  const rowIds = new Set<string>();
  const targetChannels = new Set<string>();
  const targetMeters = new Set<string>();
  const targetMetrics = new Set<string>();
  let scope: MappingPreviewDraft["metricScope"] | null = null;
  return (items as BatchDraftInput[]).map((item, index) => {
    const rowId = typeof item?.rowId === "string" && item.rowId.trim() ? item.rowId.trim() : `row-${index + 1}`;
    if (rowIds.has(rowId)) conflict("MAPPING_BATCH_DUPLICATE_ROW");
    rowIds.add(rowId);
    const rawDraft = item?.canonicalDraft ?? item?.draft ?? (item as unknown as MappingPreviewDraft);
    const canonicalDraft = reviewedDraft(rawDraft as MappingPreviewDraft);
    scope ??= canonicalDraft.metricScope;
    if (canonicalDraft.metricScope !== scope) conflict("MAPPING_BATCH_SCOPE_MISMATCH");
    const source = canonicalDraft.source;
    const channelTarget = `${source.metricScope}:${source.channelId}`;
    const meterTarget = `${source.metricScope}:${source.meterId}`;
    const metricTarget = `${source.metricScope}:${source.metricKey}`;
    if (targetChannels.has(channelTarget) || targetMeters.has(meterTarget) || targetMetrics.has(metricTarget)) {
      conflict("MAPPING_BATCH_TARGET_CONFLICT");
    }
    targetChannels.add(channelTarget);
    targetMeters.add(meterTarget);
    targetMetrics.add(metricTarget);
    return { canonicalDraft, rowId };
  });
}

function storePreviewToken(
  database: Database.Database,
  canonicalDraft: ReturnType<typeof reviewedDraft>,
  previewToken = randomUUID()
) {
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
  return previewToken;
}

function sameBinding(database: Database.Database, draft: ReturnType<typeof reviewedDraft>) {
  const existing = getMeterSource(database, draft.metricScope, draft.source.channelId);
  if (!existing) return false;
  const sourceKeys: Array<keyof MeterSourceDefinition> = [
    "meterId", "channelId", "metricScope", "metricKey", "measurementKind", "energyFlowRole",
    "inputUnit", "scaleDecimal", "sourceRevision", "epochId", "enabled", "reviewStatus",
    "sourceTimestampTimeZone", "timestampPolicy", "expectedCadenceSeconds", "displayNameZh", "displayNameEn"
  ];
  if (sourceKeys.some((key) => (existing[key] ?? null) !== (draft.source[key] ?? null))) return false;
  const mapping = database.prepare(
    "SELECT topic, selector_json FROM topic_mappings WHERE metric_scope = ? AND metric_key = ? LIMIT 1"
  ).get(draft.metricScope, draft.source.metricKey) as { topic: string; selector_json: string | null } | undefined;
  if (!mapping || mapping.topic !== draft.topic) return false;
  let selector: unknown = null;
  try { selector = mapping.selector_json ? JSON.parse(mapping.selector_json) : null; } catch { return false; }
  return canonicalJson(selector) === canonicalJson(draft.selector);
}

export function previewGuidedMappingBatch(
  database: Database.Database,
  items: unknown
): GuidedMappingBatchPreviewResult {
  const drafts = normalizeBatchDrafts(items);
  for (const { canonicalDraft } of drafts) {
    assertUnownedMetricDestination(database, {
      metricKey: canonicalDraft.source.metricKey,
      metricScope: canonicalDraft.source.metricScope
    });
  }
  return database.transaction(() => {
    const previews = drafts.map(({ canonicalDraft, rowId }) => ({
      canonicalDraft,
      previewToken: storePreviewToken(database, canonicalDraft),
      reused: sameBinding(database, canonicalDraft),
      rowId
    }));
    const batchToken = randomUUID();
    const now = new Date();
    database.prepare(`
      INSERT INTO mapping_preview_tokens (preview_token, canonical_draft_json, created_at, expires_at, target_snapshot_json)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      batchToken,
      canonicalJson({
        kind: "guided-mapping-batch",
        items: previews.map(({ canonicalDraft, previewToken, rowId }) => ({ canonicalDraft, previewToken, rowId }))
      }),
      now.toISOString(),
      new Date(now.getTime() + TOKEN_TTL_MS).toISOString(),
      canonicalJson(previews.map(({ canonicalDraft }) => targetSnapshot(database, canonicalDraft)))
    );
    return { batchToken, items: previews };
  }).immediate();
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
  topic: string,
  previousMetricKey?: string
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
  syncSourceTopicMapping(database, draft.metricScope, saved, previousMetricKey);
}

type GuidedMappingApplyInput = {
  canonicalDraft: MappingPreviewDraft;
  idempotencyKey: string;
  meterId: string;
  previewToken: string;
  source: Parameters<typeof saveMeterSource>[1];
  topic?: string;
};

type PreparedGuidedMapping = {
  draft: ReturnType<typeof reviewedDraft>;
  previousSource: MeterSourceDefinition | null;
  transportChanged: boolean;
};

function readApplyReceipt(database: Database.Database, idempotencyKey: string, requestJson: string) {
  const receipt = database.prepare("SELECT request_json, result_json FROM mapping_apply_receipts WHERE idempotency_key = ?")
    .get(idempotencyKey) as { request_json: string; result_json: string } | undefined;
  if (!receipt) return null;
  if (receipt.request_json !== requestJson) conflict("IDEMPOTENCY_CONFLICT");
  return JSON.parse(receipt.result_json) as unknown;
}

function assertReceiptDestinationsUnowned(database: Database.Database, result: unknown) {
  const sources = result && typeof result === "object" && "items" in result && Array.isArray(result.items)
    ? result.items.map((item) => item && typeof item === "object" && "source" in item ? item.source : null)
    : [result && typeof result === "object" && "source" in result ? result.source : null];
  for (const source of sources) {
    if (!source || typeof source !== "object") conflict("MAPPING_APPLY_FAILED");
    const typed = source as MeterSourceDefinition;
    assertUnownedMetricDestination(database, {
      metricKey: typed.metricKey,
      metricScope: typed.metricScope
    });
  }
}

function prepareGuidedMapping(database: Database.Database, input: GuidedMappingApplyInput): PreparedGuidedMapping {
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
  assertUnownedMetricDestination(database, {
    metricKey: draft.source.metricKey,
    metricScope: draft.source.metricScope
  });
  const mapping = database.prepare("SELECT topic, selector_json FROM topic_mappings WHERE metric_scope = ? AND metric_key = ? LIMIT 1")
    .get(draft.metricScope, draft.source.metricKey) as { topic: string; selector_json: string | null } | undefined;
  let previousSelector: unknown = null;
  try { previousSelector = mapping?.selector_json ? JSON.parse(mapping.selector_json) : null; } catch { /* Invalid legacy selectors require a new revision. */ }
  const transportChanged = Boolean(mapping && (mapping.topic !== draft.topic || canonicalJson(previousSelector) !== canonicalJson(draft.selector)));
  const previousSource = getMeterSource(database, draft.source.metricScope, draft.source.channelId);
  assertDestructiveSourceMutationAllowed(database, previousSource, draft.source);
  return { draft, previousSource, transportChanged };
}

function commitPreparedGuidedMapping(database: Database.Database, prepared: PreparedGuidedMapping) {
  const saved = saveMeterSource(database, prepared.draft.source, {
    actor: "management", reason: "reviewed-mqtt-mapping-apply", transportChanged: prepared.transportChanged
  });
  persistAppliedSelector(database, prepared.draft, saved, prepared.draft.topic, prepared.previousSource?.metricKey);
  return { applied: true as const, channelId: prepared.draft.channelId, source: saved };
}

export function applyGuidedMapping(database: Database.Database, input: GuidedMappingApplyInput) {
  if (!input.idempotencyKey?.trim()) conflict("IDEMPOTENCY_KEY_REQUIRED");
  const requestJson = canonicalJson(input);
  return database.transaction(() => {
    const replayed = readApplyReceipt(database, input.idempotencyKey, requestJson);
    if (replayed) {
      // A receipt replays a committed write; it is not a pass to keep activating a
      // destination another authority has claimed since. This redoes no write.
      assertReceiptDestinationsUnowned(database, replayed);
      return replayed as { applied: true; channelId: string; source: MeterSourceDefinition };
    }
    const prepared = prepareGuidedMapping(database, input);
    const result = commitPreparedGuidedMapping(database, prepared);
    database.prepare("INSERT INTO mapping_apply_receipts (idempotency_key, request_json, result_json, created_at) VALUES (?, ?, ?, ?)")
      .run(input.idempotencyKey, requestJson, JSON.stringify(result), new Date().toISOString());
    return result;
  }).immediate();
}

type GuidedMappingBatchApplyInput = {
  batchToken: string;
  idempotencyKey: string;
  items: Array<GuidedMappingApplyInput & { rowId: string }>;
};

function assertBatchTokenMatches(
  database: Database.Database,
  batchToken: string,
  items: Array<{ rowId: string; canonicalDraft: MappingPreviewDraft; previewToken: string }>
) {
  const stored = database.prepare(
    "SELECT canonical_draft_json, expires_at FROM mapping_preview_tokens WHERE preview_token = ?"
  ).get(batchToken) as { canonical_draft_json: string; expires_at: string } | undefined;
  if (!stored || Date.parse(stored.expires_at) <= Date.now()) conflict("PREVIEW_EXPIRED");
  let parsed: { kind?: string; items?: unknown };
  try { parsed = JSON.parse(stored.canonical_draft_json) as typeof parsed; } catch { conflict("PREVIEW_DRAFT_MISMATCH"); }
  if (parsed.kind !== "guided-mapping-batch" || !Array.isArray(parsed.items)
    || canonicalJson(parsed.items) !== canonicalJson(items)) conflict("PREVIEW_DRAFT_MISMATCH");
}

export function applyGuidedMappingBatch(
  database: Database.Database,
  input: GuidedMappingBatchApplyInput
): GuidedMappingBatchApplyResult {
  if (!input.idempotencyKey?.trim()) conflict("IDEMPOTENCY_KEY_REQUIRED");
  const requestJson = canonicalJson(input);
  return database.transaction(() => {
    const replayed = readApplyReceipt(database, input.idempotencyKey, requestJson);
    if (replayed) {
      assertReceiptDestinationsUnowned(database, replayed);
      return replayed as GuidedMappingBatchApplyResult;
    }
    const itemDrafts = input.items.map(({ canonicalDraft, previewToken, rowId }) => ({ canonicalDraft, previewToken, rowId }));
    const normalized = normalizeBatchDrafts(itemDrafts);
    if (normalized.some(({ rowId }, index) => rowId !== itemDrafts[index]?.rowId)) conflict("MAPPING_BATCH_INVALID");
    assertBatchTokenMatches(database, input.batchToken, itemDrafts);
    const prepared = input.items.map((item) => prepareGuidedMapping(database, item));
    const results = prepared.map((entry, index) => ({
      ...commitPreparedGuidedMapping(database, entry),
      rowId: input.items[index]!.rowId
    }));
    const result: GuidedMappingBatchApplyResult = { applied: true, items: results };
    database.prepare("INSERT INTO mapping_apply_receipts (idempotency_key, request_json, result_json, created_at) VALUES (?, ?, ?, ?)")
      .run(input.idempotencyKey, requestJson, JSON.stringify(result), new Date().toISOString());
    return result;
  }).immediate();
}
