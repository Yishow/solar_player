import type { PlaybackPage, PlaybackSettings } from "@solar-display/shared";

type BuildSlideshowPreviewViewModelArgs = {
  countdown: number;
  currentPage: PlaybackPage | null;
  errorMessage: string;
  isIdle: boolean;
  isLoading: boolean;
  isPlaying: boolean;
  pages: PlaybackPage[];
  progress: number;
  settings: PlaybackSettings | null;
};

function formatRepeatDays(days: number[]) {
  const labels = ["日", "一", "二", "三", "四", "五", "六"];

  if (days.length === 0) {
    return "每天";
  }

  return days.map((day) => labels[day] ?? "?").join(" / ");
}

function buildPlaybackOrderLabel(pages: PlaybackPage[]) {
  if (pages.length === 0) {
    return "尚未設定";
  }

  return pages
    .slice()
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map((page) => page.labelEn)
    .join(" → ");
}

export function buildSlideshowPreviewViewModel({
  countdown,
  currentPage,
  errorMessage,
  isIdle,
  isLoading,
  isPlaying,
  pages,
  progress,
  settings
}: BuildSlideshowPreviewViewModelArgs) {
  const currentIndex =
    currentPage === null ? 0 : pages.findIndex((page) => page.id === currentPage.id) + 1;
  const statusLabel = isIdle ? "待機中" : isPlaying ? "自動播放中" : "已暫停";
  const statusDetail = errorMessage || (isLoading ? "正在同步設定..." : "輪播引擎已套用最新 playback config。");

  return {
    currentIndexLabel: `${currentIndex} / ${pages.length}`,
    currentPageLabel: currentPage?.labelZh ?? "尚無播放頁面",
    currentRouteLabel: currentPage?.route ?? "請先在播放設定啟用頁面。",
    progressLabel: `${Math.round(progress)}%`,
    queueCards: pages.map((page) => ({
      ...page,
      durationLabel: `${page.durationSeconds}s`,
      isCurrent: currentPage?.id === page.id,
      routeLabel: page.route,
      statusLabel: page.enabled ? "輪播已啟用" : "目前不納入輪播"
    })),
    statusDetail,
    statusLabel,
    summaryRows: [
      {
        label: "播放順序",
        value: buildPlaybackOrderLabel(pages)
      },
      {
        label: "每頁停留",
        value: currentPage ? `${currentPage.durationSeconds} 秒` : "尚未設定"
      },
      {
        label: "轉場效果",
        value: settings?.transitionType ?? "尚未設定"
      },
      {
        label: "自動播放",
        value: settings?.autoplay ? "啟用中 Enabled" : "停用中 Disabled"
      },
      {
        label: "重複星期",
        value: formatRepeatDays(settings?.repeatDays ?? [])
      }
    ]
  };
}
