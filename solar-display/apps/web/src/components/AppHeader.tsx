function formatTime(now: Date) {
  return now.toLocaleTimeString("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

function formatDate(now: Date) {
  return now.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short"
  });
}

export function AppHeader() {
  const now = new Date();

  return (
    <header className="flex h-[var(--header-height)] items-center justify-between px-page-x py-6">
      <div className="flex items-center gap-6">
        <div className="flex h-[var(--header-logo-size)] w-[var(--header-logo-size)] items-center justify-center rounded-full bg-brand-900 text-xl font-bold text-white shadow-card">
          SD
        </div>
        <div className="space-y-2">
          <p className="font-en text-sm uppercase tracking-[0.24em] text-brand-700">
            Kuozui Green Energy Display Player
          </p>
          <h1 className="text-[32px] font-bold tracking-[0.04em] text-brand-900">
            國瑞汽車中廠綠能展示播放器
          </h1>
        </div>
      </div>
      <div className="rounded-xl border border-white/70 bg-white/80 px-6 py-4 text-right shadow-soft backdrop-blur">
        <p className="font-en text-[var(--header-time-font-size)] font-semibold leading-none text-brand-900">
          {formatTime(now)}
        </p>
        <p className="mt-2 text-lg font-medium text-neutral-700">{formatDate(now)}</p>
      </div>
    </header>
  );
}
