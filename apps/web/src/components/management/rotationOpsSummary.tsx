import type { ReactNode } from "react";
import {
  OpsActionRow,
  OpsInfoBanner,
  OpsStatStrip,
  OpsSurface,
  OpsSurfaceTitle
} from "./opsSurfacePrimitives";

type RotationOpsSummaryTone = "ready" | "warning" | "error" | "accent" | "default";

export type RotationOpsSummaryStat = {
  label: string;
  value: string;
  valueTone: RotationOpsSummaryTone;
};

export type RotationOpsSummaryItem = {
  detail?: string | null;
  key: string;
  label: string;
  tone: "ready" | "warning" | "error";
};

export type RotationOpsSummaryStatus = {
  detail: string;
  title: string;
  tone: "ready" | "warning" | "error";
};

function resolveValueToneClass(valueTone: RotationOpsSummaryTone) {
  if (valueTone === "ready") return "is-ready";
  if (valueTone === "warning") return "is-warning";
  if (valueTone === "error") return "is-error";
  if (valueTone === "accent") return "is-accent";
  return "";
}

export function RotationOpsSummary({
  actions,
  children,
  items = [],
  stats,
  status,
  subtitle,
  title
}: {
  actions?: ReactNode;
  children?: ReactNode;
  items?: RotationOpsSummaryItem[];
  stats: RotationOpsSummaryStat[];
  status: RotationOpsSummaryStatus;
  subtitle: string;
  title: string;
}) {
  return (
    <OpsSurface className="rotation-ops-summary" family="preview">
      <OpsSurfaceTitle caption={subtitle} title={title} />
      <OpsStatStrip className="rotation-ops-summary__stats" family="preview">
        {stats.map((stat) => (
          <div key={stat.label} className="mgmt-stat rotation-ops-summary__stat">
            <span className="mgmt-stat__label">{stat.label}</span>
            <span className={`mgmt-stat__value ${resolveValueToneClass(stat.valueTone)}`.trim()}>
              {stat.value}
            </span>
          </div>
        ))}
      </OpsStatStrip>
      <OpsInfoBanner
        className="rotation-ops-summary__status"
        detail={status.detail}
        title={status.title}
        tone={status.tone}
      />
      {children}
      {items.length > 0 ? (
        <div className="rotation-ops-summary__items">
          {items.map((item) => (
            <div
              key={item.key}
              className={`mgmt-status ${item.tone !== "ready" ? `is-${item.tone}` : ""} rotation-ops-summary__item`.trim()}
            >
              <strong>{item.label}</strong>
              {item.detail ? <small>{item.detail}</small> : null}
            </div>
          ))}
        </div>
      ) : null}
      {actions ? <OpsActionRow className="rotation-ops-summary__actions">{actions}</OpsActionRow> : null}
    </OpsSurface>
  );
}
