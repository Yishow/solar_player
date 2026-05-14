import { useRef, useState, type ChangeEvent } from "react";
import { PageContainer } from "../../components/PageContainer";
import {
  defaultBrandAssets,
  useBrandAssets,
  type BrandAssets as BrandAssetsType
} from "../../hooks/useBrandAssets";
import "./brandAssets.css";

const MAX_LOGO_BYTES = 1024 * 1024;
const ACCEPTED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

type Feedback = { tone: "ok" | "error"; message: string } | null;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("檔案讀取失敗"));
    reader.readAsDataURL(file);
  });
}

export function BrandAssets() {
  const [assets, persist] = useBrandAssets();
  const [draft, setDraft] = useState<BrandAssetsType>(assets);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateField = <K extends keyof BrandAssetsType>(key: K, value: BrandAssetsType[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setFeedback(null);
  };

  const handleLogoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      setFeedback({ tone: "error", message: "僅支援 PNG / JPG / WebP / SVG 格式。" });
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setFeedback({ tone: "error", message: "Logo 檔案需小於 1 MB。" });
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      updateField("logoDataUrl", dataUrl);
      setFeedback({ tone: "ok", message: "Logo 已預覽，記得點儲存。" });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "讀取 Logo 失敗。"
      });
    }
  };

  const handleSave = () => {
    persist(draft);
    setFeedback({ tone: "ok", message: "品牌資產已儲存並套用。" });
  };

  const handleReset = () => {
    setDraft(defaultBrandAssets);
    persist(defaultBrandAssets);
    setFeedback({ tone: "ok", message: "已恢復預設品牌資產。" });
  };

  return (
    <PageContainer
      title="品牌資產"
      subtitle="Brand Assets"
      description="管理播放器顯示的品牌 Logo、名稱與標語。"
    >
      <div className="brand-page">
        <div className="brand-grid">
          <section className="brand-card">
            <div>
              <div className="brand-card-kicker">Logo</div>
              <div className="brand-card-title">品牌標誌</div>
            </div>
            <div className="brand-logo-preview">
              <img src={draft.logoDataUrl} alt={draft.brandNameEn || "Brand logo"} />
            </div>
            <div className="brand-upload-row">
              <input
                ref={fileInputRef}
                className="brand-upload-input"
                type="file"
                accept={ACCEPTED_LOGO_TYPES.join(",")}
                onChange={handleLogoChange}
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
                onClick={() => updateField("logoDataUrl", defaultBrandAssets.logoDataUrl)}
              >
                還原預設
              </button>
            </div>
          </section>

          <section className="brand-card">
            <div>
              <div className="brand-card-kicker">Identity</div>
              <div className="brand-card-title">品牌名稱與標語</div>
            </div>
            <div className="brand-fields">
              <div className="brand-field">
                <label htmlFor="brand-name-zh">品牌中文名</label>
                <input
                  id="brand-name-zh"
                  type="text"
                  value={draft.brandNameZh}
                  onChange={(event) => updateField("brandNameZh", event.target.value)}
                />
              </div>
              <div className="brand-field">
                <label htmlFor="brand-name-en">品牌英文名</label>
                <input
                  id="brand-name-en"
                  type="text"
                  value={draft.brandNameEn}
                  onChange={(event) => updateField("brandNameEn", event.target.value)}
                />
              </div>
              <div className="brand-field">
                <label htmlFor="product-title-zh">產品中文標題</label>
                <input
                  id="product-title-zh"
                  type="text"
                  value={draft.productTitleZh}
                  onChange={(event) => updateField("productTitleZh", event.target.value)}
                />
              </div>
              <div className="brand-field">
                <label htmlFor="product-title-en">產品英文標題</label>
                <input
                  id="product-title-en"
                  type="text"
                  value={draft.productTitleEn}
                  onChange={(event) => updateField("productTitleEn", event.target.value)}
                />
              </div>
              <div className="brand-field">
                <label htmlFor="slogan-zh">標語（中文）</label>
                <input
                  id="slogan-zh"
                  type="text"
                  value={draft.sloganZh}
                  onChange={(event) => updateField("sloganZh", event.target.value)}
                />
              </div>
              <div className="brand-field">
                <label htmlFor="slogan-en">標語（英文）</label>
                <input
                  id="slogan-en"
                  type="text"
                  value={draft.sloganEn}
                  onChange={(event) => updateField("sloganEn", event.target.value)}
                />
              </div>
            </div>
          </section>
        </div>

        <div className="brand-actions">
          {feedback ? (
            <span className="brand-feedback" data-tone={feedback.tone === "error" ? "error" : "ok"}>
              {feedback.message}
            </span>
          ) : null}
          <button type="button" className="brand-button brand-button-ghost" onClick={handleReset}>
            恢復預設
          </button>
          <button type="button" className="brand-button brand-button-primary" onClick={handleSave}>
            儲存並套用
          </button>
        </div>
      </div>
    </PageContainer>
  );
}
