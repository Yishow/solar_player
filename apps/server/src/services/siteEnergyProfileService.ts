import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import {
  rejectCalendarOverride,
  resolveReviewPeriodConsumption,
  validateSiteEnergyProfile,
  type PeriodConsumptionResult,
  type ProfileApplyResponse,
  type ProfilePreviewResponse,
  type ProfilePreviewRequest,
  type SiteEnergyProfileV1,
  type SiteEnergyScope
} from "@solar-display/shared";
import { canonicalJson } from "./authoringCanonicalJson.js";
import { captureProfileSourceSnapshot, type ProfileSourceSnapshot } from "./profileSourceSnapshot.js";
import { loadAcceptedSamples } from "./periodConsumptionService.js";
import { readFreshnessPolicy } from "./freshnessPolicyService.js";
import { buildReviewReadiness, readProfileReadiness } from "./profileReadinessService.js";
import { getActiveProfile } from "./siteEnergyProfileRepository.js";
import { resolveProfileEvidence } from "./profileEvidence.js";
import type { DefinitionRevisionItem, PeriodSelection } from "@solar-display/shared";

export { getActiveProfile, listPersistedProfiles } from "./siteEnergyProfileRepository.js";

export type ProfileCalculator = (
  profile: SiteEnergyProfileV1,
  period: ProfilePreviewRequest["periodSelection"],
  context: { asOf: string; sourceSnapshot: ProfileSourceSnapshot[] }
) => ProfilePreviewResponse["calculator"];

type ReviewCalculation = {
  calculator: ProfilePreviewResponse["calculator"];
  readiness: ProfilePreviewResponse["readiness"];
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

function reviewDefinitionRevisions(sourceSnapshot: ProfileSourceSnapshot[]): DefinitionRevisionItem[] {
  return sourceSnapshot.map(({ channelId, epochId, meterId, sourceRevision }) => ({
    channelId,
    epochId,
    meterId,
    sourceRevision
  }));
}

function calculateReview(
  database: Database.Database,
  profile: SiteEnergyProfileV1,
  period: PeriodSelection,
  asOf: string,
  sourceSnapshot: ProfileSourceSnapshot[]
): ReviewCalculation {
  const samples = loadAcceptedSamples(database, profile.metricScope);
  const freshnessPolicy = readFreshnessPolicy(database).policy;
  const definitionRevision = reviewDefinitionRevisions(sourceSnapshot);
  const resolve = (meterIds: string[]): PeriodConsumptionResult => resolveReviewPeriodConsumption({
    asOf,
    definitionRevision,
    freshnessPolicy,
    meterIds,
    period,
    profile,
    reviewContext: "profile-draft",
    samples
  });

  const evidence = resolveProfileEvidence(profile, (meterIds) => resolve(meterIds));
  const basisCalculatorResult = evidence.basis ?? resolve([]);
  const periodResult = evidence.period ?? resolve([]);

  return {
    calculator: {
      basis: { memberChannelIds: evidence.basisIds, result: basisCalculatorResult },
      departments: evidence.departments,
      period: periodResult
    },
    readiness: buildReviewReadiness({
      asOf,
      basis: evidence.basis,
      departments: evidence.departments,
      period: profile.siteTotal.kind === "meter-set" ? periodResult : null,
      periodSelection: period,
      profile,
      sourceSnapshots: sourceSnapshot
    })
  };
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
  freezeDeep(sourceSnapshot);
  const asOf = new Date().toISOString();
  let review: ReviewCalculation;
  try {
    if (calculator) {
      const calculatorResult = calculator(draftSnapshot, periodSnapshot, freezeDeep({ asOf, sourceSnapshot }));
      review = { calculator: calculatorResult, readiness: buildReviewReadiness({
        asOf,
        basis: calculatorResult.basis.result,
        departments: calculatorResult.departments,
        period: calculatorResult.period,
        periodSelection: periodSnapshot,
        profile: draftSnapshot,
        sourceSnapshots: sourceSnapshot
      }) };
    } else {
      review = calculateReview(database, draftSnapshot, periodSnapshot, asOf, sourceSnapshot);
    }
  } catch (error) {
    throw Object.assign(error instanceof Error ? error : new Error("PROFILE_CALCULATOR_FAILED"), {
      code: "PROFILE_CALCULATOR_FAILED", statusCode: 500
    });
  }
  const previewToken = randomUUID();
  database.prepare(`
    INSERT INTO profile_preview_tokens (
      preview_token, metric_scope, expected_revision, draft_json, expires_at, source_snapshot_json,
      period_selection_json, review_as_of
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    previewToken,
    scope,
    expectedRevisionSnapshot,
    canonicalJson(draftSnapshot),
    new Date(Date.now() + 600_000).toISOString(),
    canonicalJson(sourceSnapshot),
    canonicalJson(periodSnapshot),
    asOf
  );
  const response: ProfilePreviewResponse = {
    asOf,
    calculator: review.calculator,
    expectedRevision: expectedRevisionSnapshot,
    periodSelection: periodSnapshot,
    previewToken,
    profile: draftSnapshot,
    readiness: review.readiness,
    reviewContext: "profile-draft",
    siteTimeZone: draftSnapshot.siteTimeZone,
    sources: sourceSnapshot.map(({ channelId, epochId, meterId, sourceRevision }) => ({
      channelId,
      epochId,
      meterId,
      sourceRevision
    }))
  };
  return response;
}

export function applyProfile(
  database: Database.Database,
  scope: SiteEnergyScope,
  input: { draft: SiteEnergyProfileV1; expectedRevision: number; previewToken: string; idempotencyKey: string }
): ProfileApplyResponse {
  if (!input.idempotencyKey?.trim()) conflict("IDEMPOTENCY_KEY_REQUIRED");
  const requestJson = canonicalJson({ input, scope });
  return database.transaction(() => {
    const receipt = database.prepare("SELECT request_json, result_json FROM profile_apply_receipts WHERE idempotency_key = ?")
      .get(input.idempotencyKey) as { request_json: string; result_json: string } | undefined;
    if (receipt) {
      if (receipt.request_json !== requestJson) conflict("IDEMPOTENCY_CONFLICT");
      return JSON.parse(receipt.result_json) as ProfileApplyResponse;
    }
    if (input.draft.metricScope !== scope) conflict("PROFILE_SCOPE_MISMATCH");
    const preview = database.prepare("SELECT * FROM profile_preview_tokens WHERE preview_token = ?")
      .get(input.previewToken) as {
        metric_scope: string;
        expected_revision: number;
        draft_json: string;
        expires_at: string;
        source_snapshot_json: string | null;
        period_selection_json: string | null;
        review_as_of: string | null;
      } | undefined;
    if (!preview || Date.parse(preview.expires_at) <= Date.now()) conflict("PREVIEW_EXPIRED");
    if (preview.metric_scope !== scope) conflict("PROFILE_SCOPE_MISMATCH");
    if (preview.draft_json !== canonicalJson(input.draft) || preview.expected_revision !== input.expectedRevision) {
      conflict("PREVIEW_DRAFT_MISMATCH");
    }
    if (!preview.period_selection_json || !preview.review_as_of) {
      conflict("PROFILE_SOURCE_REVIEW_REQUIRED");
    }
    const active = getActiveProfile(database, scope);
    if ((active?.revision ?? 0) !== input.expectedRevision) {
      throw Object.assign(new Error("PROFILE_REVISION_CONFLICT"), { code: "PROFILE_REVISION_CONFLICT", statusCode: 409 });
    }
    if (!preview.source_snapshot_json) conflict("PROFILE_SOURCE_REVIEW_REQUIRED");
    let currentSourceSnapshot: ProfileSourceSnapshot[];
    try {
      currentSourceSnapshot = captureProfileSourceSnapshot(database, input.draft);
      if (canonicalJson(currentSourceSnapshot) !== preview.source_snapshot_json) {
        conflict("PROFILE_SOURCE_CONFLICT");
      }
    } catch (error) {
      if ((error as { code?: string }).code === "PROFILE_SOURCE_UNAVAILABLE") {
        conflict("PROFILE_SOURCE_CONFLICT");
      }
      throw error;
    }
    const activationAsOf = new Date().toISOString();
    const review = calculateReview(database, input.draft, JSON.parse(preview.period_selection_json) as PeriodSelection,
      activationAsOf, currentSourceSnapshot);
    if (review.readiness.status === "incomplete" || review.readiness.status === "conflict") {
      conflict("PROFILE_NOT_READY");
    }
    const nextRevision = (active?.revision ?? 0) + 1;
    const next: SiteEnergyProfileV1 = {
      ...input.draft,
      metricScope: scope,
      revision: nextRevision,
      status: "configured-awaiting-data"
    };
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
      activationAsOf
    );
    const readiness = readProfileReadiness(database, scope, activationAsOf);
    database.prepare("UPDATE site_energy_profiles SET status = ? WHERE metric_scope = ? AND revision = ?")
      .run(readiness.status, scope, nextRevision);
    const result: ProfileApplyResponse = {
      ...next,
      readiness,
      reviewAsOf: preview.review_as_of,
      activationAsOf,
      status: readiness.status
    };
    database.prepare("INSERT INTO profile_apply_receipts (idempotency_key, request_json, result_json) VALUES (?, ?, ?)")
      .run(input.idempotencyKey, requestJson, JSON.stringify(result));
    return result;
  }).immediate();
}
