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

export const defaultFallbackPolicy: FallbackPolicy = {
  staleData: "show-placeholder",
  missingAsset: "show-seed",
  emptyContent: "hide"
};
