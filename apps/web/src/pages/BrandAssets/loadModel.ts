import type { BrandProfile } from "@solar-display/shared";

export type DraftFields = {
  name: string;
  brandNameZh: string;
  brandNameEn: string;
  productTitleZh: string;
  productTitleEn: string;
  sloganZh: string;
  sloganEn: string;
};

export type BrandAssetsLoadModel = {
  draft: DraftFields | null;
  profiles: BrandProfile[];
  selected: BrandProfile | null;
  selectedId: number | null;
};

let cachedBrandProfiles: BrandProfile[] = [];

export function pickFields(profile: BrandProfile): DraftFields {
  return {
    name: profile.name,
    brandNameZh: profile.brandNameZh,
    brandNameEn: profile.brandNameEn,
    productTitleZh: profile.productTitleZh,
    productTitleEn: profile.productTitleEn,
    sloganZh: profile.sloganZh,
    sloganEn: profile.sloganEn
  };
}

export function fieldsEqual(a: DraftFields, b: DraftFields): boolean {
  return (Object.keys(a) as Array<keyof DraftFields>).every((key) => a[key] === b[key]);
}

export function rememberBrandProfiles(profiles: BrandProfile[]) {
  cachedBrandProfiles = profiles;
}

export function readCachedBrandProfiles() {
  return cachedBrandProfiles;
}

function chooseProfile(profiles: BrandProfile[], preferredId?: number) {
  return (
    profiles.find((profile) => profile.id === preferredId) ??
    profiles.find((profile) => profile.isActive) ??
    profiles[0] ??
    null
  );
}

export function resolveInitialBrandAssetsModel(profiles: BrandProfile[]): BrandAssetsLoadModel {
  const selected = chooseProfile(profiles);

  return {
    draft: selected ? pickFields(selected) : null,
    profiles,
    selected,
    selectedId: selected?.id ?? null
  };
}

export function resolveBrandAssetsRefreshModel(args: {
  currentDraft: DraftFields | null;
  currentSelectedId: number | null;
  dirty: boolean;
  pendingAction: boolean;
  preferredId?: number;
  profiles: BrandProfile[];
}): BrandAssetsLoadModel {
  if ((args.dirty || args.pendingAction) && args.currentSelectedId !== null && args.currentDraft) {
    return {
      draft: args.currentDraft,
      profiles: args.profiles,
      selected: args.profiles.find((profile) => profile.id === args.currentSelectedId) ?? null,
      selectedId: args.currentSelectedId
    };
  }

  const selected = chooseProfile(args.profiles, args.preferredId);

  return {
    draft: selected ? pickFields(selected) : null,
    profiles: args.profiles,
    selected,
    selectedId: selected?.id ?? null
  };
}
