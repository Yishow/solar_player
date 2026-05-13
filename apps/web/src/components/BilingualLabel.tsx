type BilingualLabelProps = {
  title: string;
  subtitle: string;
  accent?: boolean;
};

export function BilingualLabel({ title, subtitle, accent = false }: BilingualLabelProps) {
  return (
    <div className="space-y-1">
      <p className={accent ? "text-lg font-semibold text-brand-900" : "text-lg font-semibold text-neutral-800"}>
        {title}
      </p>
      <p className="font-en text-xs uppercase tracking-[0.2em] text-neutral-500">{subtitle}</p>
    </div>
  );
}
