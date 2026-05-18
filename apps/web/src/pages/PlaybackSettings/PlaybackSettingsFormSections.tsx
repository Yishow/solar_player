import type { PlaybackPage, PlaybackSettings } from "@solar-display/shared";
import { Switch } from "../../components/management";

type PlaybackSettingsFormSectionsProps = {
  formDisabled: boolean;
  markDirty: () => void;
  pages: PlaybackPage[];
  setPages: React.Dispatch<React.SetStateAction<PlaybackPage[]>>;
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

export function PlaybackSettingsFormSections({
  formDisabled,
  markDirty,
  pages,
  setPages,
  updateSettingsField,
  reorderPlaybackPages,
  settings,
  viewModel
}: PlaybackSettingsFormSectionsProps) {
  return (
    <div className="ps-bottom-cards">
      <section className="settings-card ps-card-order">
        <div className="settings-card__title">
          <span className="ps-badge-number">1</span>
          <div className="ps-title-text">輪播順序<small>Rotation Order</small></div>
          <div className="ps-info-icon">i</div>
        </div>
        <div className="ps-card-content">
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
