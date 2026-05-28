import React from "react";
import type { ReactNode } from "react";
import { shellDensityClassMap, type ShellDensity } from "./shellDensity";

type TitleBlockProps = {
  aside?: ReactNode;
  density?: ShellDensity;
  description?: string;
  hideHeading?: boolean;
  subtitle: string;
  title: string;
};

export function TitleBlock({
  aside,
  density = "management",
  description,
  hideHeading = false,
  subtitle,
  title
}: TitleBlockProps) {
  return (
    <div
      data-shell-density={density}
      data-shell-role="management"
      data-shell-primitive="title-block"
      className={["flex items-start gap-4", hideHeading ? "justify-end" : "justify-between"].join(" ")}
    >
      {hideHeading ? null : (
        <div className={["mgmt-shell-title-block", shellDensityClassMap[density].title].join(" ")}>
          <div className="mgmt-shell-title-row">
            <h1 className="mgmt-page-title__heading">{title}</h1>
            <p className="mgmt-page-title__subtitle">{subtitle}</p>
          </div>
          {description ? <p className="mgmt-shell-title-description">{description}</p> : null}
        </div>
      )}
      {aside}
    </div>
  );
}
