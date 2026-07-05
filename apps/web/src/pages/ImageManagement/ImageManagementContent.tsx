import type {
  DisplayOpsAssetReferenceSummary,
  DisplayPageAssetHealthReport,
  ImageAsset
} from "@solar-display/shared";
import type { ChangeEvent, ReactNode, RefObject } from "react";
import { useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Switch, CustomSelect } from "../../components/management";
import { ImageManagementAssetHealthPanel } from "../../components/displayPageAssetHealthPanels";
import {
  formatAspectRatioChoice,
  formatAspectRatioLabel,
  parseAspectRatioChoice
} from "./aspectRatio";
import "./imageManagement.css";
import { buildImageManagementViewModel } from "./viewModel";
import type { ImageManagementResolvedPlaylistEntry } from "./viewModel";

type ImageStorageUsage = {
  fileCount: number;
  usedBytes: number;
  usedMB: number;
};

function badgeClass(badge: string) {
  if (badge === "封面") return "mgmt-chip is-cover";
  if (badge === "輪播中") return "mgmt-chip is-on";
  return "mgmt-chip";
}

function StepperButton({
  label,
  onClick,
  disabled,
  className
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  className?: string;
}) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startCounter = () => {
    if (disabled) return;
    onClick();
    timerRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        onClick();
      }, 100);
    }, 500);
  };

  const stopCounter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  return (
    <button
      type="button"
      className={className}
      disabled={disabled}
      onMouseDown={startCounter}
      onMouseUp={stopCounter}
      onMouseLeave={stopCounter}
      onTouchStart={startCounter}
      onTouchEnd={stopCounter}
    >
      {label}
    </button>
  );
}

type ImageManagementContentProps = {
  assetHealthErrorMessage: string;
  assetHealthReport: DisplayPageAssetHealthReport | null;
  assetReferences: DisplayOpsAssetReferenceSummary | null;
  assetReferencesErrorMessage: string;
  assets: ImageAsset[];
  deleteBlockMessage: string | null;
  deleteBlocked: boolean;
  errorMessage: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleDelete: () => Promise<void>;
  handleBootstrapPlaylistGovernance: () => Promise<void>;
  handleSave: () => Promise<void>;
  handleSetCover: () => Promise<void>;
  handleUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  isAssetHealthLoading: boolean;
  isAssetReferencesLoading: boolean;
  isBootstrappingPlaylist: boolean;
  isDeleting: boolean;
  isLoading: boolean;
  isSaving: boolean;
  isUpdatingPlaylistDurationAll: boolean;
  isUpdatingPlaylistSettings: boolean;
  isUploading: boolean;
  message: string;
  playlistBulkDurationSeconds: number | "";
  playlistShuffle: boolean;
  playlistEntries: Array<{
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
  }>;
  resolvedPlaylistEntries: ImageManagementResolvedPlaylistEntry[];
  remoteSyncBanner: ReactNode;
  resyncLibrary: () => Promise<void>;
  selectedImageId: number | null;
  selectedPlaylistEntryId: string | null;
  handleSelectImage: (value: number) => void;
  handleSelectPlaylistEntry: (entryId: string) => void;
  onApplyPlaylistBulkDuration: () => Promise<void>;
  onPlaylistBulkDurationChange: (value: number | "") => void;
  onTogglePlaylistShuffle: (nextShuffle: boolean) => Promise<void>;
  storageUsage: ImageStorageUsage;
  updateAssetField: (
    id: number,
    updates: Partial<{
      aspectRatio: number | null;
      description: string | null;
      title: string | null;
    }>
  ) => void;
  updatePlaylistEntryField: (
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
  ) => void;
  lastSyncedAssets?: ImageAsset[];
  lastSyncedPlaylistEntries?: Array<{
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
  }>;
};

export function ImageManagementContent({
  assetHealthErrorMessage,
  assetHealthReport,
  assetReferences,
  assetReferencesErrorMessage,
  assets,
  deleteBlockMessage,
  deleteBlocked,
  errorMessage,
  fileInputRef,
  handleDelete,
  handleBootstrapPlaylistGovernance,
  handleSave,
  handleSetCover,
  handleUpload,
  isAssetHealthLoading,
  isAssetReferencesLoading,
  isBootstrappingPlaylist,
  isDeleting,
  isLoading,
  isSaving,
  isUpdatingPlaylistDurationAll,
  isUpdatingPlaylistSettings,
  isUploading,
  message,
  playlistBulkDurationSeconds,
  playlistShuffle,
  playlistEntries,
  resolvedPlaylistEntries,
  remoteSyncBanner,
  resyncLibrary,
  selectedImageId,
  selectedPlaylistEntryId,
  handleSelectImage,
  handleSelectPlaylistEntry,
  onApplyPlaylistBulkDuration,
  onPlaylistBulkDurationChange,
  onTogglePlaylistShuffle,
  storageUsage,
  updateAssetField,
  updatePlaylistEntryField,
  lastSyncedAssets,
  lastSyncedPlaylistEntries
}: ImageManagementContentProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const isAssetDirty = (id: number) => {
    if (!lastSyncedAssets) return false;
    const current = assets.find((a) => a.id === id);
    const synced = lastSyncedAssets.find((a) => a.id === id);
    if (!current || !synced) return false;
    return (
      current.title !== synced.title ||
      current.description !== synced.description ||
      current.aspectRatio !== synced.aspectRatio
    );
  };

  const isPlaylistEntryDirty = (entryId: string) => {
    if (!lastSyncedPlaylistEntries) return false;
    const current = playlistEntries.find((e) => e.entryId === entryId);
    const synced = lastSyncedPlaylistEntries.find((e) => e.entryId === entryId);
    if (!current || !synced) return false;
    return (
      current.title !== synced.title ||
      current.description !== synced.description ||
      current.area !== synced.area ||
      current.capturedAt !== synced.capturedAt ||
      current.displayOrder !== synced.displayOrder ||
      current.durationSeconds !== synced.durationSeconds ||
      current.enabled !== synced.enabled ||
      current.fallbackMode !== synced.fallbackMode ||
      JSON.stringify(current.tags) !== JSON.stringify(synced.tags)
    );
  };

  const isAnyDirty = useMemo(() => {
    const assetsDirty = assets.some((a) => isAssetDirty(a.id));
    const playlistDirty = playlistEntries.some((e) => isPlaylistEntryDirty(e.entryId));
    return assetsDirty || playlistDirty;
  }, [assets, lastSyncedAssets, playlistEntries, lastSyncedPlaylistEntries]);

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        (asset.title && asset.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (asset.description && asset.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (asset.originalName && asset.originalName.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesStatus = true;
      if (statusFilter === "on-playlist") {
        matchesStatus = playlistEntries.some((e) => e.assetId === asset.id && e.enabled);
      } else if (statusFilter === "cover") {
        matchesStatus = !!asset.isCover;
      }

      return matchesSearch && matchesStatus;
    });
  }, [assets, searchQuery, statusFilter, playlistEntries]);

  const viewModel = useMemo(
    () =>
      buildImageManagementViewModel({
        assetReferences,
        assets: filteredAssets,
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
      }),
    [
      assetReferences,
      filteredAssets,
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
    ]
  );

  const statusVariant =
    viewModel.actionBanner.tone === "error"
      ? "is-error"
      : viewModel.actionBanner.tone === "uploading"
        ? "is-uploading"
        : viewModel.actionBanner.tone === "saving"
          ? "is-saving"
          : viewModel.actionBanner.tone === "deleting"
            ? "is-deleting"
            : "";
  const selectedAsset = assets.find((asset) => asset.id === viewModel.selection?.id);
  const aspectRatioChoice = selectedAsset ? formatAspectRatioChoice(selectedAsset.aspectRatio) : "auto";
  const playlistTagsValue = viewModel.selection?.playlistTags?.join(" / ") ?? "";

  const handleGridDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleGridDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && !isUploading) {
      const mockEvent = {
        target: {
          files: e.dataTransfer.files,
          value: ""
        }
      } as unknown as ChangeEvent<HTMLInputElement>;
      await handleUpload(mockEvent);
    }
  };

  return (
    <div className="image-mgmt-page">
      <input
        ref={fileInputRef}
        hidden
        accept=".jpg,.jpeg,.png,.webp"
        multiple
        type="file"
        onChange={(event) => void handleUpload(event)}
      />

      <section className="im-title mgmt-page-title">
        <h1 className="mgmt-page-title__heading">
          圖片<em>管理</em>
        </h1>
        <p className="mgmt-page-title__subtitle">Image Management</p>
      </section>

      <button type="button" className="mgmt-action im-resync" disabled={isLoading || isUploading} onClick={() => void resyncLibrary()}>
        重新同步
        <small>Resync</small>
      </button>
      <button type="button" className="mgmt-action primary im-upload-btn" disabled={isUploading} onClick={() => fileInputRef.current?.click()}>
        {isUploading ? "上傳中..." : "上傳圖片"}
        <small>Upload</small>
      </button>

      {remoteSyncBanner}

      <section className="settings-card mgmt-interactive-card im-card-full">
        <div className="settings-card__title">
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span>
              圖片管理與輪播治理
              <small>Image Management &amp; Playlist Governance · {viewModel.summary.totalImages} 張</small>
            </span>
            {viewModel.actionBanner.title && (
              <div 
                className={`mgmt-status im-status ${statusVariant}`} 
                role="status"
                style={{ 
                  margin: 0, 
                  padding: "4px 10px", 
                  borderRadius: "6px", 
                  fontSize: "12px",
                  lineHeight: "1.2",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <span>{viewModel.actionBanner.title}</span>
                {viewModel.actionBanner.detail && (
                  <span style={{ opacity: 0.8, fontSize: "11px" }}>
                    ({viewModel.actionBanner.detail})
                  </span>
                )}
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* 搜尋與篩選過濾列 */}
            <div className="im-filter-bar" style={{ margin: 0, gap: "8px" }}>
              <input
                type="text"
                className="im-filter-search"
                style={{ width: "220px", height: "34px", padding: "6px 12px" }}
                placeholder="搜尋圖片標題、描述、檔名..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select
                className="im-filter-select"
                style={{ width: "110px", height: "34px", padding: "6px 12px" }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">全部圖片</option>
                <option value="on-playlist">輪播中</option>
                <option value="cover">僅封面</option>
              </select>
            </div>

            <Link className="im-title-handoff-link" to="/display-pages/editor?workspace=assets">
              前往編輯器 <small>Asset Workspace →</small>
            </Link>
          </div>
        </div>

        <div className="im-main-content">
          <div className="im-grid-wrap" onDragOver={handleGridDragOver} onDrop={handleGridDrop}>
            {viewModel.emptyState ? (
              <div className="im-empty">
                <strong>{viewModel.emptyState.title}</strong>
                <br />
                <span style={{ fontSize: 13, marginTop: 6, display: "inline-block" }}>{viewModel.emptyState.description}</span>
              </div>
            ) : (
              <div className="im-grid">
                {viewModel.library.map((asset) => (
                  <button key={asset.id} type="button" onClick={() => handleSelectImage(asset.id)} className={`im-thumb ${asset.isSelected && selectedImageId !== null ? "is-selected" : ""}`}>
                    {isAssetDirty(asset.id) && <div className="im-thumb__draft-dot" title="有未儲存的草稿變更" />}
                    <div className="im-thumb__media">
                      {asset.previewUrl ? <img src={asset.previewUrl} alt={asset.title} /> : <div className="im-thumb__placeholder">無預覽</div>}
                      <span className="im-thumb__order">{asset.orderLabel}</span>
                    </div>
                    <div className="im-thumb__body">
                      <div className="im-thumb__chips">
                        {asset.badges.map((badge) => <span key={`${asset.id}-${badge}`} className={badgeClass(badge)}>{badge}</span>)}
                      </div>
                      <p className="im-thumb__title">{asset.title}</p>
                    </div>
                  </button>
                ))}

                {/* 網格末端拖放卡片 */}
                <button
                  type="button"
                  className="im-thumb is-upload-placeholder"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="im-upload-placeholder__icon">＋</span>
                  <span className="im-upload-placeholder__text">上傳新圖片</span>
                  <span className="im-upload-placeholder__subtext">拖曳檔案至此或點擊</span>
                </button>
              </div>
            )}
          </div>

          <div className="im-sidebar">
            {selectedImageId !== null && viewModel.selection && selectedAsset ? (
              <>
                <div className="im-sidebar-scroll">
                  <div className="im-sidebar-back">
                    <button type="button" className="im-back-btn" onClick={() => handleSelectImage(null as any)}>
                      ← 返回全域治理
                    </button>
                  </div>

                  <div className="im-preview">
                    <div className="im-preview__media">
                      <div className="im-preview__media-container">
                        {viewModel.selection.previewUrl ? (
                          <>
                            <img src={viewModel.selection.previewUrl} alt={viewModel.selection.title} />
                            <div 
                              className="im-preview__focal-marker"
                              style={{ 
                                left: "50%", 
                                top: "50%" 
                              }}
                              title="預設裁剪焦點"
                            >
                              <div className="im-preview__focal-marker-circle" />
                            </div>
                          </>
                        ) : (
                          <div className="im-thumb__placeholder">無預覽</div>
                        )}
                      </div>
                    </div>
                    <div className="im-preview__body">
                      <div className="im-thumb__chips" style={{ marginBottom: 6 }}>
                        {viewModel.selection.badges.map((badge) => <span key={`sel-${badge}`} className={badgeClass(badge)}>{badge}</span>)}
                      </div>
                      <p className="im-preview__title">{viewModel.selection.title}</p>
                      <p className="im-preview__meta">{viewModel.selection.filenameLabel}</p>
                      <p className="im-preview__meta">{viewModel.selection.meta}</p>
                    </div>
                  </div>

                  <div className="im-form-row">
                    <label>標題 <small>Title</small><span className="im-char-count">{(selectedAsset.title ?? "").length}/50</span></label>
                    <input className="im-input" disabled={isLoading || isDeleting} maxLength={50} value={selectedAsset.title ?? ""} onChange={(event) => updateAssetField(viewModel.selection!.id, { title: event.target.value })} />
                  </div>

                  <div className="im-form-row">
                    <label>描述 <small>Description</small><span className="im-char-count">{(selectedAsset.description ?? "").length}/100</span></label>
                    <textarea className="im-textarea" disabled={isLoading || isDeleting} maxLength={100} value={selectedAsset.description ?? ""} onChange={(event) => updateAssetField(viewModel.selection!.id, { description: event.target.value })} />
                  </div>

                  <div className="im-section-label">
                    播放設定
                    <small>Playlist Runtime</small>
                  </div>

                  {viewModel.selection.playlistEntryRows.length > 0 ? (
                    <div className="im-playlist-rows">
                      <div className="im-playlist-rows__title">
                        對應治理列
                        <small>Playlist Rows</small>
                      </div>
                      <div className="im-playlist-rows__list">
                        {viewModel.selection.playlistEntryRows.map((row) => {
                          const isRowEnabled = playlistEntries.find((e) => e.entryId === row.entryId)?.enabled ?? false;
                          return (
                            <button
                              key={row.entryId}
                              type="button"
                              className={`im-playlist-row${row.isSelected ? " is-selected" : ""}`}
                              onClick={() => handleSelectPlaylistEntry(row.entryId)}
                            >
                              <div className="im-playlist-row-header">
                                <strong>{row.entryId} · {row.title}</strong>
                                <div onClick={(e) => e.stopPropagation()}>
                                  <Switch
                                    ariaLabel="啟用播放"
                                    on={isRowEnabled}
                                    disabled={isLoading || isDeleting}
                                    onChange={(next) => updatePlaylistEntryField(row.entryId, { enabled: next })}
                                  />
                                </div>
                              </div>
                              <small>{row.area} · #{row.displayOrder} · {row.durationSeconds} 秒 · {row.fallbackMode}</small>
                              <span>{row.runtimeLabel}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  <div className="mgmt-status">
                    {viewModel.selection.playlistRuntimeStatus}
                  </div>

                  {viewModel.selection.playlistEntryId ? (
                    <>
                      <div className="im-form-row">
                        <label>播放標題 <small>Playlist Title</small></label>
                        <input className="im-input" disabled={isLoading || isDeleting} maxLength={50} value={viewModel.selection.playlistTitle ?? ""} onChange={(event) => updatePlaylistEntryField(viewModel.selection!.playlistEntryId!, { title: event.target.value })} />
                      </div>

                      <div className="im-form-row">
                        <label>播放描述 <small>Playlist Description</small></label>
                        <textarea className="im-textarea" disabled={isLoading || isDeleting} maxLength={100} value={viewModel.selection.playlistDescription ?? ""} onChange={(event) => updatePlaylistEntryField(viewModel.selection!.playlistEntryId!, { description: event.target.value })} />
                      </div>

                      <div className="im-form-row">
                        <label>顯示區域 <small>Area</small></label>
                        <input className="im-input" disabled={isLoading || isDeleting} maxLength={40} value={viewModel.selection.playlistArea ?? ""} onChange={(event) => updatePlaylistEntryField(viewModel.selection!.playlistEntryId!, { area: event.target.value })} />
                      </div>

                      <div className="im-form-row">
                        <label>拍攝時間 <small>Captured At</small></label>
                        <input className="im-input" disabled={isLoading || isDeleting} maxLength={40} value={viewModel.selection.playlistCapturedAt ?? ""} onChange={(event) => updatePlaylistEntryField(viewModel.selection!.playlistEntryId!, { capturedAt: event.target.value })} />
                      </div>

                      <div className="im-form-row">
                        <label>標籤 <small>Tags</small></label>
                        <input className="im-input" disabled={isLoading || isDeleting} maxLength={80} value={playlistTagsValue} onChange={(event) => updatePlaylistEntryField(viewModel.selection!.playlistEntryId!, {
                          tags: event.target.value
                            .split("/")
                            .map((tag) => tag.trim())
                            .filter((tag) => tag.length > 0)
                        })} />
                      </div>

                      <div className="im-form-row">
                        <label>播放順序 <small>Display Order</small></label>
                        <div className="im-stepper">
                          <StepperButton label="−" className="im-stepper__btn" disabled={isLoading || isDeleting || (viewModel.selection.playlistDisplayOrder ?? 1) <= 1} onClick={() => updatePlaylistEntryField(viewModel.selection!.playlistEntryId!, { displayOrder: Math.max(1, (viewModel.selection!.playlistDisplayOrder ?? 1) - 1) })} />
                          <span className="im-stepper__value">{viewModel.selection.playlistDisplayOrder ?? 1}</span>
                          <span className="im-stepper__unit">位</span>
                          <StepperButton label="+" className="im-stepper__btn" disabled={isLoading || isDeleting} onClick={() => updatePlaylistEntryField(viewModel.selection!.playlistEntryId!, { displayOrder: (viewModel.selection!.playlistDisplayOrder ?? 1) + 1 })} />
                        </div>
                      </div>

                      <div className="im-form-row">
                        <label>播放時間 <small>Duration</small></label>
                        <div className="im-stepper">
                          <StepperButton label="−" className="im-stepper__btn" disabled={isLoading || isDeleting || (viewModel.selection.playlistDurationSeconds ?? 1) <= 1} onClick={() => updatePlaylistEntryField(viewModel.selection!.playlistEntryId!, { durationSeconds: Math.max(1, (viewModel.selection!.playlistDurationSeconds ?? 1) - 1) })} />
                          <span className="im-stepper__value">{viewModel.selection.playlistDurationSeconds ?? 10}</span>
                          <span className="im-stepper__unit">秒</span>
                          <StepperButton label="+" className="im-stepper__btn" disabled={isLoading || isDeleting} onClick={() => updatePlaylistEntryField(viewModel.selection!.playlistEntryId!, { durationSeconds: (viewModel.selection!.playlistDurationSeconds ?? 10) + 1 })} />
                        </div>
                      </div>

                      <div className="im-form-row">
                        <label>Fallback 模式 <small>Fallback Mode</small></label>
                        <CustomSelect
                          value={viewModel.selection.playlistFallbackMode ?? "display-placeholder"}
                          disabled={isLoading || isDeleting}
                          onChange={(value) => updatePlaylistEntryField(viewModel.selection!.playlistEntryId!, {
                            fallbackMode: value as "display-placeholder" | "skip" | "use-cover"
                          })}
                          options={[
                            { label: "display-placeholder", value: "display-placeholder" },
                            { label: "skip", value: "skip" },
                            { label: "use-cover", value: "use-cover" }
                          ]}
                        />
                      </div>

                      <div className="im-toggle">
                        <div className="im-toggle__label">
                          啟用播放
                          <small>{viewModel.selection.playlistEnabled ? "目前正在 playlist runtime 中啟用" : "目前未在 playlist runtime 中啟用"}</small>
                        </div>
                        <Switch ariaLabel="啟用播放" on={viewModel.selection.playlistEnabled ?? false} disabled={isLoading || isDeleting} onChange={(next) => updatePlaylistEntryField(viewModel.selection!.playlistEntryId!, { enabled: next })} />
                      </div>
                    </>
                  ) : (
                    <div className="mgmt-status">
                      此素材目前沒有對應的 playlist entry，暫時只能調整素材庫欄位。
                      <div style={{ marginTop: 10 }}>
                        <button
                          type="button"
                          className="im-btn"
                          disabled={isLoading || isDeleting || isSaving || isBootstrappingPlaylist}
                          onClick={() => void handleBootstrapPlaylistGovernance()}
                        >
                          {isBootstrappingPlaylist ? "建立中..." : "建立 Playlist Governance Rows"}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="im-form-row">
                    <label>裁切/焦點 <small>Crop / Focus</small></label>
                    <Link
                      className="im-crop-link"
                      to={`/display-pages/editor?workspace=assets&intent=focal-point&selectedAsset=${viewModel.selection.id}`}
                    >
                      ✂ 調整焦點 Adjust Focus
                      <small>帶著 {viewModel.selection.title} 前往 editor authoring workflow</small>
                    </Link>
                  </div>

                  <div className="im-form-row">
                    <label>長寬比 <small>Aspect Ratio</small></label>
                    <CustomSelect
                      value={aspectRatioChoice}
                      disabled={isLoading || isDeleting}
                      onChange={(value) => updateAssetField(viewModel.selection!.id, { aspectRatio: parseAspectRatioChoice(value, selectedAsset.aspectRatio) })}
                      options={[
                        { label: "原始比例 Auto", value: "auto" },
                        { label: "16:9 (建議)", value: "16:9" },
                        { label: "4:3", value: "4:3" },
                        { label: "1:1", value: "1:1" },
                        ...(aspectRatioChoice === "custom" ? [{ label: `自訂比例 ${formatAspectRatioLabel(selectedAsset.aspectRatio)}`, value: "custom" }] : [])
                      ]}
                    />
                  </div>

                  <div className="im-form-row">
                    <label>展示引用 <small>Display References</small></label>
                    {isAssetReferencesLoading ? (
                      <div className="mgmt-status">正在載入素材引用...</div>
                    ) : assetReferencesErrorMessage ? (
                      <div className="mgmt-status is-error">{assetReferencesErrorMessage}</div>
                    ) : viewModel.selection.referenceTriageGroups.length > 0 ? (
                      <div className="im-triage">
                        <div className="im-triage__legend">
                          Live Runtime / Draft Configuration / Slideshow Governance
                        </div>
                        {viewModel.selection.referenceTriageGroups.map((group) => (
                          <section key={group.title} className="im-triage__group">
                            <div className="im-triage__title">
                              {group.title}
                              <small>{group.summary}</small>
                            </div>
                            {group.items.map((item) => (
                              <div key={item.key} className="im-triage__item">
                                <strong>{item.targetLabel}</strong>
                                <small>{item.message}</small>
                              </div>
                            ))}
                          </section>
                        ))}
                      </div>
                    ) : (
                      <div className="mgmt-status">目前沒有 display-page 或 slideshow 引用。</div>
                    )}
                  </div>

                  {deleteBlocked ? (
                    <div className="im-triage">
                      <section className="im-triage__group is-blocking">
                        <div className="im-triage__title">
                          Delete Blockers
                          <small>{deleteBlockMessage ?? "請先解除 live 或 slideshow 引用後再刪除。"}</small>
                        </div>
                        {viewModel.selection.deleteBlockers.map((blocker) => (
                          <div key={blocker.message} className={`im-triage__item${blocker.severity === "blocking" ? " is-blocking" : ""}`}>
                            <strong>{blocker.severity === "blocking" ? "Blocking" : "Warning"}</strong>
                            <small>{blocker.message}</small>
                          </div>
                        ))}
                      </section>
                    </div>
                  ) : null}
                </div>

                <div className="im-sidebar-actions">
                  <button type="button" className={`im-btn primary${isAnyDirty ? " glow-save-active" : ""}`} disabled={isLoading || isSaving || isDeleting} onClick={() => void handleSave()}>{isSaving ? "儲存中..." : "儲存"}</button>
                  <button type="button" className="im-btn" disabled={isLoading || isSaving || isDeleting || viewModel.selection.isCover} onClick={() => void handleSetCover()}>{viewModel.selection.isCover ? "目前封面" : "設為封面"}</button>
                  <button type="button" className="im-btn danger" disabled={isLoading || isSaving || isDeleting || deleteBlocked} onClick={() => void handleDelete()}>{deleteBlocked ? "先解除引用" : isDeleting ? "移除中..." : "移除"}</button>
                </div>
              </>
            ) : (
              <div className="im-sidebar-scroll">
                <div className="im-sidebar-header">
                  <span className="im-sidebar-title">播放與存儲統計</span>
                  <span className="im-sidebar-tag">全域設定</span>
                </div>

                <div className="im-stats mgmt-stat-strip" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '0 0 16px 0' }}>
                  <div className="mgmt-stat">
                    <span className="mgmt-stat__label">總圖片數 <small>Total</small></span>
                    <span className="mgmt-stat__value" style={{ fontSize: '20px' }}>{viewModel.summary.totalImages}</span>
                  </div>
                  <div className="mgmt-stat">
                    <span className="mgmt-stat__label">輪播張數 <small>Slideshow</small></span>
                    <span className="mgmt-stat__value" style={{ fontSize: '20px' }}>{viewModel.summary.slideshowCount}</span>
                  </div>
                  <div className="mgmt-stat">
                    <span className="mgmt-stat__label">已用空間 <small>Used Space</small></span>
                    <span className={`mgmt-stat__value ${viewModel.summary.usagePercent >= 80 ? "is-warning" : ""}`} style={{ fontSize: '20px' }}>{viewModel.summary.usagePercent}%</span>
                  </div>
                  <div className="mgmt-stat">
                    <span className="mgmt-stat__label">封面圖片 <small>Cover</small></span>
                    <span className="mgmt-stat__value" style={{ fontSize: '13px', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{viewModel.summary.coverLabel}</span>
                  </div>
                </div>

                <div className="im-section-label" style={{ marginTop: 0, paddingTop: 0, border: 'none' }}>
                  播放模式與全域時間
                  <small>Shuffle &amp; Duration</small>
                </div>

                <div className="im-toggle" style={{ margin: '8px 0 12px 0' }}>
                  <div className="im-toggle__label">
                    隨機播放
                    <small>{playlistShuffle ? "隨機順序播放" : "依順序播放"}</small>
                  </div>
                  <Switch
                    ariaLabel="隨機播放"
                    disabled={isLoading || isUpdatingPlaylistSettings}
                    on={playlistShuffle}
                    onChange={(next) => void onTogglePlaylistShuffle(next)}
                  />
                </div>

                <div className="im-duration-bulk" style={{ margin: '0 0 16px 0' }}>
                  <div className="im-duration-bulk__label">
                    全部播放時間
                    <small>Set All Duration</small>
                  </div>
                  <div className="im-inline-apply">
                    <input
                      className="im-input"
                      disabled={isLoading || isUpdatingPlaylistDurationAll}
                      min={1}
                      type="number"
                      value={playlistBulkDurationSeconds}
                      onChange={(event) => onPlaylistBulkDurationChange(
                        event.target.value === "" ? "" : Number(event.target.value)
                      )}
                    />
                    <button
                      type="button"
                      className="im-btn"
                      disabled={
                        isLoading
                        || isUpdatingPlaylistDurationAll
                        || playlistBulkDurationSeconds === ""
                        || playlistEntries.length === 0
                      }
                      onClick={() => void onApplyPlaylistBulkDuration()}
                    >
                      {isUpdatingPlaylistDurationAll ? "套用中..." : "套用"}
                    </button>
                  </div>
                </div>

                <div className="im-section-label">
                  素材健康度報告
                  <small>Health Monitor</small>
                </div>
                <ImageManagementAssetHealthPanel
                  errorMessage={assetHealthErrorMessage}
                  isLoading={isAssetHealthLoading}
                  report={assetHealthReport}
                />
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
