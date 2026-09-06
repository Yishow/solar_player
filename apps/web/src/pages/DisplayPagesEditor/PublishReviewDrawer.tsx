import { localizeFindingSeverity } from "./localization";
import { formatFallbackKey, formatFallbackMode, type DisplayPagePublishingState } from "./publishing";

export function PublishReviewDrawer({
  blockingCount,
  onClose,
  onConfirmPublish,
  publishingError,
  publishingState
}: {
  blockingCount: number;
  onClose: () => void;
  onConfirmPublish: () => void;
  publishingError: string;
  publishingState?: DisplayPagePublishingState;
}) {
  const findings = publishingState?.validation.findings ?? [];
  return (
    <aside className="space-y-3" data-publish-review-drawer>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[16px] font-semibold">發布檢查</h3>
        <button className="mgmt-action min-h-[40px]" onClick={onClose} type="button">關閉</button>
      </div>
      <p className="text-sm">這是檢查結果，還沒發布。確認後才會寫入正式畫面。</p>
      <p className="text-sm" data-publish-review-blocking>
        {blockingCount > 0 ? `有 ${blockingCount} 項阻擋問題` : "沒有阻擋問題"}
      </p>
      {findings.map((finding) => (
        <p className="text-sm" key={`${finding.code}-${finding.regionId ?? "global"}`}>
          [{localizeFindingSeverity(finding.severity)}] {finding.regionId ?? "全域"} · {finding.message ?? finding.code}
        </p>
      ))}
      {publishingState?.fallback.items.map((item) => (
        <p className="text-sm" key={item.key}>
          {formatFallbackKey(item.key)} · {formatFallbackMode(item.mode)} · {item.active ? "啟用中" : "閒置"}
        </p>
      ))}
      {publishingError ? <p className="text-sm text-[#8f452d]">{publishingError}</p> : null}
      <button
        className="mgmt-action primary min-h-[40px]"
        data-publish-review-confirm
        disabled={blockingCount > 0}
        onClick={onConfirmPublish}
        type="button"
      >
        確認發布
      </button>
    </aside>
  );
}
