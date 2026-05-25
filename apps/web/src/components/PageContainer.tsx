import React from "react";
import type { PropsWithChildren, ReactNode } from "react";
import { TitleBlock } from "./TitleBlock";
import type { ShellDensity } from "./shellDensity";

type PageContainerProps = PropsWithChildren<{
  title?: string;
  subtitle?: string;
  description?: string;
  aside?: ReactNode;
  density?: ShellDensity;
  hideTitleBlockHeading?: boolean;
  spacing?: "compact" | "default";
  shellPrimitive?: string;
}>;

export function PageContainer({
  title,
  subtitle,
  description,
  aside,
  density = "management",
  hideTitleBlockHeading = false,
  spacing = "default",
  shellPrimitive = "page-container",
  children
}: PageContainerProps) {
  const usesFixedHeight = density === "playback";
  const spacingClasses =
    spacing === "compact" ? "gap-4 px-page-x pt-4 pb-5" : "gap-6 px-page-x py-page-y";

  return (
    <section
      data-shell-density={density}
      data-shell-primitive={shellPrimitive}
      className={[
        "flex w-full flex-col",
        spacingClasses,
        usesFixedHeight ? "h-full" : "min-h-full"
      ].join(" ")}
    >
      {title && subtitle ? (
        <TitleBlock
          aside={aside}
          density={density}
          description={description}
          hideHeading={hideTitleBlockHeading}
          subtitle={subtitle}
          title={title}
        />
      ) : null}
      <div className={["flex-1", usesFixedHeight ? "min-h-0 overflow-hidden" : ""].join(" ")}>{children}</div>
    </section>
  );
}
