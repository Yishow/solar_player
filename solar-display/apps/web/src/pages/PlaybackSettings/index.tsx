import type { PlaybackPage, PlaybackSettings } from "@solar-display/shared";
import { useEffect, useState } from "react";
import { KioskButton } from "../../components/KioskButton";
import { KioskInput } from "../../components/KioskInput";
import { KioskSelect } from "../../components/KioskSelect";
import { KioskToggle } from "../../components/KioskToggle";
import { PanelCard } from "../../components/PanelCard";
import {
  getPlaybackPages,
  getPlaybackSettings,
  updatePlaybackPages,
  updatePlaybackSettings
} from "../../services/api";
import { PageScaffold } from "../shared/PageScaffold";

const weekdayOptions = [
  { label: "日", value: 0 },
  { label: "一", value: 1 },
  { label: "二", value: 2 },
  { label: "三", value: 3 },
  { label: "四", value: 4 },
  { label: "五", value: 5 },
  { label: "六", value: 6 }
] as const;

function reorderPages(pages: PlaybackPage[], index: number, direction: -1 | 1) {
  const nextIndex = index + direction;

  if (nextIndex < 0 || nextIndex >= pages.length) {
    return pages;
  }

  const nextPages = [...pages];
  const [movedPage] = nextPages.splice(index, 1);

  if (!movedPage) {
    return pages;
  }

  nextPages.splice(nextIndex, 0, movedPage);

  return nextPages.map((page, pageIndex) => ({
    ...page,
    displayOrder: pageIndex + 1
  }));
}

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

        if (!active) {
          return;
        }

        setSettings(nextSettings);
        setPages(nextPages);
        setMessage("播放設定已同步。");
        setErrorMessage("");
      } catch (error) {
        if (!active) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "載入播放設定失敗。");
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadPlaybackConfig();

    return () => {
      active = false;
    };
  }, []);

  const updateSettingsField = <Key extends keyof PlaybackSettings>(
    key: Key,
    value: PlaybackSettings[Key]
  ) => {
    setSettings((current) => (current ? { ...current, [key]: value } : current));
  };

  const handleSave = async () => {
    if (!settings) {
      return;
    }

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

  return (
    <PageScaffold
      path="/settings/playback"
      description="管理播放順序、停留秒數、排程與待機策略，並即時同步到展示端輪播引擎。"
    >
      <div className="grid grid-cols-12 gap-6">
        <PanelCard title="播放總控" subtitle="PLAYBACK SETTINGS" className="col-span-7">
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <KioskToggle
                checked={settings?.autoplay ?? false}
                onChange={(checked) => updateSettingsField("autoplay", checked)}
                label="自動輪播"
                description="啟用後依序自動切換展示頁面"
              />
              <KioskToggle
                checked={settings?.loop ?? false}
                onChange={(checked) => updateSettingsField("loop", checked)}
                label="循環播放"
                description="最後一頁播完後回到起始頁"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <KioskSelect
                label="起始頁"
                disabled={isLoading || !settings}
                value={String(settings?.startPage ?? "")}
                onChange={(event) => updateSettingsField("startPage", Number.parseInt(event.target.value, 10) || 0)}
                options={pages.map((page) => ({
                  label: `${page.displayOrder}. ${page.labelZh}`,
                  value: String(page.id)
                }))}
              />
              <KioskSelect
                label="轉場效果"
                disabled={isLoading || !settings}
                value={settings?.transitionType ?? "fade"}
                onChange={(event) => updateSettingsField("transitionType", event.target.value as PlaybackSettings["transitionType"])}
                options={[
                  { label: "淡入淡出", value: "fade" },
                  { label: "滑動切換", value: "slide" },
                  { label: "無轉場", value: "none" }
                ]}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <KioskInput
                label="轉場速度 (ms)"
                disabled={isLoading || !settings}
                type="number"
                value={String(settings?.transitionSpeed ?? 1000)}
                onChange={(event) => updateSettingsField("transitionSpeed", Number.parseInt(event.target.value, 10) || 0)}
              />
              <KioskSelect
                label="待機模式"
                disabled={isLoading || !settings}
                value={settings?.idleMode ?? "disabled"}
                onChange={(event) => updateSettingsField("idleMode", event.target.value as PlaybackSettings["idleMode"])}
                options={[
                  { label: "停用", value: "disabled" },
                  { label: "回到起始頁", value: "return-to-start" }
                ]}
              />
              <KioskInput
                label="待機秒數"
                disabled={isLoading || !settings}
                type="number"
                value={String(settings?.idleTimeout ?? 300)}
                onChange={(event) => updateSettingsField("idleTimeout", Number.parseInt(event.target.value, 10) || 1)}
              />
            </div>
          </div>
        </PanelCard>

        <PanelCard title="顯示裝置" subtitle="DISPLAY PROFILE" className="col-span-5">
          <div className="grid gap-4">
            <KioskToggle
              checked={settings?.orientation === "portrait"}
              onChange={(checked) => updateSettingsField("orientation", checked ? "portrait" : "landscape")}
              label="直式方向"
              description="關閉時維持橫式展示"
            />
            <div className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-neutral-800">亮度</p>
                  <p className="text-sm text-neutral-500">目前亮度 {settings?.brightness ?? 100}%</p>
                </div>
                <span className="rounded-full bg-brand-100 px-3 py-1 text-sm font-semibold text-brand-900">
                  {settings?.brightness ?? 100}%
                </span>
              </div>
              <KioskInput
                className="mt-4 h-12 px-0"
                disabled={isLoading || !settings}
                max="100"
                min="0"
                type="range"
                value={String(settings?.brightness ?? 100)}
                onChange={(event) => updateSettingsField("brightness", Number.parseInt(event.target.value, 10) || 0)}
              />
            </div>
          </div>
        </PanelCard>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <PanelCard title="排程" subtitle="SCHEDULE" className="col-span-7">
          <div className="grid gap-4">
            <KioskToggle
              checked={settings?.scheduleEnabled ?? false}
              onChange={(checked) => updateSettingsField("scheduleEnabled", checked)}
              label="啟用排程"
              description="僅在指定時間與星期自動播放"
            />
            <div className="grid grid-cols-2 gap-4">
              <KioskInput
                label="開始時間"
                disabled={!settings?.scheduleEnabled || isLoading || !settings}
                type="time"
                value={settings?.scheduleStart ?? "08:00"}
                onChange={(event) => updateSettingsField("scheduleStart", event.target.value)}
              />
              <KioskInput
                label="結束時間"
                disabled={!settings?.scheduleEnabled || isLoading || !settings}
                type="time"
                value={settings?.scheduleEnd ?? "18:00"}
                onChange={(event) => updateSettingsField("scheduleEnd", event.target.value)}
              />
            </div>
            <div>
              <p className="mb-3 text-sm font-medium text-neutral-600">重複星期</p>
              <div className="grid grid-cols-4 gap-3">
                {weekdayOptions.map((day) => (
                  <KioskToggle
                    key={day.value}
                    checked={settings?.repeatDays.includes(day.value) ?? false}
                    onChange={(checked) => {
                      if (!settings) {
                        return;
                      }

                      const nextRepeatDays = checked
                        ? [...settings.repeatDays, day.value]
                        : settings.repeatDays.filter((currentDay) => currentDay !== day.value);

                      updateSettingsField(
                        "repeatDays",
                        [...new Set(nextRepeatDays)].sort((left, right) => left - right)
                      );
                    }}
                    label={`星期${day.label}`}
                    description="列入自動播放排程"
                  />
                ))}
              </div>
            </div>
          </div>
        </PanelCard>

        <PanelCard title="儲存狀態" subtitle="SAVE STATUS" className="col-span-5">
          <div className="grid gap-4">
            <div className="rounded-xl border border-white/70 bg-white/95 p-4 shadow-soft">
              <p className="text-lg font-semibold text-neutral-800">{message}</p>
              <p className="mt-2 text-sm text-neutral-500">
                {errorMessage || "調整後按下儲存，展示端會透過 socket 重新載入設定。"}
              </p>
            </div>
            <KioskButton disabled={isLoading || isSaving || !settings} onClick={() => void handleSave()}>
              {isSaving ? "儲存中..." : "Save"}
            </KioskButton>
          </div>
        </PanelCard>
      </div>

      <PanelCard title="頁面順序" subtitle="PLAYBACK PAGES">
        <div className="grid gap-4">
          {pages.map((page, index) => (
            <div
              key={page.id}
              className="grid grid-cols-[96px_1.5fr_180px_220px_210px] items-center gap-4 rounded-xl border border-white/70 bg-white/95 p-4 shadow-soft"
            >
              <div className="grid gap-2">
                <KioskButton
                  variant="secondary"
                  disabled={index === 0}
                  onClick={() => setPages((current) => reorderPages(current, index, -1))}
                >
                  ↑
                </KioskButton>
                <KioskButton
                  variant="secondary"
                  disabled={index === pages.length - 1}
                  onClick={() => setPages((current) => reorderPages(current, index, 1))}
                >
                  ↓
                </KioskButton>
              </div>
              <div>
                <p className="text-lg font-semibold text-neutral-800">
                  {page.displayOrder}. {page.labelZh}
                </p>
                <p className="mt-1 text-sm text-neutral-500">{page.route}</p>
              </div>
              <KioskInput
                label="停留秒數"
                min="1"
                type="number"
                value={String(page.durationSeconds)}
                onChange={(event) => {
                  const nextDurationSeconds = Number.parseInt(event.target.value, 10) || 1;
                  setPages((current) =>
                    current.map((currentPage) =>
                      currentPage.id === page.id
                        ? {
                            ...currentPage,
                            durationSeconds: nextDurationSeconds
                          }
                        : currentPage
                    )
                  );
                }}
              />
              <KioskToggle
                checked={page.enabled}
                onChange={(checked) => {
                  setPages((current) =>
                    current.map((currentPage) =>
                      currentPage.id === page.id
                        ? {
                            ...currentPage,
                            enabled: checked
                          }
                        : currentPage
                    )
                  );
                }}
                label={page.enabled ? "啟用中" : "已停用"}
                description="控制此頁是否納入輪播"
              />
              <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50/60 px-4 py-3 text-sm text-brand-900">
                <p className="font-semibold">{page.labelEn}</p>
                <p className="mt-1">Page Key: {page.pageKey}</p>
              </div>
            </div>
          ))}
        </div>
      </PanelCard>
    </PageScaffold>
  );
}
