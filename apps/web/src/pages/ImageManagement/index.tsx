import type { ImageAsset } from "@solar-display/shared";
import type { ChangeEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { RemoteSyncBanner } from "../../components/management/RemoteSyncBanner";
import {
  useDisplaySyncDraftGuard
} from "../../hooks/displaySyncDraftGuard";
import { useDisplaySyncRefresh } from "../../hooks/useDisplaySyncRefresh";
import { useDisplayPageAssetHealth } from "../../hooks/useDisplayPageAssetHealth";
import { useImageAssetReferences } from "../../hooks/useImageAssetReferences";
import {
  bootstrapImagePlaylistGovernance,
  deleteImageAsset,
  type ImageStorageUsage,
  persistImageManagementDraftTarget,
  updateImageAsset,
  updateAllImagePlaylistDurations,
  updateImagePlaylistSettings,
  uploadImageAsset
} from "../../services/api";
import { ImageManagementContent } from "./ImageManagementContent";
import type {
  ImageManagementPlaylistEntry,
  ImageManagementResolvedPlaylistEntry
} from "./viewModel";
import {
  buildImageManagementDraftSaveTarget,
  hasSelectedImageManagementDraftChanges,
  resolveSelectedPlaylistEntry
} from "./viewModel";
import { IMAGE_MANAGEMENT_DISPLAY_SYNC_SCOPES } from "../managementDisplaySyncScopes";
import {
  loadImageManagementLibraryModel,
  loadImageManagementModel,
  loadImageManagementPlaylistGovernanceModel,
  resolveImageManagementPlaylistGovernanceModel,
  type ImageManagementLibraryModel,
  type ImageManagementModel,
  type ImageManagementPlaylistGovernanceModel
} from "./loadModel";

const initialStorageUsage: ImageStorageUsage = {
  fileCount: 0,
  usedBytes: 0,
  usedMB: 0
};

export function ImageManagement() {
  const [assets, setAssets] = useState<ImageAsset[]>([]);
  const [lastSyncedAssets, setLastSyncedAssets] = useState<ImageAsset[]>([]);
  const [storageUsage, setStorageUsage] = useState<ImageStorageUsage>(initialStorageUsage);
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);
  const [selectedPlaylistEntryId, setSelectedPlaylistEntryId] = useState<string | null>(null);
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
  const [playlistShuffle, setPlaylistShuffle] = useState(false);
  const [playlistBulkDurationSeconds, setPlaylistBulkDurationSeconds] = useState<number | "">("");
  const [isUpdatingPlaylistDurationAll, setIsUpdatingPlaylistDurationAll] = useState(false);
  const [isUpdatingPlaylistSettings, setIsUpdatingPlaylistSettings] = useState(false);
  const [hasLoadedImageManagementModel, setHasLoadedImageManagementModel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const {
    errorMessage: assetHealthErrorMessage,
    isLoading: isAssetHealthLoading,
    reload: reloadAssetHealth,
    report: assetHealthReport
  } = useDisplayPageAssetHealth({ enabled: hasLoadedImageManagementModel });
  const {
    errorMessage: assetReferencesErrorMessage,
    isLoading: isAssetReferencesLoading,
    references: assetReferences,
    reload: reloadAssetReferences
  } = useImageAssetReferences(selectedImageId, { enabled: hasLoadedImageManagementModel });

  const applyImageManagementModel = (model: ImageManagementModel) => {
    setAssets(model.assets);
    setLastSyncedAssets(model.lastSyncedAssets);
    setStorageUsage(model.storageUsage);
    setPlaylistEntries(model.playlistEntries);
    setLastSyncedPlaylistEntries(model.lastSyncedPlaylistEntries);
    setResolvedPlaylistEntries(model.resolvedPlaylistEntries);
    setPlaylistShuffle(model.playlistShuffle);
    setPlaylistBulkDurationSeconds(model.playlistBulkDurationSeconds);
    setSelectedImageId(model.selectedImageId);
    setSelectedPlaylistEntryId(model.selectedPlaylistEntryId);
    setHasLoadedImageManagementModel(true);
  };

  const syncImages = async (preferredImageId: number | null = selectedImageId) => {
    const model = await loadImageManagementModel({}, {
      currentSelectedEntryId: selectedPlaylistEntryId,
      preferredImageId
    });
    applyImageManagementModel(model);
  };

  const applyLibraryModel = (
    model: ImageManagementLibraryModel,
    preferredImageId: number | null = selectedImageId
  ) => {
    const nextSelectedImageId =
      preferredImageId !== null && model.assets.some((asset) => asset.id === preferredImageId)
        ? preferredImageId
        : model.assets[0]?.id ?? null;

    setAssets(model.assets);
    setLastSyncedAssets(model.lastSyncedAssets);
    setStorageUsage(model.storageUsage);
    setSelectedImageId(nextSelectedImageId);
    setSelectedPlaylistEntryId(
      nextSelectedImageId === null
        ? null
        : resolveSelectedPlaylistEntry(
            playlistEntries,
            nextSelectedImageId,
            selectedPlaylistEntryId
          )?.entryId ?? null
    );
  };

  const applyPlaylistGovernanceModel = (
    model: ImageManagementPlaylistGovernanceModel,
    preferredImageId: number | null = selectedImageId
  ) => {
    setPlaylistEntries(model.playlistEntries);
    setLastSyncedPlaylistEntries(model.lastSyncedPlaylistEntries);
    setResolvedPlaylistEntries(model.resolvedPlaylistEntries);
    setPlaylistShuffle(model.playlistShuffle);
    setPlaylistBulkDurationSeconds(model.playlistBulkDurationSeconds);
    setSelectedPlaylistEntryId(
      preferredImageId === null
        ? null
        : resolveSelectedPlaylistEntry(
            model.playlistEntries,
            preferredImageId,
            selectedPlaylistEntryId
          )?.entryId ?? null
    );
  };

  const applyUpdatedImageAsset = (updatedAsset: ImageAsset) => {
    const mergeUpdatedAsset = (current: ImageAsset[]) =>
      current.map((asset) => {
        if (asset.id === updatedAsset.id) {
          return updatedAsset;
        }

        return updatedAsset.isCover ? { ...asset, isCover: false } : asset;
      });

    setAssets(mergeUpdatedAsset);
    setLastSyncedAssets(mergeUpdatedAsset);
  };

  const refreshLibraryLane = async (preferredImageId: number | null = selectedImageId) => {
    const model = await loadImageManagementLibraryModel();
    applyLibraryModel(model, preferredImageId);
  };

  const refreshPlaylistGovernanceLane = async (preferredImageId: number | null = selectedImageId) => {
    const model = await loadImageManagementPlaylistGovernanceModel();
    applyPlaylistGovernanceModel(model, preferredImageId);
  };

  const refreshImageManagementDiagnostics = async (assetId: number | null = selectedImageId) => {
    const refreshResults = await Promise.allSettled([
      reloadAssetHealth(),
      reloadAssetReferences(assetId)
    ]);

    return refreshResults.some((result) => result.status === "rejected");
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const model = await loadImageManagementModel();
        if (!active) return;
        applyImageManagementModel(model);
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

  const hasSelectedDraftChanges = useMemo(
    () =>
      hasSelectedImageManagementDraftChanges({
        assets,
        lastSyncedAssets,
        lastSyncedPlaylistEntries,
        playlistEntries,
        selectedImageId,
        selectedPlaylistEntryId
      }),
    [assets, lastSyncedAssets, lastSyncedPlaylistEntries, playlistEntries, selectedImageId, selectedPlaylistEntryId]
  );

  const handleSelectImage = (nextImageId: number) => {
    if (nextImageId === selectedImageId) {
      return;
    }

    if (hasSelectedDraftChanges) {
      setMessage("請先儲存或重新同步目前圖片的未儲存變更，再切換其他素材。");
      setErrorMessage("");
      return;
    }

    setSelectedImageId(nextImageId);
    setSelectedPlaylistEntryId(
      resolveSelectedPlaylistEntry(playlistEntries, nextImageId)?.entryId ?? null
    );
    setErrorMessage("");
  };

  const handleSelectPlaylistEntry = (nextEntryId: string) => {
    if (nextEntryId === selectedPlaylistEntryId) {
      return;
    }

    if (hasSelectedDraftChanges) {
      setMessage("請先儲存或重新同步目前 playlist row 的未儲存變更，再切換其他治理列。");
      setErrorMessage("");
      return;
    }

    setSelectedPlaylistEntryId(nextEntryId);
    setErrorMessage("");
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
      await refreshLibraryLane(lastUploadedId);
      await refreshPlaylistGovernanceLane(lastUploadedId);
      const hasRefreshFailure = await refreshImageManagementDiagnostics(lastUploadedId);
      setMessage(
        hasRefreshFailure
          ? "圖片已上傳，診斷資料將在下次同步時更新。"
          : files.length === 1 ? "圖片已上傳。" : `已完成 ${files.length} 張圖片上傳。`
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "上傳圖片失敗。");
    } finally {
      event.target.value = "";
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    const saveTarget = buildImageManagementDraftSaveTarget({
      assets,
      playlistEntries,
      selectedImageId,
      selectedPlaylistEntryId
    });
    if (saveTarget === null) return;
    setIsSaving(true);
    setErrorMessage("");
    try {
      await persistImageManagementDraftTarget(saveTarget);
      setLastSyncedAssets(assets);
      setLastSyncedPlaylistEntries(playlistEntries);
      if (saveTarget.playlistEntry !== null) {
        await refreshPlaylistGovernanceLane(saveTarget.asset.id);
      }
      const hasRefreshFailure = await refreshImageManagementDiagnostics(saveTarget.asset.id);
      setMessage(
        hasRefreshFailure
          ? "圖片設定已儲存，診斷資料將在下次同步時更新。"
          : "圖片設定已儲存。"
      );
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
      const updatedAsset = await updateImageAsset(selectedImageId, { isCover: true });
      applyUpdatedImageAsset(updatedAsset);
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
      const response = await bootstrapImagePlaylistGovernance();
      applyPlaylistGovernanceModel(
        resolveImageManagementPlaylistGovernanceModel(response.playlist),
        selectedImageId
      );
      await reloadAssetReferences();
      setMessage("已建立 playlist governance rows。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "建立 playlist governance rows 失敗。");
    } finally {
      setIsBootstrappingPlaylist(false);
    }
  };

  const handleTogglePlaylistShuffle = async (nextShuffle: boolean) => {
    setIsUpdatingPlaylistSettings(true);
    setErrorMessage("");
    try {
      const response = await updateImagePlaylistSettings({ shuffle: nextShuffle });
      setPlaylistShuffle(response.playlist.settings.shuffle);
      setMessage(response.playlist.settings.shuffle ? "圖片輪播已切換為隨機播放。" : "圖片輪播已切換為排序播放。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "更新圖片輪播播放模式失敗。");
    } finally {
      setIsUpdatingPlaylistSettings(false);
    }
  };

  const handleApplyPlaylistBulkDuration = async () => {
    if (playlistBulkDurationSeconds === "") {
      return;
    }

    const appliedDuration = Number.isFinite(playlistBulkDurationSeconds)
      ? Math.max(1, Math.trunc(playlistBulkDurationSeconds))
      : 1;
    setIsUpdatingPlaylistDurationAll(true);
    setErrorMessage("");
    try {
      await updateAllImagePlaylistDurations({ durationSeconds: appliedDuration });
      await refreshPlaylistGovernanceLane(selectedImageId);
      setPlaylistBulkDurationSeconds(appliedDuration);
      setMessage(`所有圖片輪播秒數已更新為 ${appliedDuration} 秒。`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "更新全部圖片輪播秒數失敗。");
    } finally {
      setIsUpdatingPlaylistDurationAll(false);
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

  const isDirty = hasSelectedDraftChanges;
  const syncDraftGuard = useDisplaySyncDraftGuard({
    isDirty: isDirty,
    relevantScopes: IMAGE_MANAGEMENT_DISPLAY_SYNC_SCOPES,
    reloadNow: reloadImageManagement
  });

  useDisplaySyncRefresh(syncDraftGuard.handleDisplaySync, IMAGE_MANAGEMENT_DISPLAY_SYNC_SCOPES);

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
      handleSelectPlaylistEntry={handleSelectPlaylistEntry}
      handleUpload={handleUpload}
      isAssetHealthLoading={isAssetHealthLoading}
      isAssetReferencesLoading={isAssetReferencesLoading}
      isBootstrappingPlaylist={isBootstrappingPlaylist}
      isDeleting={isDeleting}
      isLoading={isLoading}
      isSaving={isSaving}
      isUpdatingPlaylistDurationAll={isUpdatingPlaylistDurationAll}
      isUpdatingPlaylistSettings={isUpdatingPlaylistSettings}
      isUploading={isUploading}
      message={message}
      playlistBulkDurationSeconds={playlistBulkDurationSeconds}
      playlistEntries={playlistEntries}
      playlistShuffle={playlistShuffle}
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
      selectedPlaylistEntryId={selectedPlaylistEntryId}
      handleSelectImage={handleSelectImage}
      storageUsage={storageUsage}
      onApplyPlaylistBulkDuration={handleApplyPlaylistBulkDuration}
      onPlaylistBulkDurationChange={setPlaylistBulkDurationSeconds}
      onTogglePlaylistShuffle={handleTogglePlaylistShuffle}
      updateAssetField={updateAssetField}
      updatePlaylistEntryField={updatePlaylistEntryField}
    />
  );
}
