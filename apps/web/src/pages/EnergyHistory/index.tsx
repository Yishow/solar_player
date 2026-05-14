import { useEffect, useMemo, useState } from "react";
import { requestJson } from "../../services/api";
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
  range: "day" | "week" | "month" | "total";
  snapshots: EnergyHistorySnapshot[];
};

type DailySummaryResponse = {
  summaries: DailyEnergySummary[];
};

type CumulativeResponse = {
  counters: CumulativeCounter[];
};

function filterSummariesByRange(range: EnergyHistoryRange, summaries: DailyEnergySummary[]) {
  if (range === "day") return summaries.slice(0, 1);
  if (range === "week") return summaries.slice(0, 7);
  if (range === "month") return summaries.slice(0, 30);
  return summaries;
}

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
  const colorMap = {
    blue: "#4a86c5",
    green: "var(--green)",
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
        const polyline = validPoints
          .map((point, index) => {
            const x = padding + (index / Math.max(validPoints.length - 1, 1)) * chartWidth;
            const y = padding + chartHeight - (point.value / maxValue) * chartHeight;
            return `${x},${y}`;
          })
          .join(" ");
        return (
          <polyline
            key={line.label}
            fill="none"
            points={polyline}
            stroke={colorMap[line.colorToken as keyof typeof colorMap]}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />
        );
      })}
    </svg>
  );
}

export function EnergyHistory() {
  const [range, setRange] = useState<EnergyHistoryRange>("day");
  const [snapshots, setSnapshots] = useState<EnergyHistorySnapshot[]>([]);
  const [summaries, setSummaries] = useState<DailyEnergySummary[]>([]);
  const [counters, setCounters] = useState<CumulativeCounter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;
    const queryRange = range === "year" ? "total" : range;
    const loadHistory = async () => {
      setIsLoading(true);
      try {
        const [historyResponse, summaryResponse, cumulativeResponse] = await Promise.all([
          requestJson<MetricsHistoryResponse>(`/api/metrics/history?range=${queryRange}`),
          requestJson<DailySummaryResponse>("/api/metrics/daily-summary"),
          requestJson<CumulativeResponse>("/api/metrics/cumulative")
        ]);
        if (!active) return;
        setSnapshots(historyResponse.snapshots);
        setSummaries(summaryResponse.summaries);
        setCounters(cumulativeResponse.counters);
        setErrorMessage("");
      } catch (error) {
        if (!active) return;
        setErrorMessage(error instanceof Error ? error.message : "載入歷史資料失敗。");
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void loadHistory();
    return () => {
      active = false;
    };
  }, [range]);

  const viewModel = useMemo(
    () =>
      buildEnergyHistoryViewModel({
        counters,
        range,
        snapshots,
        summaries: filterSummariesByRange(range, summaries)
      }),
    [counters, range, snapshots, summaries]
  );

  const validChartPoints = viewModel.chartLines
    .flatMap((line) => line.points)
    .filter((point) => point.value !== null);
  const helperState = errorMessage ? "is-error" : isLoading ? "is-loading" : "";
  const statusLabel = errorMessage || (isLoading ? "同步中..." : "歷史曲線已同步");

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
              {errorMessage ? "載入異常" : isLoading ? "同步中..." : "MQTT Live"}
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
            今日趨勢
            <small>Today's Trend</small>
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
          <div className="eh-chart-empty">目前尚無歷史圖表資料</div>
        )}

        {validChartPoints.length > 0 ? (
          <div className="eh-axis-times">
            <span>{validChartPoints[0]?.label ?? ""}</span>
            <span>{validChartPoints[Math.floor(validChartPoints.length / 2)]?.label ?? ""}</span>
            <span>{validChartPoints[validChartPoints.length - 1]?.label ?? ""}</span>
          </div>
        ) : null}

        <div className="eh-table">
          <table>
            <thead>
              <tr>
                <th>日期</th>
                <th>發電量</th>
                <th>自發自用</th>
                <th>用電量</th>
                <th>CO₂</th>
                <th>尖峰發電</th>
                <th>尖峰用電</th>
              </tr>
            </thead>
            <tbody>
              {viewModel.tableRows.map((row) => (
                <tr key={row.dateLabel}>
                  <td>{row.dateLabel}</td>
                  <td>{row.generationLabel}</td>
                  <td>{row.selfConsumptionLabel}</td>
                  <td>{row.consumptionLabel}</td>
                  <td>{row.co2Label}</td>
                  <td>{row.peakGenerationLabel}</td>
                  <td>{row.peakConsumptionLabel}</td>
                </tr>
              ))}
              {viewModel.tableRows.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", color: "#6f766f" }}>
                    目前所選範圍沒有 daily summary rows。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
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
