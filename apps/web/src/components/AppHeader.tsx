import { useEffect, useState } from "react";
import { LeafOrnament } from "./LeafOrnament";
import { StatusBadge } from "./StatusBadge";

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function formatTime(now: Date) {
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function formatDate(now: Date) {
  return `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())}`;
}

export function AppHeader() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return (
    <header className="shrink-0 border-b border-white/70 bg-white/68 backdrop-blur">
      <div className="mx-auto flex h-[var(--header-height)] max-w-[var(--screen-width)] items-center justify-between px-page-x">
        <div className="flex items-center gap-5">
          <div className="flex h-[var(--header-logo-size)] w-[var(--header-logo-size)] items-center justify-center rounded-full bg-brand-900 shadow-card">
            <LeafOrnament className="h-9 w-12" />
          </div>
          <div>
            <h1 className="text-[30px] font-bold tracking-[0.04em] text-brand-900">
              國瑞汽車中廠綠能展示播放器
            </h1>
            <p className="mt-2 font-en text-sm uppercase tracking-[0.24em] text-brand-700">
              Kuozui Green Energy Display Player
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="rounded-xl border border-white/70 bg-white/86 px-5 py-4 shadow-soft">
            <p className="font-en text-[var(--header-time-font-size)] font-semibold leading-none text-brand-900">
              {formatTime(now)}
            </p>
            <p className="mt-2 text-right text-lg font-medium text-neutral-700">{formatDate(now)}</p>
          </div>
          <div className="min-w-[220px] rounded-xl border border-white/70 bg-white/86 px-5 py-4 shadow-soft">
            <p className="font-en text-xs uppercase tracking-[0.24em] text-neutral-500">Environment</p>
            <div className="mt-3 flex items-center justify-between gap-4">
              <p className="text-2xl font-semibold text-brand-900">26°C ☀️</p>
              <StatusBadge status="connected" label="MQTT Online" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
