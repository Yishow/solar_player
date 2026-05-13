import type { PlaybackPage, PlaybackSettings } from "@solar-display/shared";

type BuildPlaybackSettingsViewModelArgs = {
  errorMessage: string;
  isSaving: boolean;
  message: string;
  pages: PlaybackPage[];
  settings: PlaybackSettings | null;
};

const weekdayLabelMap = new Map([
  [0, "日"],
  [1, "一"],
  [2, "二"],
  [3, "三"],
  [4, "四"],
  [5, "五"],
  [6, "六"]
]);

function sortPlaybackPages(pages: PlaybackPage[]) {
  return pages
    .slice()
    .sort((left, right) => left.displayOrder - right.displayOrder || left.id - right.id);
}

function padOrder(value: number) {
  return value.toString().padStart(2, "0");
}

function formatScheduleLabel(settings: PlaybackSettings | null) {
  if (!settings || !settings.scheduleEnabled) {
    return "未啟用排程，全天候可播放";
  }

  const weekdayLabels = settings.repeatDays
    .map((day) => weekdayLabelMap.get(day))
    .filter((label): label is string => Boolean(label));

  const daysLabel = weekdayLabels.length > 0 ? `每週${weekdayLabels.join("、")}` : "每日";
  const start = settings.scheduleStart ?? "--:--";
  const end = settings.scheduleEnd ?? "--:--";

  return `${daysLabel} • ${start} - ${end}`;
}

function formatStartPageLabel(settings: PlaybackSettings | null, pages: PlaybackPage[]) {
  if (!settings) {
    return "尚未設定";
  }

  const sortedPages = sortPlaybackPages(pages);
  const matchedPage =
    sortedPages.find((page) => page.id === settings.startPage) ?? sortedPages.find((page) => page.enabled) ?? null;

  if (!matchedPage) {
    return "尚未設定";
  }

  return `${padOrder(matchedPage.displayOrder)}. ${matchedPage.labelZh}`;
}

export function reorderPlaybackPages(
  pages: PlaybackPage[],
  id: number,
  direction: -1 | 1
) {
  const sortedPages = sortPlaybackPages(pages);
  const index = sortedPages.findIndex((page) => page.id === id);
  const nextIndex = index + direction;

  if (index < 0 || nextIndex < 0 || nextIndex >= sortedPages.length) {
    return sortedPages;
  }

  const nextPages = sortedPages.slice();
  const [movedPage] = nextPages.splice(index, 1);

  if (!movedPage) {
    return sortedPages;
  }

  nextPages.splice(nextIndex, 0, movedPage);

  return nextPages.map((page, orderIndex) => ({
    ...page,
    displayOrder: orderIndex + 1
  }));
}

export function buildPlaybackSettingsViewModel({
  errorMessage,
  isSaving,
  message,
  pages,
  settings
}: BuildPlaybackSettingsViewModelArgs) {
  const sortedPages = sortPlaybackPages(pages);
  const enabledCount = sortedPages.filter((page) => page.enabled).length;
  const totalDurationSeconds = sortedPages.reduce((sum, page) => sum + page.durationSeconds, 0);

  return {
    pageRows: sortedPages.map((page, index) => ({
      ...page,
      canMoveDown: index < sortedPages.length - 1,
      canMoveUp: index > 0,
      orderLabel: padOrder(page.displayOrder),
      statusLabel: page.enabled ? "啟用中" : "已停用"
    })),
    saveBanner: {
      detail: errorMessage || "調整後按下儲存，展示端會透過 socket 重新載入設定。",
      title: errorMessage ? "儲存失敗" : isSaving ? "正在儲存播放設定..." : message,
      tone: errorMessage ? ("error" as const) : isSaving ? ("saving" as const) : ("ready" as const)
    },
    summary: {
      enabledCount,
      scheduleLabel: formatScheduleLabel(settings),
      startPageLabel: formatStartPageLabel(settings, sortedPages),
      totalDurationSeconds,
      totalPages: sortedPages.length
    }
  };
}
