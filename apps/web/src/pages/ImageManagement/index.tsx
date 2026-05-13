import type { ImageAsset } from "@solar-display/shared";
import type { ChangeEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { KioskButton } from "../../components/KioskButton";
import { KioskInput } from "../../components/KioskInput";
import { PanelCard } from "../../components/PanelCard";
import {
  deleteImageAsset,
  getImages,
  getImageStorageUsage,
  type ImageStorageUsage,
  updateImageAsset,
  uploadImageAsset
} from "../../services/api";
import { PageScaffold } from "../shared/PageScaffold";
import { buildImageManagementViewModel } from "./viewModel";

function SummaryCard({
  helper,
  label,
  value
}: {
  helper: string;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-[28px] border border-white/75 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(241,246,235,0.82))] p-5 shadow-card">
      <p className="text-sm font-medium tracking-[0.08em] text-neutral-600">{label}</p>
      <p className="mt-3 text-3xl font-bold leading-tight text-brand-900">{value}</p>
      <p className="mt-3 text-sm text-neutral-500">{helper}</p>
    </article>
  );
}

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

  const syncImages = async (preferredImageId: number | null = selectedImageId) => {
    const [nextAssets, nextStorageUsage] = await Promise.all([
      getImages(),
      getImageStorageUsage()
    ]);

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
        const [nextAssets, nextStorageUsage] = await Promise.all([
          getImages(),
          getImageStorageUsage()
        ]);

        if (!active) {
          return;
        }

        setAssets(nextAssets);
        setStorageUsage(nextStorageUsage);
        setSelectedImageId(nextAssets[0]?.id ?? null);
        setMessage("圖片庫已同步。");
        setErrorMessage("");
      } catch (error) {
        if (!active) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "載入圖片管理頁失敗。");
      } finally {
        if (active) {
          setIsLoading(false);
        }
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

  const updateAssetField = (
    id: number,
    updates: Partial<{
      title: string | null;
      description: string | null;
      displayDuration: number;
      includedInSlideshow: boolean;
    }>
  ) => {
    markDirty();
    setAssets((current) =>
      current.map((asset) =>
        asset.id === id
          ? {
              ...asset,
              ...updates
            }
          : asset
      )
    );
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      return;
    }

    setIsUploading(true);
    setErrorMessage("");

    try {
      let lastUploadedId: number | null = null;

      for (const file of files) {
        const uploaded = await uploadImageAsset(file);
        lastUploadedId = uploaded.id;
      }

      await syncImages(lastUploadedId);
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

    if (!selectedAsset) {
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      await updateImageAsset(selectedAsset.id, {
        description: selectedAsset.description,
        displayDuration: selectedAsset.displayDuration,
        includedInSlideshow: selectedAsset.includedInSlideshow,
        title: selectedAsset.title
      });
      await syncImages(selectedAsset.id);
      setMessage("圖片設定已儲存。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "儲存圖片設定失敗。");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetCover = async () => {
    if (selectedImageId === null) {
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      await updateImageAsset(selectedImageId, { isCover: true });
      await syncImages(selectedImageId);
      setMessage("已更新封面圖片。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "設定封面圖片失敗。");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (selectedImageId === null) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage("");

    try {
      await deleteImageAsset(selectedImageId);
      await syncImages(null);
      setMessage("已移除圖片。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "移除圖片失敗。");
    } finally {
      setIsDeleting(false);
    }
  };

  const viewModel = buildImageManagementViewModel({
    assets,
    errorMessage,
    isDeleting,
    isSaving,
    isUploading,
    message,
    selectedImageId,
    storageUsage
  });

  return (
    <PageScaffold
      path="/settings/images"
      description="管理展示圖片、輪播納入狀態與封面設定，並即時同步圖片素材庫。"
    >
      <input
        ref={fileInputRef}
        hidden
        accept=".jpg,.jpeg,.png,.webp"
        multiple
        type="file"
        onChange={(event) => void handleUpload(event)}
      />

      <div className="grid grid-cols-4 gap-4">
        <SummaryCard
          label="總圖片數"
          value={String(viewModel.summary.totalImages)}
          helper={`目前檔案數：${storageUsage.fileCount} 張`}
        />
        <SummaryCard
          label="輪播張數"
          value={String(viewModel.summary.slideshowCount)}
          helper="已納入展示輪播的圖片數量"
        />
        <SummaryCard
          label="已用空間"
          value={`${viewModel.summary.usagePercent}%`}
          helper={viewModel.summary.usedSpaceLabel}
        />
        <SummaryCard
          label="封面圖片"
          value={viewModel.summary.coverLabel}
          helper="首頁或圖片庫預設焦點素材"
        />
      </div>

      <div className="grid grid-cols-12 gap-6">
        <PanelCard title="素材庫" subtitle="ASSET LIBRARY" className="col-span-8">
          <div className="grid grid-cols-[1.4fr_1fr] gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex min-h-[140px] items-center justify-center rounded-[28px] border border-dashed border-brand-300 bg-[rgba(241,246,235,0.72)] px-8 text-center shadow-soft transition-colors hover:bg-[rgba(247,250,243,0.92)]"
            >
              <div>
                <p className="text-xl font-semibold text-brand-900">
                  {isUploading ? "正在上傳圖片..." : "拖曳或點擊上傳展示圖片"}
                </p>
                <p className="mt-2 text-sm text-neutral-500">
                  支援 JPG / PNG / WEBP，單檔上限 10 MB，可一次選取多張依序上傳。
                </p>
              </div>
            </button>
            <div className="rounded-[28px] border border-white/70 bg-white/92 p-5 shadow-soft">
              <p className="text-sm font-medium tracking-[0.08em] text-neutral-600">同步狀態</p>
              <p className="mt-3 text-xl font-semibold text-neutral-800">{viewModel.actionBanner.title}</p>
              <p className="mt-2 text-sm leading-6 text-neutral-500">{viewModel.actionBanner.detail}</p>
              <div className="mt-4 grid gap-3">
                <KioskButton
                  variant="secondary"
                  disabled={isLoading || isUploading}
                  onClick={() => {
                    setIsLoading(true);
                    setMessage("正在同步圖片庫...");
                    setErrorMessage("");
                    void syncImages()
                      .then(() => {
                        setMessage("圖片庫已同步。");
                      })
                      .catch((error) => {
                        setErrorMessage(error instanceof Error ? error.message : "同步圖片庫失敗。");
                      })
                      .finally(() => {
                        setIsLoading(false);
                      });
                  }}
                >
                  重新同步
                </KioskButton>
                <KioskButton variant="ghost" disabled={isUploading} onClick={() => fileInputRef.current?.click()}>
                  新增圖片
                </KioskButton>
              </div>
            </div>
          </div>

          {viewModel.emptyState ? (
            <div className="mt-6 rounded-[28px] border border-dashed border-brand-200 bg-brand-50/65 p-8 text-center shadow-soft">
              <p className="text-2xl font-semibold text-brand-900">{viewModel.emptyState.title}</p>
              <p className="mt-3 text-sm leading-6 text-neutral-600">{viewModel.emptyState.description}</p>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-4 gap-4">
              {viewModel.library.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => setSelectedImageId(asset.id)}
                  className={[
                    "overflow-hidden rounded-[26px] border bg-white/96 text-left shadow-soft transition-all",
                    asset.isSelected
                      ? "border-brand-500 ring-2 ring-[rgba(78,121,55,0.16)]"
                      : "border-white/70 hover:border-brand-200"
                  ].join(" ")}
                >
                  <div className="relative h-36 bg-[linear-gradient(135deg,rgba(230,238,220,0.88),rgba(248,250,245,0.96))]">
                    {asset.previewUrl ? (
                      <img
                        src={asset.previewUrl}
                        alt={asset.title}
                        className="h-full w-full object-cover object-center"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-4xl text-brand-700">🖼️</div>
                    )}
                    <span className="absolute left-3 top-3 rounded-full bg-[rgba(15,44,26,0.84)] px-3 py-1 text-xs font-semibold tracking-[0.12em] text-white">
                      {asset.orderLabel}
                    </span>
                  </div>
                  <div className="space-y-3 p-4">
                    <div className="flex flex-wrap gap-2">
                      {asset.badges.map((badge) => (
                        <span
                          key={`${asset.id}-${badge}`}
                          className={[
                            "rounded-full px-3 py-1 text-xs font-semibold tracking-[0.08em]",
                            badge === "封面"
                              ? "bg-[rgba(224,161,42,0.18)] text-[#8d6420]"
                              : badge === "輪播中"
                                ? "bg-[rgba(78,121,55,0.14)] text-brand-900"
                                : "bg-[rgba(138,148,132,0.14)] text-neutral-600"
                          ].join(" ")}
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-neutral-800">{asset.title}</p>
                      <p className="mt-1 text-sm text-neutral-500">{asset.filename}</p>
                    </div>
                    <p className="text-sm leading-6 text-neutral-500">{asset.meta}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </PanelCard>

        <PanelCard title="圖片設定" subtitle="EDIT PANEL" className="col-span-4">
          {viewModel.selection ? (
            <div className="grid gap-5">
              <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white/96 shadow-soft">
                <div className="relative h-56 bg-[linear-gradient(135deg,rgba(230,238,220,0.88),rgba(248,250,245,0.96))]">
                  {viewModel.selection.previewUrl ? (
                    <img
                      src={viewModel.selection.previewUrl}
                      alt={viewModel.selection.title}
                      className="h-full w-full object-cover object-center"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-5xl text-brand-700">🖼️</div>
                  )}
                </div>
                <div className="space-y-2 p-4">
                  <p className="text-2xl font-semibold text-neutral-800">{viewModel.selection.title}</p>
                  <p className="text-sm text-neutral-500">{viewModel.selection.filenameLabel}</p>
                  <p className="text-sm leading-6 text-neutral-500">{viewModel.selection.meta}</p>
                </div>
              </div>

              <KioskInput
                label="標題 Title"
                disabled={isLoading || isDeleting}
                value={assets.find((asset) => asset.id === viewModel.selection?.id)?.title ?? ""}
                onChange={(event) =>
                  updateAssetField(viewModel.selection!.id, {
                    title: event.target.value
                  })
                }
              />

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-neutral-600">描述 Description</span>
                <textarea
                  className="min-h-[132px] rounded-[22px] border border-neutral-200 bg-white/92 px-4 py-4 text-base text-neutral-900 shadow-soft outline-none transition-colors placeholder:text-neutral-400 focus:border-brand-500"
                  disabled={isLoading || isDeleting}
                  value={assets.find((asset) => asset.id === viewModel.selection?.id)?.description ?? ""}
                  onChange={(event) =>
                    updateAssetField(viewModel.selection!.id, {
                      description: event.target.value
                    })
                  }
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <KioskInput
                  label="顯示時間 (秒)"
                  disabled={isLoading || isDeleting}
                  min="1"
                  type="number"
                  value={String(assets.find((asset) => asset.id === viewModel.selection?.id)?.displayDuration ?? 10)}
                  onChange={(event) =>
                    updateAssetField(viewModel.selection!.id, {
                      displayDuration: Number.parseInt(event.target.value, 10) || 1
                    })
                  }
                />
                <div className="rounded-[22px] border border-white/70 bg-white/92 p-4 shadow-soft">
                  <p className="text-sm font-medium text-neutral-600">目前設定</p>
                  <p className="mt-2 text-lg font-semibold text-brand-900">
                    {viewModel.selection.displayDurationLabel}
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    {viewModel.selection.isCover ? "目前為封面圖片" : "可切換為封面圖片"}
                  </p>
                </div>
              </div>

              <KioskButton
                variant="ghost"
                disabled={isLoading || isDeleting}
                className="justify-between"
                onClick={() =>
                  updateAssetField(viewModel.selection!.id, {
                    includedInSlideshow: !viewModel.selection!.includedInSlideshow
                  })
                }
              >
                <span>
                  {viewModel.selection.includedInSlideshow ? "已納入輪播" : "未納入輪播"}
                </span>
                <span>{viewModel.selection.includedInSlideshow ? "點擊停用" : "點擊加入"}</span>
              </KioskButton>

              <div className="grid gap-3">
                <KioskButton disabled={isLoading || isSaving || isDeleting} onClick={() => void handleSave()}>
                  {isSaving ? "儲存中..." : "儲存圖片設定"}
                </KioskButton>
                <KioskButton
                  variant="secondary"
                  disabled={isLoading || isSaving || isDeleting || viewModel.selection.isCover}
                  onClick={() => void handleSetCover()}
                >
                  {viewModel.selection.isCover ? "目前封面圖片" : "設為封面"}
                </KioskButton>
                <KioskButton
                  variant="ghost"
                  disabled={isLoading || isSaving || isDeleting}
                  onClick={() => void handleDelete()}
                >
                  {isDeleting ? "移除中..." : "移除圖片"}
                </KioskButton>
              </div>
            </div>
          ) : (
            <div className="rounded-[28px] border border-dashed border-brand-200 bg-brand-50/65 p-8 text-center shadow-soft">
              <p className="text-2xl font-semibold text-brand-900">尚未選取圖片</p>
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                從左側素材庫選擇一張圖片，即可調整標題、描述、輪播納入與封面設定。
              </p>
            </div>
          )}
        </PanelCard>
      </div>
    </PageScaffold>
  );
}
