import type { CSSProperties } from "react";
import {
  DisplayCardFrame,
  DisplayCardHeader
} from "../../../components/displayPageCards";
import type { OverviewAlertItem } from "../viewModel";

const toneLabels: Record<OverviewAlertItem["tone"], string> = {
  danger: "阻斷",
  warning: "警示"
};

export function AlertNotificationsWidget({
  alerts,
  style
}: {
  alerts: OverviewAlertItem[];
  style?: CSSProperties;
}) {
  return (
    <DisplayCardFrame className="overview-dashboard-widget overview-alert-notifications-widget" style={style} surface="info">
      <DisplayCardHeader subtitle="Alert Notifications" title="警示通知" />
      {alerts.length > 0 ? (
        <ul className="overview-alert-list">
          {alerts.map((alert) => (
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
