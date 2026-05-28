import type {
  DisplayOpsAssetReferenceSummary,
  ImageAsset
} from "@solar-display/shared";
import type { ReferenceGlyphName } from "../../components/ReferenceGlyph";
import type { ReferenceTone } from "../../components/reference/ReferenceManagement";
import { buildApiUrl } from "../../services/api";

type ImageStorageUsage = {
  fileCount: number;
  usedBytes: number;
  usedMB: number;
};

export type ImageManagementPlaylistEntry = {
  entryId: string;
  assetId: number | null;
  displayOrder: number;
  durationSeconds: number;
  enabled: boolean;
  fallbackMode: "display-placeholder" | "skip" | "use-cover";
  title: string;
  description: string;
  area: string;
  capturedAt: string;
  tags: string[];
};

export type ImageManagementResolvedPlaylistEntry = {
  entryId: string;
  fallbackActive: boolean;
  fallbackReason: string | null;
  isPlayable: boolean;
};

type ImageManagementDraftSessionArgs = {
  assets: ImageAsset[];
  playlistEntries?: ImageManagementPlaylistEntry[];
  selectedImageId: number | null;
  selectedPlaylistEntryId?: string | null;
};

type ImageManagementDraftChangeArgs = ImageManagementDraftSessionArgs & {
  lastSyncedAssets: ImageAsset[];
  lastSyncedPlaylistEntries: ImageManagementPlaylistEntry[];
};

export type ImageManagementDraftSession = {
  assetId: number;
  playlistEntryId: string | null;
};

export type ImageManagementPlaylistEntryRow = {
  area: string;
  displayOrder: number;
  durationSeconds: number;
  entryId: string;
  fallbackMode: ImageManagementPlaylistEntry["fallbackMode"];
  isEnabled: boolean;
  isSelected: boolean;
  runtimeLabel: string;
  title: string;
};

export type ImageManagementReferenceTriageGroup = {
  items: Array<{
    key: string;
    message: string;
    targetLabel: string;
  }>;
  summary: string;
  title: string;
};

export type ImageManagementDeleteBlocker = {
  message: string;
  severity: "blocking" | "warning";
};

export type ImageManagementDraftSaveTarget = {
  asset: Pick<ImageAsset, "aspectRatio" | "description" | "id" | "title">;
  playlistEntry: ImageManagementPlaylistEntry | null;
};

export function normalizeManagementPlaylistAssetId(assetId: string | null, entryId: string) {
  if (assetId === null) {
    return null;
  }

  if (!/^\d+$/.test(assetId)) {
    throw new Error(`圖片輪播項目 ${entryId} 的素材識別碼無效：${assetId}`);
  }

  return Number(assetId);
}

type BuildImageManagementViewModelArgs = {
  assetReferences?: DisplayOpsAssetReferenceSummary | null;
  assets: ImageAsset[];
  errorMessage: string;
  isDeleting: boolean;
  isSaving: boolean;
  isUploading: boolean;
  message: string;
  selectedImageId: number | null;
  selectedPlaylistEntryId?: string | null;
  storageUsage: ImageStorageUsage;
  playlistEntries?: ImageManagementPlaylistEntry[];
  resolvedPlaylistEntries?: ImageManagementResolvedPlaylistEntry[];
};

const totalStorageBytes = 5 * 1024 * 1024 * 1024;

function sortAssets(assets: ImageAsset[]) {
  return assets.slice().sort((left, right) => {
    const leftOrder = left.displayOrder ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = right.displayOrder ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder || left.id - right.id;
  });
}

export function resolveSelectedImageManagementAsset(
  assets: ImageAsset[],
  selectedImageId: number | null
) {
  const sortedAssets = sortAssets(assets);
  return sortedAssets.find((asset) => asset.id === selectedImageId) ?? sortedAssets[0] ?? null;
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

function comparePlaylistEntries(left: ImageManagementPlaylistEntry, right: ImageManagementPlaylistEntry) {
  return left.displayOrder - right.displayOrder || left.entryId.localeCompare(right.entryId);
}

export function resolvePlaylistEntriesForAsset(
  playlistEntries: ImageManagementPlaylistEntry[] | undefined,
  assetId: number
) {
  return (playlistEntries ?? [])
    .filter((entry) => entry.assetId === assetId)
    .sort(comparePlaylistEntries);
}

export function resolvePrimaryPlaylistEntry(
  playlistEntries: ImageManagementPlaylistEntry[] | undefined,
  assetId: number
) {
  return resolvePlaylistEntriesForAsset(playlistEntries, assetId)[0] ?? null;
}

export function resolveSelectedPlaylistEntry(
  playlistEntries: ImageManagementPlaylistEntry[] | undefined,
  assetId: number,
  selectedPlaylistEntryId?: string | null
) {
  const matches = resolvePlaylistEntriesForAsset(playlistEntries, assetId);
  if (matches.length === 0) {
    return null;
  }

  if (selectedPlaylistEntryId) {
    return matches.find((entry) => entry.entryId === selectedPlaylistEntryId) ?? matches[0] ?? null;
  }

  return matches[0] ?? null;
}

export function resolveImageManagementDraftSession(
  args: ImageManagementDraftSessionArgs
): ImageManagementDraftSession | null {
  const selectedAsset = resolveSelectedImageManagementAsset(args.assets, args.selectedImageId);
  if (selectedAsset === null) {
    return null;
  }

  return {
    assetId: selectedAsset.id,
    playlistEntryId:
      resolveSelectedPlaylistEntry(
        args.playlistEntries,
        selectedAsset.id,
        args.selectedPlaylistEntryId
      )?.entryId ?? null
  };
}

export function hasSelectedImageManagementDraftChanges(
  args: ImageManagementDraftChangeArgs
) {
  const session = resolveImageManagementDraftSession(args);
  if (session === null) {
    return false;
  }

  const selectedAsset = args.assets.find((asset) => asset.id === session.assetId) ?? null;
  const syncedAsset = args.lastSyncedAssets.find((asset) => asset.id === session.assetId) ?? null;
  if (JSON.stringify(selectedAsset) !== JSON.stringify(syncedAsset)) {
    return true;
  }

  if (session.playlistEntryId === null) {
    return false;
  }

  const selectedPlaylistEntry =
    args.playlistEntries?.find((entry) => entry.entryId === session.playlistEntryId) ?? null;
  const syncedPlaylistEntry =
    args.lastSyncedPlaylistEntries.find((entry) => entry.entryId === session.playlistEntryId) ?? null;

  return JSON.stringify(selectedPlaylistEntry) !== JSON.stringify(syncedPlaylistEntry);
}

export function buildImageManagementDraftSaveTarget(
  args: ImageManagementDraftSessionArgs
): ImageManagementDraftSaveTarget | null {
  const selectedAsset = resolveSelectedImageManagementAsset(args.assets, args.selectedImageId);
  if (selectedAsset === null) {
    return null;
  }

  return {
    asset: {
      aspectRatio: selectedAsset.aspectRatio,
      description: selectedAsset.description,
      id: selectedAsset.id,
      title: selectedAsset.title
    },
    playlistEntry: resolvePrimaryPlaylistEntry(args.playlistEntries, selectedAsset.id)
      ? resolveSelectedPlaylistEntry(
          args.playlistEntries,
          selectedAsset.id,
          args.selectedPlaylistEntryId
        )
      : null
  };
}

export function resolvePlaylistRuntimeInclusion(
  playlistEntries: ImageManagementPlaylistEntry[] | undefined,
  assetId: number
) {
  if (playlistEntries === undefined) {
    return null;
  }

  const matches = resolvePlaylistEntriesForAsset(playlistEntries, assetId);
  if (matches.length === 0) {
    return null;
  }

  return matches.some((entry) => entry.enabled);
}

function buildPlaylistBadge(
  playlistEntries: ImageManagementPlaylistEntry[] | undefined,
  asset: ImageAsset
) {
  if (playlistEntries === undefined) {
    return asset.includedInSlideshow ? "輪播中" : "未加入輪播";
  }

  const runtimeInclusion = resolvePlaylistRuntimeInclusion(playlistEntries, asset.id);
  if (runtimeInclusion === null) {
    return "未配置 Playlist";
  }

  return runtimeInclusion ? "輪播中" : "未加入輪播";
}

function buildPlaylistRuntimeStatus(args: {
  playlistEntry: ImageManagementPlaylistEntry | null;
  resolvedEntry: ImageManagementResolvedPlaylistEntry | null;
}) {
  if (args.playlistEntry === null) {
    return "未配置 Playlist runtime row";
  }

  if (args.playlistEntry.enabled === false) {
    return "Playlist runtime 已停用，屬於 degraded 狀態";
  }

  if (args.resolvedEntry?.fallbackActive) {
    return `Playlist runtime 目前使用 fallback：${args.resolvedEntry.fallbackReason ?? "unknown"}`;
  }

  if (args.resolvedEntry?.isPlayable === false) {
    return "Playlist runtime 目前不可播放，屬於 degraded 狀態";
  }

  return "Playlist Runtime 正常播放";
}

function buildPlaylistEntryRow(
  entry: ImageManagementPlaylistEntry,
  selectedEntryId: string | null
): ImageManagementPlaylistEntryRow {
  return {
    area: entry.area || "未命名區域",
    displayOrder: entry.displayOrder,
    durationSeconds: entry.durationSeconds,
    entryId: entry.entryId,
    fallbackMode: entry.fallbackMode,
    isEnabled: entry.enabled,
    isSelected: entry.entryId === selectedEntryId,
    runtimeLabel: entry.enabled ? "啟用中" : "停用",
    title: entry.title || "未命名播放列"
  };
}

function buildReferenceTriageGroups(
  assetReferences: DisplayOpsAssetReferenceSummary | null | undefined
): ImageManagementReferenceTriageGroup[] {
  if (!assetReferences) {
    return [];
  }

  const groups = [
    {
      filter: "live",
      summary: `${assetReferences.liveCount} live references`,
      title: "Live Runtime"
    },
    {
      filter: "draft",
      summary: `${assetReferences.draftCount} draft reference${assetReferences.draftCount === 1 ? "" : "s"}`,
      title: "Draft Configuration"
    },
    {
      filter: "slideshow",
      summary: `${assetReferences.references.filter((reference) => reference.kind === "slideshow").length} slideshow binding`,
      title: "Slideshow Governance"
    }
  ] as const;

  return groups.flatMap((group) => {
    const items = assetReferences.references
      .filter((reference) => {
        if (group.filter === "slideshow") {
          return reference.kind === "slideshow";
        }

        return reference.stage === group.filter && reference.kind !== "slideshow";
      })
      .map((reference) => ({
        key: reference.bindingId ?? `${reference.kind}-${reference.targetLabel}-${reference.stage}`,
        message: reference.message,
        targetLabel: reference.targetLabel
      }));

    if (items.length === 0) {
      return [];
    }

    return [{
      items,
      summary: group.summary,
      title: group.title
    }];
  });
}

export function buildImageManagementViewModel(args: BuildImageManagementViewModelArgs) {
  const {
    assetReferences,
    assets,
    errorMessage,
    isDeleting,
    isSaving,
    isUploading,
    message,
    selectedImageId,
    selectedPlaylistEntryId,
    storageUsage,
    playlistEntries,
    resolvedPlaylistEntries
  } = args;
  const sortedAssets = sortAssets(assets);
  const selectedAsset = resolveSelectedImageManagementAsset(assets, selectedImageId);
  const resolvedEntryMap = new Map(
    (resolvedPlaylistEntries ?? []).map((entry) => [entry.entryId, entry])
  );
  const slideshowCount = sortedAssets.filter((asset) => {
    if (playlistEntries === undefined) {
      return asset.includedInSlideshow;
    }

    return resolvePlaylistRuntimeInclusion(playlistEntries, asset.id) === true;
  }).length;
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
      badges: [buildPlaylistBadge(playlistEntries, asset), ...(asset.isCover ? ["封面"] : [])],
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
        : (() => {
            const playlistEntry = resolveSelectedPlaylistEntry(
              args.playlistEntries,
              selectedAsset.id,
              selectedPlaylistEntryId
            );
            const playlistAssetEntries = resolvePlaylistEntriesForAsset(args.playlistEntries, selectedAsset.id);
            const runtimeInclusion =
              playlistEntries === undefined
                ? selectedAsset.includedInSlideshow
                : resolvePlaylistRuntimeInclusion(playlistEntries, selectedAsset.id);
            const resolvedEntry =
              playlistEntry === null ? null : resolvedEntryMap.get(playlistEntry.entryId) ?? null;
            const playlistEntryCount = playlistAssetEntries.length;
            return {
              badges: [buildPlaylistBadge(playlistEntries, selectedAsset), ...(selectedAsset.isCover ? ["封面"] : [])],
              deleteBlockers: (assetReferences?.blockingIssues ?? []).map((issue) => ({
                message: issue.message,
                severity: issue.severity
              })),
              description: selectedAsset.description ?? "尚未填寫圖片說明",
              displayDurationLabel: `${selectedAsset.displayDuration} 秒`,
              filenameLabel: selectedAsset.originalName ?? selectedAsset.filename ?? `image-${selectedAsset.id}`,
              id: selectedAsset.id,
              includedInSlideshow: runtimeInclusion,
              isCover: selectedAsset.isCover,
              meta: `${selectedAsset.width ?? "--"} × ${selectedAsset.height ?? "--"} • ${formatMimeType(selectedAsset.mimeType)} • ${formatBytes(selectedAsset.fileSize ?? 0)}`,
              previewUrl: buildPreviewUrl(selectedAsset.filename),
              title: buildAssetTitle(selectedAsset),
              // Playlist-level fields
              playlistEntryId: playlistEntry?.entryId ?? null,
              playlistEntryCount,
              playlistDisplayOrder: playlistEntry?.displayOrder ?? null,
              playlistDurationSeconds: playlistEntry?.durationSeconds ?? null,
              playlistRuntimeStatus: buildPlaylistRuntimeStatus({
                playlistEntry,
                resolvedEntry
              }),
              playlistFallbackMode: playlistEntry?.fallbackMode ?? null,
              playlistEnabled: playlistEntry?.enabled ?? null,
              playlistTitle: playlistEntry?.title ?? null,
              playlistDescription: playlistEntry?.description ?? null,
              playlistArea: playlistEntry?.area ?? null,
              playlistEntryRows: playlistAssetEntries.map((entry) =>
                buildPlaylistEntryRow(entry, playlistEntry?.entryId ?? null)
              ),
              playlistTags: playlistEntry?.tags ?? null,
              playlistCapturedAt: playlistEntry?.capturedAt ?? null,
              referenceTriageGroups: buildReferenceTriageGroups(assetReferences)
            };
          })(),
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
