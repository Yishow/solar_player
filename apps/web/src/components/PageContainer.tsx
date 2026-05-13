import type { PropsWithChildren, ReactNode } from "react";
import { TitleBlock } from "./TitleBlock";
import type { ShellDensity } from "./shellDensity";

type PageContainerProps = PropsWithChildren<{
  title?: string;
  subtitle?: string;
  description?: string;
  aside?: ReactNode;
  density?: ShellDensity;
}>;

export function PageContainer({
  title,
  subtitle,
  description,
  aside,
  density = "management",
  children
}: PageContainerProps) {
  return (
    <section
      data-shell-density={density}
      className="mx-auto flex min-h-full max-w-[var(--screen-width)] flex-col gap-6 px-page-x py-page-y"
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
      <div className="flex-1">{children}</div>
    </section>
  );
}
