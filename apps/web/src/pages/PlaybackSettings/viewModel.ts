import type { DisplayRotationPreview, PlaybackPage, PlaybackSettings } from "@solar-display/shared";
import type { ReferenceGlyphName } from "../../components/ReferenceGlyph";
import type { ReferenceTone } from "../../components/reference/ReferenceManagement";
import {
  buildEffectiveRotationRows,
  buildRotationPreviewRows,
  buildSkippedRotationRows
} from "../DisplayPagesEditor/rotationPreview";

type BuildPlaybackSettingsViewModelArgs = {
  errorMessage: string;
  isSaving: boolean;
  message: string;
  pages: PlaybackPage[];
  rotationPreview?: DisplayRotationPreview | null;
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
  rotationPreview,
  settings
}: BuildPlaybackSettingsViewModelArgs) {
  const sortedPages = sortPlaybackPages(pages);
  const enabledCount = sortedPages.filter((page) => page.enabled).length;
  const totalDurationSeconds = sortedPages.reduce((sum, page) => sum + page.durationSeconds, 0);
  const scheduleEnabled = settings?.scheduleEnabled ?? false;

  return {
    pageRows: sortedPages.map((page, index) => ({
      ...page,
      canMoveDown: index < sortedPages.length - 1,
      canMoveUp: index > 0,
      orderLabel: padOrder(page.displayOrder),
      statusLabel: page.enabled ? "啟用中" : "已停用",
      statusTone: page.enabled ? ("success" as ReferenceTone) : ("muted" as ReferenceTone)
    })),
    saveBanner: {
      detail: errorMessage || "調整後按下儲存，展示端會透過 socket 重新載入設定。",
      title: errorMessage ? "儲存失敗" : isSaving ? "正在儲存播放設定..." : message,
      tone: errorMessage ? ("error" as const) : isSaving ? ("saving" as const) : ("ready" as const)
    },
    summaryCards: [
      {
        helper: "輪播引擎目前會納入的播放頁面數量",
        icon: "play" as ReferenceGlyphName,
        id: "enabled",
        subtitle: "Enabled Pages",
        title: "啟用頁數",
        tone: "success" as ReferenceTone,
        value: `${enabledCount} / ${sortedPages.length}`
      },
      {
        helper: "重新啟動或待機返回後的起始展示頁",
        icon: "bars" as ReferenceGlyphName,
        id: "start",
        subtitle: "Start Page",
        title: "起始頁",
        tone: "default" as ReferenceTone,
        value: formatStartPageLabel(settings, sortedPages)
      },
      {
        helper: formatScheduleLabel(settings),
        icon: "clock" as ReferenceGlyphName,
        id: "schedule",
        subtitle: "Schedule Window",
        title: "排程視窗",
        tone: scheduleEnabled ? ("accent" as ReferenceTone) : ("muted" as ReferenceTone),
        value: scheduleEnabled ? "已啟用" : "全天播放"
      },
      {
        helper: "單輪輪播所有頁面合計停留時間",
        icon: "sun" as ReferenceGlyphName,
        id: "duration",
        subtitle: "Cycle Duration",
        title: "總停留秒數",
      tone: "default" as ReferenceTone,
      value: `${totalDurationSeconds}s`
      }
    ],
    effectiveRotationRows: buildEffectiveRotationRows(rotationPreview ?? null),
    rotationPreviewRows: buildRotationPreviewRows(sortedPages),
    skippedRotationRows: buildSkippedRotationRows(rotationPreview ?? null),
    summary: {
      enabledCount,
      scheduleLabel: formatScheduleLabel(settings),
      startPageLabel: formatStartPageLabel(settings, sortedPages),
      totalDurationSeconds,
      totalPages: sortedPages.length
    }
  };
}
