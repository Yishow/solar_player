import { useMemo, useState } from "react";
import { useBodyClass } from "../../hooks/useBodyClass";
import { requestJson } from "../../services/api";
import { useRuntimeRefreshLifecycle } from "../../hooks/useRuntimeRefreshLifecycle";
import { useLiveMetrics } from "../../hooks/useLiveMetrics";
import { resolveMonitoringHistoryRuntimeRefreshSpec } from "../runtimeRefreshRegistry";
import { energyTrendCardKeys, energyTrendLayout } from "./layout";
import "./trend.css";
import {
  buildEnergyTrendViewModel,
  type EnergyTrendRange,
  type EnergyTrendSnapshot
} from "./viewModel";

type MetricsHistoryResponse = {
  range: "day" | "week" | "month" | "total";
  snapshots: EnergyTrendSnapshot[];
};

const CARD_ICON_GLYPHS: Record<string, string> = {
  bolt: "⚡",
  co2: "C",
  plug: "⌁",
  refresh: "↻",
  sun: "☀"
};

function formatTickLabel(value: string) {
  if (value.length <= 16) {
    return value.replace("T", " ").slice(5, 16);
  }
  return value;
}

function RefreshGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 12c0 4-4 8-8 8s-8-4-8-8 4-8 8-8c2 0 4 1 6 2" />
      <path d="M20 4v6h-6" />
    </svg>
  );
}

function MiniTrendChart({
  points
}: {
  points: Array<{ label: string; value: number | null }>;
}) {
  const validPoints = points.filter(
    (point): point is { label: string; value: number } => point.value !== null
  );
  if (validPoints.length === 0) return null;
  const width = 272;
  const height = 220;
  const padding = 8;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const maxValue = Math.max(...validPoints.map((point) => point.value), 1);
  const bottom = padding + chartHeight;
  const coords = validPoints.map((point, index) => ({
    x: padding + (index / Math.max(validPoints.length - 1, 1)) * chartWidth,
    y: padding + chartHeight - (point.value / maxValue) * chartHeight
  }));
  const linePath = coords.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L ${coords[coords.length - 1]!.x},${bottom} L ${coords[0]!.x},${bottom} Z`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="et-chart-svg" preserveAspectRatio="none">
      {[0, 0.33, 0.66, 1].map((ratio) => (
        <line
          key={`h${ratio}`}
          x1={padding}
          y1={padding + chartHeight * ratio}
          x2={padding + chartWidth}
          y2={padding + chartHeight * ratio}
          strokeWidth="1"
        />
      ))}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
        <line
          key={`v${ratio}`}
          x1={padding + ratio * chartWidth}
          y1={padding}
          x2={padding + ratio * chartWidth}
          y2={bottom}
          strokeWidth="1"
        />
      ))}
      <path d={areaPath} className="et-area-fill" />
      <path d={linePath} className="et-area-line" />
    </svg>
  );
}

export function EnergyTrend() {
  useBodyClass("page-hero-shell");
  const { snapshot } = useLiveMetrics();
  const [range, setRange] = useState<EnergyTrendRange>("day");
  const historyRefresh = resolveMonitoringHistoryRuntimeRefreshSpec(range);
  const historyRuntime = useRuntimeRefreshLifecycle<MetricsHistoryResponse>({
    enabled: true,
    load: () =>
      requestJson<MetricsHistoryResponse>(
        `/api/metrics/history?range=${range}`
      ),
    refreshKey: historyRefresh.refreshKey,
    shouldRefresh: (event) => historyRefresh.refreshScopes.includes(event.scope)
  });
  const snapshots = historyRuntime.payload?.snapshots ?? [];
  const isLoading = historyRuntime.isLoading || historyRuntime.isRefreshing;
  const errorMessage = historyRuntime.errorMessage;

  const viewModel = useMemo(
    () =>
      buildEnergyTrendViewModel({
        liveSnapshot: snapshot,
        range,
        snapshots
      }),
    [range, snapshot, snapshots]
  );

  const refreshState = errorMessage ? "is-error" : isLoading ? "is-loading" : "";
  const refreshSummary = errorMessage
    ? errorMessage
    : isLoading
      ? "同步中..."
      : viewModel.monitoringState.statusLabel;
  const refreshDetail = errorMessage
    ? "History sync failed"
    : isLoading
      ? "Loading metrics history"
      : `${viewModel.monitoringState.sourceRoleLabel} · ${viewModel.monitoringState.freshnessLabel} · ${viewModel.monitoringState.detailLabel}`;

  return (
    <section className="et-page">
      <section
        className="et-title mgmt-page-title"
        style={{
          left: energyTrendLayout.title.left,
          top: energyTrendLayout.title.top,
          width: energyTrendLayout.title.width
        }}
      >
        <h1 className="mgmt-page-title__heading">能源<em>趨勢</em></h1>
        <p className="mgmt-page-title__subtitle">Energy Trend</p>
      </section>

      <p
        className="et-copy"
        style={{
          left: energyTrendLayout.copy.left,
          top: energyTrendLayout.copy.top,
          width: energyTrendLayout.copy.width
        }}
      >
        {viewModel.leadDescription}
      </p>

      <div
        className="et-leaf"
        style={{
          height: energyTrendLayout.leaf.height,
          left: energyTrendLayout.leaf.left,
          top: energyTrendLayout.leaf.top,
          width: energyTrendLayout.leaf.width
        }}
        aria-hidden
      />

      <div
        className="et-tabs"
        style={{
          height: energyTrendLayout.tabs.height,
          left: energyTrendLayout.tabs.left,
          top: energyTrendLayout.tabs.top,
          width: energyTrendLayout.tabs.width
        }}
      >
        {viewModel.tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setRange(tab.key)}
            className={tab.active ? "active" : ""}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        className={`et-refresh ${refreshState}`}
        style={{
          height: energyTrendLayout.refresh.height,
          left: energyTrendLayout.refresh.left,
          top: energyTrendLayout.refresh.top,
          width: energyTrendLayout.refresh.width
        }}
      >
        <span className="et-refresh-icon">
          <RefreshGlyph />
        </span>
        <span>
          {refreshSummary}
          <small>{refreshDetail}</small>
        </span>
      </div>

      {viewModel.cards.map((card, index) => {
        const cardKey = energyTrendCardKeys[index];
        const layout = cardKey ? energyTrendLayout.cards[cardKey] : null;
        if (!layout) return null;
        const validPoints = card.chartPoints.filter(
          (point): point is { label: string; value: number } => point.value !== null
        );
        return (
          <article
            key={card.titleZh}
            className="et-card"
            style={{
              height: layout.height,
              left: layout.left,
              top: layout.top,
              width: layout.width
            }}
          >
            <div className={`et-card-icon ${card.icon === "sun" ? "is-accent" : ""}`}>
              {CARD_ICON_GLYPHS[card.icon] ?? "·"}
            </div>
            <div className="et-card-title">
              {card.titleZh}
              <small>{card.titleEn}</small>
            </div>
            <div className="et-card-value">
              {card.valueLabel}
              <small>{card.unitLabel}</small>
            </div>
            <div className="et-axis-labels">
              <span>100%</span>
              <span>66%</span>
              <span>33%</span>
              <span>0</span>
            </div>
            {validPoints.length > 0 ? (
              <MiniTrendChart points={card.chartPoints} />
            ) : (
              <div className="et-empty">{viewModel.monitoringState.emptyStateLabel}</div>
            )}
            <div className="et-axis-times">
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const idx = Math.round(ratio * (validPoints.length - 1));
                return <span key={ratio}>{formatTickLabel(validPoints[idx]?.label ?? "")}</span>;
              })}
            </div>
          </article>
        );
      })}
    </section>
  );
}
