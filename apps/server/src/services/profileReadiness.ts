import {
  findOverlappingDepartmentChannels,
  parseDecimalString,
  validateSiteEnergyProfile,
  type PeriodConsumptionResult,
  type PeriodSelection,
  type ProfileReadiness,
  type SiteEnergyProfileV1
} from "@solar-display/shared";

export type ProfileReadinessEvidence = {
  asOf: string;
  basis: PeriodConsumptionResult | null;
  departments: Array<{
    departmentId: string;
    ratio: number | null;
    result: PeriodConsumptionResult;
  }>;
  period: PeriodConsumptionResult | null;
  periodSelection: PeriodSelection;
  profile: SiteEnergyProfileV1;
  revisionBoundary?: boolean;
  sourceReasons?: string[];
  structuralReasons?: string[];
};

function isUsable(result: PeriodConsumptionResult | null) {
  return result !== null
    && (result.quality === "exact" || result.quality === "estimated-boundary")
    && result.valueKwh !== null;
}

function resultIssues(label: string, result: PeriodConsumptionResult | null) {
  if (!result) {
    return [`${label}_UNAVAILABLE`];
  }
  if (result.issues && result.issues.length > 0) {
    return result.issues.map((issue) => `${label}:${issue}`);
  }
  return [`${label}_${result.quality.toUpperCase()}`];
}

function resultIsInvalid(result: PeriodConsumptionResult | null) {
  return result?.quality === "invalid";
}

function structureReasons(profile: SiteEnergyProfileV1) {
  const reasons = validateSiteEnergyProfile(profile).errors.map(({ field }) => `PROFILE_INVALID:${field}`);
  if (profile.siteTotal.kind === "meter-set" && profile.siteTotal.memberChannelIds.length === 0) {
    reasons.push("SITE_TOTAL_REQUIRED");
  }
  if (profile.siteTotal.kind === "unconfigured" && profile.shareBasis.kind === "site-main") {
    reasons.push("SITE_TOTAL_REQUIRED");
  }
  if (profile.siteTotal.kind === "meter-set" && profile.siteTotal.coverageReview !== "reviewed") {
    reasons.push("SITE_TOTAL_COVERAGE_REVIEW_REQUIRED");
  }
  if (profile.shareBasis.kind === "meter-set" && (profile.shareBasis.memberChannelIds?.length ?? 0) === 0) {
    reasons.push("SHARE_BASIS_REQUIRED");
  }
  if (profile.shareBasis.kind === "department-sum"
    && !profile.departments.some((department) => department.accountingIncluded && department.memberChannelIds.length > 0)) {
    reasons.push("SHARE_BASIS_REQUIRED");
  }
  const seenSiteChannels = new Set<string>();
  for (const channelId of profile.siteTotal.memberChannelIds) {
    if (seenSiteChannels.has(channelId)) reasons.push(`DUPLICATE_SITE_TOTAL_CHANNEL:${channelId}`);
    seenSiteChannels.add(channelId);
  }
  for (const department of profile.departments) {
    if (!Array.isArray(department.memberChannelIds) || department.memberChannelIds.length === 0) {
      reasons.push(`DEPARTMENT_SOURCES_REQUIRED:${department.departmentId}`);
    }
    if (department.coverageReview !== "reviewed") {
      reasons.push(`DEPARTMENT_COVERAGE_REVIEW_REQUIRED:${department.departmentId}`);
    }
  }
  for (const overlap of findOverlappingDepartmentChannels(profile)) {
    reasons.push(`OVERLAPPING_DEPARTMENT_CHANNELS:${overlap.channelId}`);
  }
  return reasons;
}

export function deriveProfileReadiness(input: ProfileReadinessEvidence): ProfileReadiness {
  const reasons = [
    ...structureReasons(input.profile),
    ...(input.structuralReasons ?? []),
    ...(input.sourceReasons ?? [])
  ];
  const waitingReasons: string[] = [];

  if (input.revisionBoundary) {
    waitingReasons.push("PROFILE_REVISION_BOUNDARY");
  }

  if (input.period === null) {
    waitingReasons.push("SITE_TOTAL_WAITING_FOR_DATA");
  } else if (resultIsInvalid(input.period)) {
    reasons.push(...resultIssues("SITE_TOTAL", input.period));
  } else if (!isUsable(input.period)) {
    waitingReasons.push(...resultIssues("SITE_TOTAL", input.period));
  }

  if (input.basis === null) {
    reasons.push("SHARE_BASIS_REQUIRED");
  } else if (resultIsInvalid(input.basis)) {
    reasons.push(...resultIssues("SHARE_BASIS", input.basis));
  } else if (!isUsable(input.basis)) {
    waitingReasons.push(...resultIssues("SHARE_BASIS", input.basis));
  } else if (input.basis.valueKwh !== null && parseDecimalString(input.basis.valueKwh) === 0n) {
    waitingReasons.push("SHARE_BASIS_ZERO");
  }

  for (const department of input.departments) {
    if (resultIsInvalid(department.result)) {
      reasons.push(...resultIssues(`DEPARTMENT:${department.departmentId}`, department.result));
    } else if (!isUsable(department.result)) {
      waitingReasons.push(...resultIssues(`DEPARTMENT:${department.departmentId}`, department.result));
    }
    if (department.ratio === null) {
      waitingReasons.push(`DEPARTMENT_RATIO_UNAVAILABLE:${department.departmentId}`);
    }
  }

  const uniqueReasons = [...new Set([...reasons, ...waitingReasons])];
  return {
    asOf: input.asOf,
    periodSelection: input.periodSelection,
    reasons: uniqueReasons,
    status: reasons.length > 0
      ? "incomplete"
      : waitingReasons.length > 0
        ? "configured-awaiting-data"
        : "ready"
  };
}
