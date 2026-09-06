import { formatDecimalString, parseDecimalString, subtractDecimalString } from "./meterReading.js";
import type { SiteEnergyProfileV1 } from "./siteEnergyProfile.js";

export type DepartmentShare = {
  departmentId: string;
  nameZh: string;
  ratio: number | null;
  valueKwh: string | null;
};

function add(left: string, right: string) {
  return formatDecimalString(parseDecimalString(left) + parseDecimalString(right));
}

function ratioOf(numerator: string, denominator: string): number | null {
  const denominatorValue = parseDecimalString(denominator);
  if (denominatorValue === 0n) {
    return null;
  }
  const scaled = (parseDecimalString(numerator) * 10000n) / denominatorValue;
  return Number(scaled) / 10000;
}

function hasAll(ids: readonly string[], periodDeltas: Record<string, string | undefined>) {
  return ids.every((id) => periodDeltas[id] !== undefined);
}

export function findOverlappingDepartmentChannels(profile: SiteEnergyProfileV1) {
  const owners = new Map<string, string[]>();
  for (const department of profile.departments) {
    if (!department.accountingIncluded) {
      continue;
    }
    for (const channelId of department.memberChannelIds) {
      const current = owners.get(channelId) ?? [];
      current.push(department.nameZh);
      owners.set(channelId, current);
    }
  }
  return [...owners.entries()]
    .filter(([, names]) => names.length > 1)
    .map(([channelId, names]) => ({ channelId, departmentNames: names }));
}

export function resolveShareBasisIds(profile: SiteEnergyProfileV1): string[] {
  if (profile.shareBasis.kind === "site-main") {
    return profile.siteTotal.memberChannelIds;
  }
  if (profile.shareBasis.kind === "meter-set") {
    return profile.shareBasis.memberChannelIds ?? [];
  }
  return profile.departments
    .filter((department) => department.accountingIncluded)
    .flatMap((department) => department.memberChannelIds);
}

export function resolveDepartmentShares(input: {
  periodDeltas: Record<string, string | undefined>;
  profile: SiteEnergyProfileV1;
}): { shares: DepartmentShare[]; unallocatedKwh: string | null; quality: "exact" | "unavailable" } {
  const overlaps = findOverlappingDepartmentChannels(input.profile);
  if (overlaps.length > 0) {
    return {
      quality: "unavailable",
      shares: input.profile.departments.map((department) => ({
        departmentId: department.departmentId,
        nameZh: department.nameZh,
        ratio: null,
        valueKwh: null
      })),
      unallocatedKwh: null
    };
  }

  const basisIds = resolveShareBasisIds(input.profile);
  if (basisIds.length === 0 || !hasAll(basisIds, input.periodDeltas)) {
    return {
      quality: "unavailable",
      shares: input.profile.departments.map((department) => ({
        departmentId: department.departmentId,
        nameZh: department.nameZh,
        ratio: null,
        valueKwh: input.periodDeltas[department.memberChannelIds[0] ?? ""] ?? null
      })),
      unallocatedKwh: null
    };
  }

  const denominator = basisIds.reduce((sum, id) => add(sum, input.periodDeltas[id] ?? "0"), "0");
  const shares = input.profile.departments.map((department) => {
    if (!hasAll(department.memberChannelIds, input.periodDeltas)) {
      return {
        departmentId: department.departmentId,
        nameZh: department.nameZh,
        ratio: null,
        valueKwh: null
      };
    }
    const value = department.memberChannelIds.reduce((sum, id) => add(sum, input.periodDeltas[id] ?? "0"), "0");
    return {
      departmentId: department.departmentId,
      nameZh: department.nameZh,
      ratio: ratioOf(value, denominator),
      valueKwh: value
    };
  });
  if (denominator === "0" || shares.some((share) => share.ratio === null && share.valueKwh === null)) {
    return { quality: "unavailable", shares, unallocatedKwh: null };
  }
  const allocated = shares.reduce((sum, share) => add(sum, share.valueKwh ?? "0"), "0");
  return {
    quality: "exact",
    shares,
    unallocatedKwh: subtractDecimalString(denominator, allocated)
  };
}
