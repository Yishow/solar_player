import type { DisplayPageMediaEffects } from "./displayPageMediaEffects.js";
import type { DisplayPageFreeformObject } from "./displayPageObjects.js";

export const displayPageTemplateKeys = [
  "overview",
  "solar",
  "factory-circuit",
  "images",
  "sustainability"
] as const;

export const displayPageKeys = displayPageTemplateKeys;

export type DisplayPageTemplateKey = (typeof displayPageTemplateKeys)[number];
export type DisplayPageKey = DisplayPageTemplateKey;
export type DisplayPageId = string;

export type DisplayPageInstance = {
  id: number;
  archivedAt: string | null;
  createdAt: string | null;
  displayNameEn: string;
  displayNameZh: string;
  displayOrder: number;
  draftVersion: number | null;
  durationSeconds: number;
  enabled: boolean;
  hasDraftChanges: boolean;
  lastPublishedAt: string | null;
  liveVersion: number | null;
  pageKey: string;
  route: string;
  routeSlug: string;
  templateKey: DisplayPageTemplateKey;
  updatedAt: string | null;
};

export type ConfigStage = "draft" | "live";

export type ValidationSeverity = "blocking" | "warning";

export type ValidationFinding = {
  severity: ValidationSeverity;
  code: string;
  message: string;
  regionId?: string;
};

export type ValidationResult = {
  findings: ValidationFinding[];
  canPublish: boolean;
};

export const displayPageMediaFitModes = ["contain", "cover"] as const;

export type DisplayPageMediaFitMode = (typeof displayPageMediaFitModes)[number];

export type DisplayPageManagedAssetId = number | string;
export const displayPageMediaSourceModes = [
  "managed-asset",
  "direct-src",
  "seed-default"
] as const;

export type DisplayPageMediaSourceMode = (typeof displayPageMediaSourceModes)[number];

export type DisplayPageMediaBinding = {
  alt?: string;
  alignX?: number;
  alignY?: number;
  assetId?: DisplayPageManagedAssetId | null;
  effects?: DisplayPageMediaEffects;
  fitMode?: DisplayPageMediaFitMode;
  focusX?: number;
  focusY?: number;
  sourceMode?: DisplayPageMediaSourceMode;
  src?: string;
};

export type DisplayPageAssetFindingReason = "missing-asset" | "missing-file";

export type DisplayPageAssetFinding = {
  assetId: DisplayPageManagedAssetId | null;
  bindingId: string;
  message: string;
  pageId: DisplayPageId;
  reason: DisplayPageAssetFindingReason;
  status: "unhealthy";
};

export type DisplayPageAssetHealthEntry = {
  assetId: DisplayPageManagedAssetId | null;
  affectedPages: DisplayPageId[];
  bindings: Array<Pick<DisplayPageAssetFinding, "bindingId" | "pageId">>;
  filename: string | null;
  findings: DisplayPageAssetFinding[];
  reasons: DisplayPageAssetFindingReason[];
  status: "healthy" | "unhealthy";
  title: string | null;
};

export type DisplayPageAssetHealthReport = {
  assets: DisplayPageAssetHealthEntry[];
  findings: DisplayPageAssetFinding[];
  generatedAt: string;
  status: "healthy" | "unhealthy";
};

export type FallbackPolicyMode = "hide" | "show-placeholder" | "show-seed";

export type FallbackPolicy = {
  staleData: FallbackPolicyMode;
  missingAsset: FallbackPolicyMode;
  emptyContent: FallbackPolicyMode;
};

export type FallbackPolicyKey = keyof FallbackPolicy;

export type FallbackStatusItem = {
  key: FallbackPolicyKey;
  mode: FallbackPolicyMode;
  active: boolean;
  message?: string;
};

export type DisplayPageFallbackStatus = {
  pageId: DisplayPageId;
  stage: "live";
  isFallbackActive: boolean;
  items: FallbackStatusItem[];
};

export type PublishHistoryEntry = {
  version: number;
  stage: ConfigStage;
  publishedAt: string;
  publishedBy: string | null;
  action: "publish" | "rollback";
  sourceVersion: number | null;
};

export type DisplayPageConfigEnvelope<TRegions extends Record<string, unknown> = Record<string, unknown>> = {
  assetFindings?: DisplayPageAssetFinding[];
  freeformObjects?: DisplayPageFreeformObject[];
  pageId: DisplayPageId;
  regions: TRegions;
  updatedAt: string | null;
  version: number;
  stage?: ConfigStage;
  publishedAt?: string | null;
  publishedBy?: string | null;
  validation?: ValidationResult | null;
  fallbackPolicy?: FallbackPolicy;
};

export function isDisplayPageKey(value: string): value is DisplayPageKey {
  return displayPageKeys.includes(value as DisplayPageKey);
}

export function isDisplayPageTemplateKey(value: string): value is DisplayPageTemplateKey {
  return displayPageTemplateKeys.includes(value as DisplayPageTemplateKey);
}

export function isDisplayPageMediaSourceMode(value: unknown): value is DisplayPageMediaSourceMode {
  return typeof value === "string" && displayPageMediaSourceModes.includes(value as DisplayPageMediaSourceMode);
}

export function createEmptyDisplayPageConfig(
  pageId: DisplayPageId
): DisplayPageConfigEnvelope<Record<string, never>> {
  return {
    freeformObjects: [],
    pageId,
    regions: {},
    updatedAt: null,
    version: 1
  };
}

export function isDisplayPageMediaBinding(value: unknown): value is DisplayPageMediaBinding {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return ["alignX", "alignY", "assetId", "effects", "fitMode", "focusX", "focusY", "sourceMode", "src"].some(
    (key) => key in value
  );
}

export function resolveDisplayPageMediaSourceMode(binding: DisplayPageMediaBinding): DisplayPageMediaSourceMode {
  if (isDisplayPageMediaSourceMode(binding.sourceMode)) {
    return binding.sourceMode;
  }

  if (binding.assetId !== undefined && binding.assetId !== null) {
    return "managed-asset";
  }

  if (typeof binding.src === "string" && binding.src.trim().length > 0) {
    return "direct-src";
  }

  return "seed-default";
}

export function normalizeDisplayPageMediaBindingBySourceMode(
  binding: DisplayPageMediaBinding
): DisplayPageMediaBinding {
  const sourceMode = resolveDisplayPageMediaSourceMode(binding);
  const normalized: DisplayPageMediaBinding = {
    ...binding,
    sourceMode
  };

  if (sourceMode === "managed-asset") {
    delete normalized.src;
    return normalized;
  }

  if (sourceMode === "direct-src") {
    delete normalized.assetId;
    return normalized;
  }

  delete normalized.assetId;
  delete normalized.src;
  return normalized;
}

function resolveNonEmptyMediaSource(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export function resolveDisplayPageMediaSource(
  binding: DisplayPageMediaBinding,
  fallbackSource?: string | null
) {
  const bindingSource = resolveNonEmptyMediaSource(binding.src);
  const fallback = resolveNonEmptyMediaSource(fallbackSource);

  switch (resolveDisplayPageMediaSourceMode(binding)) {
    case "managed-asset":
      return bindingSource ?? fallback;
    case "direct-src":
      return bindingSource ?? fallback;
    case "seed-default":
    default:
      return bindingSource ?? fallback;
  }
}

export const defaultFallbackPolicy: FallbackPolicy = {
  staleData: "show-placeholder",
  missingAsset: "show-seed",
  emptyContent: "hide"
};

// `staleData: "hide"` is reserved for never-had-data cold starts. Pages that
// have prior readings but transient stale metrics stay playable with last-known values.
export const displayPageFallbackPolicyByTemplateKey: Record<DisplayPageTemplateKey, FallbackPolicy> = {
  overview: {
    emptyContent: "hide",
    missingAsset: "show-seed",
    staleData: "show-placeholder"
  },
  solar: {
    emptyContent: "hide",
    missingAsset: "show-seed",
    staleData: "show-placeholder"
  },
  "factory-circuit": {
    emptyContent: "hide",
    missingAsset: "show-placeholder",
    staleData: "show-placeholder"
  },
  images: {
    emptyContent: "hide",
    missingAsset: "show-seed",
    staleData: "show-placeholder"
  },
  sustainability: {
    emptyContent: "hide",
    missingAsset: "show-seed",
    staleData: "show-placeholder"
  }
};

export function resolveDisplayPageTemplateKeyFromPageId(pageId: string): DisplayPageTemplateKey | null {
  if (isDisplayPageTemplateKey(pageId)) {
    return pageId;
  }

  const matchedTemplateKey = displayPageTemplateKeys.find(
    (templateKey) => pageId === templateKey || pageId.startsWith(`${templateKey}-`)
  );

  return matchedTemplateKey ?? null;
}

export function resolveDisplayPageFallbackPolicyByPageId(
  pageId: string,
  templateKey?: DisplayPageTemplateKey | null
): FallbackPolicy {
  const resolvedTemplateKey = templateKey ?? resolveDisplayPageTemplateKeyFromPageId(pageId);

  if (!resolvedTemplateKey) {
    return defaultFallbackPolicy;
  }

  return displayPageFallbackPolicyByTemplateKey[resolvedTemplateKey] ?? defaultFallbackPolicy;
}
