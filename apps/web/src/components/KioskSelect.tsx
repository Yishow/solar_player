import type { SelectHTMLAttributes } from "react";

type KioskSelectOption = {
  label: string;
  value: string;
};

type KioskSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  options: KioskSelectOption[];
};

export function KioskSelect({ label, options, className, ...props }: KioskSelectProps) {
  return (
    <label className="flex flex-col gap-2">
      {label ? <span className="text-sm font-medium text-neutral-600">{label}</span> : null}
      <select
        {...props}
        className={[
          "h-[var(--button-height)] rounded-xl border border-neutral-200 bg-white/92 px-4 text-lg text-neutral-900 shadow-soft outline-none focus:border-brand-500",
          className ?? ""
        ].join(" ")}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
