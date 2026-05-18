import React from "react";
import type { DisplayPageAssetHealthEntry, DisplayPageAssetHealthReport, DisplayPageKey } from "@solar-display/shared";

const displayPageLabels: Record<DisplayPageKey, string> = {
  "factory-circuit": "Factory Circuit",
  images: "Images",
  overview: "Overview",
  solar: "Solar",
  sustainability: "Sustainability"
};

function formatReason(reason: string) {
  return reason === "missing-file" ? "檔案遺失" : "素材不存在";
}

function formatPageLabel(pageId: DisplayPageKey) {
  return displayPageLabels[pageId];
}

function renderStateBanner({
  errorMessage,
  healthyLabel,
  isLoading,
  unhealthyLabel
}: {
  errorMessage: string;
  healthyLabel: string;
  isLoading: boolean;
  unhealthyLabel: string;
}) {
  const toneClass = errorMessage
    ? "border-[rgba(180,82,52,0.25)] bg-[rgba(180,82,52,0.08)] text-[#8f452d]"
    : isLoading
      ? "border-[var(--shell-divider)] bg-[rgba(82,91,66,0.05)] text-[var(--shell-copy-ink)]"
      : unhealthyLabel
        ? "border-[rgba(180,82,52,0.25)] bg-[rgba(180,82,52,0.08)] text-[#8f452d]"
        : "border-[rgba(95,140,80,0.24)] bg-[rgba(95,140,80,0.08)] text-[#35552c]";

  return {
    message: errorMessage || (isLoading ? "正在同步素材健康狀態..." : unhealthyLabel || healthyLabel),
    toneClass
  };
}

function entryKey(entry: DisplayPageAssetHealthEntry) {
  return `${typeof entry.assetId}:${entry.assetId}`;
}

export function DisplayPageEditorAssetHealthPanel({
  errorMessage,
  isLoading,
  pageId,
  report
}: {
  errorMessage: string;
  isLoading: boolean;
  pageId: DisplayPageKey;
  report: DisplayPageAssetHealthReport | null;
}) {
  const pageEntries =
    report?.assets.filter((entry) => entry.bindings.some((binding) => binding.pageId === pageId)) ?? [];
  const pageFindings =
    pageEntries.flatMap((entry) => entry.findings.filter((finding) => finding.pageId === pageId));
  const banner = renderStateBanner({
    errorMessage,
    healthyLabel: `${formatPageLabel(pageId)} 的素材引用目前正常`,
    isLoading,
    unhealthyLabel:
      pageFindings.length > 0 ? `${formatPageLabel(pageId)} 有 ${pageFindings.length} 項素材異常` : ""
  });

  return (
    <section className="mt-4 rounded-[18px] border border-[var(--shell-divider)] bg-white/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[var(--shell-subtitle-ink)]">
            Asset Health
          </p>
          <h4 className="mt-1 text-[16px] font-semibold text-[var(--shell-title-ink)]">展示頁素材健康狀態</h4>
        </div>
        <span className="rounded-full bg-[rgba(82,91,66,0.08)] px-3 py-1 text-[12px] font-semibold text-[var(--shell-copy-ink)]">
          {pageFindings.length > 0 ? "Unhealthy" : "Healthy"}
        </span>
      </div>
      <div className={`mt-3 rounded-[14px] border px-3 py-2 text-[13px] ${banner.toneClass}`} role="status">
        {banner.message}
      </div>
      {pageFindings.length > 0 ? (
        <div className="mt-3 space-y-2 text-[13px] text-[var(--shell-copy-ink)]">
          {pageFindings.map((finding) => (
            <div key={`${finding.pageId}-${finding.bindingId}-${finding.reason}`} className="rounded-[14px] border border-[rgba(180,82,52,0.18)] bg-[rgba(180,82,52,0.05)] px-3 py-2">
              <div className="font-semibold text-[var(--shell-title-ink)]">{finding.bindingId}</div>
              <div className="mt-1">{formatReason(finding.reason)}</div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function ImageManagementAssetHealthPanel({
  errorMessage,
  isLoading,
  report
}: {
  errorMessage: string;
  isLoading: boolean;
  report: DisplayPageAssetHealthReport | null;
}) {
  const unhealthyEntries = report?.assets.filter((entry) => entry.status === "unhealthy") ?? [];
  const banner = renderStateBanner({
    errorMessage,
    healthyLabel: `所有展示頁素材引用正常，共追蹤 ${report?.assets.length ?? 0} 個素材引用`,
    isLoading,
    unhealthyLabel: unhealthyEntries.length > 0 ? `目前有 ${unhealthyEntries.length} 個素材引用異常` : ""
  });

  return (
    <section className="rounded-[18px] border border-[rgba(92,105,79,0.18)] bg-[#fffdf8] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[16px] font-semibold text-[var(--shell-title-ink)]">展示引用健康狀態</h3>
          <p className="mt-1 text-[12px] text-[#6e756d]">Display Page Asset Health</p>
        </div>
        <span className="rounded-full bg-[rgba(82,91,66,0.08)] px-3 py-1 text-[12px] font-semibold text-[var(--shell-copy-ink)]">
          {unhealthyEntries.length > 0 ? "Unhealthy" : "Healthy"}
        </span>
      </div>
      <div className={`mt-3 rounded-[14px] border px-3 py-2 text-[13px] ${banner.toneClass}`} role="status">
        {banner.message}
      </div>
      {unhealthyEntries.length > 0 ? (
        <div className="mt-3 space-y-2 text-[13px] text-[var(--shell-copy-ink)]">
          {unhealthyEntries.map((entry) => (
            <div key={entryKey(entry)} className="rounded-[14px] border border-[rgba(180,82,52,0.18)] bg-[rgba(180,82,52,0.05)] px-3 py-2">
              <div className="font-semibold text-[var(--shell-title-ink)]">
                {entry.title ?? entry.filename ?? `Asset ${entry.assetId}`}
              </div>
              <div className="mt-1">
                頁面：{entry.affectedPages.map((pageId) => formatPageLabel(pageId)).join("、")}
              </div>
              <div className="mt-1">原因：{entry.reasons.map(formatReason).join("、")}</div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
