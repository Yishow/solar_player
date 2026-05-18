import type { DisplayReadinessFinding, DisplayReadinessSourceType } from "@solar-display/shared";

type DisplayReadinessPanelProps = {
  errorMessage: string;
  findings: DisplayReadinessFinding[];
  isLoading: boolean;
  sourceType: DisplayReadinessSourceType;
  title: string;
};

export function DisplayReadinessPanel({
  errorMessage,
  findings,
  isLoading,
  sourceType,
  title
}: DisplayReadinessPanelProps) {
  const scopedFindings = findings.filter((finding) => finding.sourceType === sourceType);

  return (
    <section className="settings-card">
      <div className="settings-card__title">
        {title}
        <small>Display Readiness</small>
      </div>
      {isLoading ? (
        <div className="mgmt-status">正在計算展示 readiness...</div>
      ) : errorMessage ? (
        <div className="mgmt-status is-error">{errorMessage}</div>
      ) : scopedFindings.length === 0 ? (
        <div className="mgmt-status">目前沒有相關 readiness finding。</div>
      ) : (
        <div className="mgmt-status">
          {scopedFindings.map((finding) => (
            <div key={`${finding.pageId}-${finding.requirementKey}`} style={{ marginTop: 6 }}>
              [{finding.status}] {finding.pageId} · {finding.requirementKey}
              <small style={{ display: "block", opacity: 0.72 }}>{finding.reason}</small>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
