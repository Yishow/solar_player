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
      <DisplayCardHeader subtitle="Generation Trend" title="發電趨勢" />
      {hasSeries ? (
        <>
          <Sparkline className="overview-widget-trend-sparkline" values={series} />
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
