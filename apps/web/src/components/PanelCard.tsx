import type { PropsWithChildren } from "react";

type PanelCardProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  className?: string;
}>;

export function PanelCard({ title, subtitle, className, children }: PanelCardProps) {
  return (
    <section
      className={[
        "rounded-xl border border-white/70 bg-white/78 p-6 shadow-panel backdrop-blur",
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
      </div>
      {children}
    </section>
  );
}
