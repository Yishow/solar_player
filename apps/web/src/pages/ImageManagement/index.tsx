import type { ImageAsset } from "@solar-display/shared";
import type { ChangeEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useDisplaySyncRefresh } from "../../hooks/useDisplaySyncRefresh";
import { useDisplayPageAssetHealth } from "../../hooks/useDisplayPageAssetHealth";
import { useImageAssetReferences } from "../../hooks/useImageAssetReferences";
import {
  deleteImageAsset,
  getImages,
  getImageStorageUsage,
  type ImageStorageUsage,
  updateImageAsset,
  uploadImageAsset
} from "../../services/api";
import { ImageManagementContent } from "./ImageManagementContent";

const initialStorageUsage: ImageStorageUsage = {
  fileCount: 0,
  usedBytes: 0,
  usedMB: 0
};

export function ImageManagement() {
  const [assets, setAssets] = useState<ImageAsset[]>([]);
  const [storageUsage, setStorageUsage] = useState<ImageStorageUsage>(initialStorageUsage);
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState("正在同步圖片庫...");
  const [errorMessage, setErrorMessage] = useState("");
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
    const [nextAssets, nextStorageUsage] = await Promise.all([getImages(), getImageStorageUsage()]);
    setAssets(nextAssets);
    setStorageUsage(nextStorageUsage);
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
        const [nextAssets, nextStorageUsage] = await Promise.all([getImages(), getImageStorageUsage()]);
        if (!active) return;
        setAssets(nextAssets);
        setStorageUsage(nextStorageUsage);
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

  useDisplaySyncRefresh(() => {
    void syncImages();
    void reloadAssetHealth();
    void reloadAssetReferences();
  });

  const markDirty = () => {
    setMessage("圖片設定已變更，尚未儲存。");
    setErrorMessage("");
  };

  const updateAssetField = (id: number, updates: Partial<{
    aspectRatio: number | null;
    title: string | null;
    description: string | null;
    displayDuration: number;
    includedInSlideshow: boolean;
  }>) => {
    markDirty();
    setAssets((current) => current.map((asset) => (asset.id === id ? { ...asset, ...updates } : asset)));
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
    setIsSaving(true);
    setErrorMessage("");
    try {
      await updateImageAsset(selectedAsset.id, {
        aspectRatio: selectedAsset.aspectRatio,
        description: selectedAsset.description,
        displayDuration: selectedAsset.displayDuration,
        includedInSlideshow: selectedAsset.includedInSlideshow,
        title: selectedAsset.title
      });
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

  const resyncLibrary = async () => {
    setIsLoading(true);
    setMessage("正在同步圖片庫...");
    setErrorMessage("");
    try {
      await syncImages();
      await reloadAssetHealth();
      await reloadAssetReferences();
      setMessage("圖片庫已同步。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "同步圖片庫失敗。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ImageManagementContent
      assetHealthErrorMessage={assetHealthErrorMessage}
      assetHealthReport={assetHealthReport}
      assetReferences={assetReferences}
      assetReferencesErrorMessage={assetReferencesErrorMessage}
      assets={assets}
      deleteBlocked={(assetReferences?.liveCount ?? 0) > 0}
      errorMessage={errorMessage}
      fileInputRef={fileInputRef}
      handleDelete={handleDelete}
      handleSave={handleSave}
      handleSetCover={handleSetCover}
      handleUpload={handleUpload}
      isAssetHealthLoading={isAssetHealthLoading}
      isAssetReferencesLoading={isAssetReferencesLoading}
      isDeleting={isDeleting}
      isLoading={isLoading}
      isSaving={isSaving}
      isUploading={isUploading}
      message={message}
      resyncLibrary={resyncLibrary}
      selectedImageId={selectedImageId}
      setSelectedImageId={setSelectedImageId}
      storageUsage={storageUsage}
      updateAssetField={updateAssetField}
    />
  );
}
