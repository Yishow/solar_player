import { useMemo, useState } from "react";
import { useRuntimeRefreshLifecycle } from "../../hooks/useRuntimeRefreshLifecycle";
import { requestJson } from "../../services/api";
import { resolveMonitoringHistoryRuntimeRefreshSpec } from "../runtimeRefreshRegistry";
import { energyHistoryLayout, energyHistoryMetricCardKeys } from "./layout";
import "./history.css";
import {
  buildEnergyHistoryViewModel,
  type CumulativeCounter,
  type DailyEnergySummary,
  type EnergyHistoryRange,
  type EnergyHistorySnapshot
} from "./viewModel";

type MetricsHistoryResponse = {
  range: "day" | "week" | "month" | "year" | "total";
  snapshots: EnergyHistorySnapshot[];
};

type DailySummaryResponse = {
  summaries: DailyEnergySummary[];
};

type CumulativeResponse = {
  counters: CumulativeCounter[];
};

type HistoryRuntimePayload = {
  counters: CumulativeCounter[];
  snapshots: EnergyHistorySnapshot[];
  summaries: DailyEnergySummary[];
};

const METRIC_ICON_GLYPHS: Record<number, string> = {
  0: "☀",
  1: "↻",
  2: "⚡",
  3: "▤",
  4: "🌱"
};

function TrendChart({
  lines
}: {
  lines: Array<{
    colorToken: string;
    label: string;
    points: Array<{ label: string; value: number | null }>;
  }>;
}) {
  const validValues = lines.flatMap((line) =>
    line.points.map((point) => point.value).filter((value): value is number => value !== null)
  );
  const width = 1480;
  const height = 180;
  const padding = 16;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const maxValue = Math.max(...validValues, 1);
  const bottom = padding + chartHeight;
  const colorMap = {
    blue: "#4a86c5",
    green: "#5c854b",
    orange: "#d89c45"
  } as const;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="eh-chart-svg" preserveAspectRatio="none">
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
        <line
          key={ratio}
          x1={padding}
          y1={padding + chartHeight * ratio}
          x2={padding + chartWidth}
          y2={padding + chartHeight * ratio}
          stroke="rgba(25,40,31,0.08)"
          strokeWidth="1"
        />
      ))}
      {lines.map((line) => {
        const validPoints = line.points.filter(
          (point): point is { label: string; value: number } => point.value !== null
        );
        if (validPoints.length === 0) return null;
        const coords = validPoints.map((point, index) => ({
          x: padding + (index / Math.max(validPoints.length - 1, 1)) * chartWidth,
          y: padding + chartHeight - (point.value / maxValue) * chartHeight
        }));
        const linePath = coords.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`).join(" ");
        const areaPath = `${linePath} L ${coords[coords.length - 1]!.x},${bottom} L ${coords[0]!.x},${bottom} Z`;
        const color = colorMap[line.colorToken as keyof typeof colorMap];
        return (
          <g key={line.label}>
            <path d={areaPath} fill={color} fillOpacity={0.1} stroke="none" />
            <path
              d={linePath}
              fill="none"
              stroke={color}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
            />
          </g>
        );
      })}
    </svg>
  );
}

export function EnergyHistory() {
  const [range, setRange] = useState<EnergyHistoryRange>("day");
  const historyRefresh = resolveMonitoringHistoryRuntimeRefreshSpec(range);
  const historyRuntime = useRuntimeRefreshLifecycle<HistoryRuntimePayload>({
    enabled: true,
    load: async () => {
      const [historyResponse, summaryResponse, cumulativeResponse] = await Promise.all([
        requestJson<MetricsHistoryResponse>(`/api/metrics/history?range=${range}`),
        requestJson<DailySummaryResponse>(`/api/metrics/daily-summary?range=${range}`),
        requestJson<CumulativeResponse>("/api/metrics/cumulative")
      ]);

      return {
        counters: cumulativeResponse.counters,
        snapshots: historyResponse.snapshots,
        summaries: summaryResponse.summaries
      };
    },
    refreshKey: historyRefresh.refreshKey,
    shouldRefresh: (event) => historyRefresh.refreshScopes.includes(event.scope)
  });
  const snapshots = historyRuntime.payload?.snapshots ?? [];
  const summaries = historyRuntime.payload?.summaries ?? [];
  const counters = historyRuntime.payload?.counters ?? [];
  const isLoading = historyRuntime.isLoading || historyRuntime.isRefreshing;
  const errorMessage = historyRuntime.errorMessage;

  const viewModel = useMemo(
    () =>
      buildEnergyHistoryViewModel({
        counters,
        range,
        snapshots,
        summaries
      }),
    [counters, range, snapshots, summaries]
  );

  const validChartPoints = viewModel.chartLines
    .flatMap((line) => line.points)
    .filter((point) => point.value !== null);
  const helperState = errorMessage ? "is-error" : isLoading ? "is-loading" : "";
  const statusLabel = errorMessage || (isLoading ? "同步中..." : viewModel.monitoringState.statusLabel);
  const monitoringDetail = errorMessage
    ? "載入異常"
    : isLoading
      ? "同步中..."
      : `${viewModel.monitoringState.sourceRoleLabel} · ${viewModel.monitoringState.freshnessLabel}`;

  return (
    <section className="eh-page">
      <section
        className="eh-title"
        style={{ left: energyHistoryLayout.title.left, top: energyHistoryLayout.title.top }}
      >
        <h1>
          能源<em>歷史</em>
        </h1>
        <p>Energy History</p>
      </section>

      {/* === Side range selector === */}
      <aside
        className="eh-side"
        style={{
          height: energyHistoryLayout.side.height,
          left: energyHistoryLayout.side.left,
          top: energyHistoryLayout.side.top,
          width: energyHistoryLayout.side.width
        }}
      >
        <div className="eh-side-title">
          範圍切換
          <small>RANGE</small>
        </div>
        <div className="eh-side-list">
          {viewModel.rangeOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              className={option.active ? "active" : ""}
              onClick={() => setRange(option.key)}
            >
              <span className="eh-range-zh">{option.label}</span>
              <span className="eh-range-en">{option.subtitle}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* === Metric cards === */}
      {viewModel.metricCards.map((card, index) => {
        const layoutKey = energyHistoryMetricCardKeys[index];
        const layout = layoutKey ? energyHistoryLayout.metric[layoutKey] : null;
        if (!layout) return null;
        return (
          <article
            key={card.label}
            className="eh-metric"
            style={{
              height: layout.height,
              left: layout.left,
              top: layout.top,
              width: layout.width
            }}
          >
            <div className="eh-metric-head">
              <span className="eh-metric-icon">{METRIC_ICON_GLYPHS[index] ?? "·"}</span>
              <div className="eh-metric-label">
                <b>{card.label}</b>
                <small>{card.subtitle}</small>
              </div>
            </div>
            <div className="eh-metric-value">
              {card.valueLabel}
              <small>{card.unitLabel}</small>
            </div>
            <div className={`eh-metric-helper ${helperState}`}>
              {monitoringDetail}
            </div>
          </article>
        );
      })}

      {/* === Chart panel === */}
      <section
        className="eh-chart"
        style={{
          height: energyHistoryLayout.chart.height,
          left: energyHistoryLayout.chart.left,
          top: energyHistoryLayout.chart.top,
          width: energyHistoryLayout.chart.width
        }}
      >
        <div className="eh-chart-head">
          <div className="eh-chart-title">
            {viewModel.chartTitle}
            <small>{viewModel.chartSubtitle}</small>
          </div>
          <div className="eh-legend">
            <span className="orange">發電量 (kW)</span>
            <span className="green">自發自用 (kW)</span>
            <span className="blue">用電量 (kW)</span>
            <span className={`status ${helperState}`}>{statusLabel}</span>
          </div>
        </div>

        {validChartPoints.length > 0 ? (
          <TrendChart lines={viewModel.chartLines} />
        ) : (
          <div className="eh-chart-empty">{viewModel.monitoringState.emptyStateLabel}</div>
        )}

        {validChartPoints.length > 0 ? (
          <div className="eh-axis-times">
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const idx = Math.round(ratio * (validChartPoints.length - 1));
              return <span key={ratio}>{validChartPoints[idx]?.label ?? ""}</span>;
            })}
          </div>
        ) : null}
      </section>

      {/* === Bottom summary band === */}
      <section
        className="eh-bottom"
        style={{
          height: energyHistoryLayout.bottom.height,
          left: energyHistoryLayout.bottom.left,
          top: energyHistoryLayout.bottom.top,
          width: energyHistoryLayout.bottom.width
        }}
      >
        {viewModel.bottomSummary.map((item) => (
          <div key={item.label}>
            <b>{item.label}</b>
            <span>{item.valueLabel}</span>
            {item.detailLabel ? <small>{item.detailLabel}</small> : null}
          </div>
        ))}
      </section>
    </section>
  );
}
