import { formatDecimalString, parseDecimalString, subtractDecimalString } from "./meterReading.js";
import type { SiteEnergyProfileV1 } from "./siteEnergyProfile.js";

export type DepartmentShare = {
  departmentId: string;
  nameZh: string;
  ratio: number | null;
  valueKwh: string | null;
};

export function resolveDepartmentShares(input: {
  periodDeltas: Record<string, string>;
  profile: SiteEnergyProfileV1;
}): { shares: DepartmentShare[]; unallocatedKwh: string | null } {
  const basisIds = input.profile.shareBasis.kind === "site-main"
    ? input.profile.siteTotal.memberChannelIds
    : input.profile.shareBasis.memberChannelIds ?? [];
  const denominator = basisIds.reduce((sum, id) => add(sum, input.periodDeltas[id] ?? "0"), "0");
  const shares = input.profile.departments.map((department) => {
    const value = department.memberChannelIds.reduce((sum, id) => add(sum, input.periodDeltas[id] ?? "0"), "0");
    if (denominator === "0") {
      return { departmentId: department.departmentId, nameZh: department.nameZh, ratio: null, valueKwh: value };
    }
    const ratio = Number(value) / Number(denominator);
    return { departmentId: department.departmentId, nameZh: department.nameZh, ratio, valueKwh: value };
  });
  const allocated = shares.reduce((sum, share) => add(sum, share.valueKwh ?? "0"), "0");
  const unallocatedKwh = denominator === "0" ? null : subtractDecimalString(denominator, allocated);
  return { shares, unallocatedKwh };
}

function add(left: string, right: string) {
  return formatDecimalString(parseDecimalString(left) + parseDecimalString(right));
}
