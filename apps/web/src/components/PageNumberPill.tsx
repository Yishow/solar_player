type PageNumberPillProps = {
  current: number;
  total: number;
};

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

export function PageNumberPill({ current, total: _total }: PageNumberPillProps) {
  return (
    <div
      data-shell-primitive="page-number-pill"
      className="flex h-[42px] w-[90px] items-center justify-center rounded-[22px] font-en text-[21px] font-semibold text-white"
      style={{
        background: "var(--shell-number-pill-bg)",
        boxShadow: "var(--shell-number-pill-shadow)"
      }}
    >
      {pad(current)}
    </div>
  );
}
