import React, { useEffect, useState } from "react";
import type { HeaderWeatherMeta } from "@solar-display/shared";
import { Link } from "react-router-dom";
import { defaultBrandView, type BrandView } from "../hooks/useBrandAssets";
import { StatusBadge } from "./StatusBadge";

type AppHeaderMeta = {
  date?: string;
  status?: "connected" | "connecting" | "disconnected";
  statusLabel?: string;
  time?: string;
  weather?: HeaderWeatherMeta;
  weekday?: string;
};

const DEFAULT_HEADER_META = {
  status: "connecting",
  statusLabel: "連線中"
} as const;

const DEFAULT_WEATHER_META: HeaderWeatherMeta = {
  primaryText: "天氣資料同步中",
  secondaryText: "",
  state: "loading"
};

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function formatTime(now: Date) {
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function formatDate(now: Date) {
  return `${now.getFullYear()} / ${pad(now.getMonth() + 1)} / ${pad(now.getDate())}`;
}

const WEEKDAY_ZH = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
const WEEKDAY_EN = ["Sun.", "Mon.", "Tue.", "Wed.", "Thu.", "Fri.", "Sat."];

function defaultWeekday(now: Date) {
  return `${WEEKDAY_ZH[now.getDay()]}  ${WEEKDAY_EN[now.getDay()]}`;
}

type AppHeaderProps = {
  brandView?: BrandView;
  meta?: AppHeaderMeta;
};

function ClockArea({ meta }: { meta?: AppHeaderMeta }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const timeLabel = meta?.time ?? formatTime(now);
  const dateLabel = meta?.date ?? formatDate(now);
  const weekdayLabel = meta?.weekday ?? defaultWeekday(now);

  return (
    <>
      <div
        className="font-en text-[50px] font-bold leading-none tracking-[0.1em] tabular-nums"
        style={{ color: "var(--ink-strong)" }}
      >
        {timeLabel}
      </div>

      <div
        className="ml-[40px] font-en text-[18px] font-medium leading-[1.3]"
        style={{ color: "var(--shell-meta-date-ink)" }}
      >
        <div>{dateLabel}</div>
        <div>{weekdayLabel}</div>
      </div>
    </>
  );
}

export function AppHeader({ brandView = defaultBrandView, meta }: AppHeaderProps) {
  const statusMeta =
    meta?.status && meta?.statusLabel
      ? {
          status: meta.status,
          statusLabel: meta.statusLabel
        }
      : DEFAULT_HEADER_META;
  const weatherMeta = meta?.weather ?? DEFAULT_WEATHER_META;

  return (
    <header
      data-shell-primitive="app-header"
      className="shell-header-bar relative flex h-[var(--header-height)] w-full shrink-0 items-stretch"
    >
      <div className="flex w-full items-center pl-[34px] pr-[40px]">
        {/* Brand cluster */}
        <div className="flex items-center gap-[15px]">
          <Link
            to="/settings/playback"
            title="進入設定"
            className="flex h-[68px] w-[68px] items-center justify-center transition-transform hover:scale-105 active:scale-95"
          >
            <img
              src={brandView.logoSrc}
              alt={brandView.brandNameEn}
              className="h-[60px] w-[60px] object-contain drop-shadow-sm"
              draggable={false}
            />
          </Link>
          <div className="leading-none">
            <div
              className="text-[35px] font-extrabold tracking-[0.11em]"
              style={{ color: "var(--ink-strong)" }}
            >
              {brandView.brandNameZh}
            </div>
            <div
              className="mt-[10px] font-en text-[15px] font-bold tracking-[0.34em]"
              style={{ color: "var(--ink-strong)" }}
            >
              {brandView.brandNameEn}
            </div>
          </div>
        </div>

        {/* Product title (Whitespace divider instead of solid line) */}
        <div className="ml-[48px] leading-none">
          <div
            className="text-[22px] font-semibold tracking-[0.32em]"
            style={{ color: "var(--ink-strong)" }}
          >
            {brandView.productTitleZh}
          </div>
          <div
            className="mt-[14px] font-en text-[15px] font-medium tracking-[0.14em]"
            style={{ color: "var(--shell-kicker-muted)" }}
          >
            {brandView.productTitleEn}
          </div>
        </div>

        {/* Right meta cluster */}
        <div className="ml-auto flex items-center">
          <ClockArea meta={meta} />

          <div
            data-shell-primitive="header-weather"
            data-weather-state={weatherMeta.state}
            className="ml-[40px] flex w-[320px] min-w-0 items-center gap-[12px]"
            style={{ color: "var(--shell-meta-weather-ink)" }}
          >
            <WeatherGlyph />
            <div className="min-w-0 flex-1 leading-[1.2]">
              <div className="truncate text-[18px] font-medium">
                {weatherMeta.primaryText}
              </div>
              {weatherMeta.secondaryText ? (
                <div className="mt-[4px] truncate text-[14px] font-medium text-[var(--shell-kicker-muted)]">
                  {weatherMeta.secondaryText}
                </div>
              ) : null}
            </div>
          </div>

          <div className="ml-[40px]">
            <StatusBadge
              status={statusMeta.status}
              label={statusMeta.statusLabel}
            />
          </div>
        </div>
      </div>
    </header>
  );
}

function WeatherGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="26"
      height="26"
      fill="none"
      stroke="#F59E0B"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
    </svg>
  );
}
