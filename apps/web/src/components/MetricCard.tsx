import type { ReactNode } from "react";

type MetricCardProps = {
  icon: ReactNode;
  label: string;
  value: string;
  unit: string;
  helper?: string;
};

export function MetricCard({ icon, label, value, unit, helper }: MetricCardProps) {
  return (
    <article className="rounded-xl border border-white/70 bg-white/85 p-6 shadow-card backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <p className="text-sm font-medium tracking-[0.08em] text-neutral-600">{label}</p>
          <div className="flex items-end gap-3">
            <p className="text-[44px] font-bold leading-none text-brand-900">{value}</p>
            <span className="pb-1 font-en text-base font-semibold uppercase tracking-[0.12em] text-brand-700">
              {unit}
            </span>
          </div>
        </div>
        <div className="flex h-[var(--kpi-card-icon-size)] w-[var(--kpi-card-icon-size)] items-center justify-center rounded-full bg-brand-100 text-2xl shadow-soft">
          {icon}
        </div>
      </div>
      {helper ? <p className="mt-5 text-sm text-neutral-600">{helper}</p> : null}
    </article>
  );
}
