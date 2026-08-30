import type { buildDeviceStatusViewModel } from "./viewModel";

type LeftWingTriagePanelProps = {
  displayOpsAccessDenied: boolean;
  displayOpsErrorMessage: string;
  viewModel: ReturnType<typeof buildDeviceStatusViewModel>;
};

export function LeftWingTriagePanel({
  displayOpsAccessDenied,
  displayOpsErrorMessage,
  viewModel
}: LeftWingTriagePanelProps) {
  return (
    <>
      <div className="ds-section-block">
        <h2>
          事件分流
          <small>事件快速排查與修復引導</small>
        </h2>
        <div className="ds-hero-grid">
          {viewModel.heroCards.map((card) => (
            <article
              key={card.title}
              className={`ds-hero-card${card.tone === "error" ? " is-error" : card.tone === "warning" ? " is-warning" : ""}`}
            >
              <strong>{card.title}</strong>
              <b>{card.value}</b>
              <small>{card.detail}</small>
            </article>
          ))}
        </div>
      </div>

      <div className="ds-section-block ds-diagnostics-block">
        <h2>
          安全診斷結果
          <small>安全操作與處置邊界</small>
        </h2>
        <div className="mgmt-stat-strip ds-display-ops-stats" data-surface-family="status-dashboard">
          <div className="mgmt-status ds-diag-stat">
            <span className="ds-diag-stat__label">運行版本</span>
            <strong className="ds-diag-stat__value">{viewModel.displayOpsSummary.liveVersion}</strong>
            <small className="ds-diag-stat__hint">
              最近發布 {viewModel.displayOpsSummary.lastPublishLabel}
            </small>
          </div>
          <div className="mgmt-status ds-diag-stat">
            <span className="ds-diag-stat__label">待發布草稿</span>
            <strong className="ds-diag-stat__value">{viewModel.displayOpsSummary.draftCount} 筆</strong>
            <small className="ds-diag-stat__hint">
              {viewModel.displayOpsSummary.skipLabel}
            </small>
          </div>
          <div className="mgmt-status ds-diag-stat">
            <span className="ds-diag-stat__label">設定整備度</span>
            <strong className="ds-diag-stat__value">{viewModel.displayOpsSummary.configurationReadinessLabel}</strong>
            <small className="ds-diag-stat__hint">
              {viewModel.displayOpsSummary.operationalHealthLabel}
            </small>
          </div>
          <div className="mgmt-status ds-diag-stat">
            <span className="ds-diag-stat__label">主機層處置</span>
            <strong className="ds-diag-stat__value ds-diag-stat__code">{viewModel.diagnosticsSurface.hostEscalationLabel}</strong>
            <small className="ds-diag-stat__hint">
              操作手冊：{viewModel.diagnosticsSurface.runbookPath}
            </small>
          </div>
        </div>

        <div className="ds-diagnostics-stack">
          <div className={`mgmt-status ds-diag-hero-card ${viewModel.feedback.tone === "error" ? "is-error" : ""}`}>
            <div className="ds-diag-hero-card__header">
              <span className="ds-diag-hero-card__dot" />
              <b>{viewModel.diagnosticsSurface.resultTitle}</b>
            </div>
            <p className="ds-diag-hero-card__detail">
              {viewModel.diagnosticsSurface.resultDetail}
            </p>
          </div>

          <div className="mgmt-status ds-diag-row">
            <span className="ds-diag-row__badge">安全邊界</span>
            <span>安全範圍：{viewModel.diagnosticsSurface.safeScopeLabel} · 主機層處置：<code>{viewModel.diagnosticsSurface.hostEscalationLabel}</code></span>
          </div>

          <div className="mgmt-status ds-diag-row">
            <span className="ds-diag-row__badge ds-diag-row__badge--info">營運輔助</span>
            <span>
              {displayOpsErrorMessage || displayOpsAccessDenied
                ? (displayOpsAccessDenied ? "" : displayOpsErrorMessage)
                : viewModel.displayOpsSummary.helper}
            </span>
          </div>

          {viewModel.diagnosticsSurface.unsupportedActions.length > 0 ? (
            <div className="mgmt-status ds-diag-row is-warning">
              <span className="ds-diag-row__badge ds-diag-row__badge--warn">限制操作</span>
              <div>
                目前不支援的裝置控制：{viewModel.displayOpsSummary.unsupportedControlsLabel}
                <small style={{ display: "block", opacity: 0.8, marginTop: 2 }}>
                  {viewModel.diagnosticsSurface.unsupportedActions.map((action) => `${action.label}: ${action.guidance}`).join(" / ")}
                </small>
              </div>
            </div>
          ) : null}
        </div>

        <div
          className={`ds-card-feedback ${
            viewModel.feedback.tone === "error"
              ? "is-error"
              : viewModel.feedback.tone === "loading"
                ? "is-loading"
                : ""
          }`}
          role="status"
        >
          <b>{viewModel.feedback.title}</b>
          <span>{viewModel.feedback.detail}</span>
        </div>
      </div>

      <div className="ds-section-block ds-triage-grid">
        <article className="ds-triage-panel">
          <h2>
            展示端心跳
            <small>連線與同步狀態</small>
          </h2>
          <div className="ds-hb-badge-list">
            {viewModel.displayClientSummary.badges.map((badge) => (
              <div key={badge.label} className={`ds-hb-badge ${badge.tone}`}>
                <span className="ds-hb-badge__dot" />
                {badge.label} <b>{badge.count}</b>
              </div>
            ))}
            <div className="ds-hb-badge ds-hb-badge--total">{viewModel.displayClientSummary.totalLabel}</div>
          </div>
          <div className="mgmt-status ds-diag-row" style={{ margin: "6px 0" }}>
            <span className="ds-diag-row__badge ds-diag-row__badge--info">配對紀錄</span>
            <span>未配對存取：{viewModel.unpairedDisplayAccessSummary.totalLabel} · 最近發生：{viewModel.unpairedDisplayAccessSummary.lastSeenLabel}</span>
          </div>
          <div className="ds-triage-list">
            {viewModel.displayClientSummary.rows.map((client) => (
              <div key={client.deviceId} className={`mgmt-status ds-client-card ${client.badgeTone}`}>
                <div className="ds-client-card__header">
                  <strong>{client.clientId}</strong>
                  <span className="ds-client-card__tags">
                    <span>{client.groupLabel}</span> · <span>{client.siteLabel}</span> · <span className="ds-client-card__conn">{client.connectionLabel}</span>
                  </span>
                </div>
                <small className="ds-client-card__detail">
                  {client.pageLabel} · {client.playbackLabel} · {client.lastSeenLabel} · {client.stateLabel} · {client.timeSyncLabel} · {client.routeLabel}
                  <br />展示同步：{client.runtimeSyncStateLabel} · 最後同步：{client.runtimeSyncResolvedAtLabel === "--" ? "未回報" : client.runtimeSyncResolvedAtLabel}
                </small>
                {client.duplicateWarningLabel ? (
                  <span
                    className="mgmt-status is-warning"
                    style={{ display: "inline-block", marginTop: 6 }}
                  >
                    {client.duplicateWarningLabel}
                  </span>
                ) : null}
              </div>
            ))}
            {viewModel.displayClientSummary.rows.length === 0 ? (
              <div className="mgmt-status ds-empty-status">目前沒有展示端 heartbeat。</div>
            ) : null}
          </div>
        </article>

        <article className="ds-triage-panel">
          <h2>
            展示警示
            <small>警示優先級與修復路徑</small>
          </h2>
          <div className="ds-triage-list">
            {(displayOpsErrorMessage || displayOpsAccessDenied ? [] : viewModel.displayOpsSummary.alerts).map((alert) => (
              <div
                key={`${alert.code}-${alert.pageLabel}-${alert.message}`}
                className={`mgmt-status ds-alert-item ${alert.severity === "blocking" ? "is-error" : "is-warning"}`}
              >
                <span className="ds-alert-item__badge">[{alert.domainLabel}]</span>
                <span className="ds-alert-item__page">[{alert.pageLabel}]</span>
                <span className="ds-alert-item__msg">{alert.message}</span>
              </div>
            ))}
            {!displayOpsErrorMessage && !displayOpsAccessDenied && viewModel.displayOpsSummary.alerts.length === 0 ? (
              <div className="mgmt-status ds-empty-good">
                <span className="ds-empty-good__icon">✓</span>
                <span>所有展示頁面運作正常，無整備阻擋或素材缺失。</span>
              </div>
            ) : null}
          </div>
        </article>
      </div>
    </>
  );
}
