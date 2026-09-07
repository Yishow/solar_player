import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import {
  rejectCalendarOverride,
  validateSiteEnergyProfile,
  type ProfilePreviewRequest,
  type SiteEnergyProfileV1,
  type SiteEnergyScope
} from "@solar-display/shared";
import { canonicalJson } from "./authoringCanonicalJson.js";
import { captureProfileSourceSnapshot } from "./profileSourceSnapshot.js";

export type ProfileCalculator = (profile: SiteEnergyProfileV1, period: ProfilePreviewRequest["periodSelection"]) => {
  previewToken: string;
  siteTimeZone: string;
};

function conflict(code: string): never {
  throw Object.assign(new Error(code), { code, statusCode: 409 });
}

function freezeDeep<T>(value: T): T {
  if (!value || typeof value !== "object") return value;
  for (const child of Object.values(value as Record<string, unknown>)) {
    freezeDeep(child);
  }
  return Object.freeze(value);
}

export function getActiveProfile(database: Database.Database, scope: SiteEnergyScope) {
  const row = database.prepare(`
    SELECT * FROM site_energy_profiles WHERE metric_scope = ? AND active = 1 ORDER BY revision DESC LIMIT 1
  `).get(scope) as Record<string, unknown> | undefined;
  return row ? deserialize(row) : null;
}

export function listPersistedProfiles(database: Database.Database, scope: SiteEnergyScope) {
  return (database.prepare("SELECT * FROM site_energy_profiles WHERE metric_scope = ? ORDER BY revision")
    .all(scope) as Array<Record<string, unknown>>).map(deserialize);
}

export function previewProfile(
  database: Database.Database,
  scope: SiteEnergyScope,
  request: ProfilePreviewRequest,
  calculator?: ProfileCalculator
) {
  const draftSnapshot = structuredClone(request.draft);
  const periodSnapshot = structuredClone(request.periodSelection);
  const expectedRevisionSnapshot = request.expectedRevision;
  if (draftSnapshot.metricScope !== scope) {
    throw Object.assign(new Error("PROFILE_SCOPE_MISMATCH"), { code: "PROFILE_SCOPE_MISMATCH", statusCode: 409 });
  }
  const validation = validateSiteEnergyProfile(draftSnapshot);
  if (!validation.ok) {
    throw Object.assign(new Error("PROFILE_INVALID"), { code: "PROFILE_INVALID", statusCode: 422, fields: validation.errors });
  }
  const override = rejectCalendarOverride({
    end: (request as { end?: string }).end,
    start: (request as { start?: string }).start,
    timeZone: (request as { timeZone?: string }).timeZone
  });
  if (!override.ok) {
    throw Object.assign(new Error(override.message), { code: "CALENDAR_OVERRIDE_REJECTED", statusCode: 422, fields: override.fields });
  }
  const active = getActiveProfile(database, scope);
  if ((active?.revision ?? 0) !== expectedRevisionSnapshot) {
    throw Object.assign(new Error("PROFILE_REVISION_CONFLICT"), { code: "PROFILE_REVISION_CONFLICT", statusCode: 409 });
  }
  const sourceSnapshot = captureProfileSourceSnapshot(database, draftSnapshot);
  freezeDeep(draftSnapshot);
  freezeDeep(periodSnapshot);
  const calc = calculator?.(draftSnapshot, periodSnapshot);
  const previewToken = randomUUID();
  database.prepare(`
    INSERT INTO profile_preview_tokens (
      preview_token, metric_scope, expected_revision, draft_json, expires_at, source_snapshot_json
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    previewToken,
    scope,
    expectedRevisionSnapshot,
    canonicalJson(draftSnapshot),
    new Date(Date.now() + 600_000).toISOString(),
    canonicalJson(sourceSnapshot)
  );
  return {
    previewToken,
    profile: draftSnapshot,
    siteTimeZone: draftSnapshot.siteTimeZone,
    calculator: calc ?? null
  };
}

export function applyProfile(
  database: Database.Database,
  scope: SiteEnergyScope,
  input: { draft: SiteEnergyProfileV1; expectedRevision: number; previewToken: string; idempotencyKey: string }
) {
  if (!input.idempotencyKey?.trim()) conflict("IDEMPOTENCY_KEY_REQUIRED");
  const requestJson = canonicalJson({ input, scope });
  return database.transaction(() => {
    const receipt = database.prepare("SELECT request_json, result_json FROM profile_apply_receipts WHERE idempotency_key = ?")
      .get(input.idempotencyKey) as { request_json: string; result_json: string } | undefined;
    if (receipt) {
      if (receipt.request_json !== requestJson) conflict("IDEMPOTENCY_CONFLICT");
      return JSON.parse(receipt.result_json) as SiteEnergyProfileV1;
    }
    if (input.draft.metricScope !== scope) conflict("PROFILE_SCOPE_MISMATCH");
    const preview = database.prepare("SELECT * FROM profile_preview_tokens WHERE preview_token = ?")
      .get(input.previewToken) as {
        metric_scope: string;
        expected_revision: number;
        draft_json: string;
        expires_at: string;
        source_snapshot_json: string | null;
      } | undefined;
    if (!preview || Date.parse(preview.expires_at) <= Date.now()) conflict("PREVIEW_EXPIRED");
    if (preview.metric_scope !== scope) conflict("PROFILE_SCOPE_MISMATCH");
    if (preview.draft_json !== canonicalJson(input.draft) || preview.expected_revision !== input.expectedRevision) {
      conflict("PREVIEW_DRAFT_MISMATCH");
    }
    const active = getActiveProfile(database, scope);
    if ((active?.revision ?? 0) !== input.expectedRevision) {
      throw Object.assign(new Error("PROFILE_REVISION_CONFLICT"), { code: "PROFILE_REVISION_CONFLICT", statusCode: 409 });
    }
    if (!preview.source_snapshot_json) conflict("PROFILE_SOURCE_REVIEW_REQUIRED");
    try {
      const currentSourceSnapshot = captureProfileSourceSnapshot(database, input.draft);
      if (canonicalJson(currentSourceSnapshot) !== preview.source_snapshot_json) {
        conflict("PROFILE_SOURCE_CONFLICT");
      }
    } catch (error) {
      if ((error as { code?: string }).code === "PROFILE_SOURCE_UNAVAILABLE") {
        conflict("PROFILE_SOURCE_CONFLICT");
      }
      throw error;
    }
    const nextRevision = (active?.revision ?? 0) + 1;
    const next: SiteEnergyProfileV1 = { ...input.draft, metricScope: scope, revision: nextRevision };
    database.prepare("UPDATE site_energy_profiles SET active = 0 WHERE metric_scope = ?").run(scope);
    database.prepare(`
      INSERT INTO site_energy_profiles (
        profile_id, metric_scope, revision, schema_version, site_time_zone, status, effective_from,
        site_total_json, departments_json, share_basis_json, active, created_at
      ) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(
      next.profileId,
      scope,
      nextRevision,
      next.siteTimeZone,
      next.status,
      next.effectiveFrom,
      JSON.stringify(next.siteTotal),
      JSON.stringify(next.departments),
      JSON.stringify(next.shareBasis),
      new Date().toISOString()
    );
    database.prepare("INSERT INTO profile_apply_receipts (idempotency_key, request_json, result_json) VALUES (?, ?, ?)")
      .run(input.idempotencyKey, requestJson, JSON.stringify(next));
    return next;
  }).immediate();
}

function deserialize(row: Record<string, unknown>): SiteEnergyProfileV1 {
  return {
    departments: JSON.parse(String(row.departments_json)),
    effectiveFrom: String(row.effective_from),
    metricScope: row.metric_scope as SiteEnergyScope,
    profileId: String(row.profile_id),
    revision: Number(row.revision),
    schemaVersion: 1,
    shareBasis: JSON.parse(String(row.share_basis_json)),
    siteTimeZone: String(row.site_time_zone),
    siteTotal: JSON.parse(String(row.site_total_json)),
    status: row.status as SiteEnergyProfileV1["status"]
  };
}
