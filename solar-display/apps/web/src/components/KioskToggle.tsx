type KioskToggleProps = {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label: string;
  description?: string;
};

export function KioskToggle({
  checked,
  onChange,
  label,
  description
}: KioskToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange?.(!checked)}
      className="flex w-full items-center justify-between rounded-xl border border-white/70 bg-white/85 px-5 py-4 text-left shadow-soft"
    >
      <div>
        <p className="text-lg font-semibold text-neutral-800">{label}</p>
        {description ? <p className="mt-1 text-sm text-neutral-500">{description}</p> : null}
      </div>
      <span
        className={[
          "relative inline-flex h-[var(--toggle-height)] w-[var(--toggle-width)] rounded-full transition-colors",
          checked ? "bg-brand-700" : "bg-neutral-300"
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-1 h-[22px] w-[22px] rounded-full bg-white shadow-soft transition-transform",
            checked ? "translate-x-[28px]" : "translate-x-1"
          ].join(" ")}
        />
      </span>
    </button>
  );
}
