import type { ImageAsset } from "@solar-display/shared";
import {
  fetchImagePlaylistGovernance,
  getImages,
  getImageStorageUsage,
  type ImageStorageUsage
} from "../../services/api";
import type {
  ImageManagementPlaylistEntry,
  ImageManagementResolvedPlaylistEntry
} from "./viewModel";
import {
  normalizeManagementPlaylistAssetId,
  resolveSelectedPlaylistEntry
} from "./viewModel";

type ImagePlaylistGovernance = Awaited<ReturnType<typeof fetchImagePlaylistGovernance>>["playlist"];

type ImageManagementModelLoaders = {
  readImages?: () => Promise<ImageAsset[]>;
  readPlaylistGovernance?: () => Promise<{ playlist: ImagePlaylistGovernance }>;
  readStorageUsage?: () => Promise<ImageStorageUsage>;
};

type ResolveImageManagementModelInput = {
  assets: ImageAsset[];
  currentSelectedEntryId?: string | null;
  playlist: ImagePlaylistGovernance;
  preferredImageId?: number | null;
  storageUsage: ImageStorageUsage;
};

export type ImageManagementModel = {
  assets: ImageAsset[];
  lastSyncedAssets: ImageAsset[];
  lastSyncedPlaylistEntries: ImageManagementPlaylistEntry[];
  playlistBulkDurationSeconds: number | "";
  playlistEntries: ImageManagementPlaylistEntry[];
  playlistShuffle: boolean;
  resolvedPlaylistEntries: ImageManagementResolvedPlaylistEntry[];
  selectedImageId: number | null;
  selectedPlaylistEntryId: string | null;
  storageUsage: ImageStorageUsage;
};

export function normalizeManagementPlaylistEntry(
  entry: ImagePlaylistGovernance["entries"][number]
): ImageManagementPlaylistEntry {
  return {
    area: entry.area?.trim() ? entry.area : "",
    assetId: normalizeManagementPlaylistAssetId(entry.assetId, entry.entryId),
    capturedAt: entry.capturedAt?.trim() ? entry.capturedAt : "",
    description: entry.description?.trim() ? entry.description : "",
    displayOrder: entry.displayOrder,
    durationSeconds: entry.durationSeconds,
    enabled: entry.enabled,
    entryId: entry.entryId,
    fallbackMode: entry.fallbackMode,
    tags: entry.tags,
    title: entry.title?.trim() ? entry.title : ""
  };
}

export function normalizeResolvedPlaylistEntry(
  entry: ImagePlaylistGovernance["resolvedEntries"][number]
): ImageManagementResolvedPlaylistEntry {
  return {
    entryId: entry.entryId,
    fallbackActive: entry.fallbackActive,
    fallbackReason: entry.fallbackReason,
    isPlayable: entry.isPlayable
  };
}

export function resolveBulkPlaylistDurationInput(entries: ImageManagementPlaylistEntry[]) {
  if (entries.length === 0) {
    return "" as const;
  }

  const [firstEntry] = entries;
  if (!firstEntry) {
    return "" as const;
  }

  return entries.every((entry) => entry.durationSeconds === firstEntry.durationSeconds)
    ? firstEntry.durationSeconds
    : "" as const;
}

export function resolveImageManagementModel({
  assets,
  currentSelectedEntryId = null,
  playlist,
  preferredImageId = null,
  storageUsage
}: ResolveImageManagementModelInput): ImageManagementModel {
  const playlistEntries = playlist.entries.map(normalizeManagementPlaylistEntry);
  const resolvedPlaylistEntries = playlist.resolvedEntries.map(normalizeResolvedPlaylistEntry);
  const selectedImageId =
    preferredImageId !== null && assets.some((asset) => asset.id === preferredImageId)
      ? preferredImageId
      : assets[0]?.id ?? null;
  const selectedPlaylistEntryId =
    selectedImageId === null
      ? null
      : resolveSelectedPlaylistEntry(
          playlistEntries,
          selectedImageId,
          currentSelectedEntryId
        )?.entryId ?? null;

  return {
    assets,
    lastSyncedAssets: assets,
    lastSyncedPlaylistEntries: playlistEntries,
    playlistBulkDurationSeconds: resolveBulkPlaylistDurationInput(playlistEntries),
    playlistEntries,
    playlistShuffle: playlist.settings.shuffle,
    resolvedPlaylistEntries,
    selectedImageId,
    selectedPlaylistEntryId,
    storageUsage
  };
}

export async function loadImageManagementModel(
  loaders: ImageManagementModelLoaders = {},
  options: {
    currentSelectedEntryId?: string | null;
    preferredImageId?: number | null;
  } = {}
): Promise<ImageManagementModel> {
  const [assets, storageUsage, playlistResponse] = await Promise.all([
    (loaders.readImages ?? getImages)(),
    (loaders.readStorageUsage ?? getImageStorageUsage)(),
    (loaders.readPlaylistGovernance ?? fetchImagePlaylistGovernance)()
  ]);

  return resolveImageManagementModel({
    assets,
    currentSelectedEntryId: options.currentSelectedEntryId,
    playlist: playlistResponse.playlist,
    preferredImageId: options.preferredImageId,
    storageUsage
  });
}
