import type { ImageAsset } from "@solar-display/shared";
import type { ReferenceGlyphName } from "../../components/ReferenceGlyph";
import type { ReferenceTone } from "../../components/reference/ReferenceManagement";
import { buildApiUrl } from "../../services/api";

type ImageStorageUsage = {
  fileCount: number;
  usedBytes: number;
  usedMB: number;
};

type BuildImageManagementViewModelArgs = {
  assets: ImageAsset[];
  errorMessage: string;
  isDeleting: boolean;
  isSaving: boolean;
  isUploading: boolean;
  message: string;
  selectedImageId: number | null;
  storageUsage: ImageStorageUsage;
};

const totalStorageBytes = 5 * 1024 * 1024 * 1024;

function sortAssets(assets: ImageAsset[]) {
  return assets.slice().sort((left, right) => {
    const leftOrder = left.displayOrder ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = right.displayOrder ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder || left.id - right.id;
  });
}

function padCounter(value: number) {
  return value.toString().padStart(2, "0");
}

function formatBytes(value: number) {
  if (value >= 1024 * 1024 * 1024) {
    return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(2)} MB`;
  }

  if (value >= 1024) {
    return `${(value / 1024).toFixed(2)} KB`;
  }

  return `${value} B`;
}

function formatMimeType(mimeType: string | null) {
  if (!mimeType) {
    return "Unknown";
  }

  return mimeType.replace("image/", "").toUpperCase();
}

function buildAssetTitle(asset: ImageAsset) {
  return asset.title ?? asset.originalName ?? asset.filename ?? `Image ${asset.id}`;
}

function buildPreviewUrl(filename: string | null) {
  if (!filename) {
    return null;
  }

  return buildApiUrl(`/uploads/images/${filename}`);
}

export function buildImageManagementViewModel({
  assets,
  errorMessage,
  isDeleting,
  isSaving,
  isUploading,
  message,
  selectedImageId,
  storageUsage
}: BuildImageManagementViewModelArgs) {
  const sortedAssets = sortAssets(assets);
  const selectedAsset =
    sortedAssets.find((asset) => asset.id === selectedImageId) ?? sortedAssets[0] ?? null;
  const slideshowCount = sortedAssets.filter((asset) => asset.includedInSlideshow).length;
  const usagePercent = Math.min(
    100,
    Math.round((storageUsage.usedBytes / totalStorageBytes) * 100)
  );
  const coverAsset = sortedAssets.find((asset) => asset.isCover) ?? null;
  const tone = errorMessage
    ? "error"
    : isUploading
      ? "uploading"
      : isSaving
        ? "saving"
        : isDeleting
          ? "deleting"
          : "ready";
  const title = errorMessage
    ? "圖片操作失敗"
    : isUploading
      ? "正在上傳圖片..."
      : isSaving
        ? "正在更新圖片設定..."
        : isDeleting
          ? "正在移除圖片..."
          : message;

  return {
    actionBanner: {
      detail: errorMessage || "支援上傳、封面標記、輪播納入與單張圖片設定調整。",
      title,
      tone
    },
    emptyState:
      sortedAssets.length === 0
        ? {
            description: "保留統計卡、操作區與編輯面板位置，等待第一批展示圖片同步。",
            title: "尚未上傳圖片素材"
          }
        : null,
    library: sortedAssets.map((asset, index) => ({
      badges: [
        ...(asset.includedInSlideshow ? ["輪播中"] : ["未加入輪播"]),
        ...(asset.isCover ? ["封面"] : [])
      ],
      filename: asset.originalName ?? asset.filename ?? `image-${asset.id}`,
      id: asset.id,
      isSelected: asset.id === selectedAsset?.id,
      meta: `${asset.width ?? "--"} × ${asset.height ?? "--"} • ${formatMimeType(asset.mimeType)} • ${formatBytes(asset.fileSize ?? 0)}`,
      orderLabel: padCounter(index + 1),
      previewUrl: buildPreviewUrl(asset.filename),
      title: buildAssetTitle(asset)
    })),
    selection:
      selectedAsset === null
        ? null
        : {
            badges: [
              ...(selectedAsset.includedInSlideshow ? ["輪播中"] : ["未加入輪播"]),
              ...(selectedAsset.isCover ? ["封面"] : [])
            ],
            description: selectedAsset.description ?? "尚未填寫圖片說明",
            displayDurationLabel: `${selectedAsset.displayDuration} 秒`,
            filenameLabel: selectedAsset.originalName ?? selectedAsset.filename ?? `image-${selectedAsset.id}`,
            id: selectedAsset.id,
            includedInSlideshow: selectedAsset.includedInSlideshow,
            isCover: selectedAsset.isCover,
            meta: `${selectedAsset.width ?? "--"} × ${selectedAsset.height ?? "--"} • ${formatMimeType(selectedAsset.mimeType)} • ${formatBytes(selectedAsset.fileSize ?? 0)}`,
            previewUrl: buildPreviewUrl(selectedAsset.filename),
            title: buildAssetTitle(selectedAsset)
          },
    summaryCards: [
      {
        helper: `目前檔案數：${storageUsage.fileCount} 張`,
        icon: "image" as ReferenceGlyphName,
        id: "total",
        subtitle: "Total Images",
        title: "總圖片數",
        tone: "default" as ReferenceTone,
        value: String(sortedAssets.length)
      },
      {
        helper: "已納入展示輪播的圖片數量",
        icon: "bars" as ReferenceGlyphName,
        id: "slideshow",
        subtitle: "Slideshow Assets",
        title: "輪播張數",
        tone: "success" as ReferenceTone,
        value: String(slideshowCount)
      },
      {
        helper: `${formatBytes(storageUsage.usedBytes)} / 5.00 GB`,
        icon: "refresh" as ReferenceGlyphName,
        id: "storage",
        subtitle: "Used Space",
        title: "已用空間",
        tone: usagePercent >= 80 ? ("warning" as ReferenceTone) : ("default" as ReferenceTone),
        value: `${usagePercent}%`
      },
      {
        helper: "首頁或圖片庫預設焦點素材",
        icon: "sun" as ReferenceGlyphName,
        id: "cover",
        subtitle: "Cover Asset",
        title: "封面圖片",
        tone: coverAsset ? ("accent" as ReferenceTone) : ("muted" as ReferenceTone),
        value: coverAsset ? buildAssetTitle(coverAsset) : "尚未指定"
      }
    ],
    summary: {
      coverLabel: coverAsset ? buildAssetTitle(coverAsset) : "尚未指定",
      slideshowCount,
      totalImages: sortedAssets.length,
      usedSpaceLabel: `${formatBytes(storageUsage.usedBytes)} / 5.00 GB`,
      usagePercent
    }
  };
}
