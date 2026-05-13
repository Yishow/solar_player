type PageNumberPillProps = {
  current: number;
  total: number;
};

export function PageNumberPill({ current, total }: PageNumberPillProps) {
  return (
    <div className="inline-flex items-center rounded-full bg-brand-900 px-4 py-2 font-en text-sm font-semibold tracking-[0.24em] text-white shadow-card">
      {current}/{total}
    </div>
  );
}
