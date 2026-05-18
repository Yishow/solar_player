import React from "react";
import type { PropsWithChildren, ReactNode } from "react";
import { shellDensityClassMap, type ShellDensity } from "./shellDensity";

type SectionWrapperProps = PropsWithChildren<{
  actions?: ReactNode;
  className?: string;
  density?: ShellDensity;
  subtitle?: string;
  title: string;
}>;

export function SectionWrapper({
  actions,
  className,
  density = "management",
  subtitle,
  title,
  children
}: SectionWrapperProps) {
  return (
    <section
      data-shell-density={density}
      data-shell-primitive="section-wrapper"
      className={[
        "border border-white/70 bg-white/78 shadow-panel backdrop-blur",
        shellDensityClassMap[density].panel,
        className ?? ""
      ].join(" ")}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-semibold text-brand-900">{title}</h3>
          {subtitle ? (
            <p className="mt-1 font-en text-xs uppercase tracking-[0.22em] text-neutral-500">{subtitle}</p>
          ) : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
