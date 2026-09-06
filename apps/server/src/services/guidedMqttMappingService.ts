import type Database from "better-sqlite3";
import {
  applyMapping,
  previewMapping,
  type MappingPreviewDraft
} from "@solar-display/shared";
import { saveMeterSource } from "./meterSourceCatalogService.js";

export function previewGuidedMapping(draft: MappingPreviewDraft) {
  return previewMapping(draft);
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
  const applied = applyMapping({
    canonicalDraft: input.canonicalDraft,
    idempotencyKey: input.idempotencyKey,
    previewToken: input.previewToken
  });
  const saved = saveMeterSource(database, input.source);
  persistAppliedSelector(database, input.canonicalDraft, input.source.metricKey, input.topic);
  return { applied: applied.applied, channelId: applied.channelId, source: saved };
}
