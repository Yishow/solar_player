import { useEffect, useState } from "react";
import { LeafOrnament } from "./LeafOrnament";
import { StatusBadge } from "./StatusBadge";

type AppHeaderMeta = {
  date?: string;
  status?: "connected" | "connecting" | "disconnected";
  statusLabel?: string;
  time?: string;
  weather?: string;
  weekday?: string;
};

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function formatTime(now: Date) {
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function formatDate(now: Date) {
  return `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())}`;
}

type AppHeaderProps = {
  meta?: AppHeaderMeta;
};

export function AppHeader({ meta }: AppHeaderProps) {
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
    <header
      data-shell-primitive="app-header"
      className="relative shrink-0 overflow-hidden border-b border-white/70 bg-white/68 backdrop-blur"
    >
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent-sun-500/60 to-transparent" />
      <div className="flex h-[var(--header-height)] w-full items-center justify-between px-page-x">
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
              {meta?.time ?? formatTime(now)}
            </p>
            <p className="mt-2 text-right text-lg font-medium text-neutral-700">
              {meta?.date ?? formatDate(now)}
            </p>
            {meta?.weekday ? (
              <p className="mt-1 text-right font-en text-sm tracking-[0.16em] text-neutral-500">
                {meta.weekday}
              </p>
            ) : null}
          </div>
          <div className="min-w-[220px] rounded-xl border border-white/70 bg-white/86 px-5 py-4 shadow-soft">
            <p className="font-en text-xs uppercase tracking-[0.24em] text-neutral-500">Environment</p>
            <div className="mt-3 flex items-center justify-between gap-4">
              <p className="text-2xl font-semibold text-brand-900">{meta?.weather ?? "26°C ☀️"}</p>
              <StatusBadge
                status={meta?.status ?? "connected"}
                label={meta?.statusLabel ?? "MQTT Online"}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
