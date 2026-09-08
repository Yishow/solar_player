import {
  profileMemberChannelIds,
  resolveDepartmentShares,
  resolveShareBasisIds,
  type PeriodConsumptionResult,
  type SiteEnergyProfileV1
} from "@solar-display/shared";

export type ProfileEvidence = {
  basis: PeriodConsumptionResult | null;
  basisIds: string[];
  departments: Array<{
    departmentId: string;
    nameZh: string;
    ratio: number | null;
    result: PeriodConsumptionResult;
  }>;
  period: PeriodConsumptionResult | null;
};

export function resolveProfileEvidence(
  profile: SiteEnergyProfileV1,
  resolve: (meterIds: string[], label: string) => PeriodConsumptionResult
): ProfileEvidence {
  const period = profile.siteTotal.kind === "meter-set"
    ? resolve(profile.siteTotal.memberChannelIds, "SITE_TOTAL")
    : null;
  const basisIds = resolveShareBasisIds(profile);
  const basis = basisIds.length > 0 ? resolve(basisIds, "SHARE_BASIS") : null;
  const channelResults = new Map<string, PeriodConsumptionResult>();
  for (const channelId of profileMemberChannelIds(profile)) {
    channelResults.set(channelId, resolve([channelId], `CHANNEL:${channelId}`));
  }
  const periodDeltas: Record<string, string | undefined> = {};
  for (const [channelId, result] of channelResults) {
    if ((result.quality === "exact" || result.quality === "estimated-boundary") && result.valueKwh !== null) {
      periodDeltas[channelId] = result.valueKwh;
    }
  }
  const shares = resolveDepartmentShares({ periodDeltas, profile });
  const departments = profile.departments.map((department) => ({
    departmentId: department.departmentId,
    nameZh: department.nameZh,
    ratio: shares.shares.find((share) => share.departmentId === department.departmentId)?.ratio ?? null,
    result: resolve(department.memberChannelIds, `DEPARTMENT:${department.departmentId}`)
  }));
  return { basis, basisIds, departments, period };
}
