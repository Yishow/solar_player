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

export function applyGuidedMapping(
  database: Database.Database,
  input: {
    canonicalDraft: MappingPreviewDraft;
    idempotencyKey: string;
    meterId: string;
    previewToken: string;
    source: Parameters<typeof saveMeterSource>[1];
  }
) {
  const applied = applyMapping({
    canonicalDraft: input.canonicalDraft,
    idempotencyKey: input.idempotencyKey,
    previewToken: input.previewToken
  });
  const saved = saveMeterSource(database, input.source);
  return { applied: applied.applied, channelId: applied.channelId, source: saved };
}
