import type { PeriodConsumptionResult, PeriodSelection } from "./periodConsumption.js";
import type { AccountingPeriodResult } from "./engineeringPeriodResults.js";
import {
  isSiteEnergyProfileV2,
  validateSiteEnergyProfileV2,
  type SiteEnergyProfileV2
} from "./siteEnergyProfileV2.js";

export type SiteEnergyScope = "cl" | "kn";

export type SiteTotalConfig = {
  coverageReview: "reviewed" | "needs-review";
  kind: "unconfigured" | "meter-set";
  label: string;
  memberChannelIds: string[];
};

export type DepartmentConfig = {
  accountingIncluded: boolean;
  coverageReview: "reviewed" | "needs-review";
  departmentId: string;
  memberChannelIds: string[];
  nameZh: string;
};

export type ShareBasisConfig = {
  kind: "site-main" | "department-sum" | "meter-set";
  memberChannelIds?: string[];
  departmentIds?: string[];
  label?: string;
};

export type SiteEnergyProfileV1 = {
  departments: DepartmentConfig[];
  effectiveFrom: string;
  metricScope: SiteEnergyScope;
  profileId: string;
  revision: number;
  schemaVersion: 1;
  shareBasis: ShareBasisConfig;
  siteTimeZone: string;
  siteTotal: SiteTotalConfig;
  status: "incomplete" | "configured-awaiting-data" | "ready" | "conflict";
};

export type SiteEnergyProfile = SiteEnergyProfileV1 | SiteEnergyProfileV2;

export type SiteEnergyProfileValidationErrorCode =
  | "PROFILE_INVALID"
  | "PROFILE_OVERLAP_CONFLICT"
  | "PROFILE_PROVIDER_INVALID"
  | "PROFILE_VERSION_UNSUPPORTED";

export type SiteEnergyProfileValidationError = {
  code: SiteEnergyProfileValidationErrorCode;
  field: string;
  message: string;
};

export type SiteEnergyProfileValidationResult = {
  errors: SiteEnergyProfileValidationError[];
  ok: boolean;
};

export type ProfilePreviewRequest = {
  draft: SiteEnergyProfile;
  expectedRevision: number;
  periodSelection: { kind: "month"; year: number; month: number };
};

export type ProfileReadiness = {
  asOf: string;
  periodSelection: PeriodSelection;
  reasons: string[];
  status: SiteEnergyProfile["status"];
};

export type ProfilePreviewSource = {
  channelId: string;
  epochId: string;
  meterId: string;
  sourceRevision: number;
};

export type ProfilePreviewPeriodResult = PeriodConsumptionResult | AccountingPeriodResult;

export type ProfilePreviewDepartment = {
  departmentId: string;
  nameZh: string;
  ratio: number | null;
  result: ProfilePreviewPeriodResult;
};

export type ProfilePreviewResponse = {
  asOf: string;
  calculator: {
    basis: { memberChannelIds: string[]; result: ProfilePreviewPeriodResult };
    departments: ProfilePreviewDepartment[];
    period: ProfilePreviewPeriodResult;
  };
  expectedRevision: number;
  periodSelection: PeriodSelection;
  previewToken: string;
  profile: SiteEnergyProfile;
  readiness: ProfileReadiness;
  reviewContext: "profile-draft";
  siteTimeZone: string;
  sources: ProfilePreviewSource[];
};

export type ProfileApplyResponse = SiteEnergyProfile & {
  activationAsOf: string;
  readiness: ProfileReadiness;
  reviewAsOf: string;
};

export function isValidIanaTimeZone(value: string) {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function addValidationError(
  errors: SiteEnergyProfileValidationError[],
  code: SiteEnergyProfileValidationErrorCode,
  field: string,
  message: string
) {
  errors.push({ code, field, message });
}

function addUnsupportedVersionError(errors: SiteEnergyProfileValidationError[], version: unknown) {
  addValidationError(
    errors,
    "PROFILE_VERSION_UNSUPPORTED",
    "schemaVersion",
    `Unsupported profile schemaVersion ${String(version)}. Supported schemaVersion values are 1 and 2.`
  );
}

export function validateCommonProfileFields(
  profile: Record<string, unknown>,
  errors: SiteEnergyProfileValidationError[]
) {
  if (profile.metricScope !== "cl" && profile.metricScope !== "kn") {
    addValidationError(errors, "PROFILE_PROVIDER_INVALID", "metricScope", "廠區必須是 CL 或 KN。");
  }

  if (typeof profile.siteTimeZone !== "string" || !isValidIanaTimeZone(profile.siteTimeZone)) {
    addValidationError(errors, "PROFILE_INVALID", "siteTimeZone", "siteTimeZone 必須是有效 IANA 時區。");
  }
}

export function validateSiteEnergyProfileV1(profile: SiteEnergyProfileV1): SiteEnergyProfileValidationResult {
  const errors: SiteEnergyProfileValidationError[] = [];
  validateCommonProfileFields(profile as unknown as Record<string, unknown>, errors);
  const shareBasisKind = (profile.shareBasis as { kind?: unknown } | undefined)?.kind;
  if (shareBasisKind !== "site-main" && shareBasisKind !== "department-sum" && shareBasisKind !== "meter-set") {
    addValidationError(errors, "PROFILE_INVALID", "shareBasis.kind", "分母來源類型不受支援。");
  }
  if (profile.siteTotal.kind === "meter-set" && profile.siteTotal.memberChannelIds.length === 0) {
    addValidationError(errors, "PROFILE_INVALID", "siteTotal.memberChannelIds", "總錶來源尚未設定。");
  }
  const seen = new Set<string>();
  for (const channelId of profile.siteTotal.memberChannelIds) {
    if (seen.has(channelId)) {
      addValidationError(
        errors,
        "PROFILE_OVERLAP_CONFLICT",
        "siteTotal.memberChannelIds",
        `總錶集合重複 channel ${channelId}`
      );
    }
    seen.add(channelId);
  }
  return { errors, ok: errors.length === 0 };
}

export function isSiteEnergyProfileV1(profile: unknown): profile is SiteEnergyProfileV1 {
  return isRecord(profile) && profile.schemaVersion === 1;
}

export { isSiteEnergyProfileV2 };

export function validateSiteEnergyProfile(profile: unknown): SiteEnergyProfileValidationResult {
  const errors: SiteEnergyProfileValidationError[] = [];
  const version = isRecord(profile) ? profile.schemaVersion : undefined;
  if (version === 1) {
    return validateSiteEnergyProfileV1(profile as SiteEnergyProfileV1);
  }
  if (version === 2) {
    return validateSiteEnergyProfileV2(profile as SiteEnergyProfileV2);
  }
  addUnsupportedVersionError(errors, version);
  return { errors, ok: false };
}

export function rejectCalendarOverride(input: { timeZone?: string; start?: string; end?: string }) {
  const fields = ["timeZone", "start", "end"].filter((field) => input[field as keyof typeof input] !== undefined);
  if (fields.length === 0) {
    return { ok: true as const };
  }
  return {
    ok: false as const,
    fields,
    message: "期間邊界只能使用 E6 profile 的 siteTimeZone，不可由呼叫端覆寫。"
  };
}

export function monthBoundaryInProfileZone(instantUtc: string, siteTimeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: siteTimeZone,
    year: "numeric",
    month: "2-digit"
  }).formatToParts(new Date(instantUtc));
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return `${year}-${month}`;
}

export function profileLookupKey(profile: Pick<SiteEnergyProfileV1, "metricScope" | "revision">) {
  return `${profile.metricScope}:r${profile.revision}`;
}

export function reassignmentDoesNotTouchSource(previousSource: { sourceRevision: number; epochId: string; baseline: string }, nextSource: typeof previousSource) {
  return previousSource.sourceRevision === nextSource.sourceRevision
    && previousSource.epochId === nextSource.epochId
    && previousSource.baseline === nextSource.baseline;
}

export function profileMemberChannelIds(profile: SiteEnergyProfileV1): string[] {
  const ids = new Set<string>();
  for (const channelId of profile.siteTotal.memberChannelIds) {
    ids.add(channelId);
  }
  for (const department of profile.departments) {
    for (const channelId of department.memberChannelIds) {
      ids.add(channelId);
    }
  }
  if (profile.shareBasis.kind === "meter-set" && Array.isArray(profile.shareBasis.memberChannelIds)) {
    for (const channelId of profile.shareBasis.memberChannelIds) {
      ids.add(channelId);
    }
  }
  return Array.from(ids);
}

export * from "./siteEnergyProfileV2.js";

export function assertSupportedProfileVersion(
  profile: { schemaVersion: number },
  consumerSupportedVersion: 1 | 2
): void {
  if ((profile.schemaVersion !== 1 && profile.schemaVersion !== 2)
    || profile.schemaVersion > consumerSupportedVersion) {
    const error = new Error(
      `Unsupported profile schemaVersion ${profile.schemaVersion}. This consumer only supports schemaVersion ${consumerSupportedVersion}.`
    );
    Object.assign(error, { code: "PROFILE_VERSION_UNSUPPORTED", field: "schemaVersion" });
    throw error;
  }
}
