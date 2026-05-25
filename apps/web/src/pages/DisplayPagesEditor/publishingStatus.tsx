import React from "react";
import type { FallbackPolicy } from "@solar-display/shared";
import { localizeFindingSeverity } from "./localization";
import { formatFallbackKey, formatFallbackMode, type DisplayPagePublishingState } from "./publishing";

export function DisplayPagePublishingPanels({
  blockingCount,
  fallbackPolicy,
  publishingError,
  publishingState
}: {
  blockingCount: number;
  fallbackPolicy: FallbackPolicy;
  publishingError: string;
  publishingState?: DisplayPagePublishingState;
}) {
  return (
    <>
      <div className="mt-4 rounded-[18px] border border-[var(--shell-divider)] bg-[rgba(82,91,66,0.04)] px-4 py-3 text-[13px] leading-6 text-[var(--shell-copy-ink)]">
        <p className="font-semibold text-[var(--shell-title-ink)]">
          {blockingCount > 0 ? `草稿有 ${blockingCount} 項阻擋問題` : "草稿已通過阻擋檢查"}
        </p>
        {publishingState?.validation.findings.length
          ? publishingState.validation.findings.map((finding) => (
              <p key={`${finding.code}-${finding.regionId ?? "global"}`} className="mt-1">
                [{localizeFindingSeverity(finding.severity)}] {finding.regionId ?? "全域"} · {finding.code}
              </p>
            ))
          : <p className="mt-1">目前沒有驗證問題。</p>}
      </div>
      <div className="mt-4 rounded-[18px] border border-[var(--shell-divider)] bg-[rgba(82,91,66,0.04)] px-4 py-3 text-[13px] leading-6 text-[var(--shell-copy-ink)]">
        <p className="font-semibold text-[var(--shell-title-ink)]">
          {publishingState?.fallback.isFallbackActive ? "目前正式畫面正在使用替代內容" : "目前正式畫面未啟用替代內容"}
        </p>
        <p className="mt-1">
          目前 fallback 策略：{formatFallbackMode(fallbackPolicy.emptyContent)} / {formatFallbackMode(fallbackPolicy.missingAsset)} / {formatFallbackMode(fallbackPolicy.staleData)}
        </p>
        {publishingState?.fallback.items.map((item) => (
          <p key={item.key} className="mt-1">
            {formatFallbackKey(item.key)} · {formatFallbackMode(item.mode)} · {item.active ? "啟用中" : "閒置"}
          </p>
        ))}
        {publishingError ? <p className="mt-1 text-[#8f452d]">{publishingError}</p> : null}
      </div>
    </>
  );
}
