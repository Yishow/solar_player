import { deviceAssetRuntimeMap } from "./assets";
import { deviceLayout } from "./layout";
import { type DeviceActionFeedback, buildDeviceStatusViewModel } from "./viewModel";

type DeviceRouteStatus = {
  hostname: string;
  platform: string;
  arch: string;
  nodeVersion: string;
  uptimeSeconds: number;
  cpu: { cores: number; loadAvg: [number, number, number] };
  memory: { totalMB: number; usedMB: number; freeMB: number; usePercent: number };
  disk: { totalMB: number; usedMB: number; availableMB: number; usePercent: number };
  pid: number;
};

type DeviceStatusContentProps = {
  activeAction: string | null;
  displayOpsAccessDenied: boolean;
  displayOpsErrorMessage: string;
  displayOpsLoading: boolean;
  handleDiagnostic: (action: "export-summary" | "refresh-readiness", label: string) => Promise<void>;
  handleKioskExit: () => Promise<void>;
  isLoading: boolean;
  status: DeviceRouteStatus | null;
  viewModel: ReturnType<typeof buildDeviceStatusViewModel>;
};

function CheckGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

function NetworkGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 9c5-4 11-4 16 0M7 12c3-2 7-2 10 0M10 15c1-1 3-1 4 0" />
      <circle cx="12" cy="19" r="1" fill="currentColor" />
    </svg>
  );
}

export function DeviceStatusContent({
  activeAction,
  displayOpsAccessDenied,
  displayOpsErrorMessage,
  displayOpsLoading,
  handleDiagnostic,
  handleKioskExit,
  isLoading,
  status,
  viewModel
}: DeviceStatusContentProps) {
  const runtimeOk = viewModel.runtimeSummary.title === "正常運作";
  const runtimeError = viewModel.runtimeSummary.title === "同步失敗";
  const runtimeIconClass = runtimeError ? "is-error" : runtimeOk ? "" : "is-warning";
  const runtimeValueClass = runtimeError ? "is-error" : runtimeOk ? "" : "is-warning";

  return (
    <section className="ds-page">
      <section
        className="ds-title mgmt-page-title"
        style={{ left: deviceLayout.title.left, top: deviceLayout.title.top }}
      >
        <h1 className="mgmt-page-title__heading">
          裝置<em>狀態</em>
        </h1>
        <p className="mgmt-page-title__subtitle">Device Status</p>
      </section>

      <aside
        className="ds-aside"
        style={{
          left: deviceLayout.side.left,
          top: deviceLayout.side.top,
          width: deviceLayout.side.width
        }}
      >
        <article className="ds-status-card mgmt-surface mgmt-surface--status-dashboard mgmt-interactive-card">
          <span className="ds-status-card__label">
            裝置運作狀態
            <small>Device Operation Status</small>
          </span>
          <span className={`ds-status-card__value ${runtimeValueClass}`}>
            {viewModel.runtimeSummary.title}
          </span>
          <span className="ds-status-card__detail">{viewModel.runtimeSummary.detail}</span>
          <span className={`ds-status-card__icon ${runtimeIconClass}`}>
            <CheckGlyph />
          </span>
        </article>

        <article className="ds-status-card mgmt-surface mgmt-surface--status-dashboard mgmt-interactive-card">
          <span className="ds-status-card__label">
            系統運行時間
            <small>Uptime</small>
          </span>
          <span className="ds-status-card__value is-neutral">{viewModel.systemRows[3]?.value}</span>
          <span className="ds-status-card__detail">服務啟動後累積時間</span>
        </article>

        <article className="ds-status-card mgmt-surface mgmt-surface--status-dashboard mgmt-interactive-card">
          <span className="ds-status-card__label">
            展示營運摘要
            <small>Display Operations</small>
          </span>
          <span
            className={`ds-status-card__value ${
              viewModel.displayOpsSummary.degraded ? "is-warning" : "is-neutral"
            }`}
          >
            {displayOpsAccessDenied
              ? viewModel.displayOpsSummary.statusTitle
              : displayOpsErrorMessage
                ? "摘要不可用"
                : viewModel.displayOpsSummary.statusTitle}
          </span>
          <span className="ds-status-card__detail">
            {(displayOpsAccessDenied ? "" : displayOpsErrorMessage) ||
              `${viewModel.displayOpsSummary.liveVersion} · ${viewModel.displayOpsSummary.operationalHealthLabel} · ${viewModel.displayOpsSummary.configurationReadinessLabel}`}
          </span>
        </article>
      </aside>

      <section
        className="ds-card ds-info mgmt-surface mgmt-surface--status-dashboard mgmt-interactive-card"
        style={{
          height: deviceLayout.info.height,
          left: deviceLayout.info.left,
          top: deviceLayout.info.top,
          width: deviceLayout.info.width
        }}
      >
        <h2>
          事件分流
          <small>Incident Triage</small>
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

        <div className="ds-section ds-diagnostics-panel">
          <h2 style={{ marginBottom: 12 }}>
            Safe Diagnostics Result
            <small>Host-level escalation / truthful safe scope</small>
          </h2>
          <div className="mgmt-stat-strip ds-display-ops-stats" data-surface-family="status-dashboard">
            <div className="mgmt-status">
              Live {viewModel.displayOpsSummary.liveVersion}
              <small style={{ display: "block", opacity: 0.72 }}>
                最近發布 {viewModel.displayOpsSummary.lastPublishLabel}
              </small>
            </div>
            <div className="mgmt-status">
              Draft backlog {viewModel.displayOpsSummary.draftCount}
              <small style={{ display: "block", opacity: 0.72 }}>
                {viewModel.displayOpsSummary.skipLabel}
              </small>
            </div>
            <div className="mgmt-status">
              {viewModel.displayOpsSummary.configurationReadinessLabel}
              <small style={{ display: "block", opacity: 0.72 }}>
                Configuration readiness
              </small>
            </div>
            <div className="mgmt-status">
              {viewModel.diagnosticsSurface.hostEscalationLabel}
              <small style={{ display: "block", opacity: 0.72 }}>
                Host-level escalation
              </small>
            </div>
          </div>
          <div className={`mgmt-status ${viewModel.feedback.tone === "error" ? "is-error" : ""}`} style={{ marginTop: 12 }}>
            {viewModel.diagnosticsSurface.resultTitle}
            <small style={{ display: "block", opacity: 0.72 }}>
              {viewModel.diagnosticsSurface.resultDetail}
            </small>
          </div>
          <div className="mgmt-status" style={{ marginTop: 12 }}>
            Safe scope：{viewModel.diagnosticsSurface.safeScopeLabel}
          </div>
          <div className="mgmt-status" style={{ marginTop: 12 }}>
            {displayOpsErrorMessage || displayOpsAccessDenied
              ? (displayOpsAccessDenied ? "" : displayOpsErrorMessage)
              : viewModel.displayOpsSummary.helper}
          </div>
          <div className="mgmt-status" style={{ marginTop: 12 }}>
            Host-level escalation：{viewModel.diagnosticsSurface.hostEscalationLabel} · Runbook：{viewModel.diagnosticsSurface.runbookPath}
          </div>
          <div className="mgmt-status" style={{ marginTop: 12 }}>
            目前不支援的裝置控制：{viewModel.displayOpsSummary.unsupportedControlsLabel}
            {viewModel.diagnosticsSurface.unsupportedActions.length > 0 ? (
              <small style={{ display: "block", opacity: 0.72 }}>
                {viewModel.diagnosticsSurface.unsupportedActions.map((action) => `${action.label}: ${action.guidance}`).join(" / ")}
              </small>
            ) : null}
          </div>
        </div>

        <div className="ds-section ds-triage-grid">
          <article className="ds-triage-panel">
            <h2 style={{ marginBottom: 12 }}>
              Display Alerts
              <small>Purpose / priority / repair path</small>
            </h2>
            <div className="mgmt-status">
              {viewModel.alertsTriage.summaryTitle}
              <small style={{ display: "block", opacity: 0.72 }}>
                {viewModel.alertsTriage.helper}
              </small>
            </div>
            <div className="ds-triage-list">
              {(displayOpsErrorMessage || displayOpsAccessDenied ? [] : viewModel.displayOpsSummary.alerts).map((alert) => (
                <div
                  key={`${alert.code}-${alert.pageLabel}-${alert.message}`}
                  className={`mgmt-status ${alert.severity === "blocking" ? "is-error" : ""}`}
                >
                  [{alert.domainLabel}] [{alert.pageLabel}] {alert.message}
                </div>
              ))}
              {!displayOpsErrorMessage && !displayOpsAccessDenied && viewModel.displayOpsSummary.alerts.length === 0 ? (
                <div className="mgmt-status">目前沒有 display readiness、skip 或 asset 警示。</div>
              ) : null}
            </div>
          </article>

          <article className="ds-triage-panel">
            <h2 style={{ marginBottom: 12 }}>
              展示端心跳
              <small>Display Client Liveness</small>
            </h2>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {viewModel.displayClientSummary.badges.map((badge) => (
                <div key={badge.label} className={`mgmt-status ${badge.tone}`}>
                  {badge.label} {badge.count}
                </div>
              ))}
              <div className="mgmt-status">{viewModel.displayClientSummary.totalLabel}</div>
            </div>
            <div className="ds-triage-list">
              {viewModel.displayClientSummary.rows.map((client) => (
                <div key={client.socketId} className={`mgmt-status ${client.badgeTone}`}>
                  <strong>{client.pageLabel}</strong> · {client.playbackLabel} · {client.lastSeenLabel}
                  <small style={{ display: "block", opacity: 0.72 }}>
                    {client.stateLabel} · {client.routeLabel}
                  </small>
                </div>
              ))}
              {viewModel.displayClientSummary.rows.length === 0 ? (
                <div className="mgmt-status">目前沒有展示端 heartbeat。</div>
              ) : null}
            </div>
          </article>

          <article className="ds-triage-panel">
            <h2 style={{ marginBottom: 12 }}>
              系統日誌
              <small>Recent Logs</small>
            </h2>
            <div
              className={`mgmt-status ${
                viewModel.logsSummary.statusTitle === "日誌不可用" ? "is-error" : ""
              }`}
            >
              {viewModel.logsSummary.statusTitle}
              <small style={{ display: "block", opacity: 0.72 }}>
                {viewModel.logsTriage.helper}
              </small>
            </div>
            <div className="mgmt-status" style={{ marginTop: 12 }}>
              {viewModel.logsTriage.detail}
              <small style={{ display: "block", opacity: 0.72 }}>
                {viewModel.logsTriage.needsHostInvestigation ? "目前建議準備 host-level investigation。" : "目前可先在 app 內完成 triage。"}
              </small>
            </div>
          </article>
        </div>

        <div className="ds-section">
          <h2 style={{ marginBottom: 12 }}>
            裝置資訊
            <small>Device Information</small>
          </h2>
          <dl>
            {viewModel.systemRows.map((row) => (
              <div key={row.label} className="contents">
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
            {viewModel.networkRows.map((row) => (
              <div key={row.label} className="contents">
                <dt>{row.label}</dt>
                <dd className={row.value.includes("●") ? "is-good" : ""}>{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <figure
        className="ds-photo"
        style={{
          height: deviceLayout.photo.height,
          left: deviceLayout.photo.left,
          top: deviceLayout.photo.top,
          width: deviceLayout.photo.width,
          margin: 0
        }}
      >
        <img alt="Device board" src={deviceAssetRuntimeMap.photo} />
      </figure>

      <section
        className="ds-card ds-resource mgmt-surface mgmt-surface--status-dashboard mgmt-interactive-card"
        style={{
          height: deviceLayout.resource.height,
          left: deviceLayout.resource.left,
          top: deviceLayout.resource.top,
          width: deviceLayout.resource.width
        }}
      >
        <h2>
          系統資源監控
          <small>System Resource Monitor</small>
        </h2>
        <div className="ds-gauge-grid">
          {viewModel.resourceCards.map((card) => (
            <div key={card.label} className="ds-gauge">
              <div
                className="ds-gauge-ring"
                style={{
                  ["--gauge-color" as string]: card.gaugeColor,
                  ["--gauge-value" as string]: String(card.gaugePercent)
                }}
              >
                <span style={{ color: card.gaugeColor }}>{card.gaugeValue}</span>
              </div>
              <p>
                {card.label}
                <small>{card.helper}</small>
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        className="ds-network"
        style={{
          height: deviceLayout.network.height,
          left: deviceLayout.network.left,
          top: deviceLayout.network.top,
          width: deviceLayout.network.width
        }}
      >
        <span className="ds-network__icon">
          <NetworkGlyph />
        </span>
        <div className="ds-network__row">
          <b>網路狀態</b>
          <small>Network Status</small>
          <span>{viewModel.networkRows[0]?.value}</span>
        </div>
        <div className="ds-network__row">
          <b>訊號強度</b>
          <small>Signal Strength</small>
          <span style={{ color: "#5d655d" }}>{viewModel.networkRows[1]?.value}</span>
        </div>
      </section>

      <section
        className="ds-actions"
        style={{
          height: deviceLayout.actions.height,
          left: deviceLayout.actions.left,
          top: deviceLayout.actions.top,
          width: deviceLayout.actions.width
        }}
      >
        {viewModel.displayOpsSummary.diagnostics.map((action) => (
          <button
            key={action.action}
            type="button"
            className="ds-action"
            disabled={activeAction !== null || displayOpsLoading || displayOpsAccessDenied || Boolean(displayOpsErrorMessage)}
            onClick={() => void handleDiagnostic(action.action, action.label)}
          >
            {activeAction === action.action ? "執行中..." : action.label}
            <small>{action.safeScope}</small>
          </button>
        ))}
        <button
          type="button"
          className="ds-action"
          disabled={activeAction !== null || isLoading}
          onClick={() => void handleKioskExit()}
        >
          {activeAction === "kiosk-exit" ? "離開中..." : "離開系統"}
          <small>回到桌面後點擊 Solar Display Kiosk 重新進入</small>
        </button>
      </section>

      <div
        className={`ds-feedback ${
          viewModel.feedback.tone === "error"
            ? "is-error"
            : viewModel.feedback.tone === "loading"
              ? "is-loading"
              : ""
        }`}
        style={{
          height: deviceLayout.feedback.height,
          left: deviceLayout.feedback.left,
          top: deviceLayout.feedback.top,
          width: deviceLayout.feedback.width
        }}
        role="status"
      >
        <b>{viewModel.feedback.title}</b>
        <span style={{ opacity: 0.85 }}>{viewModel.feedback.detail}</span>
      </div>
    </section>
  );
}
