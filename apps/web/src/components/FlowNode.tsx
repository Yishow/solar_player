import type { ReactNode } from "react";

type FlowNodeProps = {
  icon: ReactNode;
  label: string;
  value: string;
  footnote?: string;
};

export function FlowNode({ icon, label, value, footnote }: FlowNodeProps) {
  return (
    <div className="flex min-h-36 flex-col justify-between rounded-xl border border-brand-100 bg-white/90 p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-xl">{icon}</div>
        <span className="rounded-full bg-neutral-100 px-3 py-1 font-en text-xs tracking-[0.18em] text-neutral-600">
          FLOW
        </span>
      </div>
      <div>
        <p className="text-lg font-semibold text-neutral-800">{label}</p>
        <p className="mt-2 text-3xl font-bold text-brand-900">{value}</p>
        {footnote ? <p className="mt-2 text-sm text-neutral-500">{footnote}</p> : null}
      </div>
    </div>
  );
}
