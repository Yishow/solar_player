import type {
  DisplayRotationPreview,
  PlaybackPage,
  PlaybackSettings
} from "@solar-display/shared";
import type {
  RotationOpsSummaryItem,
  RotationOpsSummaryStat,
  RotationOpsSummaryStatus
} from "../../components/management/rotationOpsSummary";
import {
  buildEffectiveRotationRows,
  buildSkippedRotationRows
} from "../DisplayPagesEditor/rotationPreview";

type BuildSlideshowPreviewViewModelArgs = {
  countdown: number;
  currentPage: PlaybackPage | null;
  errorMessage: string;
  isIdle: boolean;
  isLoading: boolean;
  isPlaying: boolean;
  pages: PlaybackPage[];
  progress: number;
  rotationPreview?: DisplayRotationPreview | null;
  settings: PlaybackSettings | null;
};

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

function buildDebugStatus(input: {
  effectiveCount: number;
  fallbackRoute: string | null;
  rotationPreview?: DisplayRotationPreview | null;
  skippedCount: number;
}): RotationOpsSummaryStatus {
  if (!input.rotationPreview) {
    return {
      detail: "尚未取得 effective rotation、skip 與 fallback 狀態。",
      title: "Debug 資訊 unavailable",
      tone: "error" as const
    };
  }

  if (input.fallbackRoute) {
    return {
      detail: `目前沒有可播放頁面，預覽已改走 ${input.fallbackRoute}。`,
      title: "Fallback routing 中",
      tone: "warning" as const
    };
  }

  if (input.skippedCount > 0) {
    return {
      detail: `目前可播放 ${input.effectiveCount} 頁，另有 ${input.skippedCount} 頁被 skip。`,
      title: "輪播狀態已降級",
      tone: "warning" as const
    };
  }

  return {
    detail: "effective rotation 與目前播放控制器一致。",
    title: "輪播狀態正常",
    tone: "ready" as const
  };
}

function buildRotationOpsStats(input: {
  configuredCount: number;
  countdown: number;
  currentPage: PlaybackPage | null;
  effectiveCount: number;
  skippedCount: number;
}): RotationOpsSummaryStat[] {
  return [
    { label: "Configured", value: `${input.configuredCount} 頁`, valueTone: "default" },
    { label: "Effective", value: `${input.effectiveCount} 頁`, valueTone: "ready" },
    { label: "Skipped", value: `${input.skippedCount} 頁`, valueTone: input.skippedCount > 0 ? "warning" : "default" },
    {
      label: "Current",
      value: input.currentPage?.labelZh ?? "尚未決策",
      valueTone: input.currentPage ? "accent" : "default"
    },
    {
      label: "Countdown",
      value: `${input.countdown} 秒`,
      valueTone: input.currentPage ? "accent" : "default"
    }
  ];
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
  rotationPreview,
  settings
}: BuildSlideshowPreviewViewModelArgs) {
  const currentIndex =
    currentPage === null ? 0 : pages.findIndex((page) => page.id === currentPage.id) + 1;
  const statusLabel = isIdle ? "待機中" : isPlaying ? "自動播放中" : "已暫停";
  const statusDetail = errorMessage || (isLoading ? "正在同步設定..." : "輪播引擎已套用最新 playback config。");
  const effectiveSequenceRows = buildEffectiveRotationRows(rotationPreview ?? null);
  const skippedDebugRows = buildSkippedRotationRows(rotationPreview ?? null);
  const fallbackRouteLabel = rotationPreview?.fallbackRoute ?? "未啟用";
  const debugStatus = buildDebugStatus({
    effectiveCount: effectiveSequenceRows.length,
    fallbackRoute: rotationPreview?.fallbackRoute ?? null,
    rotationPreview,
    skippedCount: skippedDebugRows.length
  });
  const rotationOpsSummary = {
    items: skippedDebugRows.map<RotationOpsSummaryItem>((row) => ({
      detail: row.detail ? `${row.skipReasonLabel} · ${row.detail}` : `${row.skipReasonLabel} · ${row.route}`,
      key: row.pageId,
      label: row.instanceLabel,
      tone: "warning"
    })),
    stats: buildRotationOpsStats({
      configuredCount: pages.length,
      countdown,
      currentPage,
      effectiveCount: effectiveSequenceRows.length,
      skippedCount: skippedDebugRows.length
    }),
    status: debugStatus
  };

  return {
    currentIndexLabel: `${currentIndex} / ${pages.length}`,
    currentPageLabel: currentPage?.labelZh ?? "尚無播放頁面",
    currentRouteLabel: currentPage?.labelEn ?? "請先在播放設定啟用頁面。",
    debugRows: [
      {
        label: "有效序列",
        value:
          effectiveSequenceRows.length > 0
            ? effectiveSequenceRows.map((row) => row.labelEn).join(" → ")
            : "尚無可播放頁面"
      },
      {
        label: "Skip 狀態",
        value:
          skippedDebugRows.length > 0
            ? `${skippedDebugRows.length} 頁被跳過`
            : "目前沒有 skipped 頁面"
      },
      {
        label: "Fallback Route",
        value: fallbackRouteLabel
      },
      {
        label: "目前決策",
        value:
          currentPage !== null
            ? `${currentPage.labelEn} / ${currentPage.labelZh}`
            : rotationPreview?.fallbackRoute
              ? `目前改走 ${rotationPreview.fallbackRoute}`
              : "尚未建立播放決策"
      }
    ],
    debugStatus,
    effectiveSequenceRows,
    fallbackRouteLabel,
    progressLabel: `${Math.round(progress)}%`,
    queueCards: pages.map((page) => ({
      ...page,
      durationLabel: `${page.durationSeconds}s`,
      isCurrent: currentPage?.id === page.id,
      previewAssetKey: page.pageKey,
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
        label: "最後更新",
        value: settings?.updatedAt
          ? settings.updatedAt.substring(0, 16).replace("T", " ")
          : "尚無紀錄"
      }
    ],
    rotationOpsSummary,
    skippedDebugRows
  };
}
