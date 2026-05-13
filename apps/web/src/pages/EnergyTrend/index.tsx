import { useEffect, useMemo, useState } from "react";
import { requestJson } from "../../services/api";
import { useLiveMetrics } from "../../hooks/useLiveMetrics";
import { PageScaffold } from "../shared/PageScaffold";
import {
  buildEnergyTrendViewModel,
  type EnergyTrendRange,
  type EnergyTrendSnapshot
} from "./viewModel";

type MetricsHistoryResponse = {
  range: "day" | "week" | "month" | "total";
  snapshots: EnergyTrendSnapshot[];
};

const iconMap = {
  bolt: "⚡",
  co2: "🌿",
  plug: "🔌",
  refresh: "🔄",
  sun: "☀️"
} as const;

function formatTickLabel(value: string) {
  if (value.length <= 16) {
    return value.replace("T", " ").slice(5, 16);
  }

  return value;
}

function MiniTrendChart({
  color,
  points
}: {
  color: string;
  points: Array<{ label: string; value: number | null }>;
}) {
  const validPoints = points.filter((point): point is { label: string; value: number } => point.value !== null);
  const width = 260;
  const height = 150;
  const padding = 16;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const maxValue = Math.max(...validPoints.map((point) => point.value), 1);

  const polyline = validPoints
    .map((point, index) => {
      const x = padding + (index / Math.max(validPoints.length - 1, 1)) * chartWidth;
      const y = padding + chartHeight - (point.value / maxValue) * chartHeight;
      return `${x},${y}`;
    })
    .join(" ");

  if (validPoints.length === 0) {
    return (
      <div className="flex h-[150px] items-center justify-center rounded-2xl border border-dashed border-brand-200 bg-white/70 text-sm text-neutral-400">
        尚無趨勢資料
      </div>
    );
  }

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[150px] w-full">
        {[0, 0.33, 0.66, 1].map((ratio) => (
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
        <polyline fill="none" points={polyline} stroke={color} strokeWidth="3" strokeLinecap="round" />
      </svg>
      <div className="mt-3 flex items-center justify-between text-xs text-neutral-400">
        <span>{formatTickLabel(validPoints[0]?.label ?? "")}</span>
        <span>{formatTickLabel(validPoints[Math.floor(validPoints.length / 2)]?.label ?? "")}</span>
        <span>{formatTickLabel(validPoints[validPoints.length - 1]?.label ?? "")}</span>
      </div>
    </div>
  );
}

export function EnergyTrend() {
  const { lastUpdatedAt, snapshot } = useLiveMetrics();
  const [range, setRange] = useState<EnergyTrendRange>("day");
  const [snapshots, setSnapshots] = useState<EnergyTrendSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    const loadHistory = async () => {
      setIsLoading(true);

      try {
        const response = await requestJson<MetricsHistoryResponse>(`/api/metrics/history?range=${range}`);

        if (!active) {
          return;
        }

        setSnapshots(response.snapshots);
        setErrorMessage("");
      } catch (error) {
        if (!active) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "載入趨勢資料失敗。");
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadHistory();

    return () => {
      active = false;
    };
  }, [range]);

  const viewModel = useMemo(
    () =>
      buildEnergyTrendViewModel({
        liveSnapshot: snapshot,
        range,
        snapshots
      }),
    [range, snapshot, snapshots]
  );

  return (
    <PageScaffold path="/trends" description="能源趨勢摘要：發電、用電、CO₂ 趨勢圖表。">
      <section className="grid grid-cols-12 gap-6">
        <div className="col-span-8">
          <div className="h-1 w-16 rounded-full bg-brand-200" />
          <h1 className="mt-5 text-[52px] font-bold leading-[1.02] text-brand-900">
            <span className="font-serif italic">能源趨勢</span>摘要
          </h1>
          <p className="mt-3 font-en text-lg uppercase tracking-[0.2em] text-brand-700">Energy Trend Summary</p>
          <p className="mt-6 max-w-4xl text-lg leading-8 text-neutral-600">{viewModel.leadDescription}</p>
        </div>
        <div className="col-span-4">
          <div className="rounded-[28px] border border-white/75 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(241,246,235,0.82))] p-5 shadow-card">
            <p className="text-sm font-medium tracking-[0.08em] text-neutral-600">資料刷新</p>
            <p className="mt-3 text-3xl font-bold leading-tight text-brand-900">
              {isLoading ? "同步中" : errorMessage ? "載入異常" : "MQTT Live"}
            </p>
            <p className="mt-3 text-sm leading-6 text-neutral-500">
              {errorMessage || `${viewModel.refreshLabel}，最新時間 ${lastUpdatedAt ?? "尚未收到"}。`}
            </p>
          </div>
        </div>
      </section>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-3">
          {viewModel.tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setRange(tab.key)}
              className={[
                "rounded-full px-5 py-3 text-sm font-semibold transition-colors",
                tab.active ? "bg-brand-900 text-white shadow-card" : "bg-white/78 text-neutral-600 hover:bg-white"
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="rounded-full bg-brand-50 px-4 py-3 text-sm text-brand-900">{viewModel.refreshLabel}</div>
      </div>

      <div className="mt-6 grid grid-cols-12 gap-4">
        {viewModel.cards.map((card, index) => (
          <article
            key={card.titleZh}
            className={[
              "rounded-[28px] border border-white/75 bg-white/92 p-5 shadow-card backdrop-blur",
              index < 3 ? "col-span-4" : "col-span-6"
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-brand-900">{card.titleZh}</p>
                <p className="mt-1 text-sm uppercase tracking-[0.18em] text-neutral-500">{card.titleEn}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-2xl shadow-soft">
                {iconMap[card.icon as keyof typeof iconMap]}
              </div>
            </div>
            <div className="mt-5 flex items-end gap-2">
              <p className="text-4xl font-bold text-neutral-900">{card.valueLabel}</p>
              <span className="pb-1 text-base font-semibold uppercase tracking-[0.12em] text-brand-700">
                {card.unitLabel}
              </span>
            </div>
            <div className="mt-4">
              <MiniTrendChart color="rgba(79,122,63,0.9)" points={card.chartPoints} />
            </div>
          </article>
        ))}
      </div>
    </PageScaffold>
  );
}
