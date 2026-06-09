import type { CSSProperties } from "react";
import { DisplayCardFrame, DisplayCardHeader } from "../../../components/displayPageCards";
import { GenerationTrendChart } from "./GenerationTrendChartView";

export function GenerationTrendWidget({
  hours,
  series,
  unit,
  style
}: {
  hours?: number[];
  series: number[];
  unit?: string;
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
        <div className="overview-widget-trend-sparkline">
          <GenerationTrendChart hours={hours} series={series} unit={unit} />
        </div>
      ) : (
        <p className="overview-widget-empty">尚無發電趨勢資料</p>
      )}
    </DisplayCardFrame>
  );
}
