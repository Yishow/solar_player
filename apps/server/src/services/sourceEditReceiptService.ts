import { createHash, randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type { MetricScope, SourceMappingConfiguration } from "@solar-display/shared";

export type StoredTopicMappingRow = {
  config_revision: number | null;
  created_at: string | null;
  decimal_places: number | null;
  enabled: number;
  id: number;
  metric_key: string;
  metric_scope: MetricScope;
  multiplier: number | null;
  name_en: string | null;
  name_zh: string | null;
  offset: number | null;
  selector_json: string | null;
  source_ref: string | null;
  topic: string;
  unit: string | null;
  updated_at: string | null;
  value_path: string | null;
};

function canonicalizePayload(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalizePayload);
  }

  if (value !== null && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return Object.keys(object).sort().reduce<Record<string, unknown>>((result, key) => {
      if (object[key] !== undefined) {
        result[key] = canonicalizePayload(object[key]);
      }
      return result;
    }, {});
  }

  return value;
}

export function computeCanonicalHash(payload: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalizePayload(payload)))
    .digest("hex");
}

const SOURCE_EDIT_ERROR_CODES = new Set([
  "ACCESS_DENIED",
  "COLLECTION_REVISION_CONFLICT",
  "DERIVED_METRIC_IDENTITY_CONFLICT",
  "DUPLICATE_METRIC_IDENTITY",
  "E1_SOURCE_IMPACT_UNKNOWN",
  "E1_SOURCE_IN_USE",
  "E1_SOURCE_REVISION_REQUIRED",
  "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD",
  "IDEMPOTENCY_REPLAY_EXPIRED",
  "INVALID_METRIC_SCOPE",
  "LEGACY_WRITE_REQUIRES_REVISION",
  "MANAGED_SOURCE_METRIC_CONFLICT",
  "SOURCE_NOT_FOUND",
  "SOURCE_REVISION_CONFLICT"
]);

export type SourceEditDomainError = {
  code: string;
  currentCollectionRevision?: number;
  currentRevision?: number;
  sourceRef?: string;
  statusCode: number;
};

/** Return only the known, safe fields that generic source-edit routes may expose. */
export function toSourceEditDomainError(error: unknown): SourceEditDomainError | null {
  if (error === null || typeof error !== "object") return null;
  const candidate = error as Record<string, unknown>;
  if (typeof candidate.code !== "string" || !SOURCE_EDIT_ERROR_CODES.has(candidate.code)) return null;

  const statusCode = typeof candidate.statusCode === "number"
    && Number.isInteger(candidate.statusCode)
    && candidate.statusCode >= 400
    && candidate.statusCode < 500
    ? candidate.statusCode
    : 409;

  return {
    code: candidate.code,
    ...(typeof candidate.currentCollectionRevision === "number"
      ? { currentCollectionRevision: candidate.currentCollectionRevision }
      : {}),
    ...(typeof candidate.currentRevision === "number" ? { currentRevision: candidate.currentRevision } : {}),
    ...(typeof candidate.sourceRef === "string" ? { sourceRef: candidate.sourceRef } : {}),
    statusCode
  };
}

export function readReceiptReplay(
  database: Database.Database,
  idempotencyKey: string,
  canonicalHash: string
) {
  const existing = findReceipt(database, idempotencyKey);
  if (!existing) return null;

  if (new Date(existing.expires_at).getTime() < Date.now()) {
    throw Object.assign(new Error("IDEMPOTENCY_REPLAY_EXPIRED"), {
      code: "IDEMPOTENCY_REPLAY_EXPIRED",
      statusCode: 410
    });
  }
  if (existing.canonical_request_hash !== canonicalHash) {
    throw Object.assign(new Error("IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD"), {
      code: "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD",
      statusCode: 409
    });
  }

  return {
    body: JSON.parse(existing.response_json) as Record<string, unknown>,
    replayed: true,
    statusCode: existing.status_code
  };
}

export function findReceipt(database: Database.Database, idempotencyKey: string) {
  return database
    .prepare(`
      SELECT idempotency_key, source_ref, canonical_request_hash, status_code, response_json, expires_at
      FROM data_hub_source_mutation_receipts
      WHERE idempotency_key = ?
    `)
    .get(idempotencyKey) as
    | {
        canonical_request_hash: string;
        expires_at: string;
        idempotency_key: string;
        response_json: string;
        source_ref: string;
        status_code: number;
      }
    | undefined;
}

export function storeReceipt(
  database: Database.Database,
  receipt: {
    canonicalHash: string;
    idempotencyKey: string;
    response: unknown;
    sourceRef: string;
    statusCode: number;
  }
) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  database
    .prepare(`
      INSERT INTO data_hub_source_mutation_receipts (
        idempotency_key, source_ref, canonical_request_hash, status_code, response_json, created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
      ON CONFLICT(idempotency_key) DO UPDATE SET
        response_json = excluded.response_json,
        status_code = excluded.status_code,
        expires_at = excluded.expires_at
    `)
    .run(
      receipt.idempotencyKey,
      receipt.sourceRef,
      receipt.canonicalHash,
      receipt.statusCode,
      JSON.stringify(receipt.response),
      expiresAt
    );
}

export function readCollectionRevision(database: Database.Database): number {
  const row = database
    .prepare("SELECT value FROM system_settings WHERE key = 'data_hub_topics_collection_revision'")
    .get() as { value: string } | undefined;
  if (!row) return 1;
  const parsed = Number.parseInt(row.value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function incrementCollectionRevision(database: Database.Database): number {
  const next = readCollectionRevision(database) + 1;
  database
    .prepare(`
      INSERT INTO system_settings (key, value, updated_at)
      VALUES ('data_hub_topics_collection_revision', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `)
    .run(String(next));
  return next;
}

export function generateSourceRef(scope: MetricScope, metricKey: string): string {
  const sanitizedKey = metricKey.replace(/[^a-zA-Z0-9_]/gu, "_");
  const suffix = randomUUID().replace(/-/gu, "").slice(0, 8);
  return `src_${scope}_${sanitizedKey}_${suffix}`;
}

export function toConfiguration(row: StoredTopicMappingRow): SourceMappingConfiguration {
  return {
    decimalPlaces: row.decimal_places ?? (row.unit === "%" ? 1 : 2),
    enabled: row.enabled === 1,
    metricKey: row.metric_key,
    metricScope: row.metric_scope,
    multiplier: row.multiplier ?? 1,
    nameEn: row.name_en,
    nameZh: row.name_zh,
    offset: row.offset ?? 0,
    topic: row.topic,
    unit: row.unit ?? "",
    valuePath: row.value_path ?? ""
  };
}
