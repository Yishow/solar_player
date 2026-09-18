import { createHash } from "node:crypto";
import type Database from "better-sqlite3";
import {
  parseDecimalString,
  type AccountingMemberRef,
  type AccountingPeriodResult,
  type PeriodSelection,
  type ProfilePreviewResponse,
  type SiteEnergyProfileV2
} from "@solar-display/shared";
import { resolveAccountingPeriodResult } from "./accountingPeriodService.js";
import { canonicalJson } from "./authoringCanonicalJson.js";
import { freezeDeep } from "./profilePreviewEvidence.js";
import { deriveEngineeringProfileReadiness } from "./profileReadiness.js";
import { captureProfileProviderSnapshot } from "./profileSourceSnapshot.js";

export type EngineeringReviewCalculation = {
  calculator: ProfilePreviewResponse["calculator"];
  readiness: ProfilePreviewResponse["readiness"];
  revisionFingerprint: string;
};

function assertEngineeringMembers(members: readonly AccountingMemberRef[]) {
  if (members.some((member) => member.kind !== "engineering")) {
    throw Object.assign(new Error("PROFILE_PROVIDER_INVALID"), { code: "PROFILE_PROVIDER_INVALID" });
  }
}

function periodForMembers(
  database: Database.Database,
  profile: SiteEnergyProfileV2,
  period: PeriodSelection,
  asOf: string,
  members: readonly AccountingMemberRef[]
): AccountingPeriodResult {
  assertEngineeringMembers(members);
  return resolveAccountingPeriodResult({
    asOf,
    database,
    period,
    profile: {
      ...profile,
      siteTotal: {
        ...profile.siteTotal,
        kind: "member-set",
        members: [...members]
      }
    },
    scope: "kn"
  });
}

function ratioOf(numerator: AccountingPeriodResult, denominator: AccountingPeriodResult): number | null {
  if (numerator.valueKwh === null || denominator.valueKwh === null) return null;
  const denominatorValue = parseDecimalString(denominator.valueKwh);
  if (denominatorValue === 0n) return null;
  return Number((parseDecimalString(numerator.valueKwh) * 10_000n) / denominatorValue) / 10_000;
}

function reviewFingerprint(
  period: AccountingPeriodResult,
  basis: AccountingPeriodResult,
  departments: ProfilePreviewResponse["calculator"]["departments"]
) {
  if (basis === period && departments.length === 0) return period.revisionFingerprint;
  return createHash("sha256").update(canonicalJson({
    basis: basis.revisionFingerprint,
    departments: departments.map(({ departmentId, result }) => ({
      departmentId,
      revisionFingerprint: "revisionFingerprint" in result ? result.revisionFingerprint : null
    })),
    period: period.revisionFingerprint
  })).digest("hex");
}

function readinessPeriod(
  period: AccountingPeriodResult,
  basis: AccountingPeriodResult,
  departments: ProfilePreviewResponse["calculator"]["departments"],
  profile: SiteEnergyProfileV2
): AccountingPeriodResult {
  const incompleteEvidence: string[] = [];
  const missingIdentities = new Set(period.missingIdentities);
  const inspect = (label: string, result: AccountingPeriodResult) => {
    result.missingIdentities.forEach((identity) => missingIdentities.add(identity));
    if (result.quality !== "valid" || result.coverage !== "complete" || result.valueKwh === null) {
      incompleteEvidence.push(label);
    }
  };
  inspect("SITE_TOTAL", period);
  inspect("SHARE_BASIS", basis);
  for (const department of departments) {
    if (!profile.departments.find((candidate) => candidate.departmentId === department.departmentId)?.accountingIncluded) {
      continue;
    }
    inspect(`DEPARTMENT:${department.departmentId}`, department.result as AccountingPeriodResult);
  }
  if (incompleteEvidence.length === 0) return period;
  return {
    ...period,
    coverage: period.coverage === "unknown" ? "unknown" : "partial",
    issues: [...new Set([
      ...period.issues ?? [],
      ...incompleteEvidence.map((label) => `${label}_PERIOD_INCOMPLETE`)
    ])],
    missingIdentities: [...missingIdentities],
    quality: period.quality === "invalid" || period.quality === "unavailable" ? period.quality : "partial"
  };
}

export function calculateEngineeringReview(
  database: Database.Database,
  profile: SiteEnergyProfileV2,
  period: PeriodSelection,
  asOf: string,
  expectedRevision: number
): EngineeringReviewCalculation {
  const accountingProfile = freezeDeep({ ...profile, revision: expectedRevision });
  const periodResult = periodForMembers(
    database,
    accountingProfile,
    period,
    asOf,
    accountingProfile.siteTotal.members
  );
  const departments: ProfilePreviewResponse["calculator"]["departments"] = accountingProfile.departments.map((department) => {
    const result = periodForMembers(database, accountingProfile, period, asOf, department.members);
    return {
      departmentId: department.departmentId,
      nameZh: department.nameZh,
      ratio: null,
      result
    };
  });
  const basisResult = accountingProfile.shareBasis.kind === "site-main"
    ? periodResult
    : periodForMembers(
      database,
      accountingProfile,
      period,
      asOf,
      accountingProfile.shareBasis.kind === "department-sum"
        ? accountingProfile.departments
          .filter((department) => department.accountingIncluded)
          .flatMap((department) => department.members)
        : accountingProfile.shareBasis.members ?? []
    );
  for (const department of departments) {
    department.ratio = ratioOf(department.result as AccountingPeriodResult, basisResult);
  }
  const sourceReasons: string[] = [];
  try {
    captureProfileProviderSnapshot(database, profile);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code) sourceReasons.push(code);
  }
  return {
    calculator: {
      basis: { memberChannelIds: [], result: basisResult },
      departments,
      period: periodResult
    },
    readiness: deriveEngineeringProfileReadiness({
      asOf,
      period: readinessPeriod(periodResult, basisResult, departments, accountingProfile),
      periodSelection: period,
      profile: accountingProfile,
      sourceReasons
    }),
    revisionFingerprint: reviewFingerprint(periodResult, basisResult, departments)
  };
}
