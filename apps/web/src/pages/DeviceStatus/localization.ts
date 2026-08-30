import type { DisplayFaultTriageKind, DisplayFaultTriageSummary } from "@solar-display/shared";

export const displayClientPageLabels: Record<string, string> = {
  "factory-circuit": "廠區迴路",
  images: "輪播圖庫",
  overview: "總覽首頁",
  solar: "太陽能發電",
  sustainability: "永續減碳"
};

export const alertTextReplacements: Array<[string | RegExp, string]> = [
  ["Asset is still referenced by a live display surface", "素材仍被正式展示頁引用"],
  ["Asset is still referenced by live playlist usage", "素材仍被正式播放清單引用"],
  ["Asset is still referenced by the live cover image", "素材仍被正式封面圖引用"],
  ["live display surface", "正式展示頁面"],
  ["live playlist usage", "正式播放清單引用"],
  ["live cover image", "正式封面圖"],
  ["runtime playlist", "正式播放清單"],
  ["live asset missing", "缺少線上即時素材"],
  ["live asset", "線上即時素材"],
  ["asset missing", "素材檔案遺失"],
  ["active profile missing", "缺少使用中的輪播設定檔"],
  ["offline cache stale", "離線快取已過期"],
  ["draft pending", "有待發布的草稿變更"],
  ["slot conflict:", "迴路槽位衝突："],
  ["slot conflict", "迴路槽位衝突"],
  ["slot-binding-conflict", "迴路槽位綁定衝突"],
  ["slot-binding-missing", "缺少迴路槽位綁定"],
  ["missing mqtt mapping", "缺少 MQTT 測點對應"],
  ["mqtt metric missing", "缺少 MQTT 測點數據"],
  ["missing-asset", "素材檔案遺失"],
  ["missing-file", "檔案不存在"],
  ["offline-unverified-asset", "離線素材尚未驗證"],
  ["unassigned-binding", "未設定數據綁定"],
  ["draft-pending", "有待發布的草稿變更"],
  ["unpublished", "尚未正式發布"],
  ["skip-active", "已被設定為略過播放"],
  ["data-not-ready", "數據尚未就緒"],
  ["stale-runtime", "即時數據已逾時"],
  ["derived-metric-missing", "缺少衍生計算指標"],
  ["readiness-blocking", "展示整備度受阻"],
  ["live-reference", "正式播放中仍有引用"],
  ["asset-unhealthy", "素材狀態異常"],
  ["freshness=waiting", "更新時效：等待同步"],
  ["freshness=stale", "更新時效：訊號延遲"],
  ["freshness=untrusted", "更新時效：不可信"],
  ["freshness=synced", "更新時效：已同步"],
  ["CL today_mwh missing", "中壢廠當日發電量 (today_mwh) 遺失"],
  ["selfConsumptionEnergy", "自發自用電量"],
  ["self_consumption", "自發自用"],
  ["consumption", "用電量"]
];

export function localizeAlertMessage(message: string): string {
  if (!message) return "";
  let localized = message;
  for (const [key, label] of Object.entries(displayClientPageLabels)) {
    localized = localized.replaceAll(key, label);
  }
  for (const [from, to] of alertTextReplacements) {
    if (typeof from === "string") {
      localized = localized.replaceAll(from, to);
    } else {
      localized = localized.replace(from, to);
    }
  }
  return localized.replace(/\s{2,}/g, " ").trim();
}

export function localizeRepairDestination(label: string | null | undefined): string | null {
  if (!label) return null;
  if (label === "MQTT Settings") return "MQTT 設定 (MQTT Settings)";
  if (label === "Circuit Settings") return "迴路設定 (Circuit Settings)";
  if (label === "Playback Settings") return "輪播設定 (Playback Settings)";
  if (label === "Display Pages Editor") return "展示頁面編輯器 (Display Pages Editor)";
  return label;
}

export function localizeActionLabel(action: string, label: string): string {
  if (action === "refresh-readiness" || label === "Refresh readiness") return "更新狀態診斷";
  if (action === "export-summary" || label === "Export summary") return "匯出診斷摘要";
  if (label === "Display diagnostics refreshed") return "展示狀態診斷已更新";
  if (label === "Diagnostics summary exported") return "診斷摘要已成功匯出";
  return label;
}

export function localizeSafeScope(scope: string): string {
  if (scope === "safe-refresh") return "安全重新整理";
  if (scope === "safe-read") return "安全讀取";
  return scope;
}

export function localizeTriageKind(kind: DisplayFaultTriageKind): string {
  switch (kind) {
    case "asset-health":
      return "素材異常";
    case "mqtt-mapping":
      return "MQTT 測點缺失";
    case "slot-binding":
      return "迴路槽位衝突";
    case "runtime-readiness":
      return "即時數據未就緒";
    case "publish-state":
      return "發布狀態待處理";
    case "other":
    default:
      return "營運異常";
  }
}

export function formatTriagePages(summary: DisplayFaultTriageSummary): string {
  return summary.affectedPages.length > 0
    ? summary.affectedPages.map((pageId) => displayClientPageLabels[pageId] ?? pageId).join("、")
    : "全域";
}

export function formatTriageHelper(summary: DisplayFaultTriageSummary): string {
  const destination = localizeRepairDestination(summary.repairDestinationLabel);
  const nextStep = destination
    ? `下一步：${destination}`
    : "請改由管理頁面檢查整體展示整備度。";

  return `受影響頁面：${formatTriagePages(summary)} · 主因：${localizeAlertMessage(summary.dominantReason)} · ${nextStep}`;
}
