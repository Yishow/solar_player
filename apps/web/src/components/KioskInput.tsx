import type { InputHTMLAttributes } from "react";

type KioskInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export function KioskInput({ label, className, ...props }: KioskInputProps) {
  return (
    <label className="flex flex-col gap-2">
      {label ? <span className="text-sm font-medium text-neutral-600">{label}</span> : null}
      <input
        {...props}
        className={[
          "h-[var(--button-height)] rounded-xl border border-neutral-200 bg-white/92 px-4 text-lg text-neutral-900 shadow-soft outline-none transition-colors placeholder:text-neutral-400 focus:border-brand-500",
          className ?? ""
        ].join(" ")}
      />
    </label>
  );
}
