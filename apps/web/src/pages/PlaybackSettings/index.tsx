import type { PlaybackPage, PlaybackSettings } from "@solar-display/shared";
import { useEffect, useState } from "react";
import {
  getPlaybackPages,
  getPlaybackSettings,
  updatePlaybackPages,
  updatePlaybackSettings
} from "../../services/api";
import { Switch } from "../../components/management";
import "./playbackSettings.css";
import { buildPlaybackSettingsViewModel, reorderPlaybackPages } from "./viewModel";

import slideOverview from "../../assets/playback/slide-overview.jpg";
import slideSolar from "../../assets/playback/slide-solar.jpg";
import slideCircuit from "../../assets/playback/slide-circuit.jpg";
import slideImages from "../../assets/playback/slide-images.jpg";
import slideSustainability from "../../assets/playback/slide-sustainability.jpg";

const PAGE_THUMBNAILS: Record<string, string> = {
  "/overview": slideOverview,
  "/solar": slideSolar,
  "/factory-circuit": slideCircuit,
  "/images": slideImages,
  "/sustainability": slideSustainability
};

export function PlaybackSettings() {
  const [settings, setSettings] = useState<PlaybackSettings | null>(null);
  const [pages, setPages] = useState<PlaybackPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("正在同步播放設定...");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;
    const loadPlaybackConfig = async () => {
      setIsLoading(true);
      try {
        const [nextSettings, nextPages] = await Promise.all([
          getPlaybackSettings(),
          getPlaybackPages()
        ]);
        if (!active) return;
        setSettings(nextSettings);
        setPages(nextPages);
        setMessage("播放設定已同步。");
        setErrorMessage("");
      } catch (error) {
        if (!active) return;
        setErrorMessage(error instanceof Error ? error.message : "載入播放設定失敗。");
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void loadPlaybackConfig();
    return () => {
      active = false;
    };
  }, []);

  const markDirty = () => {
    setMessage("設定已變更，尚未儲存。");
    setErrorMessage("");
  };

  const updateSettingsField = <Key extends keyof PlaybackSettings>(
    key: Key,
    value: PlaybackSettings[Key]
  ) => {
    markDirty();
    setSettings((current) => (current ? { ...current, [key]: value } : current));
  };

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      const [savedSettings, savedPages] = await Promise.all([
        updatePlaybackSettings(settings),
        updatePlaybackPages(
          pages.map((page) => ({
            displayOrder: page.displayOrder,
            durationSeconds: page.durationSeconds,
            enabled: page.enabled,
            id: page.id
          }))
        )
      ]);
      setSettings(savedSettings);
      setPages(savedPages);
      setMessage("播放設定已儲存。");
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "儲存播放設定失敗。");
    } finally {
      setIsSaving(false);
    }
  };

  const resyncPlaybackConfig = async () => {
    setMessage("正在重新同步播放設定...");
    setErrorMessage("");
    setIsSaving(false);
    setIsLoading(true);
    try {
      const [nextSettings, nextPages] = await Promise.all([
        getPlaybackSettings(),
        getPlaybackPages()
      ]);
      setSettings(nextSettings);
      setPages(nextPages);
      setMessage("播放設定已同步。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "重新同步播放設定失敗。");
    } finally {
      setIsLoading(false);
    }
  };

  const viewModel = buildPlaybackSettingsViewModel({
    errorMessage,
    isSaving,
    message,
    pages,
    settings
  });

  const statusVariant =
    viewModel.saveBanner.tone === "error"
      ? "is-error"
      : viewModel.saveBanner.tone === "saving"
        ? "is-saving"
        : "";

  const formDisabled = isLoading || !settings;

  return (
    <div className="playback-settings-page">
      <div className="ps-header-area">
        <h2 className="ps-header-slogan">綠能驅動・永續未來</h2>
        <section className="ps-title">
          <h1>
            播放<em>設定</em>
          </h1>
          <p>Playback Settings</p>
        </section>
      </div>

      <div className="ps-actions">
        <button
          type="button"
          className="mgmt-action ps-resync"
          disabled={isLoading}
          onClick={() => void resyncPlaybackConfig()}
        >
          重新同步
          <small>Resync</small>
        </button>
        <button
          type="button"
          className="mgmt-action primary ps-save"
          disabled={formDisabled || isSaving}
          onClick={() => void handleSave()}
        >
          {isSaving ? "儲存中..." : "儲存設定"}
          <small>Save Settings</small>
        </button>
      </div>

      <div className={`mgmt-status ps-status ${statusVariant}`} role="status">
        {viewModel.saveBanner.title}
        {viewModel.saveBanner.detail ? (
          <>
            <br />
            <span style={{ opacity: 0.75 }}>{viewModel.saveBanner.detail}</span>
          </>
        ) : null}
      </div>

      <section className="ps-preview">
        <div className="ps-preview__title">
          播放流程預覽 <small>/ Rotation Route Preview</small>
        </div>
        <div className="ps-preview__list">
          {viewModel.rotationPreviewRows.map((page, index, arr) => (
            <div key={page.id} style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div className="ps-preview__item">
                <img src={PAGE_THUMBNAILS[page.route]} alt={page.labelZh} className="ps-preview__item-thumb" />
                <div className="ps-preview__label">
                  <span className="ps-badge-number">{index + 1}</span> {page.labelEn}
                  <small style={{ display: "block", opacity: 0.72 }}>{page.durationLabel}</small>
                </div>
              </div>
              {index < arr.length - 1 && <div className="ps-preview__arrow">&gt;</div>}
            </div>
          ))}
        </div>
      </section>

      <div className="ps-bottom-cards">
        {/* Card 1: 輪播順序 Rotation Order */}
        <section className="settings-card ps-card-order">
          <div className="settings-card__title">
            <span className="ps-badge-number">1</span>
            <div className="ps-title-text">
              輪播順序
              <small>Rotation Order</small>
            </div>
            <div className="ps-info-icon">i</div>
          </div>
          <div className="ps-card-content">
            {viewModel.pageRows.map((page, index) => (
              <div key={page.id} className="ps-list-item" style={{ opacity: page.enabled ? 1 : 0.5 }}>
                <span className="ps-drag-handle" title="拖曳以排序"
                  onClick={() => {
                    if (page.canMoveUp) {
                      markDirty();
                      setPages((current) => reorderPlaybackPages(current, page.id, -1));
                    }
                  }}
                >::::</span>
                <span className="ps-badge-number">{index + 1}</span>
                <img src={PAGE_THUMBNAILS[page.route]} alt={page.labelZh} className="ps-list-thumb" />
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
            <button
              type="button"
              className="ps-add-btn"
              disabled
              title="目前僅支援既有頁面的啟用、排序與停留秒數調整。"
            >
              + 新增頁面 Add Page
            </button>
          </div>
        </section>

        {/* Card 2: 每頁停留秒數 Per-page Duration */}
        <section className="settings-card ps-card-duration">
          <div className="settings-card__title">
            <span className="ps-badge-number">2</span>
            <div className="ps-title-text">
              每頁停留秒數
              <small>Per-page Duration</small>
            </div>
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
                        current.map((current) => current.id === page.id ? { ...current, durationSeconds: next } : current)
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

        {/* Card 3: 播放控制 Playback Control */}
        <section className="settings-card ps-card-control">
          <div className="settings-card__title">
            <span className="ps-badge-number">3</span>
            <div className="ps-title-text">
              播放控制
              <small>Playback Control</small>
            </div>
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
            
            <div className="ps-row-flex">
              <div className="ps-row-label">起始頁面 <small>Start Page</small></div>
              <select className="ps-select ps-row-select-small" disabled={formDisabled} value={String(settings?.startPage ?? "")} onChange={(event) => updateSettingsField("startPage", Number.parseInt(event.target.value, 10) || settings?.startPage || 0)}>
                {viewModel.pageRows.map((page) => <option key={page.id} value={String(page.id)}>{page.labelEn}</option>)}
              </select>
            </div>

            <div className="ps-row-flex">
              <div className="ps-row-label">轉場類型 <small>Transition Type</small></div>
              <select className="ps-select ps-row-select" disabled={formDisabled} value={settings?.transitionType ?? "fade"} onChange={(event) => updateSettingsField("transitionType", event.target.value as PlaybackSettings["transitionType"])}>
                <option value="fade">淡入淡出 Fade</option>
                <option value="slide">滑動 Slide</option>
                <option value="none">無 None</option>
              </select>
            </div>

            <div className="ps-row-flex">
              <div className="ps-row-label">轉場速度 <small>Transition Speed</small></div>
              <select className="ps-select ps-row-select" disabled={formDisabled} value={String(settings?.transitionSpeed ?? 1000)} onChange={(event) => updateSettingsField("transitionSpeed", Number.parseInt(event.target.value, 10) || 1000)}>
                <option value="500">快 Fast</option>
                <option value="1000">中等 Medium</option>
                <option value="2000">慢 Slow</option>
              </select>
            </div>
          </div>
        </section>

        {/* Card 4: 排程設定 Daily Schedule */}
        <section className="settings-card ps-card-schedule">
          <div className="settings-card__title">
            <span className="ps-badge-number">4</span>
            <div className="ps-title-text">
              排程設定
              <small>Daily Schedule</small>
            </div>
            <div className="ps-info-icon">i</div>
          </div>
          <div className="ps-card-content">
            <div className="ps-row-flex">
              <div className="ps-row-label">啟用排程 <small>Enable Schedule</small></div>
              <Switch ariaLabel="啟用排程" on={settings?.scheduleEnabled ?? false} disabled={formDisabled} onChange={(next) => updateSettingsField("scheduleEnabled", next)} />
            </div>
            
            <div className="ps-row-flex">
              <div className="ps-row-label">開始時間 <small>Start Time</small></div>
              <select className="ps-select ps-row-select-small" disabled={!settings?.scheduleEnabled || formDisabled} value={settings?.scheduleStart ?? "08:00"} onChange={(event) => updateSettingsField("scheduleStart", event.target.value)}>
                <option value="08:00">08 : 00</option>
                <option value="09:00">09 : 00</option>
              </select>
            </div>

            <div className="ps-row-flex">
              <div className="ps-row-label">結束時間 <small>End Time</small></div>
              <select className="ps-select ps-row-select-small" disabled={!settings?.scheduleEnabled || formDisabled} value={settings?.scheduleEnd ?? "18:00"} onChange={(event) => updateSettingsField("scheduleEnd", event.target.value)}>
                <option value="17:00">17 : 00</option>
                <option value="18:00">18 : 00</option>
              </select>
            </div>

            <div style={{ marginTop: "32px" }}>
              <div className="ps-row-label">重複設定 <small>Repeat</small></div>
              <div className="ps-weekdays">
                {[
                  { label: "週一", en: "Mon.", value: 1 },
                  { label: "週二", en: "Tue.", value: 2 },
                  { label: "週三", en: "Wed.", value: 3 },
                  { label: "週四", en: "Thu.", value: 4 },
                  { label: "週五", en: "Fri.", value: 5 }
                ].map((day) => {
                  const active = settings?.repeatDays.includes(day.value) ?? false;
                  return (
                    <button
                      key={day.value}
                      type="button"
                      disabled={!settings?.scheduleEnabled || formDisabled}
                      className={`ps-weekday ${active ? "on" : ""}`}
                      onClick={() => {
                        if (!settings) return;
                        const nextDays = active ? settings.repeatDays.filter((current) => current !== day.value) : [...settings.repeatDays, day.value];
                        updateSettingsField("repeatDays", [...new Set(nextDays)].sort((left, right) => left - right));
                      }}
                    >
                      <span>{day.label}</span>
                      <span>{day.en}</span>
                    </button>
                  );
                })}
              </div>
              <div className="ps-weekdays-bottom">
                {[
                  { label: "週六", en: "Sat.", value: 6 },
                  { label: "週日", en: "Sun.", value: 0 }
                ].map((day) => {
                  const active = settings?.repeatDays.includes(day.value) ?? false;
                  return (
                    <button
                      key={day.value}
                      type="button"
                      disabled={!settings?.scheduleEnabled || formDisabled}
                      className={`ps-weekday ${active ? "on" : ""}`}
                      onClick={() => {
                        if (!settings) return;
                        const nextDays = active ? settings.repeatDays.filter((current) => current !== day.value) : [...settings.repeatDays, day.value];
                        updateSettingsField("repeatDays", [...new Set(nextDays)].sort((left, right) => left - right));
                      }}
                    >
                      <span>{day.label}</span>
                      <span>{day.en}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Card 5: 裝置與顯示設定 Display & Device Settings */}
        <section className="settings-card ps-card-display">
          <div className="settings-card__title">
            <span className="ps-badge-number">5</span>
            <div className="ps-title-text">
              裝置與顯示設定
              <small>Display & Device Settings</small>
            </div>
            <div className="ps-info-icon">i</div>
          </div>
          <div className="ps-card-content">
            <div className="ps-stack">
              <div className="ps-row-label">閒置模式 <small>Idle Mode</small></div>
              <select className="ps-select" disabled={formDisabled} value={settings?.idleMode ?? "disabled"} onChange={(event) => updateSettingsField("idleMode", event.target.value as PlaybackSettings["idleMode"])}>
                <option value="disabled">停用 Disabled</option>
                <option value="return-to-start">切換至固定頁面 Switch to Static Page</option>
              </select>
            </div>

            <div className="ps-stack">
              <div className="ps-row-label">閒置時間 <small>Idle Time</small></div>
              <select className="ps-select" disabled={formDisabled} value={String(settings?.idleTimeout ?? 300)} onChange={(event) => updateSettingsField("idleTimeout", Number.parseInt(event.target.value, 10) || 300)}>
                <option value="60">1 分鐘 1 Minute</option>
                <option value="300">5 分鐘 5 Minutes</option>
                <option value="600">10 分鐘 10 Minutes</option>
              </select>
            </div>

            <div className="ps-stack" style={{ marginTop: "32px" }}>
              <div className="ps-row-label">亮度 <small>Brightness</small></div>
              <div className="ps-brightness">
                <button type="button" className="ps-stepper-btn" style={{border: "none", fontSize: "20px"}} onClick={() => updateSettingsField("brightness", Math.max(0, (settings?.brightness ?? 100) - 10))}>-</button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  disabled={formDisabled}
                  value={String(settings?.brightness ?? 100)}
                  onChange={(event) => updateSettingsField("brightness", Number.parseInt(event.target.value, 10) || 0)}
                />
                <span className="ps-brightness__value">{settings?.brightness ?? 100}%</span>
                <button type="button" className="ps-stepper-btn" style={{border: "none", fontSize: "20px"}} onClick={() => updateSettingsField("brightness", Math.min(100, (settings?.brightness ?? 100) + 10))}>+</button>
              </div>
            </div>

            <div className="ps-stack" style={{ marginTop: "32px" }}>
              <div className="ps-row-label">顯示方向 <small>Orientation</small></div>
              <select className="ps-select" disabled={formDisabled} value={settings?.orientation ?? "landscape"} onChange={(event) => updateSettingsField("orientation", event.target.value as PlaybackSettings["orientation"])}>
                <option value="landscape">橫向 Landscape (16:9)</option>
                <option value="portrait">直向 Portrait (9:16)</option>
              </select>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
