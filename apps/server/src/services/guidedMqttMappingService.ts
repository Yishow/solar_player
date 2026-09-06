import type Database from "better-sqlite3";
import {
  previewMapping,
  type MappingPreviewDraft
} from "@solar-display/shared";
import { saveMeterSource } from "./meterSourceCatalogService.js";

const TOKEN_TTL_MS = 10 * 60 * 1000;

export function previewGuidedMapping(database: Database.Database, draft: MappingPreviewDraft) {
  const preview = previewMapping(draft);
  const now = new Date();
  database.prepare(`
    INSERT INTO mapping_preview_tokens (preview_token, canonical_draft_json, created_at, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(
    preview.previewToken,
    JSON.stringify(preview.canonicalDraft),
    now.toISOString(),
    new Date(now.getTime() + TOKEN_TTL_MS).toISOString()
  );
  return preview;
}

export function persistAppliedSelector(
  database: Database.Database,
  draft: MappingPreviewDraft,
  metricKey: string,
  topic = `${draft.metricScope}/${draft.channelId}`
) {
  const selectorJson = JSON.stringify(draft.selector);
  const valuePath = draft.selector.path.join(".");
  const existing = database.prepare(`
    SELECT id FROM topic_mappings WHERE metric_scope = ? AND metric_key = ? LIMIT 1
  `).get(draft.metricScope, metricKey) as { id: number } | undefined;
  if (existing) {
    database.prepare(`
      UPDATE topic_mappings SET value_path = ?, selector_json = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(valuePath, selectorJson, existing.id);
    return;
  }
  database.prepare(`
    INSERT INTO topic_mappings (metric_scope, metric_key, topic, unit, value_path, selector_json, multiplier, offset, decimal_places, enabled, created_at, updated_at)
    VALUES (?, ?, ?, 'kWh', ?, ?, 1, 0, 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(draft.metricScope, metricKey, topic, valuePath, selectorJson);
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
  const stored = database.prepare(`
    SELECT canonical_draft_json, expires_at FROM mapping_preview_tokens WHERE preview_token = ?
  `).get(input.previewToken) as { canonical_draft_json: string; expires_at: string } | undefined;
  if (!stored || stored.expires_at < new Date().toISOString()) {
    throw Object.assign(new Error("PREVIEW_EXPIRED"), { code: "PREVIEW_EXPIRED" });
  }
  if (stored.canonical_draft_json !== JSON.stringify(input.canonicalDraft)) {
    throw Object.assign(new Error("PREVIEW_DRAFT_MISMATCH"), { code: "PREVIEW_DRAFT_MISMATCH" });
  }
  const saved = saveMeterSource(database, input.source);
  persistAppliedSelector(database, input.canonicalDraft, input.source.metricKey, input.topic);
  return { applied: true, channelId: input.canonicalDraft.channelId, source: saved };
}
