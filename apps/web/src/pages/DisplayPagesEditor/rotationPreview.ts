import type {
  DisplayRotationPreview,
  DisplayRotationSkipReason,
  PlaybackPage
} from "@solar-display/shared";

export type RotationPreviewRow = {
  durationLabel: string;
  id: number;
  labelEn: string;
  labelZh: string;
  orderLabel: string;
  route: string;
};

export type SkippedRotationRow = {
  detail: string | null | undefined;
  labelEn: string;
  labelZh: string;
  skipReasonLabel: string;
  skipReasonText: string;
};

function padOrder(value: number) {
  return value.toString().padStart(2, "0");
}

export function buildRotationPreviewRows(pages: PlaybackPage[]): RotationPreviewRow[] {
  return pages
    .slice()
    .sort((left, right) => left.displayOrder - right.displayOrder || left.id - right.id)
    .filter((page) => page.enabled)
    .map((page) => ({
      durationLabel: `${page.durationSeconds} 秒`,
      id: page.id,
      labelEn: page.labelEn,
      labelZh: page.labelZh,
      orderLabel: padOrder(page.displayOrder),
      route: page.route
    }));
}

export function formatRotationSkipReason(skipReason: DisplayRotationSkipReason) {
  switch (skipReason) {
    case "disabled":
      return "頁面已停用";
    case "out-of-schedule":
      return "不在播放時段";
    case "unpublished":
      return "尚未發布";
    case "asset-unhealthy":
      return "素材狀態異常";
    case "data-not-ready":
      return "資料尚未就緒";
    default:
      return skipReason;
  }
}

export function buildEffectiveRotationRows(preview: DisplayRotationPreview | null) {
  return buildRotationPreviewRows(preview?.playablePages ?? []);
}

export function buildSkippedRotationRows(preview: DisplayRotationPreview | null): SkippedRotationRow[] {
  return (preview?.skippedPages ?? []).map((page) => ({
    detail: page.detail,
    labelEn: page.labelEn,
    labelZh: page.labelZh,
    skipReasonLabel: formatRotationSkipReason(page.skipReason),
    skipReasonText: page.skipReason
  }));
}
