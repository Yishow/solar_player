import type {
  PlaybackPage,
  PlaybackSettings
} from "@solar-display/shared";
import { memo, useState, useEffect, useRef } from "react";
import { CustomSelect, Switch } from "../../components/management";
import type { PlaybackSettingsFormViewModel } from "./viewModel";

// 自訂 Hook：處理按鈕的長按（Long Press）連續變更邏輯，支援觸控與滑鼠操作
function useLongPressStepper(
  value: number,
  onChange: (next: number) => void,
  onDirty: () => void,
  options: { min?: number; max?: number; step?: number } = {}
) {
  const { min = 1, max = Infinity, step = 1 } = options;
  const valueRef = useRef(value);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const delayRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    return () => {
      if (delayRef.current) clearTimeout(delayRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startChanging = (direction: -1 | 1) => {
    onDirty();
    const nextVal = valueRef.current + direction * step;
    onChange(Math.min(max, Math.max(min, nextVal)));

    // 350ms 後判定為長按，開始以 80ms 的間隔連續變更
    delayRef.current = setTimeout(() => {
      timerRef.current = setInterval(() => {
        const next = valueRef.current + direction * step;
        onChange(Math.min(max, Math.max(min, next)));
      }, 80);
    }, 350);
  };

  const stopChanging = () => {
    if (delayRef.current) clearTimeout(delayRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  return {
    startChanging,
    stopChanging
  };
}

// 抽取後的 Stepper 元件：具備長按、鍵盤無障礙操作、觸控優化等功能
type DurationStepperProps = {
  value: number;
  min?: number;
  disabled?: boolean;
  onDirty: () => void;
  onChange: (val: number) => void;
};

function DurationStepper({ value, min = 1, disabled, onDirty, onChange }: DurationStepperProps) {
  const { startChanging, stopChanging } = useLongPressStepper(value, onChange, onDirty, { min });

  // 鍵盤無障礙支援：ArrowUp / ArrowDown 微調
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === "ArrowUp") {
      e.preventDefault();
      onDirty();
      onChange(value + 1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      onDirty();
      onChange(Math.max(min, value - 1));
    }
  };

  return (
    <div className="ps-stepper">
      <button
        type="button"
        className="ps-stepper-btn"
        disabled={disabled}
        onPointerDown={() => startChanging(-1)}
        onPointerUp={stopChanging}
        onPointerLeave={stopChanging}
        onPointerCancel={stopChanging}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14" />
        </svg>
      </button>
      <input
        className="ps-stepper-input"
        type="number"
        min={min}
        disabled={disabled}
        value={String(value)}
        onKeyDown={handleKeyDown}
        onChange={(event) => {
          const next = Number.parseInt(event.target.value, 10) || min;
          onDirty();
          onChange(next);
        }}
      />
      <button
        type="button"
        className="ps-stepper-btn"
        disabled={disabled}
        onPointerDown={() => startChanging(1)}
        onPointerUp={stopChanging}
        onPointerLeave={stopChanging}
        onPointerCancel={stopChanging}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5v14" />
        </svg>
      </button>
    </div>
  );
}

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
  viewModel: PlaybackSettingsFormViewModel;
};

export const PlaybackSettingsFormSections = memo(function PlaybackSettingsFormSections({
  formDisabled,
  markDirty,
  pages,
  setPages,
  updateSettingsField,
  reorderPlaybackPages,
  settings,
  viewModel
}: PlaybackSettingsFormSectionsProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isDraggable, setIsDraggable] = useState(false);

  const brightness = settings?.brightness ?? 100;
  const transitionSpeed = settings?.transitionSpeed ?? 1000;
  const { startChanging: startBrightnessChange, stopChanging: stopBrightnessChange } = useLongPressStepper(
    brightness,
    (next) => updateSettingsField("brightness", next),
    markDirty,
    { min: 0, max: 100, step: 10 }
  );

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    markDirty();
    setPages((current) => {
      const next = [...current];
      const draggedItem = next.splice(draggedIndex, 1)[0];
      if (draggedItem) {
        next.splice(index, 0, draggedItem);
      }
      return next.map((item, idx) => ({
        ...item,
        displayOrder: idx + 1
      }));
    });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setIsDraggable(false);
  };

  return (
    <div className="ps-bottom-cards">
      <div className="ps-card-wrapper ps-card-order">
        <section className="settings-card mgmt-interactive-card">
          <div className="settings-card__title">
            <span className="ps-badge-number">01</span>
            <div className="ps-title-text">輪播順序<small>Rotation Order</small></div>
            <div
              className="ps-info-icon"
              data-tooltip="設定展示頁面的輪播順序。您可以拖曳左側圖示來排序，或在下拉選單中啟用/停用特定頁面。"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ps-info-svg">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </div>
          </div>
          <div className="ps-card-content">
            {viewModel.pageRows.map((page, index) => (
              <div
                key={page.id}
                className={`ps-list-item${draggedIndex === index ? " ps-dragging" : ""}${!page.enabled ? " is-disabled" : ""}`}
                draggable={isDraggable}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
              >
                <span
                  className="ps-drag-handle"
                  title="拖曳以排序"
                  onMouseEnter={() => setIsDraggable(true)}
                  onMouseLeave={() => {
                    if (draggedIndex === null) {
                      setIsDraggable(false);
                    }
                  }}
                >
                  <svg
                    width="12"
                    height="16"
                    viewBox="0 0 12 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="ps-drag-svg"
                  >
                    <circle cx="2" cy="2" r="1.5" fill="currentColor" />
                    <circle cx="2" cy="8" r="1.5" fill="currentColor" />
                    <circle cx="2" cy="14" r="1.5" fill="currentColor" />
                    <circle cx="10" cy="2" r="1.5" fill="currentColor" />
                    <circle cx="10" cy="8" r="1.5" fill="currentColor" />
                    <circle cx="10" cy="14" r="1.5" fill="currentColor" />
                  </svg>
                </span>
                <span className="ps-badge-number">{(index + 1).toString().padStart(2, "0")}</span>
                <CustomSelect
                  className="ps-dropdown-container"
                  disabled={formDisabled}
                  onChange={(nextValue) => {
                    const nextEnabled = nextValue === "enabled";
                    if (page.enabled !== nextEnabled) {
                      markDirty();
                      setPages((current) =>
                        current.map((currentPage) =>
                          currentPage.id === page.id ? { ...currentPage, enabled: nextEnabled } : currentPage
                        )
                      );
                    }
                  }}
                  options={[
                    { label: page.labelEn, value: "enabled" },
                    { label: `${page.labelEn} (停用)`, value: "disabled" }
                  ]}
                  value={page.enabled ? "enabled" : "disabled"}
                />
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="ps-card-wrapper ps-card-duration">
        <section className="settings-card mgmt-interactive-card">
          <div className="settings-card__title">
            <span className="ps-badge-number">02</span>
            <div className="ps-title-text">每頁停留秒數<small>Per-page Duration</small></div>
            <div
              className="ps-info-icon"
              data-tooltip="設定每頁展示內容在自動輪播時的停留秒數。"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ps-info-svg">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </div>
          </div>
          <div className="ps-card-content">
            {viewModel.pageRows.map((page) => (
              <div key={page.id} className={`ps-list-item${!page.enabled ? " is-disabled" : ""}`}>
                <span className="ps-label">{page.labelEn}</span>
                <DurationStepper
                  value={page.durationSeconds}
                  disabled={formDisabled || !page.enabled}
                  onDirty={markDirty}
                  onChange={(next) => {
                    setPages((current) =>
                      current.map((c) => (c.id === page.id ? { ...c, durationSeconds: next } : c))
                    );
                  }}
                />
              </div>
            ))}
            <div className="ps-unit">單位：秒 (sec.)</div>
          </div>
        </section>
      </div>

      <div className="ps-card-wrapper ps-card-control">
        <section className="settings-card mgmt-interactive-card">
          <div className="settings-card__title">
            <span className="ps-badge-number">03</span>
            <div className="ps-title-text">播放控制<small>Playback Control</small></div>
            <div
              className="ps-info-icon"
              data-tooltip="控制展示系統的自動播放 (Autoplay) 與循環播放 (Loop Mode) 行為。"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ps-info-svg">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </div>
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
              <div className="ps-row-label">轉場效果 <small>Transition Effect</small></div>
              <CustomSelect
                className="ps-row-select"
                disabled={formDisabled}
                onChange={(nextValue) => updateSettingsField("transitionType", nextValue as PlaybackSettings["transitionType"])}
                options={[
                  { label: "淡入淡出 Fade", value: "fade" },
                  { label: "滑動切換 Slide", value: "slide" },
                  { label: "無轉場 None", value: "none" }
                ]}
                value={settings?.transitionType ?? "fade"}
              />
            </div>
            <div className="ps-row-flex">
              <div className="ps-row-label">轉場速度 (ms) <small>Transition Speed</small></div>
              <input
                className="ps-stepper-input"
                disabled={formDisabled || settings?.transitionType === "none"}
                min={120}
                step={100}
                type="number"
                value={String(transitionSpeed)}
                onChange={(event) => {
                  updateSettingsField("transitionSpeed", Math.max(120, Number.parseInt(event.target.value, 10) || 120));
                }}
                style={{
                  width: "130px",
                  height: "38px",
                  border: "1px solid rgba(93, 119, 69, 0.22)",
                  borderRadius: "8px",
                  backgroundColor: formDisabled || settings?.transitionType === "none" ? "#fbfbfa" : "#fff",
                  opacity: formDisabled || settings?.transitionType === "none" ? 0.55 : 1,
                  cursor: formDisabled || settings?.transitionType === "none" ? "not-allowed" : "text",
                  padding: "0 12px",
                  textAlign: "right",
                  outline: "none",
                  boxSizing: "border-box",
                  font: "400 14px/1 var(--font-family-en)",
                  color: "#344039",
                  transition: "all 0.2s ease"
                }}
              />
            </div>
          </div>
        </section>
      </div>

      <div className="ps-card-wrapper ps-card-display">
        <section className="settings-card mgmt-interactive-card">
          <div className="settings-card__title">
            <span className="ps-badge-number">04</span>
            <div className="ps-title-text">裝置與顯示設定<small>Display & Device Settings</small></div>
            <div
              className="ps-info-icon"
              data-tooltip="調整展示裝置的亮度，系統會同步將此數值派送至硬體端。"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ps-info-svg">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </div>
          </div>
          <div className="ps-card-content">
            <div className="ps-stack">
              <div className="ps-row-label">亮度 <small>Brightness</small></div>
              <div className="ps-brightness">
                <button
                  type="button"
                  className="ps-stepper-btn"
                  disabled={formDisabled}
                  onPointerDown={() => startBrightnessChange(-1)}
                  onPointerUp={stopBrightnessChange}
                  onPointerLeave={stopBrightnessChange}
                  onPointerCancel={stopBrightnessChange}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" />
                  </svg>
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  disabled={formDisabled}
                  value={String(brightness)}
                  onChange={(event) => updateSettingsField("brightness", Number.parseInt(event.target.value, 10) || 0)}
                />
                <span className="ps-brightness__value">{brightness}%</span>
                <button
                  type="button"
                  className="ps-stepper-btn"
                  disabled={formDisabled}
                  onPointerDown={() => startBrightnessChange(1)}
                  onPointerUp={stopBrightnessChange}
                  onPointerLeave={stopBrightnessChange}
                  onPointerCancel={stopBrightnessChange}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5v14" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
});
