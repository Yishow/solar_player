import { MetricCard } from "../../components/MetricCard";
import { DataCardGrid } from "../../components/DataCardGrid";
import { Sparkline } from "../../components/Sparkline";
import { PanelCard } from "../../components/PanelCard";
import { StatusBadge } from "../../components/StatusBadge";
import { useLiveMetrics } from "../../hooks/useLiveMetrics";
import { PageScaffold } from "../shared/PageScaffold";
import { liveMetrics, trendSeries } from "../../mocks/metrics";

const metricBindings = [
  {
    fallbackIndex: 0,
    metricKey: "realTimePower"
  },
  {
    fallbackIndex: 1,
    metricKey: "todayGeneration"
  },
  {
    fallbackIndex: 2,
    metricKey: "selfConsumptionRatio"
  },
  {
    fallbackIndex: 3,
    metricKey: "todayCo2Reduction"
  },
  {
    fallbackIndex: 4,
    metricKey: "systemEfficiency"
  }
] as const;

function formatMetricValue(value: number, unit: string | null) {
  const digits =
    unit === "%" ? 1 : Math.abs(value) >= 100 ? 0 : Math.abs(value) >= 10 ? 1 : 2;

  return value.toLocaleString("zh-TW", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits === 0 ? 0 : 1
  });
}

function formatHelperTimestamp(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleTimeString("zh-TW", {
    hour12: false
  });
}

export function Overview() {
  const { connectionState, isSocketConnected, snapshot } = useLiveMetrics();
  const metricsToRender = metricBindings.map(({ fallbackIndex, metricKey }) => {
    const fallbackMetric = liveMetrics[fallbackIndex]!;
    const liveMetric = snapshot.metrics[metricKey];

    if (!isSocketConnected || !liveMetric) {
      return fallbackMetric;
    }

    return {
      ...fallbackMetric,
      helper: `最後更新 ${formatHelperTimestamp(liveMetric.timestamp)}`,
      unit: liveMetric.unit ?? fallbackMetric.unit,
      value: formatMetricValue(liveMetric.value, liveMetric.unit)
    };
  });

  return (
    <PageScaffold
      path="/overview"
      description="總覽儀表板：即時發電、累積發電、CO₂ 減量等核心 KPI。"
    >
      {/* Hero */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-brand-600/90 to-brand-800/80 p-8 text-white shadow-panel">
        <div className="absolute right-8 top-4 opacity-20">
          <svg width="120" height="120" viewBox="0 0 100 100" fill="currentColor">
            <circle cx="50" cy="50" r="20" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <line
                key={deg}
                x1={50 + 28 * Math.cos((deg * Math.PI) / 180)}
                y1={50 + 28 * Math.sin((deg * Math.PI) / 180)}
                x2={50 + 40 * Math.cos((deg * Math.PI) / 180)}
                y2={50 + 40 * Math.sin((deg * Math.PI) / 180)}
                strokeWidth="4"
                strokeLinecap="round"
              />
            ))}
          </svg>
        </div>
        <h1 className="text-4xl font-bold leading-tight">綠色能源．永續未來</h1>
        <p className="mt-3 text-lg opacity-90">國瑞汽車中廠綠能展示播放器 — 即時監控與永續成果</p>
      </div>

      {/* KPI Cards */}
      <DataCardGrid columns={5}>
        {metricsToRender.map((metric) => (
          <MetricCard
            key={metric.label}
            icon={metric.icon}
            label={metric.label}
            value={metric.value}
            unit={metric.unit}
            helper={metric.helper}
          />
        ))}
      </DataCardGrid>

      {/* Sparkline trend */}
      <PanelCard title="發電趨勢" subtitle="POWER TREND (12H)">
        <div className="mb-4 flex items-center justify-end">
          <StatusBadge
            status={
              connectionState === "connected"
                ? "connected"
                : connectionState === "connecting"
                  ? "connecting"
                  : "disconnected"
            }
            label={isSocketConnected ? "Socket 即時更新中" : "Socket 未連線，顯示 mock 資料"}
          />
        </div>
        <Sparkline values={trendSeries} />
      </PanelCard>
    </PageScaffold>
  );
}
