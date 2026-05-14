import { useEffect, useState } from "react";

export type BrandAssets = {
  logoDataUrl: string;
  brandNameZh: string;
  brandNameEn: string;
  productTitleZh: string;
  productTitleEn: string;
  sloganZh: string;
  sloganEn: string;
};

const STORAGE_KEY = "solar-display:brand-assets";

export const DEFAULT_LOGO_SRC = "/brand-logo.png";

export const defaultBrandAssets: BrandAssets = {
  logoDataUrl: DEFAULT_LOGO_SRC,
  brandNameZh: "國瑞汽車",
  brandNameEn: "KUOZUI MOTORS",
  productTitleZh: "國瑞汽車中廠綠能展示播放器",
  productTitleEn: "KUOZUI GREEN ENERGY DISPLAY PLAYER",
  sloganZh: "永續，從現在開始",
  sloganEn: "/ Sustainability Starts with Us"
};

function readStorage(): BrandAssets {
  if (typeof window === "undefined") return defaultBrandAssets;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultBrandAssets;
    const parsed = JSON.parse(raw) as Partial<BrandAssets>;
    return { ...defaultBrandAssets, ...parsed };
  } catch {
    return defaultBrandAssets;
  }
}

const BRAND_EVENT = "solar-display:brand-assets-changed";

export function useBrandAssets(): [BrandAssets, (next: BrandAssets) => void] {
  const [assets, setAssets] = useState<BrandAssets>(() => readStorage());

  useEffect(() => {
    const sync = () => setAssets(readStorage());
    window.addEventListener(BRAND_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(BRAND_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const persist = (next: BrandAssets) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(BRAND_EVENT));
    setAssets(next);
  };

  return [assets, persist];
}
