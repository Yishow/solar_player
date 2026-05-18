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
  shellPrimitive?: string;
}>;

export function PageContainer({
  title,
  subtitle,
  description,
  aside,
  density = "management",
  shellPrimitive = "page-container",
  children
}: PageContainerProps) {
  const usesFixedHeight = density === "playback";

  return (
    <section
      data-shell-density={density}
      data-shell-primitive={shellPrimitive}
      className={[
        "flex w-full flex-col gap-6 px-page-x py-page-y",
        usesFixedHeight ? "h-full" : "min-h-full"
      ].join(" ")}
    >
      {title && subtitle ? (
        <TitleBlock
          aside={aside}
          density={density}
          description={description}
          subtitle={subtitle}
          title={title}
        />
      ) : null}
      <div className={["flex-1", usesFixedHeight ? "min-h-0 overflow-hidden" : ""].join(" ")}>{children}</div>
    </section>
  );
}
