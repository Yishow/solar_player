import type {
  DisplayPageInstance,
  DisplayPageTemplateKey,
  PlaybackPage,
  PlaybackSettings
} from "@solar-display/shared";
import { displayPageTemplateKeys } from "@solar-display/shared";
import { useMemo, useState } from "react";
import { Switch } from "../../components/management";

type PlaybackSettingsFormSectionsProps = {
  formDisabled: boolean;
  isRegistrySaving: boolean;
  markDirty: () => void;
  onArchivePage: (page: DisplayPageInstance) => void;
  onCreatePage: (input: {
    displayNameEn: string;
    displayNameZh: string;
    routeSlug: string;
    templateKey: DisplayPageTemplateKey;
  }) => void;
  pages: PlaybackPage[];
  registryActionDisabled: boolean;
  registryPages: DisplayPageInstance[];
  registrySectionLabel: string;
  setPages: React.Dispatch<React.SetStateAction<PlaybackPage[]>>;
  showAddPageForm: boolean;
  updateSettingsField: <Key extends keyof PlaybackSettings>(
    key: Key,
    value: PlaybackSettings[Key]
  ) => void;
  reorderPlaybackPages: (
    pages: PlaybackPage[],
    id: number,
    direction: -1 | 1
  ) => PlaybackPage[];
  settings: PlaybackSettings | null;
  viewModel: {
    pageRows: Array<
      PlaybackPage & {
        canMoveUp: boolean;
      }
    >;
  };
};

const templateLabelMap: Record<DisplayPageTemplateKey, { en: string; zh: string }> = {
  "factory-circuit": { en: "Factory Circuit", zh: "工廠迴路" },
  images: { en: "Images", zh: "綠能影像" },
  overview: { en: "Overview", zh: "總覽" },
  solar: { en: "Solar", zh: "太陽能" },
  sustainability: { en: "Sustainability", zh: "永續資訊" }
};

export function PlaybackSettingsFormSections({
  formDisabled,
  isRegistrySaving,
  markDirty,
  onArchivePage,
  onCreatePage,
  pages,
  registryActionDisabled,
  registryPages,
  registrySectionLabel,
  setPages,
  showAddPageForm,
  updateSettingsField,
  reorderPlaybackPages,
  settings,
  viewModel
}: PlaybackSettingsFormSectionsProps) {
  const [draftTemplateKey, setDraftTemplateKey] = useState<DisplayPageTemplateKey>("images");
  const [draftDisplayNameEn, setDraftDisplayNameEn] = useState("");
  const [draftDisplayNameZh, setDraftDisplayNameZh] = useState("");
  const [draftRouteSlug, setDraftRouteSlug] = useState("");
  const templateInstanceCounts = useMemo(() => {
    const counts = new Map<DisplayPageTemplateKey, number>();

    for (const page of registryPages) {
      counts.set(page.templateKey, (counts.get(page.templateKey) ?? 0) + 1);
    }

    return counts;
  }, [registryPages]);
  const canSubmitNewPage =
    !registryActionDisabled
    && draftDisplayNameEn.trim().length > 0
    && draftDisplayNameZh.trim().length > 0
    && draftRouteSlug.trim().length > 0;

  const resetDraftForm = () => {
    setDraftTemplateKey("images");
    setDraftDisplayNameEn("");
    setDraftDisplayNameZh("");
    setDraftRouteSlug("");
  };

  return (
    <div className="ps-bottom-cards">
      <section className="settings-card ps-card-order">
        <div className="settings-card__title">
          <span className="ps-badge-number">1</span>
          <div className="ps-title-text">輪播順序<small>Rotation Order</small></div>
          <div className="ps-info-icon">i</div>
        </div>
        <div className="ps-card-content">
          <div className="ps-registry-block">
            <div className="ps-registry-block__title">
              {registrySectionLabel}
              <small>Display Page Registry</small>
            </div>
            <p className="ps-registry-block__helper">
              這裡可新增同模板副本，或封存不再需要的展示頁實例。
            </p>
            {showAddPageForm ? (
              <div className="ps-registry-form">
                <label className="ps-stack">
                  <span className="ps-row-label">模板種類 <small>Template</small></span>
                  <select
                    className="ps-select"
                    disabled={registryActionDisabled}
                    value={draftTemplateKey}
                    onChange={(event) => setDraftTemplateKey(event.target.value as DisplayPageTemplateKey)}
                  >
                    {displayPageTemplateKeys.map((templateKey) => (
                      <option key={templateKey} value={templateKey}>
                        {templateLabelMap[templateKey].zh} / {templateLabelMap[templateKey].en}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="ps-stack">
                  <span className="ps-row-label">中文顯示名稱 <small>ZH Label</small></span>
                  <input
                    className="ps-select"
                    disabled={registryActionDisabled}
                    placeholder={`${templateLabelMap[draftTemplateKey].zh} 副本`}
                    value={draftDisplayNameZh}
                    onChange={(event) => setDraftDisplayNameZh(event.target.value)}
                  />
                </label>
                <label className="ps-stack">
                  <span className="ps-row-label">英文顯示名稱 <small>EN Label</small></span>
                  <input
                    className="ps-select"
                    disabled={registryActionDisabled}
                    placeholder={`${templateLabelMap[draftTemplateKey].en} Secondary`}
                    value={draftDisplayNameEn}
                    onChange={(event) => setDraftDisplayNameEn(event.target.value)}
                  />
                </label>
                <label className="ps-stack">
                  <span className="ps-row-label">路由代號 <small>Route Slug</small></span>
                  <input
                    className="ps-select"
                    disabled={registryActionDisabled}
                    placeholder={`${draftTemplateKey}-secondary`}
                    value={draftRouteSlug}
                    onChange={(event) => setDraftRouteSlug(event.target.value)}
                  />
                </label>
                <div className="ps-registry-form__actions">
                  <button
                    type="button"
                    className="mgmt-action primary"
                    disabled={!canSubmitNewPage}
                    onClick={() => {
                      onCreatePage({
                        displayNameEn: draftDisplayNameEn.trim(),
                        displayNameZh: draftDisplayNameZh.trim(),
                        routeSlug: draftRouteSlug.trim(),
                        templateKey: draftTemplateKey
                      });
                      resetDraftForm();
                    }}
                  >
                    {isRegistrySaving ? "新增中..." : "建立頁面"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          {viewModel.pageRows.map((page, index) => (
            <div key={page.id} className="ps-list-item" style={{ opacity: page.enabled ? 1 : 0.5 }}>
              <span
                className="ps-drag-handle"
                title="拖曳以排序"
                onClick={() => {
                  if (page.canMoveUp) {
                    markDirty();
                    setPages((current) => reorderPlaybackPages(current, page.id, -1));
                  }
                }}
              >
                ::::
              </span>
              <span className="ps-badge-number">{index + 1}</span>
              <select
                className="ps-select"
                disabled={formDisabled}
                value={String(page.enabled ? "enabled" : "disabled")}
                onChange={(event) => {
                  const next = event.target.value === "enabled";
                  markDirty();
                  setPages((current) =>
                    current.map((currentPage) =>
                      currentPage.id === page.id ? { ...currentPage, enabled: next } : currentPage
                    )
                  );
                }}
              >
                <option value="enabled">{page.labelEn}</option>
                <option value="disabled">{page.labelEn} (停用)</option>
              </select>
              {(() => {
                const registryPage = registryPages.find((currentPage) => currentPage.id === page.id);
                const isLastTemplateInstance =
                  registryPage
                    ? (templateInstanceCounts.get(registryPage.templateKey) ?? 0) <= 1
                    : true;

                return (
                  <button
                    type="button"
                    className="ps-archive-btn"
                    disabled={registryActionDisabled || !registryPage || isLastTemplateInstance}
                    title={isLastTemplateInstance ? "每個模板至少需保留一個啟用中的頁面。" : "封存這個顯示頁面"}
                    onClick={() => {
                      if (registryPage) {
                        onArchivePage(registryPage);
                      }
                    }}
                  >
                    封存
                  </button>
                );
              })()}
            </div>
          ))}
        </div>
      </section>

      <section className="settings-card ps-card-duration">
        <div className="settings-card__title">
          <span className="ps-badge-number">2</span>
          <div className="ps-title-text">每頁停留秒數<small>Per-page Duration</small></div>
          <div className="ps-info-icon">i</div>
        </div>
        <div className="ps-card-content">
          {viewModel.pageRows.map((page) => (
            <div key={page.id} className="ps-list-item" style={{ opacity: page.enabled ? 1 : 0.5 }}>
              <span className="ps-label">{page.labelEn}</span>
              <div className="ps-stepper">
                <button type="button" className="ps-stepper-btn" onClick={() => {
                  const next = Math.max(1, page.durationSeconds - 1);
                  markDirty();
                  setPages((current) => current.map((c) => c.id === page.id ? { ...c, durationSeconds: next } : c));
                }}>-</button>
                <input
                  className="ps-stepper-input"
                  type="number"
                  min="1"
                  value={String(page.durationSeconds)}
                  onChange={(event) => {
                    const next = Number.parseInt(event.target.value, 10) || 1;
                    markDirty();
                    setPages((current) =>
                      current.map((currentPage) =>
                        currentPage.id === page.id ? { ...currentPage, durationSeconds: next } : currentPage
                      )
                    );
                  }}
                />
                <button type="button" className="ps-stepper-btn" onClick={() => {
                  const next = page.durationSeconds + 1;
                  markDirty();
                  setPages((current) => current.map((c) => c.id === page.id ? { ...c, durationSeconds: next } : c));
                }}>+</button>
              </div>
            </div>
          ))}
          <div className="ps-unit">單位：秒 (sec.)</div>
        </div>
      </section>

      <section className="settings-card ps-card-control">
        <div className="settings-card__title">
          <span className="ps-badge-number">3</span>
          <div className="ps-title-text">播放控制<small>Playback Control</small></div>
          <div className="ps-info-icon">i</div>
        </div>
        <div className="ps-card-content">
          <div className="ps-row-flex">
            <div className="ps-row-label">自動播放 <small>Autoplay</small></div>
            <Switch ariaLabel="自動播放" on={settings?.autoplay ?? false} disabled={formDisabled} onChange={(next) => updateSettingsField("autoplay", next)} />
          </div>
          <div className="ps-row-flex">
            <div className="ps-row-label">循環播放 <small>Loop Mode</small></div>
            <Switch ariaLabel="循環播放" on={settings?.loop ?? false} disabled={formDisabled} onChange={(next) => updateSettingsField("loop", next)} />
          </div>
        </div>
      </section>

      <section className="settings-card ps-card-display">
        <div className="settings-card__title">
          <span className="ps-badge-number">4</span>
          <div className="ps-title-text">裝置與顯示設定<small>Display & Device Settings</small></div>
          <div className="ps-info-icon">i</div>
        </div>
        <div className="ps-card-content">
          <div className="ps-stack">
            <div className="ps-row-label">亮度 <small>Brightness</small></div>
            <div className="ps-brightness">
              <button type="button" className="ps-stepper-btn" style={{ border: "none", fontSize: "20px" }} onClick={() => updateSettingsField("brightness", Math.max(0, (settings?.brightness ?? 100) - 10))}>-</button>
              <input
                type="range"
                min="0"
                max="100"
                disabled={formDisabled}
                value={String(settings?.brightness ?? 100)}
                onChange={(event) => updateSettingsField("brightness", Number.parseInt(event.target.value, 10) || 0)}
              />
              <span className="ps-brightness__value">{settings?.brightness ?? 100}%</span>
              <button type="button" className="ps-stepper-btn" style={{ border: "none", fontSize: "20px" }} onClick={() => updateSettingsField("brightness", Math.min(100, (settings?.brightness ?? 100) + 10))}>+</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
