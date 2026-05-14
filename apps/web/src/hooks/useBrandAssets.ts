import { useCallback, useEffect, useState } from "react";
import type { BrandProfile } from "@solar-display/shared";
import { brandLogoUrl, getBrandProfiles } from "../services/api";

export type BrandView = {
  logoSrc: string;
  brandNameZh: string;
  brandNameEn: string;
  productTitleZh: string;
  productTitleEn: string;
  sloganZh: string;
  sloganEn: string;
};

export const DEFAULT_LOGO_SRC = "/brand-logo.png";

export const defaultBrandView: BrandView = {
  logoSrc: DEFAULT_LOGO_SRC,
  brandNameZh: "國瑞汽車",
  brandNameEn: "KUOZUI MOTORS",
  productTitleZh: "國瑞汽車中廠綠能展示播放器",
  productTitleEn: "KUOZUI GREEN ENERGY DISPLAY PLAYER",
  sloganZh: "永續，從現在開始",
  sloganEn: "/ Sustainability Starts with Us"
};

export const BRAND_CHANGED_EVENT = "solar-display:brand-changed";

export function profileToView(profile: BrandProfile | null): BrandView {
  if (!profile) return defaultBrandView;
  return {
    logoSrc: brandLogoUrl(profile),
    brandNameZh: profile.brandNameZh || defaultBrandView.brandNameZh,
    brandNameEn: profile.brandNameEn || defaultBrandView.brandNameEn,
    productTitleZh: profile.productTitleZh || defaultBrandView.productTitleZh,
    productTitleEn: profile.productTitleEn || defaultBrandView.productTitleEn,
    sloganZh: profile.sloganZh || defaultBrandView.sloganZh,
    sloganEn: profile.sloganEn || defaultBrandView.sloganEn
  };
}

export function notifyBrandChanged() {
  window.dispatchEvent(new Event(BRAND_CHANGED_EVENT));
}

export function useBrandAssets(): BrandView {
  const [view, setView] = useState<BrandView>(defaultBrandView);

  const load = useCallback(async () => {
    try {
      const profiles = await getBrandProfiles();
      const active = profiles.find((profile) => profile.isActive) ?? profiles[0] ?? null;
      setView(profileToView(active));
    } catch {
      setView(defaultBrandView);
    }
  }, []);

  useEffect(() => {
    void load();
    const onChange = () => {
      void load();
    };
    window.addEventListener(BRAND_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(BRAND_CHANGED_EVENT, onChange);
  }, [load]);

  return view;
}
