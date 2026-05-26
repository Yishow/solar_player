import type { DisplayOpsAssetReferenceSummary, ImageAsset } from "@solar-display/shared";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ImageManagementAssetHealthPanel } from "../../components/displayPageAssetHealthPanels";
import { PageContainer } from "../../components/PageContainer";
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

type AssetLibraryProps = {
  contextLabel?: string;
  embedded?: boolean;
  initialAssets?: ImageAsset[];
  initialReferences?: DisplayOpsAssetReferenceSummary;
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

export function AssetLibrary({
  contextLabel,
  embedded = false,
  initialAssets,
  initialReferences,
  onApplySelection,
  onAssetsChange,
  onReturnToEditor,
  returnLabel = "返回展示頁編輯"
}: AssetLibraryProps) {
  const [assets, setAssets] = useState<ImageAsset[]>(initialAssets ?? []);
  const [isLoading, setIsLoading] = useState(initialAssets === undefined);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState("正在同步資產庫...");
  const [errorMessage, setErrorMessage] = useState("");
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory>("all");
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(initialAssets?.[0]?.id ?? null);
  const [thumbnailDensity, setThumbnailDensity] = useState<ThumbnailDensity>("comfortable");
  const [uploadCategory, setUploadCategory] = useState<ManagedAssetCategory>("background");
  const [uploadUsageScope, setUploadUsageScope] = useState<ManagedAssetUsageScope>("both");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const {
    errorMessage: assetHealthErrorMessage,
    isLoading: isAssetHealthLoading,
    reload: reloadAssetHealth,
    report: assetHealthReport
  } = useDisplayPageAssetHealth();
  const {
    errorMessage: assetReferencesErrorMessage,
    isLoading: isAssetReferencesLoading,
    references: assetReferences,
    reload: reloadAssetReferences
  } = useImageAssetReferences(selectedAssetId);

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

  const selectedAsset = filteredAssets.find((asset) => asset.id === selectedAssetId)
    ?? assets.find((asset) => asset.id === selectedAssetId)
    ?? null;
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

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    setIsUploading(true);
    setErrorMessage("");
    try {
      let lastUploadedId: number | null = null;
      for (const file of files) {
        const uploaded = await uploadManagedAsset(file, {
          category: uploadCategory,
          usageScope: uploadUsageScope
        });
        lastUploadedId = uploaded.id;
      }
      await Promise.all([
        syncAssets(lastUploadedId),
        reloadAssetHealth()
      ]);
      setMessage(files.length === 1 ? "資產已上傳。" : `已完成 ${files.length} 筆資產上傳。`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "上傳資產失敗。");
    } finally {
      event.target.value = "";
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (selectedAssetId === null || selectedAssetHasBlockingReferences) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage("");
    try {
      await deleteImageAsset(selectedAssetId);
      await Promise.all([
        syncAssets(selectedAssetId),
        reloadAssetHealth()
      ]);
      setMessage("資產已刪除。");
    } catch (error) {
      if (error instanceof ApiRequestError && error.statusCode === 409) {
        setErrorMessage("此資產仍被展示頁、殼層或輪播引用，請先解除引用後再刪除。");
        await reloadAssetReferences();
      } else {
        setErrorMessage(error instanceof Error ? error.message : "刪除資產失敗。");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const content = (
    <div className="grid gap-4 lg:grid-cols-[1.25fr_0.9fr]">
      <WorkspacePanel surface="asset-library">
        <input
          ref={fileInputRef}
          hidden
          accept=".jpg,.jpeg,.png,.webp,.svg"
          multiple
          type="file"
          onChange={(event) => void handleUpload(event)}
        />

        <WorkspaceActionBar className="static rounded-[20px] border-none bg-transparent px-0 py-0 shadow-none backdrop-blur-0" surface="asset-actions">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--shell-subtitle-ink)]">
              資產庫管理
            </p>
            <h2 className="mt-1 text-[24px] font-semibold text-[var(--shell-title-ink)]">資產庫</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {contextLabel && onApplySelection ? (
              <button
                type="button"
                className="rounded-full border border-[var(--shell-accent)] bg-[rgba(95,140,80,0.12)] px-4 py-2 text-[13px] font-semibold text-[var(--shell-title-ink)] disabled:opacity-60"
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
                className="rounded-full border border-[var(--shell-divider)] px-4 py-2 text-[13px] font-semibold text-[var(--shell-copy-ink)]"
                onClick={onReturnToEditor}
              >
                {returnLabel}
              </button>
            ) : null}
            <button
              type="button"
              className="rounded-full bg-[var(--shell-accent)] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? "上傳中..." : "上傳資產"}
            </button>
          </div>
        </WorkspaceActionBar>

        <WorkspaceBoard className="mt-4 text-[13px] text-[var(--shell-copy-ink)]" role="status" surface="status-board" tone={errorMessage ? "danger" : "subtle"}>
          {errorMessage || message}
        </WorkspaceBoard>

        {contextLabel ? (
          <WorkspaceBoard className="mt-4" surface="context-board" tone="accent">
            <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--shell-subtitle-ink)]">
              返回目標
            </div>
            <div className="mt-1 text-[14px] font-semibold text-[var(--shell-title-ink)]">{contextLabel}</div>
          </WorkspaceBoard>
        ) : null}

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_180px]">
          <label className="flex flex-col gap-1 text-[13px] text-[var(--shell-copy-ink)]">
            <span>搜尋素材</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜尋素材"
              className="rounded-[14px] border border-[var(--shell-divider)] bg-white px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-[13px] text-[var(--shell-copy-ink)]">
            <span>上傳分類</span>
            <select
              value={uploadCategory}
              onChange={(event) => setUploadCategory(event.target.value as ManagedAssetCategory)}
              className="rounded-[14px] border border-[var(--shell-divider)] bg-white px-3 py-2"
            >
              <option value="background">背景</option>
              <option value="object">物件</option>
              <option value="icon">圖示</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[13px] text-[var(--shell-copy-ink)]">
            <span>使用範圍</span>
            <select
              value={uploadUsageScope}
              onChange={(event) => setUploadUsageScope(event.target.value as ManagedAssetUsageScope)}
              className="rounded-[14px] border border-[var(--shell-divider)] bg-white px-3 py-2"
            >
              <option value="both">頁面 + 殼層</option>
              <option value="page-only">僅頁面</option>
              <option value="shell-only">僅殼層</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {(["all", "background", "object", "icon"] as const).map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`rounded-full px-4 py-2 text-[13px] font-semibold ${
                  selectedCategory === category
                    ? "bg-[var(--shell-title-ink)] text-white"
                    : "border border-[var(--shell-divider)] bg-white text-[var(--shell-copy-ink)]"
                }`}
              >
                {categoryLabels[category]} {categoryCounts[category]}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {([
              { label: "舒適縮圖", value: "comfortable" },
              { label: "緊密縮圖", value: "compact" }
            ] as const).map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={thumbnailDensity === option.value}
                onClick={() => setThumbnailDensity(option.value)}
                className={`rounded-full border px-3 py-2 text-[13px] font-semibold ${
                  thumbnailDensity === option.value
                    ? "border-[var(--shell-accent)] bg-[rgba(95,140,80,0.12)] text-[var(--shell-title-ink)]"
                    : "border-[var(--shell-divider)] bg-white text-[var(--shell-copy-ink)]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className={`mt-4 grid gap-3 ${thumbnailDensity === "comfortable" ? "md:grid-cols-2 xl:grid-cols-3" : "grid-cols-2 xl:grid-cols-4"}`}>
          {filteredAssets.map((asset) => {
            const previewSrc = resolveAssetPreviewSrc(asset);
            return (
              <button
                key={asset.id}
                type="button"
                onClick={() => setSelectedAssetId(asset.id)}
                className={`rounded-[18px] border p-3 text-left ${
                  asset.id === selectedAssetId
                    ? "border-[var(--shell-title-ink)] bg-[rgba(82,91,66,0.08)]"
                    : "border-[var(--shell-divider)] bg-white"
                }`}
              >
                <div className={`overflow-hidden rounded-[12px] border border-[var(--shell-divider)] bg-[rgba(82,91,66,0.04)] ${thumbnailDensity === "comfortable" ? "aspect-video" : "aspect-square"}`}>
                  {previewSrc ? (
                    <img src={previewSrc} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="mt-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-semibold text-[var(--shell-title-ink)]">
                      {asset.title ?? asset.originalName ?? `素材 ${asset.id}`}
                    </div>
                    <div className="mt-1 text-[12px] text-[var(--shell-subtitle-ink)]">
                      {categoryLabels[normalizeAssetCategory(asset)]} · {usageScopeLabels[normalizeAssetUsageScope(asset)]}
                    </div>
                    {isSeedAsset(asset) ? (
                      <div className="mt-2 inline-flex rounded-full bg-[rgba(95,140,80,0.12)] px-2.5 py-1 text-[11px] font-semibold text-[var(--shell-title-ink)]">
                        內建素材 · {asset.seedKey}
                      </div>
                    ) : null}
                  </div>
                  <span className="rounded-full bg-[rgba(82,91,66,0.08)] px-3 py-1 text-[12px] font-semibold text-[var(--shell-copy-ink)]">
                    #{asset.id}
                  </span>
                </div>
                <div className="mt-3 text-[13px] text-[var(--shell-copy-ink)]">{formatUsageSummary(asset)}</div>
              </button>
            );
          })}
        </div>

        {filteredAssets.length === 0 ? (
          <WorkspaceBoard className="mt-4 py-6 text-[13px] text-[var(--shell-subtitle-ink)]" surface="empty-state" tone="empty">
            目前沒有符合條件的資產。
          </WorkspaceBoard>
        ) : null}

        <div className="mt-4">
          <ImageManagementAssetHealthPanel
            errorMessage={assetHealthErrorMessage}
            isLoading={isAssetHealthLoading}
            report={assetHealthReport}
          />
        </div>
      </WorkspacePanel>

      <WorkspacePanel surface="asset-selection">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--shell-subtitle-ink)]">
              使用摘要
            </p>
            <h3 className="mt-1 text-[20px] font-semibold text-[var(--shell-title-ink)]">目前引用</h3>
          </div>
          <button
            type="button"
            disabled={selectedAssetId === null || isDeleting || selectedAssetHasBlockingReferences}
            onClick={() => void handleDelete()}
            className="rounded-full border border-[rgba(180,82,52,0.24)] bg-[rgba(180,82,52,0.08)] px-4 py-2 text-[13px] font-semibold text-[#8f452d] disabled:opacity-60"
          >
            {selectedAssetHasBlockingReferences ? "解除引用後可刪除" : isDeleting ? "刪除中..." : "刪除資產"}
          </button>
        </div>

        {selectedAsset ? (
          <div className="mt-4 space-y-3">
            <WorkspaceBoard className="p-4" surface="selection-board" tone="subtle">
              {selectedAssetPreviewSrc ? (
                <div className="mb-3 overflow-hidden rounded-[14px] border border-[var(--shell-divider)] bg-white">
                  <img src={selectedAssetPreviewSrc} alt="" className="h-40 w-full object-cover" />
                </div>
              ) : null}
              <div className="text-[16px] font-semibold text-[var(--shell-title-ink)]">
                {selectedAsset.title ?? selectedAsset.originalName ?? `素材 ${selectedAsset.id}`}
              </div>
              <div className="mt-2 text-[13px] text-[var(--shell-copy-ink)]">
                使用範圍：{usageScopeLabels[normalizeAssetUsageScope(selectedAsset)]}
              </div>
              <div className="mt-1 text-[13px] text-[var(--shell-copy-ink)]">
                {formatUsageSummary(selectedAsset)}
              </div>
              {isSeedAsset(selectedAsset) ? (
                <div className="mt-2 text-[13px] font-semibold text-[var(--shell-title-ink)]">
                  內建素材：{selectedAsset.seedKey}
                </div>
              ) : null}
            </WorkspaceBoard>

            <WorkspaceBoard className="p-4" surface="usage-board" tone="base">
              <div className="text-[13px] font-semibold text-[var(--shell-title-ink)]">引用位置</div>
              <div className="mt-2 text-[13px] text-[var(--shell-subtitle-ink)]">
                {assetReferencesErrorMessage || (isAssetReferencesLoading ? "正在同步引用..." : "")}
              </div>
              {resolvedAssetReferences?.blockingIssues.length ? (
                <div className="mt-3 rounded-[14px] border border-[rgba(180,82,52,0.24)] bg-[rgba(180,82,52,0.08)] px-3 py-2 text-[13px] font-semibold text-[#8f452d]">
                  {resolvedAssetReferences.blockingIssues.map((issue) => issue.message).join("；")}
                </div>
              ) : null}
              <div className="mt-3 space-y-2">
                {resolvedAssetReferences?.references.length ? resolvedAssetReferences.references.map((reference) => (
                  <div key={`${reference.stage}-${reference.kind}-${reference.bindingId ?? "none"}`} className="rounded-[14px] border border-[var(--shell-divider)] bg-[rgba(82,91,66,0.03)] px-3 py-2 text-[13px] text-[var(--shell-copy-ink)]">
                    <div className="font-semibold text-[var(--shell-title-ink)]">
                      {formatReferenceKind(reference.kind)} · {reference.stage === "live" ? "Live" : "Draft"}
                    </div>
                    <div className="mt-1">{reference.message}</div>
                  </div>
                )) : (
                  <div className="rounded-[14px] border border-dashed border-[var(--shell-divider)] px-3 py-3 text-[13px] text-[var(--shell-subtitle-ink)]">
                    目前沒有引用位置。
                  </div>
                )}
              </div>
            </WorkspaceBoard>
          </div>
        ) : (
          <WorkspaceBoard className="mt-4 py-6 text-[13px] text-[var(--shell-subtitle-ink)]" surface="empty-state" tone="empty">
            {isLoading ? "正在同步資產..." : "請先從左側選擇一筆資產。"}
          </WorkspaceBoard>
        )}
      </WorkspacePanel>
    </div>
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
