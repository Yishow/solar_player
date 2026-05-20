import { useCallback, useEffect, useRef, useState } from "react";
import type { DisplaySyncEvent, RuntimeBrandProfile } from "@solar-display/shared";
import { buildApiUrl, getRuntimeBrandProfile } from "../services/api";
import { subscribeSocketEvent } from "../services/socket";

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

function resolveRuntimeBrandLogoUrl(logoUrl: string | null | undefined) {
  return logoUrl ? buildApiUrl(logoUrl) : DEFAULT_LOGO_SRC;
}

export function profileToView(profile: RuntimeBrandProfile | null): BrandView {
  if (!profile) return defaultBrandView;
  return {
    logoSrc: resolveRuntimeBrandLogoUrl(profile.logoUrl),
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

export async function resolveRuntimeBrandView(
  loadRuntimeBrandProfile: () => Promise<RuntimeBrandProfile | null> = getRuntimeBrandProfile
) {
  try {
    return profileToView(await loadRuntimeBrandProfile());
  } catch {
    return defaultBrandView;
  }
}

export async function refreshRuntimeBrandView(
  previousView: BrandView,
  loadRuntimeBrandProfile: () => Promise<RuntimeBrandProfile | null> = getRuntimeBrandProfile
) {
  try {
    return profileToView(await loadRuntimeBrandProfile());
  } catch {
    return previousView;
  }
}

export function shouldRefreshBrandForDisplaySync(event: Pick<DisplaySyncEvent, "scope">) {
  return event.scope === "brand";
}

export function useBrandAssets(): BrandView {
  const [view, setView] = useState<BrandView>(defaultBrandView);
  const viewRef = useRef(view);
  const isMountedRef = useRef(true);
  const inFlightRefreshRef = useRef<Promise<void> | null>(null);
  const pendingRefreshRef = useRef(false);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => () => {
    isMountedRef.current = false;
  }, []);

  const refresh = useCallback(async (mode: "bootstrap" | "refresh") => {
    if (inFlightRefreshRef.current) {
      pendingRefreshRef.current = true;
      await inFlightRefreshRef.current;
      return;
    }

    const nextRefresh = (async () => {
      const previousView = viewRef.current;
      const nextView =
        mode === "bootstrap"
          ? await resolveRuntimeBrandView()
          : await refreshRuntimeBrandView(previousView);

      if (!isMountedRef.current) {
        return;
      }

      viewRef.current = nextView;
      setView(nextView);
    })().finally(async () => {
      inFlightRefreshRef.current = null;

      if (!pendingRefreshRef.current || !isMountedRef.current) {
        return;
      }

      pendingRefreshRef.current = false;
      await refresh("refresh");
    });

    inFlightRefreshRef.current = nextRefresh;
    await nextRefresh;
  }, []);

  useEffect(() => {
    void refresh("bootstrap");

    const onChange = () => {
      void refresh("refresh");
    };

    window.addEventListener(BRAND_CHANGED_EVENT, onChange);
    const unsubscribeDisplaySync = subscribeSocketEvent("display:sync", (event) => {
      if (!shouldRefreshBrandForDisplaySync(event)) {
        return;
      }

      void refresh("refresh");
    });

    return () => {
      window.removeEventListener(BRAND_CHANGED_EVENT, onChange);
      unsubscribeDisplaySync();
    };
  }, [refresh]);

  return view;
}
