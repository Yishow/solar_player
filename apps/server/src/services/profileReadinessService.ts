import type Database from "better-sqlite3";
import {
  resolvePeriodConsumption,
  type DefinitionRevisionItem,
  type PeriodConsumptionResult,
  type PeriodSelection,
  type ProfileReadiness,
  type SiteEnergyProfileV1
} from "@solar-display/shared";
import { captureProfileSourceSnapshot, type ProfileSourceSnapshot } from "./profileSourceSnapshot.js";
import { loadEffectivePeriodContext, periodSelectionFromRange } from "./periodConsumptionService.js";
import { getActiveProfile } from "./siteEnergyProfileRepository.js";
import { deriveProfileReadiness } from "./profileReadiness.js";
import { resolveProfileEvidence } from "./profileEvidence.js";

function invalidResult(profile: SiteEnergyProfileV1, issue: string): PeriodConsumptionResult {
  return {
    issues: [issue],
    profileRevision: profile.revision,
    quality: "invalid",
    siteTimeZone: profile.siteTimeZone,
    valueKwh: null
  };
}

function withRevisionBoundary(result: PeriodConsumptionResult, crossesRevisionBoundary: boolean) {
  if (!crossesRevisionBoundary) return result;
  return {
    ...result,
    issues: [...result.issues ?? [], "PROFILE_REVISION_BOUNDARY"],
    observedDeltaKwh: null,
    quality: result.quality === "invalid" ? "invalid" as const : "partial" as const,
    valueKwh: null
  };
}

type ProfileEvidenceContext = {
  asOf: string;
  period: PeriodSelection;
  profile: SiteEnergyProfileV1;
  samples: Parameters<typeof resolvePeriodConsumption>[0]["samples"];
  freshnessPolicy: Parameters<typeof resolvePeriodConsumption>[0]["freshnessPolicy"];
  definitionRevision: DefinitionRevisionItem[];
  crossesRevisionBoundary: boolean;
};

function resolveResult(input: ProfileEvidenceContext, meterIds: string[], label: string) {
  try {
    return withRevisionBoundary(resolvePeriodConsumption({
      asOf: input.asOf,
      definitionRevision: input.definitionRevision,
      freshnessPolicy: input.freshnessPolicy,
      meterIds,
      period: input.period,
      profile: input.profile,
      samples: input.samples
    }), input.crossesRevisionBoundary);
  } catch {
    return invalidResult(input.profile, `${label}_UNRESOLVED`);
  }
}

function sourceDiagnostics(sources: ProfileSourceSnapshot[]) {
  return sources
    .filter((source) => source.energyFlowRole !== "consumption")
    .map((source) => `SOURCE_ENERGY_FLOW_ROLE_INVALID:${source.channelId}`);
}

function resolveEvidence(input: ProfileEvidenceContext) {
  return resolveProfileEvidence(input.profile, (meterIds, label) => resolveResult(input, meterIds, label));
}

function missingProfileReadiness(asOf: string): ProfileReadiness {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", year: "numeric", month: "2-digit" }).formatToParts(new Date(asOf));
  return {
    asOf,
    periodSelection: {
      kind: "month",
      month: Number(parts.find((part) => part.type === "month")?.value ?? 1),
      year: Number(parts.find((part) => part.type === "year")?.value ?? 1970)
    },
    reasons: ["PROFILE_NOT_CONFIGURED"],
    status: "incomplete"
  };
}

export function readProfileReadiness(
  database: Database.Database,
  scope: "cl" | "kn",
  asOf = new Date().toISOString()
): ProfileReadiness {
  const active = getActiveProfile(database, scope);
  if (!active) return missingProfileReadiness(asOf);

  let period: PeriodSelection | null;
  try {
    period = periodSelectionFromRange("month", asOf, active.siteTimeZone);
  } catch {
    return {
      asOf,
      periodSelection: { kind: "month", month: 1, year: 1970 },
      reasons: ["PROFILE_TIMEZONE_INVALID"],
      status: "incomplete"
    };
  }
  if (!period) {
    return {
      asOf,
      periodSelection: { kind: "month", month: 1, year: 1970 },
      reasons: ["PROFILE_PERIOD_UNAVAILABLE"],
      status: "incomplete"
    };
  }

  try {
    const context = loadEffectivePeriodContext(database, scope, { kind: "period", period }, asOf);
    const sourceReasons: string[] = [];
    let sources: ProfileSourceSnapshot[] = [];
    try {
      sources = captureProfileSourceSnapshot(database, context.profile);
      sourceReasons.push(...sourceDiagnostics(sources));
    } catch (error) {
      sourceReasons.push((error as { code?: string }).code ?? "PROFILE_SOURCE_UNAVAILABLE");
    }
    const results = resolveEvidence({
      asOf,
      crossesRevisionBoundary: context.crossesRevisionBoundary,
      definitionRevision: sources.map(({ channelId, epochId, meterId, sourceRevision }) => ({
        channelId,
        epochId,
        meterId,
        sourceRevision
      })),
      freshnessPolicy: context.freshnessPolicy,
      period,
      profile: context.profile,
      samples: context.samples
    });
    return deriveProfileReadiness({
      asOf,
      basis: results.basis,
      departments: results.departments,
      period: results.period,
      periodSelection: period,
      profile: context.profile,
      revisionBoundary: context.crossesRevisionBoundary,
      sourceReasons,
      structuralReasons: sources.length === 0 && sourceReasons.length === 0 ? ["PROFILE_SOURCE_REVIEW_REQUIRED"] : []
    });
  } catch (error) {
    return {
      asOf,
      periodSelection: period,
      reasons: [(error as { code?: string }).code ?? "PROFILE_READINESS_UNAVAILABLE"],
      status: "incomplete"
    };
  }
}

export function buildReviewReadiness(input: {
  asOf: string;
  basis: PeriodConsumptionResult | null;
  departments: ReturnType<typeof resolveProfileEvidence>["departments"];
  period: PeriodConsumptionResult | null;
  periodSelection: PeriodSelection;
  profile: SiteEnergyProfileV1;
  sourceSnapshots: ProfileSourceSnapshot[];
}) {
  return deriveProfileReadiness({
    asOf: input.asOf,
    basis: input.basis,
    departments: input.departments,
    period: input.period,
    periodSelection: input.periodSelection,
    profile: input.profile,
    sourceReasons: sourceDiagnostics(input.sourceSnapshots)
  });
}
