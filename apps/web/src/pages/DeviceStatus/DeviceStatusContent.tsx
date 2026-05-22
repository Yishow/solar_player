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
  handleDiagnostic: (action: "export-summary" | "refresh-readiness", label: string) => Promise<void>;
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
  handleDiagnostic,
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
        className="ds-title"
        style={{ left: deviceLayout.title.left, top: deviceLayout.title.top }}
      >
        <h1>
          裝置<em>狀態</em>
        </h1>
        <p>Device Status Details</p>
      </section>

      <aside
        className="ds-aside"
        style={{
          left: deviceLayout.side.left,
          top: deviceLayout.side.top,
          width: deviceLayout.side.width
        }}
      >
        <article className="ds-status-card">
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

        <article className="ds-status-card">
          <span className="ds-status-card__label">
            系統運行時間
            <small>Uptime</small>
          </span>
          <span className="ds-status-card__value is-neutral">{viewModel.systemRows[3]?.value}</span>
          <span className="ds-status-card__detail">服務啟動後累積時間</span>
        </article>

        <article className="ds-status-card">
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
        className="ds-card ds-info"
        style={{
          height: deviceLayout.info.height,
          left: deviceLayout.info.left,
          top: deviceLayout.info.top,
          width: deviceLayout.info.width
        }}
      >
        <h2>
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

        <div style={{ marginTop: 18, borderTop: "1px solid rgba(92, 105, 79, 0.14)", paddingTop: 16 }}>
          <h2 style={{ marginBottom: 12 }}>
            展示營運摘要
            <small>Readiness / Publish / Assets</small>
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
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
              {viewModel.displayOpsSummary.operationalHealthLabel}
              <small style={{ display: "block", opacity: 0.72 }}>
                Operational health · {viewModel.displayOpsSummary.assetHealthLabel}
              </small>
            </div>
          </div>
          <div
            className={`mgmt-status ${displayOpsErrorMessage || displayOpsAccessDenied ? "is-error" : ""}`}
            style={{ marginTop: 12 }}
          >
            {(displayOpsAccessDenied ? "" : displayOpsErrorMessage) || viewModel.displayOpsSummary.helper}
          </div>
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
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
          <div className="mgmt-status" style={{ marginTop: 12 }}>
            {viewModel.displayOpsSummary.safeOpsHelper}
          </div>
          <div className="mgmt-status" style={{ marginTop: 12 }}>
            目前不支援的裝置控制：{viewModel.displayOpsSummary.unsupportedControlsLabel}
          </div>

          <div style={{ marginTop: 16, borderTop: "1px solid rgba(92, 105, 79, 0.14)", paddingTop: 16 }}>
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
                {viewModel.logsSummary.fileCountLabel} · {viewModel.logsSummary.directoryLabel}
              </small>
            </div>
            <div className="mgmt-status" style={{ marginTop: 12 }}>
              {viewModel.logsSummary.detail}
            </div>
          </div>
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
        className="ds-card ds-resource"
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
            disabled={activeAction !== null || displayOpsAccessDenied || Boolean(displayOpsErrorMessage) || isLoading}
            onClick={() => void handleDiagnostic(action.action, action.label)}
          >
            {activeAction === action.action ? "執行中..." : action.label}
            <small>{action.safeScope}</small>
          </button>
        ))}
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
