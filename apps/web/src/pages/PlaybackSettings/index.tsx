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

const weekdayOptions = [
  { label: "日", value: 0 },
  { label: "一", value: 1 },
  { label: "二", value: 2 },
  { label: "三", value: 3 },
  { label: "四", value: 4 },
  { label: "五", value: 5 },
  { label: "六", value: 6 }
] as const;

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
      <section className="ps-title">
        <h1>
          播放<em>設定</em>
        </h1>
        <p>Playback Settings</p>
      </section>

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

      <div className={`mgmt-status ps-status ${statusVariant}`} role="status">
        {viewModel.saveBanner.title}
        {viewModel.saveBanner.detail ? (
          <>
            <br />
            <span style={{ opacity: 0.75 }}>{viewModel.saveBanner.detail}</span>
          </>
        ) : null}
      </div>

      {/* 輪播控制 */}
      <section className="settings-card ps-card-control">
        <div className="settings-card__title">
          輪播控制
          <small>Slideshow Control</small>
        </div>

        <div className="ps-toggle">
          <div className="ps-toggle__label">
            自動輪播
            <small>啟用後依序自動切換展示頁面</small>
          </div>
          <Switch
            ariaLabel="自動輪播"
            on={settings?.autoplay ?? false}
            disabled={formDisabled}
            onChange={(next) => updateSettingsField("autoplay", next)}
          />
        </div>

        <div className="ps-toggle">
          <div className="ps-toggle__label">
            循環播放
            <small>最後一頁播完後回到起始頁</small>
          </div>
          <Switch
            ariaLabel="循環播放"
            on={settings?.loop ?? false}
            disabled={formDisabled}
            onChange={(next) => updateSettingsField("loop", next)}
          />
        </div>

        <div className="ps-row">
          <label className="ps-row__label">
            起始頁
            <small>Start Page</small>
          </label>
          <select
            className="ps-select"
            disabled={formDisabled}
            value={String(settings?.startPage ?? "")}
            onChange={(event) =>
              updateSettingsField(
                "startPage",
                Number.parseInt(event.target.value, 10) || settings?.startPage || 0
              )
            }
          >
            {viewModel.pageRows.map((page) => (
              <option key={page.id} value={String(page.id)}>
                {page.orderLabel}. {page.labelZh}
              </option>
            ))}
          </select>
        </div>

        <div className="ps-row ps-row--inline" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div className="ps-row" style={{ marginBottom: 0, gridTemplateColumns: "70px 1fr" }}>
            <label className="ps-row__label">
              轉場
              <small>Transition</small>
            </label>
            <select
              className="ps-select"
              disabled={formDisabled}
              value={settings?.transitionType ?? "fade"}
              onChange={(event) =>
                updateSettingsField(
                  "transitionType",
                  event.target.value as PlaybackSettings["transitionType"]
                )
              }
            >
              <option value="fade">淡入淡出</option>
              <option value="slide">滑動</option>
              <option value="none">無</option>
            </select>
          </div>
          <div className="ps-row" style={{ marginBottom: 0, gridTemplateColumns: "70px 1fr" }}>
            <label className="ps-row__label">
              速度
              <small>Speed (ms)</small>
            </label>
            <input
              className="ps-input"
              type="number"
              disabled={formDisabled}
              value={String(settings?.transitionSpeed ?? 1000)}
              onChange={(event) =>
                updateSettingsField(
                  "transitionSpeed",
                  Number.parseInt(event.target.value, 10) || 0
                )
              }
            />
          </div>
        </div>
      </section>

      {/* 排程設定 */}
      <section className="settings-card ps-card-schedule">
        <div className="settings-card__title">
          排程設定
          <small>Schedule</small>
        </div>

        <div className="ps-toggle">
          <div className="ps-toggle__label">
            啟用排程
            <small>僅在指定時間與星期自動播放</small>
          </div>
          <Switch
            ariaLabel="啟用排程"
            on={settings?.scheduleEnabled ?? false}
            disabled={formDisabled}
            onChange={(next) => updateSettingsField("scheduleEnabled", next)}
          />
        </div>

        <div className="ps-grid-2">
          <div className="ps-row" style={{ gridTemplateColumns: "70px 1fr" }}>
            <label className="ps-row__label">
              開始
              <small>Start</small>
            </label>
            <input
              className="ps-input"
              type="time"
              disabled={!settings?.scheduleEnabled || formDisabled}
              value={settings?.scheduleStart ?? "08:00"}
              onChange={(event) => updateSettingsField("scheduleStart", event.target.value)}
            />
          </div>
          <div className="ps-row" style={{ gridTemplateColumns: "70px 1fr" }}>
            <label className="ps-row__label">
              結束
              <small>End</small>
            </label>
            <input
              className="ps-input"
              type="time"
              disabled={!settings?.scheduleEnabled || formDisabled}
              value={settings?.scheduleEnd ?? "18:00"}
              onChange={(event) => updateSettingsField("scheduleEnd", event.target.value)}
            />
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <div className="ps-row__label" style={{ marginBottom: 6 }}>
            自動播放星期
            <small>Repeat Days</small>
          </div>
          <div className="ps-weekdays">
            {weekdayOptions.map((day) => {
              const active = settings?.repeatDays.includes(day.value) ?? false;
              return (
                <button
                  key={day.value}
                  type="button"
                  disabled={!settings?.scheduleEnabled || formDisabled}
                  className={`ps-weekday ${active ? "on" : ""}`}
                  onClick={() => {
                    if (!settings) return;
                    const nextDays = active
                      ? settings.repeatDays.filter((current) => current !== day.value)
                      : [...settings.repeatDays, day.value];
                    updateSettingsField(
                      "repeatDays",
                      [...new Set(nextDays)].sort((left, right) => left - right)
                    );
                  }}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 顯示設定 */}
      <section className="settings-card ps-card-display">
        <div className="settings-card__title">
          顯示設定
          <small>Display</small>
        </div>

        <div className="ps-toggle">
          <div className="ps-toggle__label">
            直式方向
            <small>關閉時維持橫式展示</small>
          </div>
          <Switch
            ariaLabel="直式方向"
            on={settings?.orientation === "portrait"}
            disabled={formDisabled}
            onChange={(next) =>
              updateSettingsField("orientation", next ? "portrait" : "landscape")
            }
          />
        </div>

        <div className="ps-row">
          <label className="ps-row__label">
            待機模式
            <small>Idle Mode</small>
          </label>
          <select
            className="ps-select"
            disabled={formDisabled}
            value={settings?.idleMode ?? "disabled"}
            onChange={(event) =>
              updateSettingsField(
                "idleMode",
                event.target.value as PlaybackSettings["idleMode"]
              )
            }
          >
            <option value="disabled">停用</option>
            <option value="return-to-start">回到起始頁</option>
          </select>
        </div>

        <div className="ps-row">
          <label className="ps-row__label">
            待機秒數
            <small>Idle Timeout</small>
          </label>
          <input
            className="ps-input"
            type="number"
            disabled={formDisabled}
            value={String(settings?.idleTimeout ?? 300)}
            onChange={(event) =>
              updateSettingsField("idleTimeout", Number.parseInt(event.target.value, 10) || 1)
            }
          />
        </div>

        <div style={{ marginTop: 6 }}>
          <div className="ps-row__label" style={{ marginBottom: 6 }}>
            亮度
            <small>Brightness</small>
          </div>
          <div className="ps-brightness">
            <input
              type="range"
              min="0"
              max="100"
              disabled={formDisabled}
              value={String(settings?.brightness ?? 100)}
              onChange={(event) =>
                updateSettingsField("brightness", Number.parseInt(event.target.value, 10) || 0)
              }
            />
            <span className="ps-brightness__value">
              {settings?.brightness ?? 100}
              <small>%</small>
            </span>
          </div>
        </div>
      </section>

      {/* 頁面順序 */}
      <section className="settings-card ps-card-pages">
        <div className="settings-card__title">
          頁面順序
          <small>Playback Pages · 共 {viewModel.summary.totalPages} 頁，循環時長 {viewModel.summary.totalDurationSeconds}s</small>
        </div>

        <div className="ps-pages-table">
          <div className="ps-pages-header">
            <span>排序</span>
            <span>順位</span>
            <span>頁面</span>
            <span>路由</span>
            <span>停留秒數</span>
            <span>狀態</span>
            <span>納入輪播</span>
          </div>

          {viewModel.pageRows.map((page) => (
            <div key={page.id} className={`ps-page-row ${page.enabled ? "" : "is-disabled"}`}>
              <div className="ps-page-row__sort">
                <button
                  type="button"
                  disabled={!page.canMoveUp}
                  onClick={() => {
                    markDirty();
                    setPages((current) => reorderPlaybackPages(current, page.id, -1));
                  }}
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={!page.canMoveDown}
                  onClick={() => {
                    markDirty();
                    setPages((current) => reorderPlaybackPages(current, page.id, 1));
                  }}
                >
                  ↓
                </button>
              </div>

              <div className="ps-page-row__order">{page.orderLabel}</div>

              <div className="ps-page-row__title">
                <b>{page.labelZh}</b>
                <small>{page.labelEn}</small>
              </div>

              <div className="ps-page-row__route">{page.route}</div>

              <div className="ps-page-row__duration">
                <input
                  className="ps-input"
                  type="number"
                  min="1"
                  value={String(page.durationSeconds)}
                  onChange={(event) => {
                    const next = Number.parseInt(event.target.value, 10) || 1;
                    markDirty();
                    setPages((current) =>
                      current.map((current) =>
                        current.id === page.id ? { ...current, durationSeconds: next } : current
                      )
                    );
                  }}
                />
                <small>秒</small>
              </div>

              <div>
                <span className={`mgmt-chip ${page.enabled ? "is-on" : ""}`}>
                  {page.statusLabel}
                </span>
              </div>

              <div>
                <Switch
                  ariaLabel={`${page.labelZh} 納入輪播`}
                  on={page.enabled}
                  onChange={(next) => {
                    markDirty();
                    setPages((current) =>
                      current.map((currentPage) =>
                        currentPage.id === page.id ? { ...currentPage, enabled: next } : currentPage
                      )
                    );
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
