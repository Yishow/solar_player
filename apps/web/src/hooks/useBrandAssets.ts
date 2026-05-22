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
export const BRAND_VIEW_STORAGE_KEY = "solar-display:brand-view";
export const DEFAULT_DOCUMENT_TITLE = "綠能展示播放器";

export const defaultBrandView: BrandView = {
  logoSrc: DEFAULT_LOGO_SRC,
  brandNameZh: "國瑞汽車",
  brandNameEn: "KUOZUI MOTORS",
  productTitleZh: "國瑞汽車綠能展示播放器",
  productTitleEn: "KUOZUI GREEN ENERGY DISPLAY PLAYER",
  sloganZh: "永續，從現在開始",
  sloganEn: "/ Sustainability Starts with Us"
};

export const BRAND_CHANGED_EVENT = "solar-display:brand-changed";

type BrandViewStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;

function resolveBrandViewStorage(storage?: BrandViewStorage | null) {
  if (storage !== undefined) {
    return storage;
  }

  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function normalizeCachedBrandView(value: unknown): BrandView | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Partial<BrandView>;
  const nextView: BrandView = {
    ...defaultBrandView
  };

  const keys: Array<keyof BrandView> = [
    "logoSrc",
    "brandNameZh",
    "brandNameEn",
    "productTitleZh",
    "productTitleEn",
    "sloganZh",
    "sloganEn"
  ];

  for (const key of keys) {
    if (typeof candidate[key] === "string") {
      nextView[key] = candidate[key];
    }
  }

  return nextView;
}

export function readCachedBrandView(storage?: BrandViewStorage | null): BrandView | null {
  const resolvedStorage = resolveBrandViewStorage(storage);

  if (!resolvedStorage) {
    return null;
  }

  const raw = resolvedStorage.getItem(BRAND_VIEW_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return normalizeCachedBrandView(JSON.parse(raw));
  } catch {
    resolvedStorage.removeItem(BRAND_VIEW_STORAGE_KEY);
    return null;
  }
}

export function writeCachedBrandView(view: BrandView, storage?: BrandViewStorage | null) {
  const resolvedStorage = resolveBrandViewStorage(storage);

  if (!resolvedStorage) {
    return;
  }

  resolvedStorage.setItem(BRAND_VIEW_STORAGE_KEY, JSON.stringify(view));
}

export function resolveInitialBrandView(initialView?: BrandView, storage?: BrandViewStorage | null) {
  return initialView ?? readCachedBrandView(storage) ?? defaultBrandView;
}

export function resolveDocumentTitle(view?: Pick<BrandView, "productTitleZh"> | null) {
  const productTitleZh = view?.productTitleZh?.trim();
  return productTitleZh && productTitleZh.length > 0 ? productTitleZh : DEFAULT_DOCUMENT_TITLE;
}

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

export async function resolveLoaderBrandView(
  loadRuntimeBrandProfile: () => Promise<RuntimeBrandProfile | null> = getRuntimeBrandProfile,
  storage?: BrandViewStorage | null
) {
  try {
    return profileToView(await loadRuntimeBrandProfile());
  } catch {
    return readCachedBrandView(storage) ?? defaultBrandView;
  }
}

export async function loadRuntimeBrandView() {
  return resolveLoaderBrandView();
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

export function useBrandAssets(initialView: BrandView = defaultBrandView): BrandView {
  const [view, setView] = useState<BrandView>(() => resolveInitialBrandView(initialView));
  const viewRef = useRef(view);
  const isMountedRef = useRef(true);
  const inFlightRefreshRef = useRef<Promise<void> | null>(null);
  const pendingRefreshRef = useRef(false);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    writeCachedBrandView(view);
    if (typeof document !== "undefined") {
      document.title = resolveDocumentTitle(view);
    }
  }, [view]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
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
