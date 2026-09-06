import type Database from "better-sqlite3";
import {
  rejectCalendarOverride,
  validateSiteEnergyProfile,
  type ProfilePreviewRequest,
  type SiteEnergyProfileV1,
  type SiteEnergyScope
} from "@solar-display/shared";

export type ProfileCalculator = (profile: SiteEnergyProfileV1, period: ProfilePreviewRequest["periodSelection"]) => {
  previewToken: string;
  siteTimeZone: string;
};

const previews = new Map<string, { expectedRevision: number; profile: SiteEnergyProfileV1 }>();

export function getActiveProfile(database: Database.Database, scope: SiteEnergyScope) {
  const row = database.prepare(`
    SELECT * FROM site_energy_profiles WHERE metric_scope = ? AND active = 1 ORDER BY revision DESC LIMIT 1
  `).get(scope) as Record<string, unknown> | undefined;
  return row ? deserialize(row) : null;
}

export function previewProfile(
  database: Database.Database,
  scope: SiteEnergyScope,
  request: ProfilePreviewRequest,
  calculator?: ProfileCalculator
) {
  if (request.draft.metricScope !== scope) {
    throw Object.assign(new Error("PROFILE_SCOPE_MISMATCH"), { code: "PROFILE_SCOPE_MISMATCH", statusCode: 409 });
  }
  const validation = validateSiteEnergyProfile(request.draft);
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
  if ((active?.revision ?? 0) !== request.expectedRevision && request.expectedRevision !== 0) {
    throw Object.assign(new Error("PROFILE_REVISION_CONFLICT"), { code: "PROFILE_REVISION_CONFLICT", statusCode: 409 });
  }
  const previewToken = `e6-${scope}-r${request.expectedRevision}-${Date.now()}`;
  previews.set(previewToken, { expectedRevision: request.expectedRevision, profile: request.draft });
  const calc = calculator?.({ ...request.draft, siteTimeZone: request.draft.siteTimeZone }, request.periodSelection);
  return {
    previewToken,
    profile: request.draft,
    siteTimeZone: request.draft.siteTimeZone,
    calculator: calc ?? null
  };
}

export function applyProfile(
  database: Database.Database,
  scope: SiteEnergyScope,
  input: { draft: SiteEnergyProfileV1; expectedRevision: number; previewToken: string; idempotencyKey: string }
) {
  const preview = previews.get(input.previewToken);
  if (!preview) {
    throw Object.assign(new Error("PREVIEW_EXPIRED"), { code: "PREVIEW_EXPIRED", statusCode: 409 });
  }
  if (JSON.stringify(preview.profile) !== JSON.stringify(input.draft)) {
    throw Object.assign(new Error("PREVIEW_DRAFT_MISMATCH"), { code: "PREVIEW_DRAFT_MISMATCH", statusCode: 409 });
  }
  const active = getActiveProfile(database, scope);
  if ((active?.revision ?? 0) !== input.expectedRevision) {
    throw Object.assign(new Error("PROFILE_REVISION_CONFLICT"), { code: "PROFILE_REVISION_CONFLICT", statusCode: 409 });
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
  previews.delete(input.previewToken);
  return next;
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
