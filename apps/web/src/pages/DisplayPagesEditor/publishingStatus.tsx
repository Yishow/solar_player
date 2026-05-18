import type { FallbackPolicy } from "@solar-display/shared";
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
          {blockingCount > 0 ? `draft 有 ${blockingCount} 項 blocking 問題` : "draft 已通過 blocking 檢查"}
        </p>
        {publishingState?.validation.findings.length
          ? publishingState.validation.findings.map((finding) => (
              <p key={`${finding.code}-${finding.regionId ?? "global"}`} className="mt-1">
                [{finding.severity}] {finding.regionId ?? "global"} · {finding.code}
              </p>
            ))
          : <p className="mt-1">目前沒有 validation findings。</p>}
      </div>
      <div className="mt-4 rounded-[18px] border border-[var(--shell-divider)] bg-[rgba(82,91,66,0.04)] px-4 py-3 text-[13px] leading-6 text-[var(--shell-copy-ink)]">
        <p className="font-semibold text-[var(--shell-title-ink)]">
          {publishingState?.fallback.isFallbackActive ? "目前 live 正在 fallback" : "目前 live 未啟用 fallback"}
        </p>
        <p className="mt-1">
          目前 hook fallback policy：{formatFallbackMode(fallbackPolicy.emptyContent)} / {formatFallbackMode(fallbackPolicy.missingAsset)} / {formatFallbackMode(fallbackPolicy.staleData)}
        </p>
        {publishingState?.fallback.items.map((item) => (
          <p key={item.key} className="mt-1">
            {formatFallbackKey(item.key)} · {formatFallbackMode(item.mode)} · {item.active ? "active" : "idle"}
          </p>
        ))}
        {publishingError ? <p className="mt-1 text-[#8f452d]">{publishingError}</p> : null}
      </div>
    </>
  );
}
