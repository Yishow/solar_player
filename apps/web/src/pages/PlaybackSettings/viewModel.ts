import type {
  DisplayFaultTriageSummary,
  DisplayOpsSummary,
  DisplayRotationPreview,
  PlaybackPage,
  PlaybackSettings
} from "@solar-display/shared";
import { resolveDisplayFaultTriageSummaryFromDisplayOps } from "@solar-display/shared";
import type { ReferenceGlyphName } from "../../components/ReferenceGlyph";
import type { ReferenceTone } from "../../components/reference/ReferenceManagement";
import {
  buildConfiguredRotationRows,
  buildEffectiveRotationRows,
  buildSkippedRotationRows
} from "../DisplayPagesEditor/rotationPreview";
import type { RotationOpsSummaryStat, RotationOpsSummaryStatus } from "../../components/management/rotationOpsSummary";

type BuildPlaybackSettingsViewModelArgs = {
  errorMessage: string;
  isSaving: boolean;
  message: string;
  pages: PlaybackPage[];
  runtimeCountdown: number;
  runtimeCurrentPage: PlaybackPage | null;
  runtimeErrorMessage: string;
  runtimeIsLoading: boolean;
  runtimeIsPlaying: boolean;
  runtimeProgress: number;
  displayOpsSummary?: DisplayOpsSummary | null;
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

const builtInPlaybackPageLabelMap = new Map([
  ["overview", "總覽"],
  ["solar", "太陽能"],
  ["factory-circuit", "工廠迴路"],
  ["images", "圖庫"],
  ["sustainability", "永續"]
]);

const displayOpsTextReplacements = [
  ["Asset is still referenced by a live display surface", "素材仍被正式展示頁引用"],
  ["Asset is still referenced by live playlist usage", "素材仍被正式播放清單引用"],
  ["Asset is still referenced by the live cover image", "素材仍被正式封面圖引用"],
  ["live display surface", "正式展示頁"],
  ["live playlist usage", "正式播放清單引用"],
  ["live cover image", "正式封面圖"],
  ["runtime playlist", "正式播放清單"],
  ["缺少必要的 circuit slot 綁定", "缺少必要的電路槽位綁定"],
  ["runtime 已逾時", "即時資料已逾時"],
  ["最新 draft 尚未發布", "最新草稿尚未發布"],
  ["MQTT mapping", "MQTT 對應"],
  ["circuit slot 綁定", "電路槽位綁定"],
  ["slot binding", "槽位綁定"],
  ["draft", "草稿"],
  ["runtime", "即時資料"],
  ["global", "全域設定"],
  ["Asset", "素材"],
  ["asset", "素材"]
] as const;

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

function createPlaybackPageLabelMap(input: {
  displayOpsSummary?: DisplayOpsSummary | null;
  pages: PlaybackPage[];
}) {
  const pageLabels = new Map(builtInPlaybackPageLabelMap);

  for (const page of input.pages) {
    pageLabels.set(page.pageKey, page.labelZh);
  }

  for (const page of input.displayOpsSummary?.pages ?? []) {
    pageLabels.set(page.pageId, page.labelZh);
  }

  return pageLabels;
}

function localizeDisplayOpsMessage(message: string, pageLabels: Map<string, string>) {
  let localizedMessage = message;

  for (const [pageId, labelZh] of pageLabels) {
    localizedMessage = localizedMessage.replaceAll(pageId, labelZh);
  }

  for (const [searchValue, replaceValue] of displayOpsTextReplacements) {
    localizedMessage = localizedMessage.replaceAll(searchValue, replaceValue);
  }

  return localizedMessage.replace(/\s{2,}/g, " ").trim();
}

function formatTriagePages(
  summary: DisplayFaultTriageSummary,
  pageLabels: Map<string, string>
) {
  if (summary.affectedPages.length === 0) {
    return "全域設定";
  }

  return summary.affectedPages
    .map((pageId) => pageLabels.get(pageId) ?? localizeDisplayOpsMessage(pageId, pageLabels))
    .join("、");
}

function formatTriageDetail(
  summary: DisplayFaultTriageSummary,
  pageLabels: Map<string, string>
) {
  return `主因：${localizeDisplayOpsMessage(summary.dominantReason, pageLabels)} · 受影響頁面：${formatTriagePages(summary, pageLabels)}`;
}

function buildEffectiveRotationStatus(input: {
  playableCount: number;
  runtimeCurrentPage: PlaybackPage | null;
  runtimeErrorMessage: string;
  runtimeIsLoading: boolean;
  runtimeIsPlaying: boolean;
  runtimeProgress: number;
  skippedCount: number;
}): RotationOpsSummaryStatus {
  if (input.runtimeErrorMessage) {
    return {
      detail: input.runtimeErrorMessage,
      title: "輪播狀態同步失敗",
      tone: "error"
    };
  }

  if (input.runtimeIsLoading) {
    return {
      detail: "正在同步 effective rotation、目前播放頁與 countdown。",
      title: "輪播狀態同步中",
      tone: "warning"
    };
  }

  if (input.playableCount === 0) {
    return {
      detail: "目前沒有可播放頁面，請先處理 skip 或啟用設定。",
      title: "正式輪播鏈不可用",
      tone: "error"
    };
  }

  if (input.skippedCount > 0) {
    return {
      detail: `目前可播放 ${input.playableCount} 頁，另有 ${input.skippedCount} 頁被 skip。`,
      title: "輪播狀態已降級",
      tone: "warning"
    };
  }

  const currentLabel = input.runtimeCurrentPage?.labelZh ?? "尚未建立";
  return {
    detail: `${currentLabel} · ${Math.round(input.runtimeProgress)}% progress · ${input.runtimeIsPlaying ? "Auto Play" : "Paused"}`,
    title: "正式輪播鏈正常",
    tone: "ready"
  };
}

function buildRuntimeSummaryRows(input: {
  configuredCount: number;
  playableCount: number;
  runtimeCountdown: number;
  runtimeCurrentPage: PlaybackPage | null;
  skippedCount: number;
}): RotationOpsSummaryStat[] {
  return [
    { label: "Configured", value: `${input.configuredCount} 頁`, valueTone: "default" },
    { label: "Effective", value: `${input.playableCount} 頁`, valueTone: "ready" },
    { label: "Skipped", value: `${input.skippedCount} 頁`, valueTone: input.skippedCount > 0 ? "warning" : "default" },
    {
      label: "Current",
      value: input.runtimeCurrentPage?.labelZh ?? "尚未決策",
      valueTone: input.runtimeCurrentPage ? "accent" : "default"
    },
    {
      label: "Countdown",
      value: `${input.runtimeCountdown} 秒`,
      valueTone: input.runtimeCurrentPage ? "accent" : "default"
    }
  ];
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
  runtimeCountdown,
  runtimeCurrentPage,
  runtimeErrorMessage,
  runtimeIsLoading,
  runtimeIsPlaying,
  runtimeProgress,
  displayOpsSummary,
  rotationPreview,
  settings
}: BuildPlaybackSettingsViewModelArgs) {
  const sortedPages = sortPlaybackPages(pages);
  const playbackPageLabels = createPlaybackPageLabelMap({ displayOpsSummary, pages: sortedPages });
  const enabledCount = sortedPages.filter((page) => page.enabled).length;
  const totalDurationSeconds = sortedPages.reduce((sum, page) => sum + page.durationSeconds, 0);
  const scheduleEnabled = settings?.scheduleEnabled ?? false;
  const configuredRotationRows = buildConfiguredRotationRows(sortedPages);
  const effectiveRotationRows = buildEffectiveRotationRows(rotationPreview ?? null, runtimeCurrentPage?.id ?? null);
  const skippedRotationRows = buildSkippedRotationRows(rotationPreview ?? null);
  const triageSummary =
    displayOpsSummary?.triageSummary
    ?? resolveDisplayFaultTriageSummaryFromDisplayOps(displayOpsSummary ?? null);

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
    displayOpsBanner: {
      detail:
        triageSummary
          ? formatTriageDetail(triageSummary, playbackPageLabels)
          : displayOpsSummary?.blockingIssues[0]?.message
            ? localizeDisplayOpsMessage(displayOpsSummary.blockingIssues[0].message, playbackPageLabels)
            : "輪播發布、略過狀態與草稿待發布情形會在這裡同步。",
      title:
        triageSummary
          ? `${triageSummary.affectedPages.length} 個展示頁需處理`
          : displayOpsSummary?.draftPending
          ? `${displayOpsSummary.draftCount} 個展示頁待發布`
          : "展示作業已同步",
      tone:
        displayOpsSummary?.blockingIssues.some((issue) => issue.severity === "blocking")
          ? ("error" as const)
          : displayOpsSummary?.draftPending
            ? ("warning" as const)
            : ("ready" as const)
    },
    triageSummary,
    pendingDraftRows:
      displayOpsSummary?.pages
        .filter((page) => page.draftPending)
        .map((page) => ({
          labelEn: page.labelEn,
          labelZh: page.labelZh,
          publishState: page.publishState
        })) ?? [],
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
    configuredRotationRows,
    effectiveRotationRows,
    skippedRotationRows,
    runtimeSummaryRows: buildRuntimeSummaryRows({
      configuredCount: configuredRotationRows.length,
      playableCount: effectiveRotationRows.length,
      runtimeCountdown,
      runtimeCurrentPage,
      skippedCount: skippedRotationRows.length
    }),
    effectiveRotationStatus: buildEffectiveRotationStatus({
      playableCount: effectiveRotationRows.length,
      runtimeCurrentPage,
      runtimeErrorMessage,
      runtimeIsLoading,
      runtimeIsPlaying,
      runtimeProgress,
      skippedCount: skippedRotationRows.length
    }),
    summary: {
      enabledCount,
      scheduleLabel: formatScheduleLabel(settings),
      startPageLabel: formatStartPageLabel(settings, sortedPages),
      totalDurationSeconds,
      totalPages: sortedPages.length
    }
  };
}
