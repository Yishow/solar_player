import type { CSSProperties } from "react";
import {
  DisplayCardFrame,
  DisplayCardHeader
} from "../../../components/displayPageCards";
import type { OverviewWeatherViewModel } from "../viewModel";

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

function renderWeatherIcon(condition: string) {
  const cond = condition || "";
  if (cond.includes("雨") || cond.includes("Rain")) {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#3a7ebe" }}>
        <path d="M16 13a4 4 0 0 0-8 0" />
        <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" />
        <path className="overview-weather-rain-drop" d="M8 19v2M12 19v2M16 19v2" />
      </svg>
    );
  }
  if (cond.includes("晴") || cond.includes("Sun")) {
    return (
      <svg className="overview-weather-icon-sun" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#d9a73d" }}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    );
  }
  if (cond.includes("雲") || cond.includes("陰") || cond.includes("Cloud") || cond.includes("Overcast")) {
    return (
      <svg className="overview-weather-icon-cloud" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#7a889b" }}>
        <path d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-2.54-4.5-5-4.5-.42 0-.83.05-1.22.14A7 7 0 0 0 3.5 14 3.5 3.5 0 0 0 7 17.5h10.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#62844e" }}>
      <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" />
    </svg>
  );
}

export function WeatherCardWidget({
  weather,
  style
}: {
  weather: OverviewWeatherViewModel;
  style?: CSSProperties;
}) {
  const observedLabel = formatObservedAt(weather.observedAt);
  const { num: tempNum, unit: tempUnit } = parseTemperature(weather.temperature);
  const weatherIcon = weather.available ? renderWeatherIcon(weather.condition) : null;

  return (
    <DisplayCardFrame className="overview-dashboard-widget overview-weather-widget" style={style} surface="info">
      <DisplayCardHeader
        subtitle="Weather"
        title="天氣"
      />
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
                {weatherIcon ? <span className="overview-weather-inline-icon">{weatherIcon}</span> : null}
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
              <span className="overview-weather-indicator-label">💧 濕度</span>
              <span className="overview-weather-indicator-value">{weather.humidity}</span>
            </div>
            <div className="overview-weather-indicator-chip">
              <span className="overview-weather-indicator-label">💨 風速</span>
              <span className="overview-weather-indicator-value">{weather.windSpeed}</span>
            </div>
            <div className="overview-weather-indicator-chip">
              <span className="overview-weather-indicator-label">🌧️ 雨量</span>
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
