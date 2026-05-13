import { KioskButton } from "../../components/KioskButton";
import { PanelCard } from "../../components/PanelCard";
import { usePageRotation } from "../../hooks/usePageRotation";
import { PageScaffold } from "../shared/PageScaffold";

function formatRepeatDays(days: number[]) {
  const labels = ["日", "一", "二", "三", "四", "五", "六"];

  if (days.length === 0) {
    return "每天";
  }

  return days.map((day) => labels[day] ?? "?").join(" / ");
}

export function SlideshowPreview() {
  const {
    countdown,
    currentPage,
    errorMessage,
    isIdle,
    isLoading,
    isPlaying,
    nextPage,
    pages,
    prevPage,
    progress,
    settings,
    togglePlay
  } = usePageRotation();

  return (
    <PageScaffold
      path="/slideshow-preview"
      description="預覽輪播引擎目前會播放哪一頁、剩餘倒數、進度條與實際套用中的播放規則。"
    >
      <div className="grid grid-cols-12 gap-6">
        <PanelCard title="當前頁面" subtitle="LIVE PREVIEW" className="col-span-8">
          <div className="relative overflow-hidden rounded-[28px] border border-white/70 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_rgba(214,232,201,0.72)_40%,_rgba(57,107,72,0.86)_100%)] p-8 shadow-panel">
            <div className="absolute inset-x-0 bottom-0 h-2 bg-white/20">
              <div
                className="h-full rounded-full bg-brand-900 transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="font-en text-xs uppercase tracking-[0.28em] text-white/80">Now Playing</p>
            <div className="mt-6">
              <p className="text-5xl font-bold tracking-[0.04em] text-white">
                {currentPage?.labelZh ?? "尚無播放頁面"}
              </p>
              <p className="mt-3 text-xl text-white/78">{currentPage?.labelEn ?? "No Enabled Pages"}</p>
              <p className="mt-6 text-lg text-white/82">{currentPage?.route ?? "請先在播放設定啟用頁面。"}</p>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-4">
              <div className="rounded-2xl bg-white/14 px-5 py-4 backdrop-blur">
                <p className="text-sm text-white/72">剩餘倒數</p>
                <p className="mt-2 text-3xl font-semibold text-white">{countdown}s</p>
              </div>
              <div className="rounded-2xl bg-white/14 px-5 py-4 backdrop-blur">
                <p className="text-sm text-white/72">播放狀態</p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {isIdle ? "待機中" : isPlaying ? "播放中" : "已暫停"}
                </p>
              </div>
              <div className="rounded-2xl bg-white/14 px-5 py-4 backdrop-blur">
                <p className="text-sm text-white/72">進度</p>
                <p className="mt-2 text-3xl font-semibold text-white">{Math.round(progress)}%</p>
              </div>
            </div>
          </div>
        </PanelCard>

        <PanelCard title="播放控制" subtitle="PLAY CONTROL" className="col-span-4">
          <div className="grid gap-3">
            <KioskButton variant="secondary" onClick={prevPage}>
              上一頁
            </KioskButton>
            <KioskButton onClick={togglePlay}>{isPlaying ? "Pause" : "Play"}</KioskButton>
            <KioskButton variant="ghost" onClick={nextPage}>
              下一頁
            </KioskButton>
          </div>
          <div className="mt-5 rounded-xl border border-white/70 bg-white/90 p-4 shadow-soft">
            <p className="text-sm font-medium text-neutral-600">
              {errorMessage || (isLoading ? "正在同步設定..." : "輪播引擎已套用最新 playback config。")}
            </p>
          </div>
        </PanelCard>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <PanelCard title="設定摘要" subtitle="PLAYBACK SUMMARY" className="col-span-4">
          <div className="space-y-3 text-sm text-neutral-600">
            <div className="flex items-center justify-between">
              <span>自動輪播</span>
              <strong className="text-neutral-900">{settings?.autoplay ? "On" : "Off"}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>循環播放</span>
              <strong className="text-neutral-900">{settings?.loop ? "On" : "Off"}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>轉場效果</span>
              <strong className="text-neutral-900">{settings?.transitionType ?? "-"}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>轉場速度</span>
              <strong className="text-neutral-900">{settings?.transitionSpeed ?? 0} ms</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>亮度</span>
              <strong className="text-neutral-900">{settings?.brightness ?? 0}%</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>方向</span>
              <strong className="text-neutral-900">{settings?.orientation ?? "-"}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>待機模式</span>
              <strong className="text-neutral-900">{settings?.idleMode ?? "-"}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>排程</span>
              <strong className="text-neutral-900">
                {settings?.scheduleEnabled ? `${settings.scheduleStart} - ${settings.scheduleEnd}` : "關閉"}
              </strong>
            </div>
            <div className="flex items-center justify-between">
              <span>重複星期</span>
              <strong className="text-neutral-900">{formatRepeatDays(settings?.repeatDays ?? [])}</strong>
            </div>
          </div>
        </PanelCard>

        <PanelCard title="播放佇列" subtitle="QUEUE ORDER" className="col-span-8">
          <div className="grid grid-cols-3 gap-4">
            {pages.map((page) => {
              const isCurrent = currentPage?.id === page.id;

              return (
                <div
                  key={page.id}
                  className={[
                    "rounded-2xl border p-4 transition-colors",
                    isCurrent
                      ? "border-brand-500 bg-brand-50 shadow-card"
                      : page.enabled
                        ? "border-white/70 bg-white/95 shadow-soft"
                        : "border-neutral-200 bg-neutral-100/80 opacity-70"
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-lg font-semibold text-neutral-800">
                      {page.displayOrder}. {page.labelZh}
                    </p>
                    <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-neutral-600">
                      {page.durationSeconds}s
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-neutral-500">{page.route}</p>
                  <p className="mt-4 text-sm text-neutral-600">
                    {page.enabled ? "輪播已啟用" : "目前不納入輪播"}
                  </p>
                </div>
              );
            })}
          </div>
        </PanelCard>
      </div>
    </PageScaffold>
  );
}
