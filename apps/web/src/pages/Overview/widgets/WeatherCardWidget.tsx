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

export function WeatherCardWidget({
  weather,
  style
}: {
  weather: OverviewWeatherViewModel;
  style?: CSSProperties;
}) {
  const observedLabel = formatObservedAt(weather.observedAt);

  return (
    <DisplayCardFrame className="overview-dashboard-widget overview-weather-widget" style={style} surface="info">
      <DisplayCardHeader subtitle="Weather" title="天氣" />
      {weather.available ? (
        <div className="overview-weather-body">
          <div className="overview-weather-primary">
            <p className="overview-weather-temperature">{weather.temperature}</p>
            <div className="overview-weather-summary">
              <span className="overview-weather-condition">{weather.condition}</span>
              <div className="overview-weather-meta">
                {weather.location ? (
                  <span className="overview-weather-location">{weather.location}</span>
                ) : null}
                {observedLabel ? (
                  <span className="overview-weather-observed">{observedLabel} 觀測</span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="overview-weather-indicators">
            <div className="overview-weather-indicator">
              <span className="overview-weather-indicator-label">濕度</span>
              <span className="overview-weather-indicator-value">{weather.humidity}</span>
            </div>
            <div className="overview-weather-indicator">
              <span className="overview-weather-indicator-label">風速</span>
              <span className="overview-weather-indicator-value">{weather.windSpeed}</span>
            </div>
            <div className="overview-weather-indicator">
              <span className="overview-weather-indicator-label">雨量</span>
              <span className="overview-weather-indicator-value">{weather.precipitation}</span>
            </div>
          </div>
        </div>
      ) : (
        <p className="overview-widget-empty">天氣資料尚未就緒</p>
      )}
    </DisplayCardFrame>
  );
}
