import type { ImageAsset } from "@solar-display/shared";
import { buildApiUrl } from "../../services/api";

export type AssetCategory = "all" | "background" | "icon" | "object";
export type ManagedAssetCategory = "background" | "icon" | "object";
export type ManagedAssetUsageScope = "both" | "page-only" | "shell-only";
export type ThumbnailDensity = "comfortable" | "compact";

export const categoryLabels: Record<AssetCategory, string> = {
  all: "全部",
  background: "背景",
  icon: "圖示",
  object: "物件"
};

export const usageScopeLabels: Record<ManagedAssetUsageScope, string> = {
  both: "頁面 + 殼層",
  "page-only": "僅頁面",
  "shell-only": "僅殼層"
};

export function formatUsageSummary(asset: ImageAsset): string {
  const summary = asset.usageSummary;
  if (!summary) {
    return "未建立引用摘要";
  }

  return `Live ${summary.liveCount} · Draft ${summary.draftCount}`;
}

export function isSeedAsset(asset: ImageAsset): boolean {
  return typeof asset.seedKey === "string" && asset.seedKey.length > 0;
}

export function normalizeAssetCategory(asset: ImageAsset): ManagedAssetCategory {
  return asset.category === "icon" || asset.category === "object" ? asset.category : "background";
}

export function normalizeAssetUsageScope(asset: ImageAsset): ManagedAssetUsageScope {
  return asset.usageScope === "page-only" || asset.usageScope === "shell-only" ? asset.usageScope : "both";
}

export function resolveAssetPreviewSrc(asset: ImageAsset): string | null {
  return asset.filename ? buildApiUrl(`/uploads/images/${asset.filename}`) : null;
}
