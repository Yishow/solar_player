import { toSparklineSmoothPath } from "../../../components/Sparkline";
import {
  buildGenerationTrendAxisLabels,
  buildGenerationTrendYTicks,
  findGenerationTrendPeak,
  mapGenerationTrendCoordinates
} from "./generationTrendChart";

const axisLabels = buildGenerationTrendAxisLabels();

function formatTick(value: number) {
  if (value >= 1000) {
    return `${Math.round((value / 1000) * 10) / 10}k`;
  }
  return `${Math.round(value)}`;
}

export function GenerationTrendChart({
  hours,
  series,
  unit
}: {
  hours?: number[];
  series: number[];
  unit?: string;
}) {
  const yTicks = buildGenerationTrendYTicks(series, 3);
  const niceMax = yTicks[0]?.value ?? 0;
  const coords = mapGenerationTrendCoordinates(series, niceMax, hours);
  const linePath = toSparklineSmoothPath(coords);
  const areaPath = `${linePath} L 100 100 L 0 100 Z`;
  const peak = findGenerationTrendPeak(series, hours);
  const peakCoord = peak ? coords[peak.index] : undefined;

  return (
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
              <linearGradient id="overview-trend-area-fill" x1="0%" x2="0%" y1="0%" y2="100%">
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
            <path className="overview-trend-area-path" d={areaPath} />
            <path
              className="overview-trend-line-path"
              d={linePath}
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div className="overview-trend-points" aria-hidden="true">
            {coords.map((coord, index) => (
              <span
                key={index}
                className="overview-trend-dot"
                style={{ left: `${coord.x}%`, top: `${coord.y}%` }}
              />
            ))}
            {peakCoord ? (
              <span
                className="overview-trend-peak-marker"
                style={{ left: `${peakCoord.x}%`, top: `${peakCoord.y}%` }}
              >
                <span className="overview-trend-peak-value">
                  {Math.round(peak!.value).toLocaleString("zh-TW")}
                  {unit ? ` ${unit}` : ""}
                </span>
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <div className="overview-trend-axis" aria-hidden="true">
        {axisLabels.map((tick) => (
          <span key={tick.label} className="overview-trend-axis-tick">
            {tick.label}
          </span>
        ))}
      </div>
    </div>
  );
}
