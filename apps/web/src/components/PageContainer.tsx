import type { PropsWithChildren, ReactNode } from "react";
import { SectionTitle } from "./SectionTitle";

type PageContainerProps = PropsWithChildren<{
  title?: string;
  subtitle?: string;
  description?: string;
  aside?: ReactNode;
}>;

export function PageContainer({
  title,
  subtitle,
  description,
  aside,
  children
}: PageContainerProps) {
  return (
    <section className="mx-auto flex min-h-full max-w-[var(--screen-width)] flex-col gap-6 px-page-x py-page-y">
      {title && subtitle ? (
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <SectionTitle title={title} subtitle={subtitle} />
            {description ? <p className="max-w-4xl text-lg leading-8 text-neutral-600">{description}</p> : null}
          </div>
          {aside}
        </div>
      ) : null}
      <div className="flex-1">{children}</div>
    </section>
  );
}
