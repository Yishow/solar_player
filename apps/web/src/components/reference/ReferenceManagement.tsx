import type { PropsWithChildren, ReactNode } from "react";
import { ReferenceGlyph, type ReferenceGlyphName } from "../ReferenceGlyph";
import { StatusBadge } from "../StatusBadge";
import "./referenceManagement.css";

export type ReferenceTone =
  | "accent"
  | "danger"
  | "default"
  | "muted"
  | "success"
  | "warning";

type ReferencePanelProps = PropsWithChildren<{
  actions?: ReactNode;
  bodyClassName?: string;
  className?: string;
  icon?: ReferenceGlyphName;
  subtitle?: string;
  title: string;
}>;

type ReferenceStatCardProps = {
  className?: string;
  helper: string;
  icon?: ReferenceGlyphName;
  subtitle?: string;
  title: string;
  tone?: ReferenceTone;
  value: string;
};

type ReferenceStatusBannerProps = {
  className?: string;
  detail: string;
  icon?: ReferenceGlyphName;
  statusLabel?: string;
  statusTone?: "connected" | "connecting" | "disconnected";
  title: string;
  tone?: ReferenceTone;
};

type ReferenceFormRowProps = PropsWithChildren<{
  className?: string;
  description?: string;
  label: string;
  stacked?: boolean;
  subtitle?: string;
}>;

type ReferenceEmptyStateProps = {
  className?: string;
  description: string;
  title: string;
};

function toneClassName(tone: ReferenceTone) {
  switch (tone) {
    case "accent":
      return "reference-mgmt-tone-accent";
    case "danger":
      return "reference-mgmt-tone-danger";
    case "muted":
      return "reference-mgmt-tone-muted";
    case "success":
      return "reference-mgmt-tone-success";
    case "warning":
      return "reference-mgmt-tone-warning";
    default:
      return "reference-mgmt-tone-default";
  }
}

export function ReferencePanel({
  actions,
  bodyClassName,
  children,
  className,
  icon,
  subtitle,
  title
}: ReferencePanelProps) {
  return (
    <section className={["reference-mgmt-panel", className ?? ""].join(" ").trim()}>
      <header className="reference-mgmt-panel__header">
        <div className="reference-mgmt-panel__heading">
          {icon ? (
            <span className="reference-mgmt-panel__icon" aria-hidden="true">
              <ReferenceGlyph name={icon} />
            </span>
          ) : null}
          <div>
            <h3 className="reference-mgmt-panel__title">{title}</h3>
            {subtitle ? <p className="reference-mgmt-panel__subtitle">{subtitle}</p> : null}
          </div>
        </div>
        {actions ? <div className="reference-mgmt-panel__actions">{actions}</div> : null}
      </header>
      <div className={["reference-mgmt-panel__body", bodyClassName ?? ""].join(" ").trim()}>
        {children}
      </div>
    </section>
  );
}

export function ReferenceStatCard({
  className,
  helper,
  icon,
  subtitle,
  title,
  tone = "default",
  value
}: ReferenceStatCardProps) {
  return (
    <article
      className={[
        "reference-mgmt-stat",
        toneClassName(tone),
        className ?? ""
      ].join(" ").trim()}
    >
      {icon ? (
        <span className="reference-mgmt-stat__icon" aria-hidden="true">
          <ReferenceGlyph name={icon} />
        </span>
      ) : null}
      <div className="reference-mgmt-stat__label">{title}</div>
      {subtitle ? <div className="reference-mgmt-stat__subtitle">{subtitle}</div> : null}
      <div className="reference-mgmt-stat__value">{value}</div>
      <p className="reference-mgmt-stat__helper">{helper}</p>
    </article>
  );
}

export function ReferenceStatusBanner({
  className,
  detail,
  icon,
  statusLabel,
  statusTone,
  title,
  tone = "default"
}: ReferenceStatusBannerProps) {
  return (
    <div
      className={[
        "reference-mgmt-banner",
        toneClassName(tone),
        className ?? ""
      ].join(" ").trim()}
    >
      <div className="reference-mgmt-banner__head">
        <div className="reference-mgmt-banner__title-group">
          {icon ? (
            <span className="reference-mgmt-banner__icon" aria-hidden="true">
              <ReferenceGlyph name={icon} />
            </span>
          ) : null}
          <div>
            <p className="reference-mgmt-banner__title">{title}</p>
            <p className="reference-mgmt-banner__detail">{detail}</p>
          </div>
        </div>
        {statusTone ? <StatusBadge label={statusLabel} status={statusTone} /> : null}
      </div>
    </div>
  );
}

export function ReferenceFormRow({
  children,
  className,
  description,
  label,
  stacked = false,
  subtitle
}: ReferenceFormRowProps) {
  return (
    <div
      className={[
        "reference-mgmt-form-row",
        stacked ? "reference-mgmt-form-row--stacked" : "",
        className ?? ""
      ].join(" ").trim()}
    >
      <div className="reference-mgmt-form-row__meta">
        <p className="reference-mgmt-form-row__label">{label}</p>
        {subtitle ? <p className="reference-mgmt-form-row__subtitle">{subtitle}</p> : null}
        {description ? <p className="reference-mgmt-form-row__description">{description}</p> : null}
      </div>
      <div className="reference-mgmt-form-row__control">{children}</div>
    </div>
  );
}

export function ReferenceEmptyState({
  className,
  description,
  title
}: ReferenceEmptyStateProps) {
  return (
    <div className={["reference-mgmt-empty", className ?? ""].join(" ").trim()}>
      <p className="reference-mgmt-empty__title">{title}</p>
      <p className="reference-mgmt-empty__description">{description}</p>
    </div>
  );
}
