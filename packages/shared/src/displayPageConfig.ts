export const displayPageKeys = [
  "overview",
  "solar",
  "factory-circuit",
  "images",
  "sustainability"
] as const;

export type DisplayPageKey = (typeof displayPageKeys)[number];

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

export type DisplayPageMediaBinding = {
  alt?: string;
  alignX?: number;
  alignY?: number;
  assetId?: DisplayPageManagedAssetId | null;
  fitMode?: DisplayPageMediaFitMode;
  focusX?: number;
  focusY?: number;
  src?: string;
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
  pageId: DisplayPageKey;
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
  pageId: DisplayPageKey;
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

export function createEmptyDisplayPageConfig(
  pageId: DisplayPageKey
): DisplayPageConfigEnvelope<Record<string, never>> {
  return {
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

  return ["alignX", "alignY", "assetId", "fitMode", "focusX", "focusY", "src"].some(
    (key) => key in value
  );
}

export const defaultFallbackPolicy: FallbackPolicy = {
  staleData: "show-placeholder",
  missingAsset: "show-seed",
  emptyContent: "hide"
};
