import type { DisplaySyncEvent } from "@solar-display/shared";
import type { CSSProperties } from "react";
import { DisplayCardFrame, DisplayCardHeader } from "../../../components/displayPageCards";
import { toSparklineSmoothPath } from "../../../components/Sparkline";
import { useRuntimeRefreshLifecycle } from "../../../hooks/useRuntimeRefreshLifecycle";
import { requestJson } from "../../../services/api";
import { resolveMonitoringHistoryRuntimeRefreshSpec } from "../../runtimeRefreshRegistry";

type MonthlyConsumptionSummary = {
  consumptionTotal: number | null;
  date: string;
};

const monthlyConsumptionRefresh = resolveMonitoringHistoryRuntimeRefreshSpec("month");

export function shouldRefreshMonthlyConsumption(event: Pick<DisplaySyncEvent, "scope">) {
  return monthlyConsumptionRefresh.refreshScopes.includes(event.scope);
}

function formatDateLabel(dateStr: string) {
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parseInt(parts[1]!, 10)}/${parseInt(parts[2]!, 10)}`;
  }
  return dateStr;
}

export function buildMonthlyConsumptionTrend(summaries: MonthlyConsumptionSummary[]) {
  const validSummaries = summaries
    .filter((summary): summary is MonthlyConsumptionSummary & { consumptionTotal: number } =>
      typeof summary.consumptionTotal === "number"
    )
    .reverse();

  return {
    dates: validSummaries.map((summary) => formatDateLabel(summary.date)),
    series: validSummaries.map((summary) => summary.consumptionTotal)
  };
}

function niceCeil(value: number): number {
  if (value <= 0) return 1000;
  const exponent = Math.floor(Math.log10(value));
  const base = Math.pow(10, exponent);
  for (const multiple of [1, 2, 2.5, 5, 10]) {
    if (multiple * base >= value) {
      return multiple * base;
    }
  }
  return 10 * base;
}

function buildYTicks(series: number[], count = 3) {
  const tickCount = Math.max(count, 2);
  const peak = series.length > 0 ? Math.max(...series) : 0;
  const niceMax = niceCeil(peak);

  return Array.from({ length: tickCount }, (_, index) => ({
    value: (niceMax * (tickCount - 1 - index)) / (tickCount - 1),
    position: (index / (tickCount - 1)) * 100
  }));
}

function mapCoordinates(series: number[], niceMax: number) {
  if (series.length === 0) return [];
  const scaleMax = niceMax > 0 ? niceMax : 1;
  const L = series.length;
  return series.map((value, index) => ({
    x: L > 1 ? (index / (L - 1)) * 100 : 0,
    y: 100 - (value / scaleMax) * 90 - 5
  }));
}

function formatTick(value: number) {
  if (value >= 1000) {
    return `${Math.round((value / 1000) * 10) / 10}k`;
  }
  return `${Math.round(value)}`;
}

export function PhasePowerTableWidget({
  style
}: {
  phasePower?: any; // kept to avoid compilation errors elsewhere
  style?: CSSProperties;
}) {
  const monthlyConsumptionRuntime = useRuntimeRefreshLifecycle<{
    summaries: MonthlyConsumptionSummary[];
  }>({
    enabled: true,
    load: () => requestJson("/api/metrics/daily-summary?range=month"),
    refreshKey: monthlyConsumptionRefresh.refreshKey,
    shouldRefresh: shouldRefreshMonthlyConsumption
  });
  const { dates, series } = buildMonthlyConsumptionTrend(
    monthlyConsumptionRuntime.payload?.summaries ?? []
  );

  const yTicks = buildYTicks(series, 3);
  const niceMax = yTicks[0]?.value ?? 0;
  const coords = mapCoordinates(series, niceMax);
  const linePath = toSparklineSmoothPath(coords);
  const areaPath = linePath ? `${linePath} L 100 100 L 0 100 Z` : "";

  let peakIndex = 0;
  for (let i = 1; i < series.length; i++) {
    if (series[i]! > series[peakIndex]!) {
      peakIndex = i;
    }
  }
  const peakCoord = coords[peakIndex];
  const peakValue = series[peakIndex] ?? 0;

  const labelIndices = series.length > 0
    ? [0, Math.floor(series.length * 0.25), Math.floor(series.length * 0.5), Math.floor(series.length * 0.75), series.length - 1]
    : [];

  return (
    <DisplayCardFrame className="overview-dashboard-widget overview-phase-power-widget" style={style} surface="info">
      <DisplayCardHeader subtitle="Monthly Consumption" title="月用量曲線" />
      {series.length > 0 ? (
        <div className="overview-widget-trend-sparkline">
          <div className="overview-trend-chart">
            <div className="overview-trend-chart-plot">
              <div className="overview-trend-yaxis" aria-hidden="true">
                {yTicks.map((tick) => (
                  <span key={tick.position} className="overview-trend-yaxis-tick" style={{ top: `${tick.position}%` }}>
                    {formatTick(tick.value)}
                  </span>
                ))}
              </div>
              <div className="overview-trend-canvas">
                <svg
                  className="overview-trend-chart-svg"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  role="presentation"
                >
                  <defs>
                    <linearGradient id="overview-consumption-area-fill" x1="0%" x2="0%" y1="0%" y2="100%">
                      <stop offset="0%" stopColor="rgba(94, 135, 71, 0.5)" />
                      <stop offset="50%" stopColor="rgba(94, 135, 71, 0.2)" />
                      <stop offset="100%" stopColor="rgba(94, 135, 71, 0.02)" />
                    </linearGradient>
                  </defs>
                  {yTicks.map((tick) => (
                    <line
                      key={tick.position}
                      className="overview-trend-gridline"
                      x1="0"
                      x2="100"
                      y1={tick.position}
                      y2={tick.position}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                  {areaPath && (
                    <path
                      className="overview-trend-area-path"
                      d={areaPath}
                      fill="url(#overview-consumption-area-fill)"
                    />
                  )}
                  {linePath && (
                    <path
                      className="overview-trend-line-path"
                      d={linePath}
                      fill="none"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                </svg>
                <div className="overview-trend-points" aria-hidden="true">
                  {coords.map((coord, idx) => (
                    <span
                      key={idx}
                      className="overview-trend-dot"
                      style={{ left: `${coord.x}%`, top: `${coord.y}%` }}
                    />
                  ))}
                  {peakCoord && (
                    <span
                      className="overview-trend-peak-marker"
                      style={{ left: `${peakCoord.x}%`, top: `${peakCoord.y}%` }}
                    >
                      <span className="overview-trend-peak-value">
                        {Math.round(peakValue).toLocaleString("zh-TW")} kWh
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="overview-trend-axis" aria-hidden="true">
              {labelIndices.map((idx) => (
                <span key={idx} className="overview-trend-axis-tick">
                  {dates[idx]}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="overview-widget-empty">尚無用量趨勢資料</p>
      )}
    </DisplayCardFrame>
  );
}
