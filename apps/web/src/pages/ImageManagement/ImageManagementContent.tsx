import type {
  DisplayOpsAssetReferenceSummary,
  DisplayPageAssetHealthReport,
  ImageAsset
} from "@solar-display/shared";
import type { ChangeEvent, RefObject } from "react";
import { Switch } from "../../components/management";
import { ImageManagementAssetHealthPanel } from "../../components/displayPageAssetHealthPanels";
import {
  formatAspectRatioChoice,
  formatAspectRatioLabel,
  parseAspectRatioChoice
} from "./aspectRatio";
import "./imageManagement.css";
import { buildImageManagementViewModel } from "./viewModel";

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

type ImageManagementContentProps = {
  assetHealthErrorMessage: string;
  assetHealthReport: DisplayPageAssetHealthReport | null;
  assetReferences: DisplayOpsAssetReferenceSummary | null;
  assetReferencesErrorMessage: string;
  assets: ImageAsset[];
  deleteBlocked: boolean;
  errorMessage: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleDelete: () => Promise<void>;
  handleSave: () => Promise<void>;
  handleSetCover: () => Promise<void>;
  handleUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  isAssetHealthLoading: boolean;
  isAssetReferencesLoading: boolean;
  isDeleting: boolean;
  isLoading: boolean;
  isSaving: boolean;
  isUploading: boolean;
  message: string;
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
  resyncLibrary: () => Promise<void>;
  selectedImageId: number | null;
  setSelectedImageId: (value: number) => void;
  storageUsage: ImageStorageUsage;
  updateAssetField: (
    id: number,
    updates: Partial<{
      aspectRatio: number | null;
      description: string | null;
      displayDuration: number;
      includedInSlideshow: boolean;
      title: string | null;
    }>
  ) => void;
};

export function ImageManagementContent({
  assetHealthErrorMessage,
  assetHealthReport,
  assetReferences,
  assetReferencesErrorMessage,
  assets,
  deleteBlocked,
  errorMessage,
  fileInputRef,
  handleDelete,
  handleSave,
  handleSetCover,
  handleUpload,
  isAssetHealthLoading,
  isAssetReferencesLoading,
  isDeleting,
  isLoading,
  isSaving,
  isUploading,
  message,
  playlistEntries,
  resyncLibrary,
  selectedImageId,
  setSelectedImageId,
  storageUsage,
  updateAssetField
}: ImageManagementContentProps) {
  const viewModel = buildImageManagementViewModel({
    assets,
    errorMessage,
    isDeleting,
    isSaving,
    isUploading,
    message,
    selectedImageId,
    storageUsage,
    playlistEntries
  });
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

      <section className="im-title">
        <h1>
          圖片<em>管理</em>
        </h1>
        <p>Image Management</p>
      </section>

      <button type="button" className="mgmt-action im-resync" disabled={isLoading || isUploading} onClick={() => void resyncLibrary()}>
        重新同步
        <small>Resync</small>
      </button>
      <button type="button" className="mgmt-action primary im-upload-btn" disabled={isUploading} onClick={() => fileInputRef.current?.click()}>
        {isUploading ? "上傳中..." : "上傳圖片"}
        <small>Upload</small>
      </button>

      <div className={`mgmt-status im-status ${statusVariant}`} role="status">
        {viewModel.actionBanner.title}
        {viewModel.actionBanner.detail ? (
          <>
            <br />
            <span style={{ opacity: 0.75 }}>{viewModel.actionBanner.detail}</span>
          </>
        ) : null}
      </div>

      <section className="settings-card im-card-library">
        <div className="settings-card__title">
          素材庫
          <small>Asset Library · {viewModel.summary.totalImages} 張</small>
        </div>

        <div className="im-stats">
          <div className="im-stat">
            <span className="im-stat__label">總圖片數<small>Total</small></span>
            <span className="im-stat__value">{viewModel.summary.totalImages}</span>
            <span className="im-stat__hint">已上傳檔案</span>
          </div>
          <div className="im-stat">
            <span className="im-stat__label">輪播張數<small>Slideshow</small></span>
            <span className="im-stat__value">{viewModel.summary.slideshowCount}</span>
            <span className="im-stat__hint">已納入展示</span>
          </div>
          <div className="im-stat">
            <span className="im-stat__label">已用空間<small>Used Space</small></span>
            <span className={`im-stat__value ${viewModel.summary.usagePercent >= 80 ? "is-warning" : ""}`}>{viewModel.summary.usagePercent}%</span>
            <span className="im-stat__hint">{viewModel.summary.usedSpaceLabel}</span>
          </div>
          <div className="im-stat">
            <span className="im-stat__label">封面圖片<small>Cover</small></span>
            <span className="im-stat__value" style={{ fontSize: 16, lineHeight: 1.2 }}>{viewModel.summary.coverLabel}</span>
            <span className="im-stat__hint">首頁焦點素材</span>
          </div>
        </div>

        <ImageManagementAssetHealthPanel
          errorMessage={assetHealthErrorMessage}
          isLoading={isAssetHealthLoading}
          report={assetHealthReport}
        />

        <div className="im-uploader" role="button" tabIndex={0} onClick={() => fileInputRef.current?.click()} onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}>
          <span className="im-uploader__icon">＋</span>
          <div className="im-uploader__copy">
            <strong>{isUploading ? "正在上傳圖片..." : "拖曳或點擊上傳展示圖片"}</strong>
            <small>支援 JPG / PNG / WEBP，單檔上限 10 MB，可多選依序上傳</small>
          </div>
        </div>

        <div className="im-grid-wrap">
          {viewModel.emptyState ? (
            <div className="im-empty">
              <strong>{viewModel.emptyState.title}</strong>
              <br />
              <span style={{ fontSize: 13, marginTop: 6, display: "inline-block" }}>{viewModel.emptyState.description}</span>
            </div>
          ) : (
            <div className="im-grid">
              {viewModel.library.map((asset) => (
                <button key={asset.id} type="button" onClick={() => setSelectedImageId(asset.id)} className={`im-thumb ${asset.isSelected ? "is-selected" : ""}`}>
                  <div className="im-thumb__media">
                    {asset.previewUrl ? <img src={asset.previewUrl} alt={asset.title} /> : <div className="im-thumb__placeholder">無預覽</div>}
                    <span className="im-thumb__order">{asset.orderLabel}</span>
                  </div>
                  <div className="im-thumb__body">
                    <div className="im-thumb__chips">
                      {asset.badges.map((badge) => <span key={`${asset.id}-${badge}`} className={badgeClass(badge)}>{badge}</span>)}
                    </div>
                    <p className="im-thumb__title">{asset.title}</p>
                    <p className="im-thumb__filename">{asset.filename}</p>
                    <p className="im-thumb__meta">{asset.meta}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="settings-card im-card-editor">
        <div className="settings-card__title">圖片設定<small>Edit Panel</small></div>
        {viewModel.selection && selectedAsset ? (
          <>
            <div className="im-editor-body">
              <div className="im-preview">
                <div className="im-preview__media">
                  {viewModel.selection.previewUrl ? <img src={viewModel.selection.previewUrl} alt={viewModel.selection.title} /> : <div className="im-thumb__placeholder">無預覽</div>}
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

              <div className="im-form-row">
                <label>顯示時間 <small>Duration</small></label>
                <div className="im-stepper">
                  <button type="button" className="im-stepper__btn" disabled={isLoading || isDeleting || selectedAsset.displayDuration <= 1} onClick={() => updateAssetField(viewModel.selection!.id, { displayDuration: Math.max(1, selectedAsset.displayDuration - 1) })}>−</button>
                  <span className="im-stepper__value">{selectedAsset.displayDuration}</span>
                  <span className="im-stepper__unit">秒</span>
                  <button type="button" className="im-stepper__btn" disabled={isLoading || isDeleting} onClick={() => updateAssetField(viewModel.selection!.id, { displayDuration: selectedAsset.displayDuration + 1 })}>+</button>
                </div>
              </div>

              <div className="im-form-row">
                <label>裁切/焦點 <small>Crop / Focus</small></label>
                <button type="button" className="im-crop-btn" disabled>✂ 調整焦點 Adjust Focus</button>
              </div>

              <div className="im-form-row">
                <label>長寬比 <small>Aspect Ratio</small></label>
                <select className="im-select" value={aspectRatioChoice} disabled={isLoading || isDeleting} onChange={(event) => updateAssetField(viewModel.selection!.id, { aspectRatio: parseAspectRatioChoice(event.target.value, selectedAsset.aspectRatio) })}>
                  <option value="auto">原始比例 Auto</option>
                  <option value="16:9">16:9 (建議)</option>
                  <option value="4:3">4:3</option>
                  <option value="1:1">1:1</option>
                  {aspectRatioChoice === "custom" ? <option value="custom">自訂比例 {formatAspectRatioLabel(selectedAsset.aspectRatio)}</option> : null}
                </select>
              </div>

              <div className="im-toggle">
                <div className="im-toggle__label">
                  納入輪播
                  <small>{viewModel.selection.includedInSlideshow ? "目前已加入展示輪播" : "目前未在輪播清單"}</small>
                </div>
                <Switch ariaLabel="納入輪播" on={viewModel.selection.includedInSlideshow} disabled={isLoading || isDeleting} onChange={(next) => updateAssetField(viewModel.selection!.id, { includedInSlideshow: next })} />
              </div>

              <div className="im-form-row">
                <label>展示引用 <small>Display References</small></label>
                {isAssetReferencesLoading ? (
                  <div className="mgmt-status">正在載入素材引用...</div>
                ) : assetReferencesErrorMessage ? (
                  <div className="mgmt-status is-error">{assetReferencesErrorMessage}</div>
                ) : assetReferences && assetReferences.references.length > 0 ? (
                  <div className="mgmt-status">
                    {assetReferences.references.map((reference) => (
                      <div key={`${reference.kind}-${reference.targetLabel}-${reference.stage}`} style={{ marginTop: 6 }}>
                        {reference.kind} · {reference.stage} · {reference.targetLabel}
                        <small style={{ display: "block", opacity: 0.72 }}>{reference.message}</small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mgmt-status">目前沒有 display-page 或 slideshow 引用。</div>
                )}
              </div>

              {deleteBlocked ? (
                <div className="mgmt-status is-error">
                  這張圖片仍被 live display surface 引用，請先解除引用後再移除。
                </div>
              ) : null}
            </div>

            <div className="im-editor-actions">
              <button type="button" className="im-btn primary" disabled={isLoading || isSaving || isDeleting} onClick={() => void handleSave()}>{isSaving ? "儲存中..." : "儲存"}</button>
              <button type="button" className="im-btn" disabled={isLoading || isSaving || isDeleting || viewModel.selection.isCover} onClick={() => void handleSetCover()}>{viewModel.selection.isCover ? "目前封面" : "設為封面"}</button>
              <button type="button" className="im-btn danger" disabled={isLoading || isSaving || isDeleting || deleteBlocked} onClick={() => void handleDelete()}>{deleteBlocked ? "先解除引用" : isDeleting ? "移除中..." : "移除"}</button>
            </div>
          </>
        ) : (
          <div className="im-empty">
            <strong>尚未選取圖片</strong>
            <br />
            <span style={{ fontSize: 13, marginTop: 6, display: "inline-block" }}>從左側素材庫選擇一張圖片，即可調整標題、描述、輪播納入與封面設定。</span>
          </div>
        )}
      </section>
    </div>
  );
}
