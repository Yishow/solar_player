import type { PeriodConsumptionResult, PeriodSelection } from "./periodConsumption.js";

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

export type ProfilePreviewRequest = {
  draft: SiteEnergyProfileV1;
  expectedRevision: number;
  periodSelection: { kind: "month"; year: number; month: number };
};

export type ProfileReadiness = {
  asOf: string;
  periodSelection: PeriodSelection;
  reasons: string[];
  status: SiteEnergyProfileV1["status"];
};

export type ProfilePreviewSource = {
  channelId: string;
  epochId: string;
  meterId: string;
  sourceRevision: number;
};

export type ProfilePreviewDepartment = {
  departmentId: string;
  nameZh: string;
  ratio: number | null;
  result: PeriodConsumptionResult;
};

export type ProfilePreviewResponse = {
  asOf: string;
  calculator: {
    basis: { memberChannelIds: string[]; result: PeriodConsumptionResult };
    departments: ProfilePreviewDepartment[];
    period: PeriodConsumptionResult;
  };
  expectedRevision: number;
  periodSelection: PeriodSelection;
  previewToken: string;
  profile: SiteEnergyProfileV1;
  readiness: ProfileReadiness;
  reviewContext: "profile-draft";
  siteTimeZone: string;
  sources: ProfilePreviewSource[];
};

export type ProfileApplyResponse = SiteEnergyProfileV1 & {
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

export function validateSiteEnergyProfile(profile: SiteEnergyProfileV1) {
  const errors: Array<{ field: string; message: string }> = [];
  if (profile.metricScope !== "cl" && profile.metricScope !== "kn") {
    errors.push({ field: "metricScope", message: "廠區必須是 CL 或 KN。" });
  }
  if (!isValidIanaTimeZone(profile.siteTimeZone)) {
    errors.push({ field: "siteTimeZone", message: "siteTimeZone 必須是有效 IANA 時區。" });
  }
  const shareBasisKind = (profile.shareBasis as { kind?: unknown } | undefined)?.kind;
  if (shareBasisKind !== "site-main" && shareBasisKind !== "department-sum" && shareBasisKind !== "meter-set") {
    errors.push({ field: "shareBasis.kind", message: "分母來源類型不受支援。" });
  }
  if (profile.siteTotal.kind === "meter-set" && profile.siteTotal.memberChannelIds.length === 0) {
    errors.push({ field: "siteTotal.memberChannelIds", message: "總錶來源尚未設定。" });
  }
  const seen = new Set<string>();
  for (const channelId of profile.siteTotal.memberChannelIds) {
    if (seen.has(channelId)) {
      errors.push({ field: "siteTotal.memberChannelIds", message: `總錶集合重複 channel ${channelId}` });
    }
    seen.add(channelId);
  }
  return { errors, ok: errors.length === 0 };
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
