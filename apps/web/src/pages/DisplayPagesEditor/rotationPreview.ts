import type {
  DisplayPageTemplateKey,
  DisplayRotationPreview,
  DisplayRotationSkipReason,
  PlaybackPage
} from "@solar-display/shared";
import { isDisplayPageTemplateKey } from "@solar-display/shared";

export type RotationPreviewRow = {
  durationLabel: string;
  id: number;
  instanceLabel: string;
  isCurrent?: boolean;
  labelEn: string;
  labelZh: string;
  orderLabel: string;
  pageId: string;
  route: string;
  stateLabel: string;
  stateTone: "ready" | "warning" | "accent";
  templateKey: DisplayPageTemplateKey | null;
};

export type SkippedRotationRow = {
  detail: string | null | undefined;
  instanceLabel: string;
  labelEn: string;
  labelZh: string;
  orderLabel: string;
  pageId: string;
  route: string;
  skipReasonLabel: string;
  skipReasonText: string;
};

function padOrder(value: number) {
  return value.toString().padStart(2, "0");
}

function resolvePreviewTemplateKey(page: PlaybackPage): DisplayPageTemplateKey | null {
  if (page.templateKey && isDisplayPageTemplateKey(page.templateKey)) {
    return page.templateKey;
  }

  const routeKey = page.route.replace(/^\//, "");
  return isDisplayPageTemplateKey(routeKey) ? routeKey : null;
}

export function buildRotationPreviewRows(pages: PlaybackPage[]): RotationPreviewRow[] {
  return buildConfiguredRotationRows(pages);
}

export function buildConfiguredRotationRows(pages: PlaybackPage[]): RotationPreviewRow[] {
  return pages
    .slice()
    .sort((left, right) => left.displayOrder - right.displayOrder || left.id - right.id)
    .map((page) => ({
      durationLabel: `${page.durationSeconds} 秒`,
      id: page.id,
      instanceLabel: `${page.labelZh} / ${page.route}`,
      labelEn: page.labelEn,
      labelZh: page.labelZh,
      orderLabel: padOrder(page.displayOrder),
      pageId: page.pageKey,
      route: page.route,
      stateLabel: page.enabled ? "已配置" : "已停用",
      stateTone: page.enabled ? "ready" : "warning",
      templateKey: resolvePreviewTemplateKey(page)
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
    case "stale-runtime":
      return "即時資料逾時";
    case "mqtt-mapping-missing":
      return "MQTT 指標映射缺失";
    case "derived-metric-missing":
      return "衍生指標依賴缺失";
    case "slot-binding-missing":
      return "迴路槽位尚未綁定";
    case "slot-binding-conflict":
      return "迴路槽位綁定衝突";
    default:
      return skipReason;
  }
}

export function buildEffectiveRotationRows(
  preview: DisplayRotationPreview | null,
  currentPageId?: number | null
): RotationPreviewRow[] {
  return (preview?.playablePages ?? []).map((page) => ({
    durationLabel: `${page.durationSeconds} 秒`,
    id: page.id,
    instanceLabel: `${page.labelZh} / ${page.route}`,
    isCurrent: currentPageId === page.id,
    labelEn: page.labelEn,
    labelZh: page.labelZh,
    orderLabel: padOrder(page.displayOrder),
    pageId: page.pageKey,
    route: page.route,
    stateLabel: currentPageId === page.id ? "目前播放中" : "正式納入",
    stateTone: currentPageId === page.id ? "accent" : "ready",
    templateKey: resolvePreviewTemplateKey(page)
  }));
}

export function buildSkippedRotationRows(preview: DisplayRotationPreview | null): SkippedRotationRow[] {
  return (preview?.skippedPages ?? []).map((page) => ({
    detail: page.detail,
    instanceLabel: `${padOrder(page.displayOrder)} · ${page.labelZh}`,
    labelEn: page.labelEn,
    labelZh: page.labelZh,
    orderLabel: padOrder(page.displayOrder),
    pageId: page.pageKey,
    route: page.route,
    skipReasonLabel: formatRotationSkipReason(page.skipReason),
    skipReasonText: page.skipReason
  }));
}
