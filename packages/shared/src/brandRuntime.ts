import type { BrandProfile } from "./types.js";

export type RuntimeBrandProfile = Pick<
  BrandProfile,
  | "brandNameZh"
  | "brandNameEn"
  | "productTitleZh"
  | "productTitleEn"
  | "sloganZh"
  | "sloganEn"
  | "logoUrl"
>;
