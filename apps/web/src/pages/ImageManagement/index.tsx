import type { ImageAsset } from "@solar-display/shared";
import type { ChangeEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { RemoteSyncBanner } from "../../components/management/RemoteSyncBanner";
import {
  hasDisplaySyncDraftChanges,
  useDisplaySyncDraftGuard
} from "../../hooks/displaySyncDraftGuard";
import { useDisplaySyncRefresh } from "../../hooks/useDisplaySyncRefresh";
import { useDisplayPageAssetHealth } from "../../hooks/useDisplayPageAssetHealth";
import { useImageAssetReferences } from "../../hooks/useImageAssetReferences";
import {
  bootstrapImagePlaylistGovernance,
  deleteImageAsset,
  fetchImagePlaylistGovernance,
  getImages,
  getImageStorageUsage,
  type ImageStorageUsage,
  updateImageAsset,
  updateImagePlaylistEntry,
  uploadImageAsset
} from "../../services/api";
import { ImageManagementContent } from "./ImageManagementContent";
import type {
  ImageManagementPlaylistEntry,
  ImageManagementResolvedPlaylistEntry
} from "./viewModel";
import {
  normalizeManagementPlaylistAssetId,
  resolvePlaylistEntriesForAsset
} from "./viewModel";

const initialStorageUsage: ImageStorageUsage = {
  fileCount: 0,
  usedBytes: 0,
  usedMB: 0
};

function normalizeNullablePlaylistText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeManagementPlaylistEntry(entry: Awaited<ReturnType<typeof fetchImagePlaylistGovernance>>["playlist"]["entries"][number]): ImageManagementPlaylistEntry {
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

function normalizeResolvedPlaylistEntry(
  entry: Awaited<ReturnType<typeof fetchImagePlaylistGovernance>>["playlist"]["resolvedEntries"][number]
): ImageManagementResolvedPlaylistEntry {
  return {
    entryId: entry.entryId,
    fallbackActive: entry.fallbackActive,
    fallbackReason: entry.fallbackReason,
    isPlayable: entry.isPlayable
  };
}

export function ImageManagement() {
  const [assets, setAssets] = useState<ImageAsset[]>([]);
  const [lastSyncedAssets, setLastSyncedAssets] = useState<ImageAsset[]>([]);
  const [storageUsage, setStorageUsage] = useState<ImageStorageUsage>(initialStorageUsage);
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isBootstrappingPlaylist, setIsBootstrappingPlaylist] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState("正在同步圖片庫...");
  const [errorMessage, setErrorMessage] = useState("");
  const [playlistEntries, setPlaylistEntries] = useState<ImageManagementPlaylistEntry[]>([]);
  const [lastSyncedPlaylistEntries, setLastSyncedPlaylistEntries] = useState<ImageManagementPlaylistEntry[]>([]);
  const [resolvedPlaylistEntries, setResolvedPlaylistEntries] = useState<ImageManagementResolvedPlaylistEntry[]>([]);
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
  } = useImageAssetReferences(selectedImageId);

  const syncImages = async (preferredImageId: number | null = selectedImageId) => {
    const [nextAssets, nextStorageUsage, playlistRes] = await Promise.all([
      getImages(),
      getImageStorageUsage(),
      fetchImagePlaylistGovernance()
    ]);
    const nextPlaylistEntries = playlistRes.playlist.entries.map(normalizeManagementPlaylistEntry);
    const nextResolvedPlaylistEntries = playlistRes.playlist.resolvedEntries.map(normalizeResolvedPlaylistEntry);
    setAssets(nextAssets);
    setLastSyncedAssets(nextAssets);
    setStorageUsage(nextStorageUsage);
    setPlaylistEntries(nextPlaylistEntries);
    setLastSyncedPlaylistEntries(nextPlaylistEntries);
    setResolvedPlaylistEntries(nextResolvedPlaylistEntries);
    setSelectedImageId((currentSelected) => {
      const candidateId = preferredImageId ?? currentSelected;
      if (candidateId !== null && nextAssets.some((asset) => asset.id === candidateId)) {
        return candidateId;
      }
      return nextAssets[0]?.id ?? null;
    });
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const [nextAssets, nextStorageUsage, playlistRes] = await Promise.all([
          getImages(),
          getImageStorageUsage(),
          fetchImagePlaylistGovernance()
        ]);
        if (!active) return;
        const nextPlaylistEntries = playlistRes.playlist.entries.map(normalizeManagementPlaylistEntry);
        const nextResolvedPlaylistEntries = playlistRes.playlist.resolvedEntries.map(normalizeResolvedPlaylistEntry);
        setAssets(nextAssets);
        setLastSyncedAssets(nextAssets);
        setStorageUsage(nextStorageUsage);
        setPlaylistEntries(nextPlaylistEntries);
        setLastSyncedPlaylistEntries(nextPlaylistEntries);
        setResolvedPlaylistEntries(nextResolvedPlaylistEntries);
        setSelectedImageId(nextAssets[0]?.id ?? null);
        setMessage("圖片庫已同步。");
        setErrorMessage("");
      } catch (error) {
        if (!active) return;
        setErrorMessage(error instanceof Error ? error.message : "載入圖片管理頁失敗。");
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const markDirty = () => {
    setMessage("圖片設定已變更，尚未儲存。");
    setErrorMessage("");
  };

  const updateAssetField = (id: number, updates: Partial<{
    aspectRatio: number | null;
    title: string | null;
    description: string | null;
  }>) => {
    markDirty();
    setAssets((current) => current.map((asset) => (asset.id === id ? { ...asset, ...updates } : asset)));
  };

  const updatePlaylistEntryField = (
    entryId: string,
    updates: Partial<{
      area: string;
      capturedAt: string;
      description: string;
      displayOrder: number;
      durationSeconds: number;
      enabled: boolean;
      fallbackMode: "display-placeholder" | "skip" | "use-cover";
      tags: string[];
      title: string;
    }>
  ) => {
    markDirty();
    setPlaylistEntries((current) =>
      current.map((entry) => (entry.entryId === entryId ? { ...entry, ...updates } : entry))
    );
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    setIsUploading(true);
    setErrorMessage("");
    try {
      let lastUploadedId: number | null = null;
      for (const file of files) {
        const uploaded = await uploadImageAsset(file);
        lastUploadedId = uploaded.id;
      }
      await syncImages(lastUploadedId);
      await reloadAssetHealth();
      await reloadAssetReferences();
      setMessage(files.length === 1 ? "圖片已上傳。" : `已完成 ${files.length} 張圖片上傳。`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "上傳圖片失敗。");
    } finally {
      event.target.value = "";
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    const selectedAsset = assets.find((asset) => asset.id === selectedImageId);
    if (!selectedAsset) return;
    const assetPlaylistEntries = resolvePlaylistEntriesForAsset(playlistEntries, selectedAsset.id);
    const selectedPlaylistEntry = assetPlaylistEntries[0] ?? null;
    setIsSaving(true);
    setErrorMessage("");
    try {
      await Promise.all([
        updateImageAsset(selectedAsset.id, {
          aspectRatio: selectedAsset.aspectRatio,
          description: selectedAsset.description,
          title: selectedAsset.title
        }),
        ...(selectedPlaylistEntry === null
          ? []
          : [
              updateImagePlaylistEntry(selectedPlaylistEntry.entryId, {
                area: normalizeNullablePlaylistText(selectedPlaylistEntry.area),
                assetId: selectedPlaylistEntry.assetId,
                capturedAt: normalizeNullablePlaylistText(selectedPlaylistEntry.capturedAt),
                description: normalizeNullablePlaylistText(selectedPlaylistEntry.description),
                displayOrder: selectedPlaylistEntry.displayOrder,
                durationSeconds: selectedPlaylistEntry.durationSeconds,
                enabled: selectedPlaylistEntry.enabled,
                fallbackMode: selectedPlaylistEntry.fallbackMode,
                tags: selectedPlaylistEntry.tags,
                title: normalizeNullablePlaylistText(selectedPlaylistEntry.title)
              })
            ])
      ]);
      await syncImages(selectedAsset.id);
      await reloadAssetHealth();
      await reloadAssetReferences();
      setMessage("圖片設定已儲存。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "儲存圖片設定失敗。");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetCover = async () => {
    if (selectedImageId === null) return;
    setIsSaving(true);
    setErrorMessage("");
    try {
      await updateImageAsset(selectedImageId, { isCover: true });
      await syncImages(selectedImageId);
      await reloadAssetReferences();
      setMessage("已更新封面圖片。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "設定封面圖片失敗。");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (selectedImageId === null) return;
    setIsDeleting(true);
    setErrorMessage("");
    try {
      await deleteImageAsset(selectedImageId);
      await syncImages(null);
      await reloadAssetHealth();
      await reloadAssetReferences();
      setMessage("已移除圖片。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "移除圖片失敗。");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBootstrapPlaylistGovernance = async () => {
    setIsBootstrappingPlaylist(true);
    setErrorMessage("");
    try {
      await bootstrapImagePlaylistGovernance();
      await syncImages(selectedImageId);
      await reloadAssetReferences();
      setMessage("已建立 playlist governance rows。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "建立 playlist governance rows 失敗。");
    } finally {
      setIsBootstrappingPlaylist(false);
    }
  };

  const reloadImageManagement = async () => {
    await syncImages();
    await reloadAssetHealth();
    await reloadAssetReferences();
    setMessage("圖片庫已同步。");
    setErrorMessage("");
  };

  const resyncLibrary = async () => {
    setIsLoading(true);
    setMessage("正在同步圖片庫...");
    setErrorMessage("");
    try {
      await reloadImageManagement();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "同步圖片庫失敗。");
    } finally {
      setIsLoading(false);
    }
  };

  const isDirty = useMemo(
    () =>
      hasDisplaySyncDraftChanges(assets, lastSyncedAssets)
      || hasDisplaySyncDraftChanges(playlistEntries, lastSyncedPlaylistEntries),
    [assets, lastSyncedAssets, lastSyncedPlaylistEntries, playlistEntries]
  );
  const syncDraftGuard = useDisplaySyncDraftGuard({
    isDirty: isDirty,
    reloadNow: reloadImageManagement
  });

  useDisplaySyncRefresh(syncDraftGuard.handleDisplaySync);

  return (
    <ImageManagementContent
      assetHealthErrorMessage={assetHealthErrorMessage}
      assetHealthReport={assetHealthReport}
      assetReferences={assetReferences}
      assetReferencesErrorMessage={assetReferencesErrorMessage}
      assets={assets}
      deleteBlocked={(assetReferences?.blockingIssues.length ?? 0) > 0}
      deleteBlockMessage={assetReferences?.blockingIssues[0]?.message ?? null}
      errorMessage={errorMessage}
      fileInputRef={fileInputRef}
      handleDelete={handleDelete}
      handleBootstrapPlaylistGovernance={handleBootstrapPlaylistGovernance}
      handleSave={handleSave}
      handleSetCover={handleSetCover}
      handleUpload={handleUpload}
      isAssetHealthLoading={isAssetHealthLoading}
      isAssetReferencesLoading={isAssetReferencesLoading}
      isBootstrappingPlaylist={isBootstrappingPlaylist}
      isDeleting={isDeleting}
      isLoading={isLoading}
      isSaving={isSaving}
      isUploading={isUploading}
      message={message}
      playlistEntries={playlistEntries}
      resolvedPlaylistEntries={resolvedPlaylistEntries}
      remoteSyncBanner={
        syncDraftGuard.hasPendingRemoteChange ? (
          <RemoteSyncBanner
            onKeepEditing={syncDraftGuard.keepEditing}
            onReloadNow={() => syncDraftGuard.discardAndReload().catch(() => {})}
          />
        ) : null
      }
      resyncLibrary={resyncLibrary}
      selectedImageId={selectedImageId}
      setSelectedImageId={setSelectedImageId}
      storageUsage={storageUsage}
      updateAssetField={updateAssetField}
      updatePlaylistEntryField={updatePlaylistEntryField}
    />
  );
}
