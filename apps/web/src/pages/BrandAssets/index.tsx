import type { BrandProfile } from "@solar-display/shared";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useBlocker } from "react-router-dom";
import { PageContainer } from "../../components/PageContainer";
import { RemoteSyncBanner } from "../../components/management/RemoteSyncBanner";
import {
  useDisplaySyncDraftGuard
} from "../../hooks/displaySyncDraftGuard";
import {
  brandLogoUrl,
  activateBrandProfile,
  createBrandProfile,
  deleteBrandLogo,
  deleteBrandProfile,
  getBrandProfiles,
  updateBrandProfile,
  uploadBrandLogo,
  type BrandProfileUpdate
} from "../../services/api";
import { notifyBrandChanged } from "../../hooks/useBrandAssets";
import { useDisplaySyncRefresh } from "../../hooks/useDisplaySyncRefresh";
import { BRAND_ASSETS_DISPLAY_SYNC_SCOPES } from "../managementDisplaySyncScopes";
import { CropDialog } from "./CropDialog";
import {
  fieldsEqual,
  pickFields,
  readCachedBrandProfiles,
  rememberBrandProfiles,
  resolveBrandAssetsRefreshModel,
  resolveInitialBrandAssetsModel,
  type DraftFields
} from "./loadModel";
import "./brandAssets.css";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_BYTES = 2 * 1024 * 1024;
const ASPECT_TOLERANCE = 0.12;

type Feedback = { tone: "ok" | "error"; message: string } | null;

type PendingAction =
  | {
      confirmLabel: string;
      description: string;
      kind: "delete-profile" | "remove-logo";
      title: string;
    }
  | null;

const FIELD_LABELS: Record<keyof DraftFields, string> = {
  name: "品牌設定名稱",
  brandNameZh: "品牌中文名",
  brandNameEn: "品牌英文名",
  productTitleZh: "產品中文標題",
  productTitleEn: "產品英文標題",
  sloganZh: "標語（中文）",
  sloganEn: "標語（英文）"
};

function formatBytes(value: number | null): string {
  if (!value || value <= 0) return "—";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function formatRatio(width: number | null, height: number | null): string {
  if (!width || !height) return "—";
  return `${(width / height).toFixed(2)} : 1`;
}

function aspectWarning(width: number | null, height: number | null): string | null {
  if (!width || !height) return null;
  const ratio = width / height;
  if (Math.abs(ratio - 1) > ASPECT_TOLERANCE) {
    return `Logo 非 1:1 比例（${ratio.toFixed(2)}:1），在 Header 顯示可能變形。建議使用裁切功能或重新上傳。`;
  }
  return null;
}

export function BrandAssets() {
  const initialModel = useMemo(
    () => resolveInitialBrandAssetsModel(readCachedBrandProfiles()),
    []
  );
  const [profiles, setProfiles] = useState<BrandProfile[]>(initialModel.profiles);
  const [selectedId, setSelectedId] = useState<number | null>(initialModel.selectedId);
  const [draft, setDraft] = useState<DraftFields | null>(initialModel.draft);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmingAction, setIsConfirmingAction] = useState(false);
  const [pendingCropSrc, setPendingCropSrc] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => profiles.find((profile) => profile.id === selectedId) ?? null,
    [profiles, selectedId]
  );

  const dirty = useMemo(() => {
    if (!selected || !draft) return false;
    return !fieldsEqual(draft, pickFields(selected));
  }, [draft, selected]);
  const selectedIdRef = useRef(selectedId);
  const draftRef = useRef(draft);
  const dirtyRef = useRef(dirty);
  const pendingActionRef = useRef(pendingAction);

  selectedIdRef.current = selectedId;
  draftRef.current = draft;
  dirtyRef.current = dirty;
  pendingActionRef.current = pendingAction;

  const blocker = useBlocker(dirty);
  useEffect(() => {
    if (blocker.state === "blocked") {
      const ok = window.confirm("尚有未儲存的變更，確定離開嗎？");
      if (ok) blocker.proceed();
      else blocker.reset();
    }
  }, [blocker]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const syncProfiles = useCallback(async (
    preferredId?: number,
    options: { preserveLocalState?: boolean } = {}
  ) => {
    const list = await getBrandProfiles();
    rememberBrandProfiles(list);
    const preserveLocalState = options.preserveLocalState ?? true;
    const model = resolveBrandAssetsRefreshModel({
      currentDraft: draftRef.current,
      currentSelectedId: selectedIdRef.current,
      dirty: preserveLocalState ? dirtyRef.current : false,
      pendingAction: preserveLocalState ? pendingActionRef.current !== null : false,
      preferredId,
      profiles: list
    });

    setProfiles(model.profiles);
    setSelectedId(model.selectedId);
    setDraft(model.draft);
    return model.selected;
  }, []);

  const resyncBrandProfiles = useCallback(async (preferredId?: number) => {
    try {
      await syncProfiles(preferredId, { preserveLocalState: false });
      setFeedback({ tone: "ok", message: "品牌設定已同步。" });
    } catch (error) {
      const nextError = error instanceof Error ? error : new Error("重新同步品牌設定失敗");
      setFeedback({
        tone: "error",
        message: nextError.message
      });
      throw nextError;
    }
  }, [syncProfiles]);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        await syncProfiles(undefined, { preserveLocalState: true });
      } catch (error) {
        if (!active) {
          return;
        }

        setFeedback({
          tone: "error",
          message: error instanceof Error ? error.message : "載入品牌設定失敗"
        });
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, [syncProfiles]);

  const confirmDiscardDirty = useCallback(() => {
    if (!dirty) return true;
    return window.confirm("尚有未儲存的變更，繼續會丟棄目前修改，確定要繼續嗎？");
  }, [dirty]);

  const syncDraftGuard = useDisplaySyncDraftGuard({
    isDirty: dirty,
    relevantScopes: BRAND_ASSETS_DISPLAY_SYNC_SCOPES,
    reloadNow: () => resyncBrandProfiles(selectedId ?? undefined)
  });

  useDisplaySyncRefresh(syncDraftGuard.handleDisplaySync, BRAND_ASSETS_DISPLAY_SYNC_SCOPES);

  const cancelPendingAction = useCallback(() => {
    if (isConfirmingAction) {
      return;
    }

    setPendingAction(null);
  }, [isConfirmingAction]);

  const handleSelect = (profile: BrandProfile) => {
    if (dirty) {
      const ok = window.confirm("尚有未儲存的變更，切換會丟棄變更，繼續？");
      if (!ok) return;
    }
    setSelectedId(profile.id);
    setDraft(pickFields(profile));
    setFeedback(null);
    setPendingAction(null);
  };

  const updateField = <K extends keyof DraftFields>(key: K, value: DraftFields[K]) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
    setFeedback(null);
  };

  const resetField = (key: keyof DraftFields) => {
    if (!selected || !draft) return;
    setDraft({ ...draft, [key]: selected[key as keyof BrandProfile] as string });
  };

  const handleSave = async () => {
    if (!selected || !draft) return;
    setIsSaving(true);
    try {
      const payload: BrandProfileUpdate = {};
      const original = pickFields(selected);
      (Object.keys(draft) as Array<keyof DraftFields>).forEach((key) => {
        if (draft[key] !== original[key]) {
          payload[key] = draft[key];
        }
      });
      const updated = await updateBrandProfile(selected.id, payload);
      setProfiles((current) => {
        const nextProfiles = current.map((profile) => (profile.id === updated.id ? updated : profile));
        rememberBrandProfiles(nextProfiles);
        return nextProfiles;
      });
      setDraft(pickFields(updated));
      setFeedback({ tone: "ok", message: "已儲存。" });
      syncDraftGuard.clearPendingRemoteChange();
      if (updated.isActive) notifyBrandChanged();
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "儲存失敗"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleActivate = async () => {
    if (!selected || selected.isActive) return;
    if (!confirmDiscardDirty()) return;
    try {
      await activateBrandProfile(selected.id);
      notifyBrandChanged();
      await resyncBrandProfiles(selected.id);
      setFeedback({ tone: "ok", message: `已切換到「${selected.name}」` });
      syncDraftGuard.clearPendingRemoteChange();
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "切換失敗"
      });
    }
  };

  const handleCreate = async () => {
    if (!confirmDiscardDirty()) return;
    const name = window.prompt("新品牌設定的名稱？", "新品牌設定");
    if (!name || name.trim().length === 0) return;
    try {
      const created = await createBrandProfile({ name: name.trim() });
      await resyncBrandProfiles(created.id);
      setFeedback({ tone: "ok", message: "已建立新設定。" });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "建立失敗"
      });
    }
  };

  const handleDelete = () => {
    if (!selected) return;
    if (selected.isActive) {
      setFeedback({ tone: "error", message: "啟用中的設定無法刪除，請先切換到其他設定。" });
      return;
    }
    if (!confirmDiscardDirty()) return;
    setPendingAction({
      confirmLabel: "確認刪除",
      description: `刪除後會移除「${selected.name}」以及其上傳 Logo，且無法復原。`,
      kind: "delete-profile",
      title: `確定刪除「${selected.name}」？`
    });
  };

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selected) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFeedback({ tone: "error", message: "僅支援 PNG / JPG / WebP / SVG。" });
      return;
    }
    if (file.size > MAX_BYTES) {
      setFeedback({ tone: "error", message: "檔案需小於 2 MB。" });
      return;
    }
    if (file.type === "image/svg+xml") {
      void uploadLogoBlob(file, file.name, null, null);
    } else {
      const url = URL.createObjectURL(file);
      setPendingCropSrc(url);
    }
  };

  const uploadLogoBlob = async (
    blob: Blob,
    filename: string,
    width: number | null,
    height: number | null
  ) => {
    if (!selected) return;
    try {
      const updated = await uploadBrandLogo(selected.id, blob, filename, {
        width: width ?? undefined,
        height: height ?? undefined
      });
      setProfiles((current) => {
        const nextProfiles = current.map((profile) => (profile.id === updated.id ? updated : profile));
        rememberBrandProfiles(nextProfiles);
        return nextProfiles;
      });
      setFeedback({ tone: "ok", message: "Logo 已更新。" });
      syncDraftGuard.clearPendingRemoteChange();
      if (updated.isActive) notifyBrandChanged();
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Logo 上傳失敗"
      });
    }
  };

  const handleRemoveLogo = () => {
    if (!selected || !selected.logoFilename) return;
    setPendingAction({
      confirmLabel: "確認移除 Logo",
      description: "移除後 Header 會退回預設品牌圖示，直到再次上傳新的 Logo。",
      kind: "remove-logo",
      title: "確定移除目前 Logo？"
    });
  };

  const confirmPendingAction = useCallback(async () => {
    if (!selected || !pendingAction) {
      return;
    }

    setIsConfirmingAction(true);

    try {
      if (pendingAction.kind === "delete-profile") {
        const deletedName = selected.name;
        await deleteBrandProfile(selected.id);
        await resyncBrandProfiles();
        setFeedback({ tone: "ok", message: `已刪除「${deletedName}」。` });
      }

      if (pendingAction.kind === "remove-logo") {
        const updated = await deleteBrandLogo(selected.id);
        setProfiles((current) => {
          const nextProfiles = current.map((profile) => (profile.id === updated.id ? updated : profile));
          rememberBrandProfiles(nextProfiles);
          return nextProfiles;
        });
        if (updated.isActive) notifyBrandChanged();
        setFeedback({ tone: "ok", message: "Logo 已移除。" });
      }

      syncDraftGuard.clearPendingRemoteChange();
      setPendingAction(null);
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "操作失敗"
      });
      throw error;
    } finally {
      setIsConfirmingAction(false);
    }
  }, [pendingAction, resyncBrandProfiles, selected, syncDraftGuard]);

  const previewLogoSrc = selected ? brandLogoUrl(selected) : "/brand-logo.png";
  const warning = selected ? aspectWarning(selected.logoWidth, selected.logoHeight) : null;

  return (
    <PageContainer
      title="品牌資產"
      subtitle="Brand Assets"
      description="管理多套品牌設定，並控制目前播放器顯示的品牌資訊。"
    >
      <div className="brand-page">
        {syncDraftGuard.hasPendingRemoteChange ? (
          <RemoteSyncBanner
            onKeepEditing={syncDraftGuard.keepEditing}
            onReloadNow={() => syncDraftGuard.discardAndReload().catch(() => {})}
          />
        ) : null}

        {/* Profile chip rail */}
        <div className="brand-profile-rail">
          <span className="brand-profile-rail-label">Profiles</span>
          <div className="brand-profile-chips">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                className="brand-profile-chip"
                data-selected={profile.id === selectedId ? "true" : "false"}
                data-active={profile.isActive ? "true" : "false"}
                onClick={() => handleSelect(profile)}
              >
                <span>{profile.name}</span>
                {profile.brandNameZh ? (
                  <span className="brand-profile-chip-meta">{profile.brandNameZh}</span>
                ) : null}
              </button>
            ))}
          </div>
          <div className="brand-profile-rail-actions">
            <button
              type="button"
              className="brand-button brand-button-ghost brand-button-small"
              onClick={() => void handleCreate()}
            >
              ＋ 新增
            </button>
            <button
              type="button"
              className="brand-button brand-button-danger brand-button-small"
              onClick={() => void handleDelete()}
              disabled={!selected || selected.isActive || profiles.length <= 1}
            >
              刪除
            </button>
          </div>
        </div>

        {selected && draft ? (
          <>
            {/* Sticky stage banner — full-width hero preview */}
            <section className="brand-stage">
              <div className="brand-stage-frame">
                <div className="brand-stage-header">
                  <img
                    className="brand-stage-logo"
                    src={previewLogoSrc}
                    alt={draft.brandNameEn || draft.brandNameZh}
                  />
                  <div>
                    <div className="brand-stage-brand-zh">{draft.brandNameZh || "—"}</div>
                    <div className="brand-stage-brand-en">{draft.brandNameEn || "—"}</div>
                  </div>
                  <span className="brand-stage-divider" aria-hidden />
                  <div className="brand-stage-product">
                    <div className="brand-stage-product-zh">{draft.productTitleZh || "—"}</div>
                    <div className="brand-stage-product-en">{draft.productTitleEn || "—"}</div>
                  </div>
                </div>
                <div className="brand-stage-canvas">
                  <div className="brand-stage-canvas-grid">
                    <div className="brand-stage-tile">
                      <span className="brand-stage-tile-label">Solar</span>
                      <span className="brand-stage-tile-value">128.4 kW</span>
                    </div>
                    <div className="brand-stage-tile">
                      <span className="brand-stage-tile-label">Today</span>
                      <span className="brand-stage-tile-value">812 kWh</span>
                    </div>
                    <div className="brand-stage-tile">
                      <span className="brand-stage-tile-label">CO₂↓</span>
                      <span className="brand-stage-tile-value">405 kg</span>
                    </div>
                    <div className="brand-stage-tile">
                      <span className="brand-stage-tile-label">Eff.</span>
                      <span className="brand-stage-tile-value">94.2 %</span>
                    </div>
                  </div>
                </div>
                <div className="brand-stage-footer">
                  <div>
                    <div className="brand-stage-slogan-zh">{draft.sloganZh || "—"}</div>
                    <div className="brand-stage-slogan-en">{draft.sloganEn || "—"}</div>
                  </div>
                </div>
              </div>

              <div className="brand-stage-side">
                <div className="brand-stage-side-head">
                  <div className="brand-stage-side-title-group">
                    <span className="brand-stage-side-kicker">Live Preview</span>
                    <span className="brand-stage-side-title">{selected.name}</span>
                  </div>
                  {dirty ? <span className="brand-dirty-badge">未儲存</span> : null}
                </div>

                <span
                  className="brand-stage-dot"
                  data-state={selected.isActive ? "active" : "inactive"}
                >
                  {selected.isActive ? "啟用中，變更會立即反映播放器" : "未啟用，儲存後不影響當前播放"}
                </span>

                {feedback ? (
                  <div
                    className="brand-feedback"
                    data-tone={feedback.tone === "error" ? "error" : "ok"}
                  >
                    {feedback.message}
                  </div>
                ) : null}

                {pendingAction ? (
                  <div className="brand-confirm-panel">
                    <strong>{pendingAction.title}</strong>
                    <p>{pendingAction.description}</p>
                    <div className="brand-confirm-panel-actions">
                      <button
                        type="button"
                        className="brand-button brand-button-ghost"
                        onClick={cancelPendingAction}
                        disabled={isConfirmingAction}
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        className="brand-button brand-button-danger"
                        onClick={() => void confirmPendingAction()}
                        disabled={isConfirmingAction}
                      >
                        {isConfirmingAction ? "處理中…" : pendingAction.confirmLabel}
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="brand-stage-actions">
                  {!selected.isActive ? (
                    <button
                      type="button"
                      className="brand-button brand-button-ghost"
                      onClick={() => void handleActivate()}
                    >
                      設為啟用
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="brand-button brand-button-ghost"
                    onClick={() => setDraft(pickFields(selected))}
                    disabled={!dirty}
                  >
                    全部還原
                  </button>
                  <button
                    type="button"
                    className="brand-button brand-button-primary"
                    onClick={() => void handleSave()}
                    disabled={!dirty || isSaving}
                  >
                    {isSaving ? "儲存中…" : "儲存變更"}
                  </button>
                </div>
              </div>
            </section>

            {/* Edit grid: Logo (narrow) + Identity (wide) */}
            <div className="brand-edit-grid">
              <section className="brand-card">
                <div className="brand-card-head">
                  <div>
                    <div className="brand-card-kicker">Logo</div>
                    <div className="brand-card-title">品牌標誌</div>
                  </div>
                </div>
                <div className="brand-logo-preview">
                  {selected.logoFilename ? (
                    <img src={previewLogoSrc} alt={selected.name} />
                  ) : (
                    <span className="brand-logo-empty">尚未上傳 Logo</span>
                  )}
                </div>
                <div className="brand-logo-info">
                  <dl className="brand-logo-meta">
                    <dt>尺寸</dt>
                    <dd>
                      {selected.logoWidth && selected.logoHeight
                        ? `${selected.logoWidth} × ${selected.logoHeight}`
                        : "—"}
                    </dd>
                    <dt>比例</dt>
                    <dd>{formatRatio(selected.logoWidth, selected.logoHeight)}</dd>
                    <dt>檔案大小</dt>
                    <dd>{formatBytes(selected.logoFileSize)}</dd>
                    <dt>MIME</dt>
                    <dd>{selected.logoMimeType ?? "—"}</dd>
                  </dl>
                  {warning ? <div className="brand-logo-warning">{warning}</div> : null}
                  <div className="brand-logo-actions">
                    <input
                      ref={fileInputRef}
                      className="brand-upload-input"
                      type="file"
                      accept={ACCEPTED_TYPES.join(",")}
                      onChange={handleFile}
                    />
                    <button
                      type="button"
                      className="brand-button brand-button-primary"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      上傳新 Logo
                    </button>
                    <button
                      type="button"
                      className="brand-button brand-button-ghost"
                      onClick={() => void handleRemoveLogo()}
                      disabled={!selected.logoFilename}
                    >
                      移除
                    </button>
                  </div>
                </div>
              </section>

              <section className="brand-card">
                <div className="brand-card-head">
                  <div>
                    <div className="brand-card-kicker">Identity</div>
                    <div className="brand-card-title">品牌名稱與標語</div>
                  </div>
                </div>
                <div className="brand-fields">
                  {(Object.keys(FIELD_LABELS) as Array<keyof DraftFields>).map((key) => {
                    const original = selected[key as keyof BrandProfile] as string;
                    const changed = draft[key] !== original;
                    return (
                      <div
                        key={key}
                        className="brand-field"
                        data-changed={changed ? "true" : "false"}
                      >
                        <div className="brand-field-header">
                          <label htmlFor={`field-${key}`}>{FIELD_LABELS[key]}</label>
                          {changed ? (
                            <button
                              type="button"
                              className="brand-field-reset"
                              onClick={() => resetField(key)}
                            >
                              還原此欄
                            </button>
                          ) : null}
                        </div>
                        <input
                          id={`field-${key}`}
                          type="text"
                          value={draft[key]}
                          onChange={(event) => updateField(key, event.target.value)}
                        />
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </>
        ) : (
          <div className="brand-card">尚未載入品牌設定。</div>
        )}
      </div>

      {pendingCropSrc ? (
        <CropDialog
          src={pendingCropSrc}
          onCancel={() => {
            URL.revokeObjectURL(pendingCropSrc);
            setPendingCropSrc(null);
          }}
          onConfirm={(blob, width, height) => {
            URL.revokeObjectURL(pendingCropSrc);
            setPendingCropSrc(null);
            void uploadLogoBlob(blob, "brand-logo.png", width, height);
          }}
        />
      ) : null}
    </PageContainer>
  );
}
