import { deviceLayout } from "./layout";
import type { DeviceStatusResponseData } from "../../services/api";
import { type buildDeviceStatusViewModel } from "./viewModel";
import { LeftWingTriagePanel } from "./LeftWingTriagePanel";
import { RightWingMetricsPanel } from "./RightWingMetricsPanel";

type DeviceStatusContentProps = {
  activeAction: string | null;
  displayOpsAccessDenied: boolean;
  displayOpsErrorMessage: string;
  displayOpsLoading: boolean;
  handleDiagnostic: (action: "export-summary" | "refresh-readiness", label: string) => Promise<void>;
  handleKioskExit: () => Promise<void>;
  isLoading: boolean;
  status: DeviceStatusResponseData | null;
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

export function DeviceStatusContent({
  activeAction,
  displayOpsAccessDenied,
  displayOpsErrorMessage,
  displayOpsLoading,
  handleDiagnostic,
  handleKioskExit,
  isLoading,
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

      <section
        className="ds-actions-header"
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
            className="ds-action-btn"
            disabled={activeAction !== null || displayOpsLoading || displayOpsAccessDenied || Boolean(displayOpsErrorMessage)}
            onClick={() => void handleDiagnostic(action.action, action.label)}
          >
            <b>{activeAction === action.action ? "執行中..." : action.label}</b>
            <small>{action.safeScope}</small>
          </button>
        ))}
        <button
          type="button"
          className="ds-action-btn ds-action-danger"
          disabled={activeAction !== null || isLoading}
          onClick={() => void handleKioskExit()}
        >
          <b>{activeAction === "kiosk-exit" ? "離開中..." : "離開系統"}</b>
          <small>離開展示模式</small>
        </button>
      </section>

      <section
        className="ds-kpi-banner"
        style={{
          height: deviceLayout.kpiBar.height,
          left: deviceLayout.kpiBar.left,
          top: deviceLayout.kpiBar.top,
          width: deviceLayout.kpiBar.width
        }}
      >
        <article className="ds-kpi-card mgmt-interactive-card">
          <span className="ds-kpi-card__label">
            裝置運作狀態
            <small>主機與遙測</small>
          </span>
          <span className={`ds-kpi-card__value ${runtimeValueClass}`}>
            {viewModel.runtimeSummary.title}
          </span>
          <span className="ds-kpi-card__detail">{viewModel.runtimeSummary.detail}</span>
          <span className={`ds-kpi-card__icon ${runtimeIconClass}`}>
            <CheckGlyph />
          </span>
        </article>

        <article className="ds-kpi-card mgmt-interactive-card">
          <span className="ds-kpi-card__label">
            系統運行時間
            <small>累積開機時間</small>
          </span>
          <span className="ds-kpi-card__value is-neutral">{viewModel.uptimeLabel}</span>
          <span className="ds-kpi-card__detail">服務啟動後累積時間</span>
        </article>

        <article className="ds-kpi-card mgmt-interactive-card">
          <span className="ds-kpi-card__label">
            展示營運摘要
            <small>播放與營運狀態</small>
          </span>
          <span
            className={`ds-kpi-card__value ${
              viewModel.displayOpsSummary.degraded ? "is-warning" : "is-neutral"
            }`}
          >
            {displayOpsAccessDenied
              ? viewModel.displayOpsSummary.statusTitle
              : displayOpsErrorMessage
                ? "摘要不可用"
                : viewModel.displayOpsSummary.statusTitle}
          </span>
          <span className="ds-kpi-card__detail">
            {(displayOpsAccessDenied ? "" : displayOpsErrorMessage) ||
              `${viewModel.displayOpsSummary.liveVersion} · ${viewModel.displayOpsSummary.operationalHealthLabel} · ${viewModel.displayOpsSummary.configurationReadinessLabel}`}
          </span>
        </article>

        <article className="ds-kpi-card mgmt-interactive-card">
          <span className="ds-kpi-card__label">
            展示警示
            <small>警示項目彙整</small>
          </span>
          <span
            className={`ds-kpi-card__value ${
              viewModel.displayOpsSummary.alerts.length > 0 ? "is-warning" : "is-neutral"
            }`}
          >
            {viewModel.alertsTriage.summaryTitle}
          </span>
          <span className="ds-kpi-card__detail">{viewModel.alertsTriage.helper}</span>
        </article>

        <article className="ds-kpi-card mgmt-interactive-card">
          <span className="ds-kpi-card__label">
            時間同步狀態
            <small>時鐘校時狀態</small>
          </span>
          <span
            className={`ds-kpi-card__value ${
              viewModel.timeSyncSummary.tone === "is-good"
                ? ""
                : viewModel.timeSyncSummary.tone === "is-warning"
                  ? "is-warning"
                  : "is-error"
            }`}
          >
            {viewModel.timeSyncSummary.stateLabel}
          </span>
          <span className="ds-kpi-card__detail">
            {viewModel.timeSyncSummary.formattedTime}
          </span>
        </article>
      </section>

      {/* === Left Wing Panel: Display Operations & Triage === */}
      <section
        className="ds-wing-panel ds-wing-left mgmt-surface mgmt-surface--status-dashboard mgmt-interactive-card"
        style={{
          height: deviceLayout.leftPanel.height,
          left: deviceLayout.leftPanel.left,
          top: deviceLayout.leftPanel.top,
          width: deviceLayout.leftPanel.width
        }}
      >
        <LeftWingTriagePanel
          displayOpsAccessDenied={displayOpsAccessDenied}
          displayOpsErrorMessage={displayOpsErrorMessage}
          viewModel={viewModel}
        />
      </section>

      {/* === Right Wing Panel: Resources, Logs & Device Specifications === */}
      <section
        className="ds-wing-panel ds-wing-right mgmt-surface mgmt-surface--status-dashboard mgmt-interactive-card"
        style={{
          height: deviceLayout.rightPanel.height,
          left: deviceLayout.rightPanel.left,
          top: deviceLayout.rightPanel.top,
          width: deviceLayout.rightPanel.width
        }}
      >
        <RightWingMetricsPanel viewModel={viewModel} />
      </section>
    </section>
  );
}
