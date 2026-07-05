import type {
  DisplayOpsAssetReferenceSummary,
  DisplayPageAssetHealthReport,
  ImageAsset
} from "@solar-display/shared";
import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { ImageManagementAssetHealthPanel } from "../../components/displayPageAssetHealthPanels";
import { PageContainer } from "../../components/PageContainer";
import { CustomSelect } from "../../components/management";
import { WorkspaceActionBar, WorkspaceBoard, WorkspacePanel } from "../../components/workspaceSurface";
import { useDisplayPageAssetHealth } from "../../hooks/useDisplayPageAssetHealth";
import { useDisplaySyncRefresh } from "../../hooks/useDisplaySyncRefresh";
import { useImageAssetReferences } from "../../hooks/useImageAssetReferences";
import {
  ApiRequestError,
  buildApiUrl,
  deleteImageAsset,
  getImages,
  uploadManagedAsset
} from "../../services/api";
import { IMAGE_MANAGEMENT_DISPLAY_SYNC_SCOPES } from "../managementDisplaySyncScopes";

type AssetCategory = "all" | "background" | "icon" | "object";
type ManagedAssetCategory = "background" | "icon" | "object";
type ManagedAssetUsageScope = "both" | "page-only" | "shell-only";
type ThumbnailDensity = "comfortable" | "compact";

const displayPageLabels = {
  "factory-circuit": "Factory Circuit",
  images: "Images",
  overview: "Overview",
  "shared-shell": "Shared Shell",
  solar: "Solar",
  sustainability: "Sustainability"
} as const;


type AssetLibraryProps = {
  contextLabel?: string;
  embedded?: boolean;
  initialAssets?: ImageAsset[];
  initialAssetHealthReport?: DisplayPageAssetHealthReport | null;
  initialReferences?: DisplayOpsAssetReferenceSummary;
  initialQuery?: string;
  initialDragging?: boolean;
  initialLightboxSrc?: string;
  initialBatchMode?: boolean;
  onApplySelection?: (asset: ImageAsset) => void;
  onAssetsChange?: (assets: ImageAsset[]) => void;
  onReturnToEditor?: () => void;
  returnLabel?: string;
};

const categoryLabels: Record<AssetCategory, string> = {
  all: "全部",
  background: "背景",
  icon: "圖示",
  object: "物件"
};

const usageScopeLabels: Record<ManagedAssetUsageScope, string> = {
  both: "頁面 + 殼層",
  "page-only": "僅頁面",
  "shell-only": "僅殼層"
};

function formatUsageSummary(asset: ImageAsset) {
  const summary = asset.usageSummary;
  if (!summary) {
    return "未建立引用摘要";
  }

  return `Live ${summary.liveCount} · Draft ${summary.draftCount}`;
}

function isSeedAsset(asset: ImageAsset) {
  return typeof asset.seedKey === "string" && asset.seedKey.length > 0;
}

function normalizeAssetCategory(asset: ImageAsset): ManagedAssetCategory {
  return asset.category === "icon" || asset.category === "object" ? asset.category : "background";
}

function normalizeAssetUsageScope(asset: ImageAsset): ManagedAssetUsageScope {
  return asset.usageScope === "page-only" || asset.usageScope === "shell-only" ? asset.usageScope : "both";
}

function resolveAssetPreviewSrc(asset: ImageAsset) {
  return asset.filename ? buildApiUrl(`/uploads/images/${asset.filename}`) : null;
}

function formatReferenceKind(kind: string) {
  switch (kind) {
    case "display-page":
      return "頁面媒體";
    case "page-object":
      return "自由物件";
    case "shell-decoration":
      return "殼層裝飾";
    case "slideshow":
      return "輪播";
    case "cover":
      return "封面";
    default:
      return kind;
  }
}

const AssetLibraryCard = memo(function AssetLibraryCard({
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
}: {
  asset: ImageAsset;
  isSelected: boolean;
  thumbnailDensity: ThumbnailDensity;
  onSelect: (id: number) => void;
  isBatchMode?: boolean;
  isBatchSelected?: boolean;
  onToggleBatchSelect?: (id: number) => void;
  embedded?: boolean;
  onApplySelection?: (asset: ImageAsset) => void;
  onDeleteClick?: (asset: ImageAsset) => void;
}) {
  const previewSrc = resolveAssetPreviewSrc(asset);
  const isReferenced = (asset.usageSummary?.referenceCount ?? 0) > 0;

  return (
    <button
      type="button"
      onClick={() => {
        if (isBatchMode) {
          if (!isReferenced && onToggleBatchSelect) {
            onToggleBatchSelect(asset.id);
          }
        } else {
          onSelect(asset.id);
        }
      }}
      onDoubleClick={() => {
        if (!isBatchMode && embedded && onApplySelection) {
          onApplySelection(asset);
        }
      }}
      className={`asset-library-card group rounded-[18px] border p-3 text-left relative transition-all duration-200 ${
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
                      onDeleteClick?.(asset);
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
    </button>
  );
});

const AssetLibrarySkeletonCard = memo(function AssetLibrarySkeletonCard({
  thumbnailDensity
}: {
  thumbnailDensity: ThumbnailDensity;
}) {
  return (
    <div className="rounded-[18px] border border-[var(--shell-divider)] p-3 bg-white">
      <div className={`asset-skeleton-pulse rounded-[12px] ${thumbnailDensity === "comfortable" ? "aspect-video" : "aspect-square"}`} />
      <div className="mt-3 space-y-2">
        <div className="asset-skeleton-pulse h-4 w-3/4 rounded" />
        <div className="asset-skeleton-pulse h-3 w-1/2 rounded" />
        <div className="mt-2 asset-skeleton-pulse h-3 w-1/4 rounded" />
      </div>
    </div>
  );
});

export function AssetLibrary({
  contextLabel,
  embedded = false,
  initialAssets,
  initialAssetHealthReport,
  initialReferences,
  initialQuery,
  initialDragging,
  initialLightboxSrc,
  initialBatchMode,
  onApplySelection,
  onAssetsChange,
  onReturnToEditor,
  returnLabel = "返回展示頁編輯"
}: AssetLibraryProps) {
  // 1. All state hooks
  const [assets, setAssets] = useState<ImageAsset[]>(initialAssets ?? []);
  const [isLoading, setIsLoading] = useState(initialAssets === undefined);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState(initialAssets === undefined ? "正在同步資產庫..." : "資產庫已同步。");
  const [errorMessage, setErrorMessage] = useState("");
  const [query, setQuery] = useState(initialQuery ?? "");
  const [isDragging, setIsDragging] = useState(initialDragging ?? false);
  const [activeLightboxSrc, setActiveLightboxSrc] = useState<string | null>(initialLightboxSrc ?? null);
  const [isBatchMode, setIsBatchMode] = useState(initialBatchMode ?? false);
  const [batchSelectedIds, setBatchSelectedIds] = useState<Set<number>>(new Set());
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleVal, setEditingTitleVal] = useState("");
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editingDescVal, setEditingDescVal] = useState("");
  const [deleteConfirmAsset, setDeleteConfirmAsset] = useState<ImageAsset | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<AssetCategory>("all");
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(initialAssets?.[0]?.id ?? null);
  const [thumbnailDensity, setThumbnailDensity] = useState<ThumbnailDensity>("comfortable");
  const [uploadCategory, setUploadCategory] = useState<ManagedAssetCategory>("background");
  const [uploadUsageScope, setUploadUsageScope] = useState<ManagedAssetUsageScope>("both");
  
  // 2. All refs
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const rightPanelScrollRef = useRef<HTMLDivElement | null>(null);

  // 3. Helper custom hooks
  const {
    errorMessage: assetHealthErrorMessage,
    isLoading: isAssetHealthLoading,
    reload: reloadAssetHealth,
    report: assetHealthReport
  } = useDisplayPageAssetHealth({ initialReport: initialAssetHealthReport });

  const {
    errorMessage: assetReferencesErrorMessage,
    isLoading: isAssetReferencesLoading,
    references: assetReferences,
    reload: reloadAssetReferences
  } = useImageAssetReferences(selectedAssetId);

  // 4. Memos (filteredAssets first, then selectedAsset which depends on filteredAssets)
  const filteredAssets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return assets.filter((asset) => {
      if (selectedCategory !== "all" && normalizeAssetCategory(asset) !== selectedCategory) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        asset.title,
        asset.originalName,
        asset.description
      ].some((value) => value?.toLowerCase().includes(normalizedQuery));
    });
  }, [assets, query, selectedCategory]);

  const selectedAsset = useMemo(
    () =>
      filteredAssets.find((asset) => asset.id === selectedAssetId)
        ?? assets.find((asset) => asset.id === selectedAssetId)
        ?? null,
    [filteredAssets, assets, selectedAssetId]
  );

  const resolvedAssetReferences =
    initialReferences && initialReferences.assetId === selectedAssetId ? initialReferences : assetReferences;
  const selectedAssetPreviewSrc = selectedAsset ? resolveAssetPreviewSrc(selectedAsset) : null;
  const selectedAssetHasBlockingReferences = (resolvedAssetReferences?.blockingIssues.length ?? 0) > 0;

  const categoryCounts = useMemo(() => ({
    all: assets.length,
    background: assets.filter((asset) => normalizeAssetCategory(asset) === "background").length,
    icon: assets.filter((asset) => normalizeAssetCategory(asset) === "icon").length,
    object: assets.filter((asset) => normalizeAssetCategory(asset) === "object").length
  }), [assets]);

  const unhealthyEntries = useMemo(() => 
    assetHealthReport?.assets.filter((entry) => entry.status === "unhealthy") ?? [],
    [assetHealthReport]
  );
  const totalTracked = assetHealthReport?.assets.length ?? 0;

  useEffect(() => {
    if (selectedAssetId) {
      setTimeout(() => {
        if (rightPanelScrollRef.current) {
          rightPanelScrollRef.current.scrollTop = 0;
          rightPanelScrollRef.current.scrollIntoView({ 
            behavior: "smooth", 
            block: "start" 
          });
        }
      }, 50);
    }
  }, [selectedAssetId]);
  useEffect(() => {
    if (selectedAsset) {
      setEditingTitleVal(selectedAsset.title);
      setEditingDescVal(selectedAsset.description ?? "");
      setIsEditingTitle(false);
      setIsEditingDesc(false);
    }
  }, [selectedAssetId, assets]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputFocused = activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.tagName === "SELECT");

      if (e.key === "/" && !isInputFocused) {
        e.preventDefault();
        const searchInput = document.getElementById("search-input");
        if (searchInput) {
          searchInput.focus();
        }
      }

      if (e.key === "Escape") {
        const searchInput = document.getElementById("search-input");
        if (activeEl === searchInput && searchInput) {
          setQuery("");
          searchInput.blur();
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    if (!activeLightboxSrc) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveLightboxSrc(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeLightboxSrc]);

  const syncAssets = async (preferredAssetId: number | null = selectedAssetId) => {
    const nextAssets = await getImages();
    setAssets(nextAssets);
    onAssetsChange?.(nextAssets);
    setSelectedAssetId((currentSelected) => {
      const candidate = preferredAssetId ?? currentSelected;
      if (candidate !== null && nextAssets.some((asset) => asset.id === candidate)) {
        return candidate;
      }

      return nextAssets[0]?.id ?? null;
    });
  };

  useEffect(() => {
    if (initialAssets) {
      return;
    }

    let active = true;
    void getImages()
      .then((nextAssets) => {
        if (!active) {
          return;
        }

        setAssets(nextAssets);
        onAssetsChange?.(nextAssets);
        setSelectedAssetId(nextAssets[0]?.id ?? null);
        setMessage("資產庫已同步。");
        setErrorMessage("");
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "載入資產庫失敗。");
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [initialAssets]);

  useDisplaySyncRefresh(async () => {
    await Promise.all([
      syncAssets(),
      reloadAssetHealth(),
      reloadAssetReferences()
    ]);
  }, IMAGE_MANAGEMENT_DISPLAY_SYNC_SCOPES);

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    void uploadFiles(files);
    event.target.value = "";
  };

  const handleDrop = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const files = Array.from(event.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/") || file.name.endsWith(".svg")
    );
    void uploadFiles(files);
  };

  const handleToggleBatchSelect = (id: number) => {
    setBatchSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getElementImageSize = (file: File): Promise<{ width: number; height: number }> => {
    if (typeof window === "undefined" || typeof Image === "undefined" || typeof URL === "undefined") {
      const nameLower = file.name.toLowerCase();
      if (nameLower.includes("icon")) {
        return Promise.resolve({ width: 128, height: 128 });
      }
      return Promise.resolve({ width: 1920, height: 1080 });
    }
    return new Promise((resolve, reject) => {
      try {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
          URL.revokeObjectURL(url);
        };
        img.onerror = () => {
          reject();
          URL.revokeObjectURL(url);
        };
        img.src = url;
      } catch {
        reject();
      }
    });
  };

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setIsUploading(true);
    setErrorMessage("");
    try {
      for (const file of files) {
        let predictedCategory = uploadCategory;
        const nameLower = file.name.toLowerCase();
        
        if (nameLower.includes("icon") || nameLower.includes("logo") || nameLower.includes("btn")) {
          predictedCategory = "icon";
        } else if (nameLower.includes("bg") || nameLower.includes("hero") || nameLower.includes("wallpaper")) {
          predictedCategory = "background";
        }

        try {
          const dimensions = await getElementImageSize(file);
          if (dimensions.width < 256 && dimensions.height < 256) {
            predictedCategory = "icon";
          } else if (dimensions.width >= 800 && dimensions.width > dimensions.height) {
            predictedCategory = "background";
          } else {
            predictedCategory = "object";
          }
        } catch {
          // ignore pre-detection failures
        }

        const uploaded = await uploadManagedAsset(file, predictedCategory, uploadUsageScope);
        setSelectedAssetId(uploaded.id);
      }
      await Promise.all([
        syncAssets(),
        reloadAssetHealth()
      ]);
      setMessage("已成功上傳新資產。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "上傳失敗。");
    } finally {
      setIsUploading(false);
    }
  };

  const handleBatchDelete = async () => {
    if (batchSelectedIds.size === 0) return;
    if (!window.confirm(`確定要刪除這 ${batchSelectedIds.size} 筆資產嗎？`)) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage("");
    try {
      const idsToDelete = Array.from(batchSelectedIds);
      let deletedCount = 0;
      let failedCount = 0;

      for (const id of idsToDelete) {
        try {
          await deleteImageAsset(id);
          deletedCount++;
        } catch (error) {
          failedCount++;
        }
      }

      await Promise.all([
        syncAssets(),
        reloadAssetHealth()
      ]);

      setBatchSelectedIds(new Set());
      if (failedCount > 0) {
        setErrorMessage(`成功刪除 ${deletedCount} 筆資產，另有 ${failedCount} 筆資產因被引用中而刪除失敗。`);
      } else {
        setMessage(`已成功批次刪除 ${deletedCount} 筆資產。`);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "批次刪除失敗。");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveTitle = async () => {
    if (!selectedAsset || !editingTitleVal.trim()) {
      setIsEditingTitle(false);
      return;
    }
    if (editingTitleVal === selectedAsset.title) {
      setIsEditingTitle(false);
      return;
    }
    try {
      await updateImageAsset(selectedAsset.id, { title: editingTitleVal });
      await syncAssets();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "儲存標題失敗。");
    } finally {
      setIsEditingTitle(false);
    }
  };

  const handleSaveDesc = async () => {
    if (!selectedAsset) {
      setIsEditingDesc(false);
      return;
    }
    if (editingDescVal === (selectedAsset.description ?? "")) {
      setIsEditingDesc(false);
      return;
    }
    try {
      await updateImageAsset(selectedAsset.id, { description: editingDescVal });
      await syncAssets();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "儲存描述失敗。");
    } finally {
      setIsEditingDesc(false);
    }
  };

  const handleUpdateCategory = async (newCategory: ManagedAssetCategory) => {
    if (!selectedAsset) return;
    try {
      await updateImageAsset(selectedAsset.id, { category: newCategory });
      await syncAssets();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "修改分類失敗。");
    }
  };

  const handleUpdateUsageScope = async (newUsageScope: ManagedAssetUsageScope) => {
    if (!selectedAsset) return;
    try {
      await updateImageAsset(selectedAsset.id, { usageScope: newUsageScope });
      await syncAssets();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "修改使用範圍失敗。");
    }
  };

  const handleConfirmDelete = (asset: ImageAsset) => {
    setDeleteConfirmAsset(asset);
  };

  const handleExecuteDelete = async () => {
    if (!deleteConfirmAsset) return;
    const targetId = deleteConfirmAsset.id;
    setDeleteConfirmAsset(null);

    setIsDeleting(true);
    setErrorMessage("");
    try {
      await deleteImageAsset(targetId);
      await Promise.all([
        syncAssets(),
        reloadAssetHealth()
      ]);
      setSelectedAssetId(null);
      setMessage("已成功刪除資產。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "刪除失敗。");
    } finally {
      setIsDeleting(false);
    }
  };

  const content = (
    <>
      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.9fr]">
      <WorkspacePanel
        surface="asset-library"
        className={`relative pt-0 flex flex-col min-h-0 overflow-hidden ${embedded ? "h-full" : "h-[calc(100vh-160px)]"}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => void handleDrop(e)}
      >
        {isDragging && (
          <div className="asset-drag-overlay">
            <svg className="h-12 w-12 text-[var(--green)] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="text-[18px] font-semibold text-[var(--shell-title-ink)]">拖曳檔案至此處上傳</span>
            <span className="mt-1 text-[13px] text-[var(--shell-subtitle-ink)]">支援 JPG, PNG, WEBP, SVG 格式</span>
          </div>
        )}
        <input
          ref={fileInputRef}
          hidden
          accept=".jpg,.jpeg,.png,.webp,.svg"
          multiple
          type="file"
          onChange={(event) => void handleUpload(event)}
        />

        <WorkspaceActionBar
          className="sticky top-0 z-20 bg-[var(--workspace-surface)] px-5 -mx-5 py-4 shadow-sm rounded-t-[22px] rounded-b-none"
          style={{ borderBottom: "1px solid var(--workspace-surface-border)" }}
          surface="asset-actions"
        >
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--shell-subtitle-ink)]">
                資產庫管理
              </p>
              <h2 className="mt-1 text-[24px] font-semibold text-[var(--shell-title-ink)]">資產庫</h2>
            </div>
            {(errorMessage || message) && (
              <span
                data-workspace-surface="status-board"
                className={`inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wide px-3 py-1 rounded-full border shadow-sm backdrop-blur-sm transition-all duration-300 ${
                  errorMessage
                    ? "bg-[rgba(180,82,52,0.06)] text-[var(--workspace-surface-danger-ink)] border-[rgba(180,82,52,0.18)]"
                    : "bg-[rgba(95,140,80,0.06)] text-[var(--green)] border-[rgba(95,140,80,0.18)]"
                }`}
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    errorMessage ? "bg-red-400" : "bg-[var(--green)]"
                  }`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${
                    errorMessage ? "bg-red-500" : "bg-[var(--green)]"
                  }`}></span>
                </span>
                {errorMessage ? (
                  <svg className="h-3.5 w-3.5 text-[var(--workspace-surface-danger-ink)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : null}
                <span>{errorMessage || message}</span>
              </span>
            )}
            {unhealthyEntries.length > 0 ? (
              <span
                className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wide px-3 py-1 rounded-full border shadow-sm backdrop-blur-sm transition-all duration-300 bg-[rgba(180,82,52,0.06)] text-[var(--workspace-surface-danger-ink)] border-[rgba(180,82,52,0.18)] cursor-help shrink-0"
                title={`引用異常素材：\n${unhealthyEntries
                  .map(
                    (e) =>
                      `• ${e.title ?? e.filename ?? `Asset ${e.assetId}`} (頁面: ${e.affectedPages.map((p) => displayPageLabels[p as keyof typeof displayPageLabels] ?? p).join(", ")}, 原因: ${e.reasons.map((r) => (r === "missing-file" ? "檔案遺失" : "不存在")).join(", ")})`
                  )
                  .join("\n")}`}
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-red-400"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span>⚠️ {unhealthyEntries.length} 個異常</span>
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wide px-3 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-500 shadow-sm shrink-0"
                title={`所有展示素材引用正常，共追蹤 ${totalTracked} 個素材引用`}
              >
                🛡️ 引用正常 ({totalTracked})
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`asset-btn ${
                isBatchMode ? "asset-btn-danger" : "asset-btn-secondary"
              }`}
              onClick={() => {
                setIsBatchMode(!isBatchMode);
                setBatchSelectedIds(new Set());
              }}
            >
              {isBatchMode ? "退出批次" : "批次管理"}
            </button>
            {contextLabel && onApplySelection ? (
              <button
                type="button"
                className="asset-btn asset-btn-primary"
                disabled={!selectedAsset}
                onClick={() => {
                  if (selectedAsset) {
                    onApplySelection(selectedAsset);
                  }
                }}
              >
                套用目前素材並返回
              </button>
            ) : null}
            {onReturnToEditor ? (
              <button
                type="button"
                className="asset-btn asset-btn-secondary"
                onClick={onReturnToEditor}
              >
                {returnLabel}
              </button>
            ) : null}
            <button
              type="button"
              className="asset-btn asset-btn-primary"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? "上傳中..." : "上傳資產"}
            </button>
          </div>
        </WorkspaceActionBar>



        {contextLabel ? (
          <WorkspaceBoard className="mt-4" surface="context-board" tone="accent">
            <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--shell-subtitle-ink)]">
              返回目標
            </div>
            <div className="mt-1 text-[14px] font-semibold text-[var(--shell-title-ink)]">{contextLabel}</div>
          </WorkspaceBoard>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 bg-[var(--workspace-surface)]/60 backdrop-blur-md border border-[var(--workspace-surface-border)]/50 p-2.5 rounded-[20px] flex-shrink-0 shadow-sm relative z-30">
          {/* Left: Segmented Tabs and Search input */}
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[320px]">
            {/* Segmented Tab Control */}
            <div className="flex rounded-full bg-[rgba(82,91,66,0.06)] p-0.5 border border-[var(--workspace-surface-border)]/60 shrink-0">
              {(["all", "background", "object", "icon"] as const).map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`rounded-full px-3.5 py-1 text-[12px] font-bold transition-all duration-200 ${
                    category === selectedCategory
                      ? "bg-[var(--green)] text-white shadow-md shadow-emerald-900/10 border border-emerald-600/10"
                      : "border border-transparent text-[var(--shell-subtitle-ink)] hover:text-[var(--shell-title-ink)]"
                  }`}
                >
                  {categoryLabels[category]} {categoryCounts[category]}
                </button>
              ))}
            </div>

            {/* Compact Search Box */}
            <div className="relative flex-1 min-w-[150px] group/search">
              <span className="sr-only">搜尋素材</span>
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within/search:text-[var(--green)] transition-colors">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                id="search-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜尋資產..."
                className="w-full rounded-full border border-[var(--shell-divider)] bg-white pl-10 pr-10 py-1.5 text-[12px] transition-all focus:outline-none focus:border-[var(--green)] focus:ring-2 focus:ring-[var(--green)]/15"
              />
              {query ? (
                <button
                  type="button"
                  className="search-clear-btn absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  onClick={() => setQuery("")}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              ) : null}
            </div>
          </div>

          {/* Right: Select filters & Density buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Filter Group: Category */}
            <div className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" title="上傳預設分類">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <CustomSelect
                className="w-[95px] text-[11px]"
                value={uploadCategory}
                onChange={(value) => setUploadCategory(value as ManagedAssetCategory)}
                options={[
                  { label: "背景", value: "background" },
                  { label: "物件", value: "object" },
                  { label: "圖示", value: "icon" }
                ]}
              />
            </div>
            
            {/* Filter Group: Usage Scope */}
            <div className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" title="上傳預設範圍">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.657-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.657-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              <CustomSelect
                className="w-[115px] text-[11px]"
                value={uploadUsageScope}
                onChange={(value) => setUploadUsageScope(value as ManagedAssetUsageScope)}
                options={[
                  { label: "頁面 + 殼層", value: "both" },
                  { label: "僅頁面", value: "page-only" },
                  { label: "僅殼層", value: "shell-only" }
                ]}
              />
            </div>

            {/* Compact Density Selector */}
            <div className="flex rounded-full bg-[rgba(82,91,66,0.06)] p-0.5 border border-[var(--workspace-surface-border)]/60 shrink-0">
              {([
                { label: "舒適縮圖", value: "comfortable" },
                { label: "緊密縮圖", value: "compact" }
              ] as const).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={thumbnailDensity === option.value}
                  onClick={() => setThumbnailDensity(option.value)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-all duration-200 ${
                    thumbnailDensity === option.value
                      ? "bg-white text-[var(--shell-title-ink)] shadow-sm border border-[var(--workspace-surface-border)]/40"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden mt-4 px-1.5 pb-4 min-h-0 space-y-4 pt-1.5">
          <div className={`grid gap-3 ${thumbnailDensity === "comfortable" ? "md:grid-cols-2 xl:grid-cols-3" : "grid-cols-2 xl:grid-cols-4"}`}>
          {isLoading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <AssetLibrarySkeletonCard key={index} thumbnailDensity={thumbnailDensity} />
            ))
          ) : filteredAssets.length === 0 ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="empty-upload-trigger col-span-full border-2 border-dashed border-[var(--shell-divider)] rounded-[24px] p-10 flex flex-col items-center justify-center text-center bg-white/40 hover:bg-white/80 transition-all group cursor-pointer"
            >
              <div className="h-12 w-12 rounded-full bg-[var(--workspace-surface-subtle)] text-[var(--shell-subtitle-ink)] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <svg className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <div className="text-[14px] font-bold text-[var(--shell-title-ink)]">目前沒有符合條件的資產</div>
              <div className="mt-1 text-[12px] text-[var(--shell-subtitle-ink)]">此分類下無素材，點此上傳資產</div>
            </button>
          ) : (
            filteredAssets.map((asset) => (
              <AssetLibraryCard
                key={asset.id}
                asset={asset}
                isSelected={asset.id === selectedAssetId}
                thumbnailDensity={thumbnailDensity}
                onSelect={setSelectedAssetId}
                isBatchMode={isBatchMode}
                isBatchSelected={batchSelectedIds.has(asset.id)}
                onToggleBatchSelect={handleToggleBatchSelect}
                embedded={embedded}
                onApplySelection={onApplySelection}
                onDeleteClick={(a) => {
                  setSelectedAssetId(a.id);
                  handleConfirmDelete(a);
                }}
              />
            ))
          )}
        </div>

        {filteredAssets.length === 0 ? (
          <WorkspaceBoard className="mt-4 py-6 text-[13px] text-[var(--shell-subtitle-ink)]" surface="empty-state" tone="empty">
            目前沒有符合條件的資產。
          </WorkspaceBoard>
        ) : null}

        </div>

        <div className={`asset-batch-bar flex items-center justify-between gap-6 ${isBatchMode ? "active" : ""}`}>
          <div className="text-[14px] text-[var(--shell-title-ink)] font-semibold">
            已選擇 <span className="text-[var(--green)] font-bold text-[16px]">{batchSelectedIds.size}</span> 筆資產
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="asset-btn asset-btn-secondary"
              onClick={() => setBatchSelectedIds(new Set())}
              disabled={batchSelectedIds.size === 0}
            >
              取消選取
            </button>
            <button
              type="button"
              className="asset-btn asset-btn-danger"
              disabled={batchSelectedIds.size === 0}
              onClick={() => void handleBatchDelete()}
            >
              批次刪除 ({batchSelectedIds.size})
            </button>
          </div>
        </div>
      </WorkspacePanel>

      <WorkspacePanel
        surface="asset-selection"
        className={`flex flex-col min-h-0 overflow-hidden ${embedded ? "h-full" : "h-[calc(100vh-160px)]"}`}
      >
        <div className="flex-shrink-0 flex items-center justify-between gap-3 pb-3 border-b border-[var(--workspace-surface-border)]">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--shell-subtitle-ink)]">
              使用摘要
            </p>
            <h3 className="mt-1 text-[20px] font-semibold text-[var(--shell-title-ink)]">目前引用</h3>
          </div>
        </div>

        {selectedAsset ? (
          <div key={selectedAssetId ?? "none"} ref={rightPanelScrollRef} className="flex flex-col gap-3 min-h-0 flex-1 overflow-y-auto mt-4 pr-1">
            <WorkspaceBoard className="p-4 flex flex-col gap-4 detail-glass-card" surface="metadata-board" tone="base">
              {selectedAssetPreviewSrc ? (
                <div 
                  className="w-full aspect-video rounded-[14px] overflow-hidden border border-[var(--shell-divider)] bg-[var(--workspace-surface-muted)] relative cursor-zoom-in group/preview shadow-sm"
                  onClick={() => setActiveLightboxSrc(selectedAssetPreviewSrc)}
                  title="點擊放大圖片"
                >
                  <img src={selectedAssetPreviewSrc} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover/preview:scale-102" />
                  <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                    <span className="bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-full text-[12px] font-bold text-gray-800 flex items-center gap-1.5 shadow-md scale-95 group-hover/preview:scale-100 transition-all duration-200">
                      <svg className="h-3.5 w-3.5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                      點擊放大
                    </span>
                  </div>
                </div>
              ) : null}
              <div className="min-w-0 w-full">
                {isEditingTitle ? (
                  <input
                    type="text"
                    value={editingTitleVal}
                    onChange={(e) => setEditingTitleVal(e.target.value)}
                    onBlur={() => void handleSaveTitle()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        void handleSaveTitle();
                      }
                      if (e.key === "Escape") {
                        setEditingTitleVal(selectedAsset.title);
                        setIsEditingTitle(false);
                      }
                    }}
                    className="w-full text-[16px] font-bold text-[var(--shell-title-ink)] border border-[var(--green)] bg-white rounded-md px-2 py-0.5 focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <div className="flex items-center gap-1 group/title">
                    <span 
                      className="text-[16px] font-bold text-[var(--shell-title-ink)] truncate max-w-[160px] block cursor-pointer hover:bg-gray-50 px-1 rounded" 
                      onClick={() => {
                        setEditingTitleVal(selectedAsset.title);
                        setIsEditingTitle(true);
                      }}
                      title="點擊編輯標題"
                    >
                      {selectedAsset.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTitleVal(selectedAsset.title);
                        setIsEditingTitle(true);
                      }}
                      className="inline-edit-title-btn opacity-0 group-hover/title:opacity-100 text-gray-400 hover:text-[var(--green)] transition-opacity"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                )}
                
                {isEditingDesc ? (
                  <input
                    type="text"
                    value={editingDescVal}
                    onChange={(e) => setEditingDescVal(e.target.value)}
                    onBlur={() => void handleSaveDesc()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        void handleSaveDesc();
                      }
                      if (e.key === "Escape") {
                        setEditingDescVal(selectedAsset.description ?? "");
                        setIsEditingDesc(false);
                      }
                    }}
                    className="w-full text-[13px] text-[var(--shell-subtitle-ink)] border border-[var(--green)] bg-white rounded px-2 py-0.5 focus:outline-none mt-1"
                    autoFocus
                  />
                ) : (
                  <div className="flex items-center gap-1 group/desc mt-1">
                    <span 
                      className="text-[13px] text-[var(--shell-subtitle-ink)] truncate max-w-[160px] block cursor-pointer hover:bg-gray-50 px-1 rounded" 
                      onClick={() => {
                        setEditingDescVal(selectedAsset.description ?? "");
                        setIsEditingDesc(true);
                      }}
                      title="點擊編輯描述"
                    >
                      {selectedAsset.description || "尚無描述"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingDescVal(selectedAsset.description ?? "");
                        setIsEditingDesc(true);
                      }}
                      className="opacity-0 group-hover/desc:opacity-100 text-gray-400 hover:text-[var(--green)] transition-opacity"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                )}
                
                <div className="mt-1 text-[11px] text-[var(--shell-subtitle-ink)]">ID: {selectedAsset.id}</div>
              </div>
            </WorkspaceBoard>

            <WorkspaceBoard className="p-4 mt-3 grid grid-cols-2 gap-4 text-[13px] detail-glass-card" surface="info-board" tone="base">
              <div>
                <div className="text-[var(--shell-subtitle-ink)] font-medium">分類</div>
                <select
                  value={selectedAsset.category}
                  onChange={(e) => void handleUpdateCategory(e.target.value as ManagedAssetCategory)}
                  className="mt-1 w-full bg-white border border-[var(--shell-divider)] rounded-lg px-2 py-1 font-semibold text-[var(--shell-title-ink)] focus:outline-none focus:border-[var(--green)]"
                >
                  <option value="background">背景</option>
                  <option value="object">物件</option>
                  <option value="icon">圖示</option>
                </select>
              </div>
              <div>
                <div className="text-[var(--shell-subtitle-ink)] font-medium">使用範圍</div>
                <select
                  value={selectedAsset.usageScope}
                  onChange={(e) => void handleUpdateUsageScope(e.target.value as any)}
                  className="mt-1 w-full bg-white border border-[var(--shell-divider)] rounded-lg px-2 py-1 font-semibold text-[var(--shell-title-ink)] focus:outline-none focus:border-[var(--shell-accent)]"
                >
                  <option value="both">頁面 + 殼層</option>
                  <option value="page-only">僅頁面</option>
                  <option value="shell-only">僅殼層</option>
                </select>
              </div>
              <div>
                <div className="text-[var(--shell-subtitle-ink)] font-medium">格式與比例</div>
                <div className="mt-1 font-semibold text-[var(--shell-title-ink)]">
                  {selectedAsset.aspectRatio || "16:9"} ({selectedAsset.originalName.split(".").pop()?.toUpperCase() || "PNG"})
                </div>
              </div>
              <div>
                <div className="text-[var(--shell-subtitle-ink)] font-medium">詳細規格</div>
                <div className="mt-1 font-semibold text-[var(--shell-title-ink)]">
                  {selectedAsset.width && selectedAsset.height ? `${selectedAsset.width} x ${selectedAsset.height}` : "未知"}
                  {selectedAsset.fileSize ? ` · ${Math.round(selectedAsset.fileSize / 102.4) / 10} KB` : ""}
                </div>
              </div>
            </WorkspaceBoard>

            <WorkspaceBoard className="p-4 mt-3 detail-glass-card" surface="usage-board" tone="base">
              <div className="text-[13px] font-semibold text-[var(--shell-title-ink)]">引用位置</div>
              <div className="mt-2 text-[13px] text-[var(--shell-subtitle-ink)]">
                {assetReferencesErrorMessage || (isAssetReferencesLoading ? "正在同步引用..." : "")}
              </div>
              {resolvedAssetReferences?.blockingIssues.length ? (
                <div className="delete-blocker-alert mt-3 rounded-[14px] border border-[rgba(180,82,52,0.3)] bg-[rgba(180,82,52,0.06)] px-3 py-2.5 text-[13px] font-semibold text-[#8f452d] flex items-start gap-2 animate-pulse">
                  <svg className="h-4 w-4 text-[#8f452d] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    {resolvedAssetReferences.blockingIssues.map((issue) => issue.message).join("；")}
                  </div>
                </div>
              ) : null}
              <div className="mt-3 space-y-2">
                {resolvedAssetReferences?.references.length ? resolvedAssetReferences.references.map((reference) => {
                  const getReferenceHref = (ref: typeof reference) => {
                    const base = "/display-pages/editor";
                    if (ref.kind === "shell-decoration") {
                      return `${base}?workspace=decorations`;
                    }
                    if (ref.kind === "slideshow") {
                      return `${base}?workspace=slideshow`;
                    }
                    if (ref.kind === "cover") {
                      return `${base}?workspace=cover`;
                    }
                    if (ref.pageId) {
                      const bindingQuery = ref.bindingId ? `&focusObject=${ref.bindingId}` : "";
                      return `${base}?pageId=${ref.pageId}${bindingQuery}`;
                    }
                    return base;
                  };

                  return (
                    <a
                      key={`${reference.stage}-${reference.kind}-${reference.bindingId ?? "none"}`}
                      href={getReferenceHref(reference)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-[14px] border border-[var(--shell-divider)] bg-[rgba(82,91,66,0.03)] px-3 py-2 text-[13px] text-[var(--shell-copy-ink)] hover:bg-[rgba(95,140,80,0.06)] hover:border-[rgba(95,140,80,0.2)] transition-all group/ref"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[var(--shell-title-ink)] flex items-center gap-1 group-hover/ref:text-[var(--green)] transition-colors">
                          {formatReferenceKind(reference.kind)}
                          <svg className="h-3 w-3 opacity-50 group-hover/ref:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          reference.stage === "live"
                            ? "reference-badge-live bg-[var(--workspace-surface-accent)] text-[var(--green)] border border-[var(--workspace-surface-accent-border)]"
                            : "reference-badge-draft bg-blue-50 text-blue-600 border border-blue-100"
                        }`}>
                          {reference.stage === "live" ? "Live" : "Draft"}
                        </span>
                      </div>
                      <div className="mt-1 text-gray-500">{reference.message}</div>
                    </a>
                  );
                }) : (
                  <div className="rounded-[14px] border border-dashed border-[var(--shell-divider)] px-3 py-3 text-[13px] text-[var(--shell-subtitle-ink)]">
                    目前沒有引用位置。
                  </div>
                )}
              </div>
            </WorkspaceBoard>
            <div className="mt-3 p-4 detail-glass-card detail-glass-card-danger flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-red-800">危險操作區域</div>
                <div className="text-[11px] text-red-600 mt-0.5">刪除此素材後將無法還原，請謹慎操作</div>
              </div>
              <button
                type="button"
                onClick={() => selectedAsset && handleConfirmDelete(selectedAsset)}
                disabled={isDeleting || selectedAssetHasBlockingReferences}
                className="asset-btn asset-btn-danger shrink-0"
              >
                {selectedAssetHasBlockingReferences ? "解除引用後可刪除" : "刪除資產"}
              </button>
            </div>
          </div>
        ) : (
          <WorkspaceBoard className="mt-4 py-6 text-[13px] text-[var(--shell-subtitle-ink)]" surface="empty-state" tone="empty">
            {isLoading ? "正在同步資產..." : "請先從左側選擇一筆資產。"}
          </WorkspaceBoard>
        )}
      </WorkspacePanel>
    </div>
      
      {deleteConfirmAsset && (
        <div className="glass-confirm-dialog fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white/85 backdrop-blur-md border border-[var(--shell-divider)] p-6 rounded-[24px] max-w-sm w-full shadow-2xl text-center">
            <div className="h-12 w-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-100">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-[16px] font-bold text-[var(--shell-title-ink)] mb-2">確定要刪除此資產？</h3>
            <p className="text-[13px] text-[var(--shell-copy-ink)] mb-6">
              您即將刪除「<span className="font-semibold text-gray-800">{deleteConfirmAsset.title}</span>」。此動作將無法復原。
            </p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                className="asset-btn asset-btn-secondary"
                onClick={() => setDeleteConfirmAsset(null)}
              >
                取消
              </button>
              <button
                type="button"
                className="asset-btn asset-btn-danger"
                onClick={() => void handleExecuteDelete()}
              >
                確定刪除
              </button>
            </div>
          </div>
        </div>
      )}

      {activeLightboxSrc && (
        <div 
          className="asset-lightbox-backdrop"
          onClick={() => setActiveLightboxSrc(null)}
        >
          <div 
            className="asset-lightbox-content"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={activeLightboxSrc} alt="Lightbox Preview" className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain border border-white/20" />
            <button
              type="button"
              onClick={() => setActiveLightboxSrc(null)}
              className="absolute -top-12 right-0 text-white/70 hover:text-white p-2 text-[14px] font-semibold flex items-center gap-1 bg-transparent border-none cursor-pointer"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
              關閉 (ESC)
            </button>
          </div>
        </div>
      )}
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <PageContainer
      title="資產庫管理"
      subtitle="Asset Library"
      spacing="compact"
    >
      {content}
    </PageContainer>
  );
}
