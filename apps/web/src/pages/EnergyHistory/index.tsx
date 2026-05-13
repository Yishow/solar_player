import { useEffect, useMemo, useState } from "react";
import { PanelCard } from "../../components/PanelCard";
import { requestJson } from "../../services/api";
import { PageScaffold } from "../shared/PageScaffold";
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
  if (range === "day") {
    return summaries.slice(0, 1);
  }

  if (range === "week") {
    return summaries.slice(0, 7);
  }

  if (range === "month") {
    return summaries.slice(0, 30);
  }

  return summaries;
}

function BigTrendChart({
  lines
}: {
  lines: Array<{
    colorToken: string;
    label: string;
    points: Array<{ label: string; value: number | null }>;
  }>;
}) {
  const validValues = lines.flatMap((line) => line.points.map((point) => point.value).filter((value): value is number => value !== null));
  const width = 1400;
  const height = 350;
  const padding = 36;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const maxValue = Math.max(...validValues, 1);
  const colorMap = {
    blue: "#4a86c5",
    green: "#5f8c50",
    orange: "#d89c45"
  } as const;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
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
        const validPoints = line.points.filter((point): point is { label: string; value: number } => point.value !== null);
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
            strokeWidth="4"
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

        if (!active) {
          return;
        }

        setSnapshots(historyResponse.snapshots);
        setSummaries(summaryResponse.summaries);
        setCounters(cumulativeResponse.counters);
        setErrorMessage("");
      } catch (error) {
        if (!active) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "載入歷史資料失敗。");
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
      buildEnergyHistoryViewModel({
        counters,
        range,
        snapshots,
        summaries: filterSummariesByRange(range, summaries)
      }),
    [counters, range, snapshots, summaries]
  );

  return (
    <PageScaffold path="/history" description="發電歷史紀錄：每日彙總、峰值數據、累積統計。">
      <div className="grid grid-cols-12 gap-6">
        <aside className="col-span-2">
          <div className="rounded-[28px] border border-white/70 bg-white/90 p-4 shadow-card">
            <div className="space-y-2">
              {viewModel.rangeOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setRange(option.key)}
                  className={[
                    "flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition-colors",
                    option.active ? "bg-brand-900 text-white shadow-soft" : "bg-brand-50/50 text-neutral-700 hover:bg-white"
                  ].join(" ")}
                >
                  <span className="text-lg font-semibold">{option.label}</span>
                  <span className="text-xs uppercase tracking-[0.18em] opacity-75">{option.subtitle}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="col-span-10 grid gap-6">
          <section>
            <h1 className="text-[44px] font-bold leading-tight text-brand-900">能源資料歷史</h1>
            <p className="mt-2 text-lg uppercase tracking-[0.18em] text-brand-700">Energy Data History</p>
            <p className="mt-4 text-base leading-7 text-neutral-600">
              以 monitoring batch 的 FHD 可讀性為優先，集中呈現趨勢線、累積摘要與高密度表格。
            </p>
          </section>

          {errorMessage ? (
            <div className="rounded-[28px] border border-[rgba(230,0,18,0.18)] bg-[rgba(255,241,241,0.96)] px-6 py-5 shadow-soft">
              <p className="text-xl font-semibold text-neutral-800">歷史資料載入失敗</p>
              <p className="mt-2 text-sm leading-6 text-neutral-600">{errorMessage}</p>
            </div>
          ) : null}

          <div className="grid grid-cols-5 gap-4">
            {viewModel.metricCards.map((card) => (
              <article
                key={card.label}
                className="rounded-[28px] border border-white/75 bg-white/92 p-5 shadow-card backdrop-blur"
              >
                <p className="text-sm font-medium tracking-[0.08em] text-neutral-600">{card.label}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-500">{card.subtitle}</p>
                <div className="mt-4 flex items-end gap-2">
                  <p className="text-3xl font-bold text-brand-900">{card.valueLabel}</p>
                  <span className="pb-1 text-sm font-semibold uppercase tracking-[0.12em] text-brand-700">
                    {card.unitLabel}
                  </span>
                </div>
              </article>
            ))}
          </div>

          <PanelCard title="今日趨勢" subtitle="TODAY'S TREND">
            <div className="mb-4 flex flex-wrap gap-4 text-sm text-neutral-500">
              {viewModel.chartLines.map((line) => (
                <span key={line.label}>{line.label}</span>
              ))}
              <span>{isLoading ? "同步中..." : "歷史曲線已同步"}</span>
            </div>
            <BigTrendChart lines={viewModel.chartLines} />
          </PanelCard>

          <PanelCard title="高密度歷史表" subtitle="DENSE HISTORY TABLE">
            <div className="overflow-x-auto rounded-[28px] border border-white/70 bg-white/82">
              <table className="min-w-full text-left text-sm text-neutral-700">
                <thead className="border-b border-neutral-200 bg-white/95 text-xs uppercase tracking-[0.18em] text-neutral-500">
                  <tr>
                    <th className="px-4 py-3">日期</th>
                    <th className="px-4 py-3">發電量</th>
                    <th className="px-4 py-3">自發自用</th>
                    <th className="px-4 py-3">用電量</th>
                    <th className="px-4 py-3">CO2</th>
                    <th className="px-4 py-3">尖峰發電</th>
                    <th className="px-4 py-3">尖峰用電</th>
                  </tr>
                </thead>
                <tbody>
                  {viewModel.tableRows.map((row) => (
                    <tr key={row.dateLabel} className="border-b border-neutral-100 last:border-b-0">
                      <td className="px-4 py-3 font-semibold text-neutral-800">{row.dateLabel}</td>
                      <td className="px-4 py-3">{row.generationLabel}</td>
                      <td className="px-4 py-3">{row.selfConsumptionLabel}</td>
                      <td className="px-4 py-3">{row.consumptionLabel}</td>
                      <td className="px-4 py-3">{row.co2Label}</td>
                      <td className="px-4 py-3">{row.peakGenerationLabel}</td>
                      <td className="px-4 py-3">{row.peakConsumptionLabel}</td>
                    </tr>
                  ))}
                  {viewModel.tableRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-neutral-500">
                        目前所選範圍沒有 daily summary rows。
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </PanelCard>

          <div className="grid grid-cols-3 gap-4">
            {viewModel.bottomSummary.map((item) => (
              <div key={item.label} className="rounded-[28px] border border-white/70 bg-white/92 p-5 shadow-soft">
                <p className="text-sm font-medium tracking-[0.08em] text-neutral-500">{item.label}</p>
                <p className="mt-3 text-2xl font-semibold text-brand-900">{item.valueLabel}</p>
                {item.detailLabel ? <p className="mt-2 text-sm text-neutral-500">{item.detailLabel}</p> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageScaffold>
  );
}
