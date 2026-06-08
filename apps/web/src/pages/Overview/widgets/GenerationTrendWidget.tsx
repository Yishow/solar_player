import type { CSSProperties } from "react";
import {
  DisplayCardFooter,
  DisplayCardFrame,
  DisplayCardHeader
} from "../../../components/displayPageCards";
import { Sparkline } from "../../../components/Sparkline";

function formatTrendValue(value: number) {
  return `${Math.round(value).toLocaleString("zh-TW")} kW`;
}

export function GenerationTrendWidget({
  series,
  style
}: {
  series: number[];
  style?: CSSProperties;
}) {
  const hasSeries = series.length > 0;

  return (
    <DisplayCardFrame className="overview-dashboard-widget overview-generation-trend-widget" style={style} surface="info">
      <div className="overview-trend-header-row">
        <DisplayCardHeader subtitle="Generation Trend" title="發電趨勢" />
        <div className="overview-trend-toolbar">
          <div className="overview-trend-tabs">
            <span className="overview-trend-tab overview-trend-tab-active">Today</span>
            <span className="overview-trend-tab">7D</span>
            <span className="overview-trend-tab">30D</span>
          </div>
          <span className="overview-trend-refresh">15s 更新</span>
        </div>
      </div>
      {hasSeries ? (
        <>
          <div className="overview-trend-area">
            <Sparkline className="overview-widget-trend-sparkline" values={series} />
          </div>
          <DisplayCardFooter className="overview-widget-meta">
            <span>{formatTrendValue(series[0]!)}</span>
            <span>{formatTrendValue(series[series.length - 1]!)}</span>
          </DisplayCardFooter>
        </>
      ) : (
        <p className="overview-widget-empty">尚無發電趨勢資料</p>
      )}
    </DisplayCardFrame>
  );
}
