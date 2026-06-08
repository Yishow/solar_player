import type { CSSProperties } from "react";
import {
  DisplayCardFrame,
  DisplayCardHeader
} from "../../../components/displayPageCards";
import type { OverviewAlertItem } from "../viewModel";

type OverviewAlertThresholdRow = {
  detail: string;
  id: string;
  title: string;
  tone: "normal";
};

const toneLabels: Record<OverviewAlertItem["tone"] | OverviewAlertThresholdRow["tone"], string> = {
  danger: "阻斷",
  normal: "正常",
  warning: "警示"
};

const thresholdRows: OverviewAlertThresholdRow[] = [
  {
    detail: "門檻 850 kW 以下",
    id: "threshold-real-time-power",
    title: "即時功率過高",
    tone: "normal"
  },
  {
    detail: "門檻 85°C 以下",
    id: "threshold-inverter-temperature",
    title: "逆變器溫度過高",
    tone: "normal"
  },
  {
    detail: "門檻 210 - 240 V",
    id: "threshold-grid-voltage",
    title: "電網電壓異常",
    tone: "normal"
  },
  {
    detail: "門檻 60 秒內恢復",
    id: "threshold-communication",
    title: "通訊中斷",
    tone: "normal"
  }
];

const MAX_VISIBLE_ROWS = 4;

export function AlertNotificationsWidget({
  alwaysShowThresholds = false,
  alerts,
  style
}: {
  alwaysShowThresholds?: boolean;
  alerts: OverviewAlertItem[];
  style?: CSSProperties;
}) {
  const prioritizedAlerts = alerts.slice(0, MAX_VISIBLE_ROWS);
  const visibleThresholdRows = alwaysShowThresholds
    ? thresholdRows.slice(0, Math.max(0, MAX_VISIBLE_ROWS - prioritizedAlerts.length))
    : [];
  const rows: Array<OverviewAlertItem | OverviewAlertThresholdRow> = [
    ...prioritizedAlerts,
    ...visibleThresholdRows
  ];

  return (
    <DisplayCardFrame className="overview-dashboard-widget overview-alert-notifications-widget" style={style} surface="info">
      <div className="overview-alert-header-row">
        <DisplayCardHeader subtitle="Alert Notifications" title="警示通知" />
        {alwaysShowThresholds ? (
          <div aria-hidden="true" className="overview-alert-sound-toggle">
            <span className="overview-alert-sound-label">提醒音</span>
            <span className="overview-alert-sound-switch">
              <span className="overview-alert-sound-thumb" />
            </span>
          </div>
        ) : null}
      </div>
      {rows.length > 0 ? (
        <ul className="overview-alert-list">
          {rows.map((alert) => (
            <li className="overview-alert-item" key={alert.id}>
              <span className={`overview-alert-tone overview-alert-tone-${alert.tone}`}>
                {toneLabels[alert.tone]}
              </span>
              <p className="overview-alert-title">{alert.title}</p>
              <p className="overview-alert-detail">{alert.detail}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="overview-widget-empty">無警示</p>
      )}
    </DisplayCardFrame>
  );
}
