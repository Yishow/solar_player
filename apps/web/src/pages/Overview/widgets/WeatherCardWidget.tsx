import { useRef, type CSSProperties } from "react";
import {
  DisplayCardFrame,
  DisplayCardHeader
} from "../../../components/displayPageCards";
import type { OverviewWeatherViewModel } from "../viewModel";

let nextInstanceId = 0;

type WeatherThemeClass = "weather-sunny" | "weather-rainy" | "weather-cloudy" | "weather-stormy" | "weather-snowy" | "weather-foggy" | "";

function getWeatherThemeClass(condition: string): WeatherThemeClass {
  const cond = condition || "";
  if (cond.includes("雷") || cond.includes("暴") || cond.includes("Storm") || cond.includes("Thunder")) {
    return "weather-stormy";
  }
  if (cond.includes("雨") || cond.includes("Rain") || cond.includes("Drizzle")) {
    return "weather-rainy";
  }
  if (cond.includes("雪") || cond.includes("冰") || cond.includes("Snow") || cond.includes("Hail")) {
    return "weather-snowy";
  }
  if (cond.includes("霧") || cond.includes("霾") || cond.includes("Fog") || cond.includes("Mist") || cond.includes("Haze")) {
    return "weather-foggy";
  }
  if (cond.includes("晴") || cond.includes("Sun")) {
    return "weather-sunny";
  }
  if (cond.includes("雲") || cond.includes("陰") || cond.includes("Cloud") || cond.includes("Overcast")) {
    return "weather-cloudy";
  }
  return "";
}

function formatObservedAt(observedAt: string): string {
  if (!observedAt) {
    return "";
  }

  const parsed = new Date(observedAt);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
}

function parseTemperature(tempStr: string) {
  if (!tempStr) {
    return { num: "--", unit: "" };
  }
  const match = tempStr.match(/^([\d.]+)(.*)$/);
  if (match) {
    return { num: match[1], unit: match[2] };
  }
  return { num: tempStr, unit: "" };
}

function renderWeatherIcon(condition: string, idPrefix: string) {
  const cond = condition || "";

  /* 雷雨/暴雨 (stormy) — 深灰雲 + 閃電 */
  if (getWeatherThemeClass(cond) === "weather-stormy") {
    const cloudGrad = `${idPrefix}stormy-cloud-grad`;
    const boltGrad = `${idPrefix}stormy-bolt-grad`;
    return (
      <svg className="overview-weather-icon-stormy" viewBox="0 0 24 24" width="48" height="48" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <defs>
          <linearGradient id={cloudGrad} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#6b6b8a" />
            <stop offset="100%" stopColor="#3d3d5c" />
          </linearGradient>
          <linearGradient id={boltGrad} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffe680" />
            <stop offset="100%" stopColor="#f5a623" />
          </linearGradient>
        </defs>
        <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" fill={`url(#${cloudGrad})`} stroke="#2a2a40" />
        <polygon points="12,14 10,18 13,18 11,22 15,16 12,16 14,13" fill={`url(#${boltGrad})`} stroke="#d9a73d" strokeWidth="0.8" />
      </svg>
    );
  }

  if (cond.includes("雨") || cond.includes("Rain")) {
    const cloudGrad = `${idPrefix}rainy-cloud-grad`;
    const dropGrad = `${idPrefix}rain-drop-grad`;
    return (
      <svg className="overview-weather-icon-rainy" viewBox="0 0 24 24" width="48" height="48" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <defs>
          <linearGradient id={cloudGrad} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8da0b6" />
            <stop offset="100%" stopColor="#4a5a6e" />
          </linearGradient>
          <linearGradient id={dropGrad} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#a3c4f3" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#3a7ebe" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" fill={`url(#${cloudGrad})`} stroke="#3e4a5b" />
        <line className="overview-weather-rain-d1" x1="8" y1="16" x2="8" y2="19" stroke={`url(#${dropGrad})`} strokeWidth="2" />
        <line className="overview-weather-rain-d2" x1="12" y1="18" x2="12" y2="21" stroke={`url(#${dropGrad})`} strokeWidth="2" />
        <line className="overview-weather-rain-d3" x1="16" y1="15" x2="16" y2="18" stroke={`url(#${dropGrad})`} strokeWidth="2" />
        <line className="overview-weather-rain-d4" x1="10" y1="17" x2="10" y2="20" stroke={`url(#${dropGrad})`} strokeWidth="1.5" />
        <line className="overview-weather-rain-d5" x1="14" y1="16" x2="14" y2="19" stroke={`url(#${dropGrad})`} strokeWidth="1.5" />
      </svg>
    );
  }

  /* 雪天/冰雹 (snowy) — 淺藍雲 + 雪點 */
  if (cond.includes("雪") || cond.includes("冰") || cond.includes("Snow") || cond.includes("Hail")) {
    const cloudGrad = `${idPrefix}snowy-cloud-grad`;
    return (
      <svg className="overview-weather-icon-snowy" viewBox="0 0 24 24" width="48" height="48" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <defs>
          <linearGradient id={cloudGrad} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#dce6f5" />
            <stop offset="100%" stopColor="#b0c8e0" />
          </linearGradient>
        </defs>
        <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" fill={`url(#${cloudGrad})`} stroke="#7a8fa6" />
        <circle cx="8" cy="18" r="1.2" fill="#e8f0fa" stroke="#a0b8d0" strokeWidth="1" />
        <circle cx="12" cy="20" r="1" fill="#e8f0fa" stroke="#a0b8d0" strokeWidth="1" />
        <circle cx="16" cy="17.5" r="1.1" fill="#e8f0fa" stroke="#a0b8d0" strokeWidth="1" />
        <circle cx="10" cy="16" r="0.9" fill="#e8f0fa" stroke="#a0b8d0" strokeWidth="0.8" />
        <circle cx="14" cy="19" r="0.8" fill="#e8f0fa" stroke="#a0b8d0" strokeWidth="0.8" />
      </svg>
    );
  }

  /* 霧天/霧霾 (foggy) — 水平霧線 */
  if (cond.includes("霧") || cond.includes("霾") || cond.includes("Fog") || cond.includes("Mist") || cond.includes("Haze")) {
    const fogGrad = `${idPrefix}foggy-grad`;
    return (
      <svg className="overview-weather-icon-foggy" viewBox="0 0 24 24" width="48" height="48" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <defs>
          <linearGradient id={fogGrad} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#bcc4b8" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#bcc4b8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#bcc4b8" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <line x1="3" y1="10" x2="21" y2="10" stroke={`url(#${fogGrad})`} />
        <line x1="5" y1="13.5" x2="19" y2="13.5" stroke={`url(#${fogGrad})`} />
        <line x1="4" y1="17" x2="20" y2="17" stroke={`url(#${fogGrad})`} />
        <line x1="7" y1="20.5" x2="17" y2="20.5" stroke={`url(#${fogGrad})`} />
      </svg>
    );
  }

  if (cond.includes("晴") || cond.includes("Sun")) {
    const sunGrad = `${idPrefix}sunny-sun-grad`;
    const glowGrad = `${idPrefix}sunny-glow-grad`;
    return (
      <svg className="overview-weather-icon-sunny" viewBox="0 0 24 24" width="48" height="48" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <defs>
          <linearGradient id={sunGrad} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffe066" />
            <stop offset="100%" stopColor="#f5a623" />
          </linearGradient>
          <linearGradient id={glowGrad} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f5a623" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#d9a73d" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="7" fill={`url(#${glowGrad})`} />
        <g className="overview-weather-sun-spin">
          <circle className="overview-weather-sun-pulse" cx="12" cy="12" r="4" fill={`url(#${sunGrad})`} stroke="#d9a73d" />
          <g stroke="#f5a623">
            <line x1="12" y1="2" x2="12" y2="4" />
            <line x1="12" y1="20" x2="12" y2="22" />
            <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
            <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
            <line x1="2" y1="12" x2="4" y2="12" />
            <line x1="20" y1="12" x2="22" y2="12" />
            <line x1="6.34" y1="17.66" x2="4.93" y2="19.07" />
            <line x1="19.07" y1="4.93" x2="17.66" y2="6.34" />
          </g>
        </g>
      </svg>
    );
  }
  if (cond.includes("雲") || cond.includes("陰") || cond.includes("Cloud") || cond.includes("Overcast")) {
    const sunGrad = `${idPrefix}cloudy-sun-grad`;
    const cloudGrad = `${idPrefix}cloudy-cloud-grad`;
    return (
      <svg className="overview-weather-icon-cloudy" viewBox="0 0 24 24" width="48" height="48" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <defs>
          <linearGradient id={sunGrad} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff2a3" />
            <stop offset="100%" stopColor="#f5a623" />
          </linearGradient>
          <linearGradient id={cloudGrad} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#b5c4d6" />
          </linearGradient>
        </defs>
        <g className="overview-weather-cloudy-sun">
          <circle cx="16" cy="9" r="3.5" fill={`url(#${sunGrad})`} stroke="#f5a623" strokeWidth="1.5" />
          <line x1="16" y1="3.5" x2="16" y2="4.5" stroke="#f5a623" strokeWidth="1.5" />
          <line x1="16" y1="13.5" x2="16" y2="14.5" stroke="#f5a623" strokeWidth="1.5" />
          <line x1="11.5" y1="9" x2="12.5" y2="9" stroke="#f5a623" strokeWidth="1.5" />
          <line x1="19.5" y1="9" x2="20.5" y2="9" stroke="#f5a623" strokeWidth="1.5" />
        </g>
        <path className="overview-weather-cloudy-cloud" d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-2.54-4.5-5-4.5-.42 0-.83.05-1.22.14A7 7 0 0 0 3.5 14 3.5 3.5 0 0 0 7 17.5h10.5" fill={`url(#${cloudGrad})`} stroke="#7a889b" />
      </svg>
    );
  }
  const thermGrad = `${idPrefix}default-therm-grad`;
  return (
    <svg className="overview-weather-icon-default" viewBox="0 0 24 24" width="48" height="48" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id={thermGrad} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ff8585" />
          <stop offset="100%" stopColor="#e84545" />
        </linearGradient>
      </defs>
      <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" fill={`url(#${thermGrad})`} stroke="#852f2f" />
    </svg>
  );
}

export function WeatherCardWidget({
  weather,
  style,
  themeMode = "auto",
  manualTheme = ""
}: {
  weather: OverviewWeatherViewModel;
  style?: CSSProperties;
  themeMode?: "auto" | "manual";
  manualTheme?: WeatherThemeClass;
}) {
  const idPrefixRef = useRef<string | null>(null);
  if (!idPrefixRef.current) {
    idPrefixRef.current = `w-${++nextInstanceId}-`;
  }
  const idPrefix = idPrefixRef.current;

  const observedLabel = formatObservedAt(weather.observedAt);
  const { num: tempNum, unit: tempUnit } = parseTemperature(weather.temperature);
  const weatherIcon = weather.available ? renderWeatherIcon(weather.condition, idPrefix) : null;
  const themeClass = themeMode === "manual" ? manualTheme : (weather.available ? getWeatherThemeClass(weather.condition) : "");
  const combinedClassName = `overview-dashboard-widget overview-weather-widget ${themeClass}`.trim();

  return (
    <DisplayCardFrame className={combinedClassName} style={style} surface="info">
      <DisplayCardHeader
        subtitle="Weather"
        title="天氣"
      />
      {weather.available && weatherIcon ? (
        <div className="overview-weather-absolute-icon">
          {weatherIcon}
        </div>
      ) : null}
      {weather.available ? (
        <div className="overview-weather-body">
          <div className="overview-weather-primary">
            <div className="overview-weather-temp-group">
              <p className="overview-weather-temperature">
                <span className="overview-weather-temp-num">{tempNum}</span>
                {tempUnit ? <span className="overview-weather-temp-unit">{tempUnit}</span> : null}
              </p>
            </div>
            <div className="overview-weather-summary">
              <span className="overview-weather-condition-badge">
                {weather.condition}
              </span>
              <span className="overview-weather-meta-line">
                {weather.location ? weather.location : null}
                {weather.location && observedLabel ? <span className="overview-weather-meta-dot">·</span> : null}
                {observedLabel ? (
                  <>
                    <span className="overview-weather-live-dot" />
                    {observedLabel}
                  </>
                ) : null}
              </span>
            </div>
          </div>
          <div className="overview-weather-indicators">
            <div className="overview-weather-indicator-chip">
              <span className="overview-weather-indicator-label">
                <svg className="overview-weather-indicator-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                </svg>
                濕度
              </span>
              <span className="overview-weather-indicator-value">{weather.humidity}</span>
            </div>
            <div className="overview-weather-indicator-chip">
              <span className="overview-weather-indicator-label">
                <svg className="overview-weather-indicator-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59-4.59A2 2 0 1 1 14 6H2m15.59 2.59A2 2 0 1 1 19 12H2" />
                </svg>
                風速
              </span>
              <span className="overview-weather-indicator-value">{weather.windSpeed}</span>
            </div>
            <div className="overview-weather-indicator-chip">
              <span className="overview-weather-indicator-label">
                <svg className="overview-weather-indicator-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 3h-8M4 3h8m-8 0v15a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V3M4 8h16M4 13h16" />
                </svg>
                雨量
              </span>
              <span className="overview-weather-indicator-value">{weather.precipitation}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="overview-weather-skeleton">
          <div className="overview-weather-skeleton-primary">
            <div className="overview-weather-skeleton-temp" />
            <div className="overview-weather-skeleton-summary">
              <div className="overview-weather-skeleton-cond" />
              <div className="overview-weather-skeleton-meta" />
            </div>
          </div>
          <div className="overview-weather-skeleton-indicators">
            <div className="overview-weather-skeleton-indicator" />
            <div className="overview-weather-skeleton-indicator" />
            <div className="overview-weather-skeleton-indicator" />
          </div>
        </div>
      )}
    </DisplayCardFrame>
  );
}
