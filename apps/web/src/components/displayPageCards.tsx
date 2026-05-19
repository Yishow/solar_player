import type { CSSProperties, ReactNode } from "react";

type DisplayCardSurface = "info" | "metric";
type DisplayCardValueAlign = "center" | "start";

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function DisplayCardFrame({
  children,
  className,
  style,
  surface
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  surface: DisplayCardSurface;
}) {
  return (
    <article
      className={classNames("display-card-frame", `display-card-surface-${surface}`, className)}
      style={style}
    >
      {children}
    </article>
  );
}

export function DisplayCardHeader({
  icon,
  iconContainerClassName,
  subtitle,
  title
}: {
  icon?: ReactNode;
  iconContainerClassName?: string;
  subtitle?: ReactNode;
  title: ReactNode;
}) {
  return (
    <div className="display-card-header">
      {icon ? (
        <div className={classNames("display-card-header-icon", iconContainerClassName)}>{icon}</div>
      ) : null}
      <div className="display-card-header-copy">
        <h3 className="display-card-title">{title}</h3>
        {subtitle ? <p className="display-card-subtitle">{subtitle}</p> : null}
      </div>
    </div>
  );
}

export function DisplayCardValueRow({
  align = "start",
  className,
  unit,
  value
}: {
  align?: DisplayCardValueAlign;
  className?: string;
  unit?: ReactNode;
  value: ReactNode;
}) {
  return (
    <div
      className={classNames(
        "display-card-value-row",
        align === "center" ? "display-card-value-row-center" : "display-card-value-row-start",
        className
      )}
    >
      <span className="display-card-value">{value}</span>
      {unit ? <span className="display-card-unit">{unit}</span> : null}
    </div>
  );
}

export function DisplayCardFooter({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={classNames("display-card-footer", className)}>{children}</div>;
}
