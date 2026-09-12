import type { ImageAsset } from "@solar-display/shared";
import React, { memo } from "react";
import {
  type AssetCategory,
  type ManagedAssetCategory,
  type ManagedAssetUsageScope,
  type ThumbnailDensity,
  categoryLabels,
  formatUsageSummary,
  isSeedAsset,
  normalizeAssetCategory,
  normalizeAssetUsageScope,
  resolveAssetPreviewSrc,
  usageScopeLabels
} from "./assetLibraryTypes";

export type {
  AssetCategory,
  ManagedAssetCategory,
  ManagedAssetUsageScope,
  ThumbnailDensity
};
export {
  categoryLabels,
  formatUsageSummary,
  isSeedAsset,
  normalizeAssetCategory,
  normalizeAssetUsageScope,
  resolveAssetPreviewSrc,
  usageScopeLabels
};

export type AssetLibraryCardProps = {
  asset: ImageAsset;
  isSelected: boolean;
  thumbnailDensity: ThumbnailDensity;
  onSelect: (id: number) => void;
  isBatchMode?: boolean;
  isBatchSelected?: boolean;
  onToggleBatchSelect?: (id: number) => void;
  embedded?: boolean;
  onApplySelection?: (asset: ImageAsset) => void;
  onDeleteClick?: (id: number) => void;
};

let assetCardRenderListenerForTest: ((id: number) => void) | null = null;

export function setAssetCardRenderListenerForTest(
  listener: ((id: number) => void) | null
) {
  assetCardRenderListenerForTest = listener;
}

export const AssetLibraryCard = memo(function AssetLibraryCard({
  asset,
  isSelected,
  thumbnailDensity,
  onSelect,
  isBatchMode = false,
  isBatchSelected = false,
  onToggleBatchSelect,
  embedded = false,
  onApplySelection,
  onDeleteClick
}: AssetLibraryCardProps) {
  assetCardRenderListenerForTest?.(asset.id);
  const previewSrc = resolveAssetPreviewSrc(asset);
  const isReferenced = (asset.usageSummary?.referenceCount ?? 0) > 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        if (isBatchMode) {
          if (!isReferenced && onToggleBatchSelect) {
            onToggleBatchSelect(asset.id);
          }
        } else {
          onSelect(asset.id);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          if (e.target === e.currentTarget) {
            e.preventDefault();
            if (isBatchMode) {
              if (!isReferenced && onToggleBatchSelect) {
                onToggleBatchSelect(asset.id);
              }
            } else {
              onSelect(asset.id);
            }
          }
        }
      }}
      onDoubleClick={() => {
        if (!isBatchMode && embedded && onApplySelection) {
          onApplySelection(asset);
        }
      }}
      className={`asset-library-card group rounded-[18px] border p-3 text-left relative transition-all duration-200 cursor-pointer ${
        isSelected && !isBatchMode
          ? "border-[var(--shell-title-ink)] bg-[var(--workspace-surface-accent)] shadow-md"
          : isBatchSelected
          ? "border-[var(--green)] bg-[var(--workspace-surface-accent)] shadow-sm"
          : "border-[var(--shell-divider)] bg-white hover:shadow-md"
      } ${isBatchMode && isReferenced ? "opacity-60 cursor-not-allowed" : ""}`}
    >
      <div className={`overflow-hidden rounded-[12px] border border-[var(--shell-divider)] bg-[var(--workspace-surface-muted)] relative ${thumbnailDensity === "comfortable" ? "aspect-video" : "aspect-square"}`}>
        {previewSrc ? (
          <img src={previewSrc} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : null}

        {isBatchMode && (
          <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
            {isReferenced ? (
              <>
                <input
                  type="checkbox"
                  disabled
                  className="h-4 w-4 rounded border-gray-200 text-gray-300 cursor-not-allowed opacity-50"
                  title="此素材有 active 引用，請解除引用後再批次刪除"
                />
                <div className="bg-red-50 text-red-600 rounded-full p-0.5 border border-red-100 shadow-sm animate-pulse" title="此素材有 active 引用，請解除引用後再批次刪除">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </>
            ) : (
              <input
                type="checkbox"
                checked={isBatchSelected}
                onChange={() => onToggleBatchSelect?.(asset.id)}
                className="h-4.5 w-4.5 rounded border-gray-300 text-[var(--green)] focus:ring-[var(--green)] cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        )}

        {!isBatchMode && (
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-between p-3 text-white rounded-[12px]">
            {/* Top info and actions */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-wider bg-white/20 px-2 py-0.5 rounded-full border border-white/10">
                #{asset.id}
              </span>
              <div className="flex items-center gap-1.5">
                {isSeedAsset(asset) && (
                  <span className="text-[10px] font-bold bg-[var(--green)] px-2 py-0.5 rounded-full">
                    內建素材
                  </span>
                )}
                {isReferenced ? (
                  <div className="hover-lock-icon bg-white/95 text-gray-500 rounded-full p-1 shadow-md cursor-help" title="此素材已被引用，無法直接刪除">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteClick?.(asset.id);
                    }}
                    className="hover-delete-btn bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-full p-1 shadow-md transition-colors duration-150"
                    title="快速刪除此資產"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Application action (embedded mode only) */}
            {embedded && onApplySelection && (
              <div className="flex justify-center my-auto">
                <span className="hover-apply-btn rounded-full bg-white/95 px-3.5 py-1.5 text-[11px] font-bold text-gray-800 shadow-md hover:bg-white scale-95 group-hover:scale-100 transition-all duration-200">
                  套用此圖
                </span>
              </div>
            )}

            {/* Bottom usage stats and guidelines */}
            <div className="space-y-1 mt-auto">
              <div className="text-[11px] font-semibold opacity-90 line-clamp-2 leading-snug">
                {formatUsageSummary(asset)}
              </div>
              <div className="text-[10px] opacity-75 flex items-center justify-between">
                <span>範圍: {usageScopeLabels[normalizeAssetUsageScope(asset)]}</span>
                {embedded && onApplySelection && (
                  <span className="text-[9px] font-bold text-emerald-300 animate-pulse">
                    雙擊套用 ↵
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="mt-2.5 px-0.5">
        <div className="truncate text-[14px] font-bold text-[var(--shell-title-ink)]">
          {asset.title ?? asset.originalName ?? `素材 ${asset.id}`}
        </div>
        <div className="mt-0.5 text-[11px] font-semibold text-[var(--shell-subtitle-ink)] flex items-center justify-between">
          <span>{categoryLabels[normalizeAssetCategory(asset)]}</span>
          {isSeedAsset(asset) && (
            <span className="sr-only">內建素材 · {asset.seedKey}</span>
          )}
        </div>
      </div>
    </div>
  );
});
