import type { BrandProfile } from "@solar-display/shared";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useBlocker } from "react-router-dom";
import { PageContainer } from "../../components/PageContainer";
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
import { CropDialog } from "./CropDialog";
import "./brandAssets.css";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_BYTES = 2 * 1024 * 1024;
const ASPECT_TOLERANCE = 0.12;

type Feedback = { tone: "ok" | "error"; message: string } | null;

type DraftFields = {
  name: string;
  brandNameZh: string;
  brandNameEn: string;
  productTitleZh: string;
  productTitleEn: string;
  sloganZh: string;
  sloganEn: string;
};

const FIELD_LABELS: Record<keyof DraftFields, string> = {
  name: "品牌設定名稱",
  brandNameZh: "品牌中文名",
  brandNameEn: "品牌英文名",
  productTitleZh: "產品中文標題",
  productTitleEn: "產品英文標題",
  sloganZh: "標語（中文）",
  sloganEn: "標語（英文）"
};

function pickFields(profile: BrandProfile): DraftFields {
  return {
    name: profile.name,
    brandNameZh: profile.brandNameZh,
    brandNameEn: profile.brandNameEn,
    productTitleZh: profile.productTitleZh,
    productTitleEn: profile.productTitleEn,
    sloganZh: profile.sloganZh,
    sloganEn: profile.sloganEn
  };
}

function fieldsEqual(a: DraftFields, b: DraftFields): boolean {
  return (Object.keys(a) as Array<keyof DraftFields>).every((key) => a[key] === b[key]);
}

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
  const [profiles, setProfiles] = useState<BrandProfile[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<DraftFields | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingCropSrc, setPendingCropSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => profiles.find((profile) => profile.id === selectedId) ?? null,
    [profiles, selectedId]
  );

  const dirty = useMemo(() => {
    if (!selected || !draft) return false;
    return !fieldsEqual(draft, pickFields(selected));
  }, [draft, selected]);

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

  const loadProfiles = useCallback(async (preferredId?: number) => {
    try {
      const list = await getBrandProfiles();
      setProfiles(list);
      const chosen =
        list.find((profile) => profile.id === preferredId) ??
        list.find((profile) => profile.isActive) ??
        list[0] ??
        null;
      setSelectedId(chosen?.id ?? null);
      setDraft(chosen ? pickFields(chosen) : null);
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "載入品牌設定失敗"
      });
    }
  }, []);

  useEffect(() => {
    void loadProfiles();
  }, [loadProfiles]);

  const confirmDiscardDirty = useCallback(() => {
    if (!dirty) return true;
    return window.confirm("尚有未儲存的變更，繼續會丟棄目前修改，確定要繼續嗎？");
  }, [dirty]);

  const handleSelect = (profile: BrandProfile) => {
    if (dirty) {
      const ok = window.confirm("尚有未儲存的變更，切換會丟棄變更，繼續？");
      if (!ok) return;
    }
    setSelectedId(profile.id);
    setDraft(pickFields(profile));
    setFeedback(null);
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
      setProfiles((current) => current.map((profile) => (profile.id === updated.id ? updated : profile)));
      setDraft(pickFields(updated));
      setFeedback({ tone: "ok", message: "已儲存。" });
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
      await loadProfiles(selected.id);
      setFeedback({ tone: "ok", message: `已切換到「${selected.name}」` });
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
      await loadProfiles(created.id);
      setFeedback({ tone: "ok", message: "已建立新設定。" });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "建立失敗"
      });
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (selected.isActive) {
      setFeedback({ tone: "error", message: "啟用中的設定無法刪除，請先切換到其他設定。" });
      return;
    }
    if (!confirmDiscardDirty()) return;
    const ok = window.confirm(`確定刪除「${selected.name}」？`);
    if (!ok) return;
    try {
      await deleteBrandProfile(selected.id);
      await loadProfiles();
      setFeedback({ tone: "ok", message: "已刪除。" });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "刪除失敗"
      });
    }
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
      setProfiles((current) =>
        current.map((profile) => (profile.id === updated.id ? updated : profile))
      );
      setFeedback({ tone: "ok", message: "Logo 已更新。" });
      if (updated.isActive) notifyBrandChanged();
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Logo 上傳失敗"
      });
    }
  };

  const handleRemoveLogo = async () => {
    if (!selected || !selected.logoFilename) return;
    const ok = window.confirm("移除目前 Logo？");
    if (!ok) return;
    try {
      const updated = await deleteBrandLogo(selected.id);
      setProfiles((current) =>
        current.map((profile) => (profile.id === updated.id ? updated : profile))
      );
      if (updated.isActive) notifyBrandChanged();
      setFeedback({ tone: "ok", message: "Logo 已移除。" });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "移除失敗"
      });
    }
  };

  const previewLogoSrc = selected ? brandLogoUrl(selected) : "/brand-logo.png";
  const warning = selected ? aspectWarning(selected.logoWidth, selected.logoHeight) : null;

  return (
    <PageContainer
      title="品牌資產"
      subtitle="Brand Assets"
      description="管理多套品牌設定，並控制目前播放器顯示的品牌資訊。"
    >
      <div className="brand-page">
        <div className="brand-layout">
          {/* profile sidebar */}
          <aside className="brand-profile-list">
            <div className="brand-profile-list-header">
              <span className="brand-profile-list-title">品牌設定</span>
              <span className="brand-profile-list-kicker">Profiles</span>
            </div>
            {profiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                className="brand-profile-item"
                data-selected={profile.id === selectedId ? "true" : "false"}
                onClick={() => handleSelect(profile)}
              >
                <span className="brand-profile-item-name">{profile.name}</span>
                <span className="brand-profile-item-meta">
                  {profile.isActive ? (
                    <span className="brand-profile-active-pill">使用中</span>
                  ) : null}
                  <span>{profile.brandNameZh || "—"}</span>
                </span>
              </button>
            ))}
            <div className="brand-profile-list-actions">
              <button
                type="button"
                className="brand-button brand-button-ghost brand-button-small"
                onClick={() => void handleCreate()}
              >
                新增
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
          </aside>

          {/* detail */}
          {selected && draft ? (
            <div className="brand-detail">
              {/* preview */}
              <section className="brand-card">
                <div className="brand-card-head">
                  <div>
                    <div className="brand-card-kicker">Preview</div>
                    <div className="brand-card-title">即時預覽</div>
                  </div>
                  {dirty ? <span className="brand-dirty-badge">未儲存變更</span> : null}
                </div>
                <div className="brand-preview-frame">
                  <div className="brand-preview-bar">
                    <img className="brand-preview-logo" src={previewLogoSrc} alt={draft.brandNameEn} />
                    <div>
                      <div className="brand-preview-text-zh">{draft.brandNameZh || "—"}</div>
                      <div className="brand-preview-text-en">{draft.brandNameEn || "—"}</div>
                    </div>
                    <div className="brand-preview-product">
                      <div className="brand-preview-product-zh">{draft.productTitleZh || "—"}</div>
                      <div className="brand-preview-product-en">{draft.productTitleEn || "—"}</div>
                    </div>
                  </div>
                  <div className="brand-preview-slogan">
                    <span className="brand-preview-slogan-zh">{draft.sloganZh || "—"}</span>
                    <span className="brand-preview-slogan-en">{draft.sloganEn || "—"}</span>
                  </div>
                </div>
              </section>

              {/* logo */}
              <section className="brand-card">
                <div className="brand-card-head">
                  <div>
                    <div className="brand-card-kicker">Logo</div>
                    <div className="brand-card-title">品牌標誌</div>
                  </div>
                  {!selected.isActive ? (
                    <button
                      type="button"
                      className="brand-button brand-button-primary brand-button-small"
                      onClick={() => void handleActivate()}
                    >
                      設為啟用
                    </button>
                  ) : null}
                </div>
                <div className="brand-logo-block">
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
                        移除 Logo
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* fields */}
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
                      <div key={key} className="brand-field">
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

              <div className="brand-actions">
                {feedback ? (
                  <span
                    className="brand-feedback"
                    data-tone={feedback.tone === "error" ? "error" : "ok"}
                  >
                    {feedback.message}
                  </span>
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
                  {isSaving ? "儲存中…" : "儲存"}
                </button>
              </div>
            </div>
          ) : (
            <div className="brand-card">尚未載入品牌設定。</div>
          )}
        </div>
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
