import { createHash } from "node:crypto";
import type Database from "better-sqlite3";
import {
  isKnEngineeringId,
  periodWindow,
  resolvePeriodConsumption,
  type AccountingMemberRef,
  type AccountingPeriodResult,
  type KnEngineeringId,
  type PeriodConsumptionQuality,
  type PeriodConsumptionResult,
  type PeriodSample,
  type PeriodSelection,
  type SiteEnergyProfile,
  type SiteEnergyProfileV1,
  type SiteEnergyProfileV2
} from "@solar-display/shared";
import { readFreshnessPolicy } from "./freshnessPolicyService.js";
import { listPersistedProfiles } from "./siteEnergyProfileRepository.js";
import { selectCalculationEvidence, toPeriodSamples } from "./accountingEvidenceSelection.js";
import { loadAcceptedMeterReadings } from "./meterReadingService.js";
import { readEngineeringAccountingPeriodResult } from "./engineeringAccountingPeriodService.js";

/** Every accepted reading of a scope as resolver samples, for callers that need the whole scope. */
export function loadAcceptedSamples(database: Database.Database, scope: "cl" | "kn"): PeriodSample[] {
  return toPeriodSamples(loadAcceptedMeterReadings(database, scope));
}

function physicalAccountingQuality(quality: PeriodConsumptionQuality): AccountingPeriodResult["quality"] {
  switch (quality) {
    case "exact":
      return "valid";
    case "estimated-boundary":
    case "partial":
      return "partial";
    case "invalid":
      return "invalid";
    case "unavailable":
      return "unavailable";
  }
}

function physicalAccountingCoverage(result: PeriodConsumptionResult): AccountingPeriodResult["coverage"] {
  if (result.quality === "unavailable") {
    return "unknown";
  }
  if (result.quality === "partial" || result.quality === "estimated-boundary") {
    return "partial";
  }
  return result.dailyCoverage && !result.dailyCoverage.isComplete ? "partial" : "complete";
}

function physicalRevisionFingerprint(result: PeriodConsumptionResult): string {
  const canonical = {
    providerKind: "physical",
    periodStart: result.periodStart ?? "",
    periodEnd: result.periodEnd ?? "",
    profileRevision: result.profileRevision,
    siteTimeZone: result.siteTimeZone,
    valueKwh: result.valueKwh,
    quality: result.quality,
    sourceRevisions: [...result.provenance?.sourceRevisions ?? []].sort()
  };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

export type PhysicalAccountingPeriodResult = Omit<PeriodConsumptionResult, keyof AccountingPeriodResult>
  & AccountingPeriodResult;

export function adaptPhysicalPeriodResult(result: PeriodConsumptionResult): PhysicalAccountingPeriodResult {
  return {
    ...result,
    providerKind: "physical",
    periodStart: result.periodStart ?? "",
    periodEnd: result.periodEnd ?? "",
    siteTimeZone: result.siteTimeZone,
    profileRevision: result.profileRevision,
    valueKwh: result.valueKwh,
    quality: physicalAccountingQuality(result.quality),
    coverage: physicalAccountingCoverage(result),
    missingIdentities: [],
    revisionFingerprint: physicalRevisionFingerprint(result),
    ...(result.issues && result.issues.length > 0 ? { issues: [...result.issues] } : {})
  };
}

export function profileProviderError(
  code: "PROFILE_PROVIDER_INVALID" | "PROFILE_VERSION_UNSUPPORTED" | "PROFILE_SCOPE_MISMATCH"
): never {
  throw Object.assign(new Error(code), { code });
}

export function requireV1Profile(profile: SiteEnergyProfile): SiteEnergyProfileV1 {
  if (profile.schemaVersion !== 1) {
    profileProviderError("PROFILE_VERSION_UNSUPPORTED");
  }
  return profile;
}

export function listPersistedV1Profiles(
  database: Database.Database,
  scope: "cl" | "kn"
): SiteEnergyProfileV1[] {
  return listPersistedProfiles(database, scope).filter(
    (profile): profile is SiteEnergyProfileV1 => profile.schemaVersion === 1
  );
}

function physicalMemberChannelIds(members: readonly AccountingMemberRef[]): string[] {
  const ids: string[] = [];
  for (const member of members) {
    if (member.kind !== "physical-meter" || typeof member.channelId !== "string" || member.channelId.trim().length === 0) {
      profileProviderError("PROFILE_PROVIDER_INVALID");
    }
    ids.push(member.channelId);
  }
  return [...new Set(ids)];
}

function physicalProfileView(profile: SiteEnergyProfileV2): SiteEnergyProfileV1 {
  const memberChannelIds = profile.siteTotal.kind === "member-set"
    ? physicalMemberChannelIds(profile.siteTotal.members)
    : [];
  return {
    departments: [],
    effectiveFrom: profile.effectiveFrom,
    metricScope: profile.metricScope,
    profileId: profile.profileId,
    revision: profile.revision,
    schemaVersion: 1,
    shareBasis: { kind: "site-main" },
    siteTimeZone: profile.siteTimeZone,
    siteTotal: {
      coverageReview: profile.siteTotal.coverageReview,
      kind: memberChannelIds.length > 0 ? "meter-set" : "unconfigured",
      label: profile.siteTotal.label,
      memberChannelIds
    },
    status: profile.status
  };
}

function resolvePhysicalAccountingPeriod(
  database: Database.Database,
  scope: "cl" | "kn",
  profile: SiteEnergyProfileV1,
  period: PeriodSelection,
  asOf: string
): PhysicalAccountingPeriodResult {
  return adaptPhysicalPeriodResult(resolvePeriodConsumption({
    asOf,
    freshnessPolicy: readFreshnessPolicy(database).policy,
    meterIds: profile.siteTotal.memberChannelIds,
    period,
    profile,
    samples: loadAcceptedSamples(database, scope)
  }));
}

function engineeringMemberIds(profile: SiteEnergyProfileV2): KnEngineeringId[] {
  if (profile.metricScope !== "kn" || profile.siteTotal.kind !== "member-set") {
    if (profile.metricScope !== "kn") profileProviderError("PROFILE_PROVIDER_INVALID");
    return [];
  }
  const ids: KnEngineeringId[] = [];
  for (const member of profile.siteTotal.members) {
    if (member.kind !== "engineering" || !isKnEngineeringId(member.engineeringId)
      || typeof member.sourceRef !== "string" || member.sourceRef.trim().length === 0) {
      profileProviderError("PROFILE_PROVIDER_INVALID");
    }
    ids.push(member.engineeringId);
  }
  return [...new Set(ids)];
}

export type AccountingPeriodRequest = {
  database: Database.Database;
  scope: "cl" | "kn";
  profile: SiteEnergyProfile;
  period: PeriodSelection;
  asOf: string;
};

export function resolveAccountingPeriodResult(input: AccountingPeriodRequest): AccountingPeriodResult {
  const profile = input.profile as SiteEnergyProfile & { schemaVersion?: unknown };
  if (!profile || typeof profile !== "object" || (profile.schemaVersion !== 1 && profile.schemaVersion !== 2)) {
    profileProviderError("PROFILE_VERSION_UNSUPPORTED");
  }
  if (profile.metricScope !== input.scope) {
    profileProviderError("PROFILE_SCOPE_MISMATCH");
  }

  if (profile.schemaVersion === 1) {
    return resolvePhysicalAccountingPeriod(input.database, input.scope, profile, input.period, input.asOf);
  }

  if (profile.providerKind === "engineering") {
    const engineeringIds = engineeringMemberIds(profile);
    const window = periodWindow(input.period, profile.siteTimeZone);
    return readEngineeringAccountingPeriodResult(input.database, {
      periodEnd: new Date(window.endMs).toISOString(),
      periodStart: new Date(window.startMs).toISOString(),
      profileRevision: profile.revision,
      siteTimeZone: profile.siteTimeZone,
      expectedEngineeringIds: engineeringIds
    });
  }
  if (profile.providerKind === "physical") {
    return resolvePhysicalAccountingPeriod(
      input.database,
      input.scope,
      physicalProfileView(profile),
      input.period,
      input.asOf
    );
  }
  profileProviderError("PROFILE_PROVIDER_INVALID");
}
