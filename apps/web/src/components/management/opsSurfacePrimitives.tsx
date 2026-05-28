import type { HTMLAttributes, ReactNode } from "react";

type SurfaceFamily = "operations" | "preview" | "status-dashboard";
type BannerTone = "ready" | "warning" | "error";
type SurfaceTag = "article" | "div" | "section";

function joinClasses(...classNames: Array<string | undefined | false>) {
  return classNames.filter(Boolean).join(" ");
}

function surfaceFamilyClassName(family: SurfaceFamily) {
  if (family === "preview") return "mgmt-surface--preview";
  if (family === "status-dashboard") return "mgmt-surface--status-dashboard";
  return "mgmt-surface--operations";
}

export type OpsSurfaceProps = HTMLAttributes<HTMLElement> & {
  as?: SurfaceTag;
  children?: ReactNode;
  family: SurfaceFamily;
};

export function OpsSurface({ as = "section", children, className, family, ...props }: OpsSurfaceProps) {
  const Tag = as;
  return (
    <Tag
      {...props}
      className={joinClasses("mgmt-surface", surfaceFamilyClassName(family), className)}
      data-surface-family={family}
    >
      {children}
    </Tag>
  );
}

export type OpsSurfaceTitleProps = HTMLAttributes<HTMLDivElement> & {
  caption?: ReactNode;
  title: ReactNode;
};

export function OpsSurfaceTitle({ caption, className, title, ...props }: OpsSurfaceTitleProps) {
  return (
    <div {...props} className={joinClasses("mgmt-surface__title", className)}>
      {title}
      {caption ? <small>{caption}</small> : null}
    </div>
  );
}

export type OpsInfoBannerProps = HTMLAttributes<HTMLDivElement> & {
  detail?: ReactNode;
  title: ReactNode;
  tone?: BannerTone;
};

export function OpsInfoBanner({
  className,
  detail,
  title,
  tone = "ready",
  ...props
}: OpsInfoBannerProps) {
  return (
    <div
      {...props}
      className={joinClasses("mgmt-banner", tone !== "ready" && `is-${tone}`, className)}
      role={props.role ?? "status"}
    >
      <strong>{title}</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

export type OpsStatStripProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
  family?: SurfaceFamily;
};

export function OpsStatStrip({
  children,
  className,
  family = "operations",
  ...props
}: OpsStatStripProps) {
  return (
    <div
      {...props}
      className={joinClasses("mgmt-stat-strip", `mgmt-stat-strip--${family}`, className)}
      data-surface-family={family}
    >
      {children}
    </div>
  );
}

export type OpsActionRowProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
};

export function OpsActionRow({ children, className, ...props }: OpsActionRowProps) {
  return (
    <div {...props} className={joinClasses("mgmt-action-row", className)}>
      {children}
    </div>
  );
}
