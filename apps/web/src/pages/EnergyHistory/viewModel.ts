import {
  buildMonitoringSurfaceState,
  isMonitoringSourceStale
} from "../energyMonitoringState";

export type EnergyHistoryRange = "day" | "week" | "month" | "year" | "total";

export type EnergyHistorySnapshot = {
  capturedAt: string;
  co2: number | null;
  consumption: number | null;
  efficiency: number | null;
  generation: number | null;
  ratio: number | null;
  selfConsumption: number | null;
};

export type DailyEnergySummary = {
  co2Total: number | null;
  consumptionTotal: number | null;
  date: string;
  generationTotal: number | null;
  peakConsumption: number | null;
  peakConsumptionTime: string | null;
  peakGeneration: number | null;
  peakGenerationTime: string | null;
  selfConsumptionTotal: number | null;
};

export type CumulativeCounter = {
  lastUpdated: string | null;
  metricKey: string;
  resetCount: number;
  totalValue: number | null;
};

type BuildEnergyHistoryViewModelArgs = {
  counters: CumulativeCounter[];
  now?: Date | string;
  range: EnergyHistoryRange;
  snapshots: EnergyHistorySnapshot[];
  summaries: DailyEnergySummary[];
};

const rangeOptions = [
  { key: "day", label: "今日", subtitle: "Today" },
  { key: "week", label: "本週", subtitle: "This Week" },
  { key: "month", label: "本月", subtitle: "This Month" },
  { key: "year", label: "今年", subtitle: "This Year" },
  { key: "total", label: "累積", subtitle: "Cumulative" }
] as const;

const rangeHeadings: Record<EnergyHistoryRange, { sourceLabel: string; title: string; subtitle: string }> = {
  day: {
    sourceLabel: "History Summary",
    subtitle: "Today's Trend",
    title: "今日趨勢"
  },
  month: {
    sourceLabel: "History Summary",
    subtitle: "This Month",
    title: "本月趨勢"
  },
  total: {
    sourceLabel: "Cumulative Counter",
    subtitle: "Cumulative Trend",
    title: "累積趨勢"
  },
  week: {
    sourceLabel: "History Summary",
    subtitle: "This Week",
    title: "本週趨勢"
  },
  year: {
    sourceLabel: "History Summary",
    subtitle: "This Year",
    title: "今年趨勢"
  }
};

function formatInteger(value: number | null) {
  if (value === null) {
    return "--";
  }

  return Math.round(value).toLocaleString("zh-TW");
}

function formatCo2Tonnes(value: number | null) {
  if (value === null) {
    return "--";
  }

  return (value / 1000).toLocaleString("zh-TW", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  });
}

function getCounterValue(counters: CumulativeCounter[], metricKey: string) {
  return counters.find((counter) => counter.metricKey === metricKey)?.totalValue ?? null;
}

function sumSummaries(
  summaries: DailyEnergySummary[],
  picker: (summary: DailyEnergySummary) => number | null
) {
  if (summaries.length === 0) {
    return null;
  }

  return summaries.reduce((sum, summary) => sum + (picker(summary) ?? 0), 0);
}

function getSummariesValue(
  range: EnergyHistoryRange,
  summaries: DailyEnergySummary[],
  picker: (summary: DailyEnergySummary) => number | null
) {
  if (summaries.length === 0) {
    return null;
  }

  if (range === "day") {
    return picker(summaries[0]!);
  }

  return sumSummaries(summaries, picker);
}

function resolvePeakSummary(
  summaries: DailyEnergySummary[],
  picker: (summary: DailyEnergySummary) => number | null
) {
  return summaries.reduce<DailyEnergySummary | null>((currentPeak, summary) => {
    const currentValue = currentPeak === null ? null : picker(currentPeak);
    const nextValue = picker(summary);
    if (nextValue === null) {
      return currentPeak;
    }
    if (currentValue === null || nextValue >= currentValue) {
      return summary;
    }
    return currentPeak;
  }, null);
}

function hasHistorySnapshotData(snapshots: EnergyHistorySnapshot[]) {
  return snapshots.some(
    (snapshot) =>
      snapshot.co2 !== null ||
      snapshot.consumption !== null ||
      snapshot.efficiency !== null ||
      snapshot.generation !== null ||
      snapshot.ratio !== null ||
      snapshot.selfConsumption !== null
  );
}

function hasSummaryData(summaries: DailyEnergySummary[]) {
  return summaries.some(
    (summary) =>
      summary.co2Total !== null ||
      summary.consumptionTotal !== null ||
      summary.generationTotal !== null ||
      summary.selfConsumptionTotal !== null ||
      summary.peakConsumption !== null ||
      summary.peakGeneration !== null
  );
}

function hasRequiredCounterData(counters: CumulativeCounter[]) {
  const requiredKeys = ["generation", "selfConsumption", "consumption", "ratio", "co2"];
  return requiredKeys.every((metricKey) =>
    counters.some((counter) => counter.metricKey === metricKey && counter.totalValue !== null)
  );
}

export function buildEnergyHistoryViewModel({
  counters,
  now,
  range,
  snapshots,
  summaries
}: BuildEnergyHistoryViewModelArgs) {
  const rangeHeading = rangeHeadings[range];
  const peakGenerationSummary = resolvePeakSummary(summaries, (summary) => summary.peakGeneration);
  const peakConsumptionSummary = resolvePeakSummary(summaries, (summary) => summary.peakConsumption);
  const lastUpdated =
    range === "total"
      ? counters.reduce((latest: string | null, counter) => {
          if (!counter.lastUpdated) return latest;
          if (!latest) return counter.lastUpdated;
          return counter.lastUpdated > latest ? counter.lastUpdated : latest;
        }, null)
      : snapshots.reduce<string | null>((latest, snapshot) => {
          if (!snapshot.capturedAt) return latest;
          if (!latest) return snapshot.capturedAt;
          return snapshot.capturedAt > latest ? snapshot.capturedAt : latest;
        }, null);
  const lastUpdatedLabel = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })
    : "--:--";
  const generationValue =
    range === "total"
      ? getCounterValue(counters, "generation")
      : getSummariesValue(range, summaries, (summary) => summary.generationTotal);
  const selfConsumptionValue =
    range === "total"
      ? getCounterValue(counters, "selfConsumption")
      : getSummariesValue(range, summaries, (summary) => summary.selfConsumptionTotal);
  const consumptionValue =
    range === "total"
      ? getCounterValue(counters, "consumption")
      : getSummariesValue(range, summaries, (summary) => summary.consumptionTotal);
  const ratioValue =
    range === "total"
      ? getCounterValue(counters, "ratio")
      : generationValue !== null && generationValue > 0 && selfConsumptionValue !== null
        ? (selfConsumptionValue / generationValue) * 100
        : null;
  const co2Value =
    range === "total"
      ? getCounterValue(counters, "co2")
      : getSummariesValue(range, summaries, (summary) => summary.co2Total);
  const hasUsableSummaries = hasSummaryData(summaries);
  const hasUsableSnapshots = hasHistorySnapshotData(snapshots);
  const hasUsableCounters = hasRequiredCounterData(counters);
  const historySourceStale = isMonitoringSourceStale(lastUpdated, {
    now,
    staleAfterMs: 24 * 60 * 60 * 1000
  });
  const monitoringState = range === "total"
    ? !hasUsableCounters
      ? buildMonitoringSurfaceState({
          category: "empty",
          detailLabel: "累積計數器目前沒有可用資料",
          emptyStateLabel: "目前沒有可用的歷史資料來源",
          freshnessLabel: "無資料",
          lastUpdatedAt: null,
          sourceRoleLabel: "Cumulative Counter"
        })
      : historySourceStale
        ? buildMonitoringSurfaceState({
            category: "stale",
            detailLabel: "累積計數器已超過操作監看時效，請確認上游同步",
            emptyStateLabel: "目前沒有可用的歷史資料來源",
            freshnessLabel: "逾時資料",
            lastUpdatedAt: lastUpdated,
            sourceRoleLabel: "Cumulative Counter"
          })
        : buildMonitoringSurfaceState({
            category: "fresh",
            detailLabel: "累積計數器已同步，可用於長期監看",
            emptyStateLabel: "目前沒有可用的歷史資料來源",
            freshnessLabel: "累積資料",
            lastUpdatedAt: lastUpdated,
            sourceRoleLabel: "Cumulative Counter"
          })
    : !hasUsableSummaries && !hasUsableSnapshots
      ? buildMonitoringSurfaceState({
          category: "empty",
          detailLabel: "所選 range 尚未產生可用的 history rows",
          emptyStateLabel: "目前沒有可用的歷史資料來源",
          freshnessLabel: "無資料",
          lastUpdatedAt: null,
          sourceRoleLabel: "History Summary"
        })
      : historySourceStale
        ? buildMonitoringSurfaceState({
            category: "stale",
            detailLabel: "歷史來源已超過操作監看時效，請留意目前數據可能過舊",
            emptyStateLabel: "目前沒有可用的歷史資料來源",
            freshnessLabel: "逾時資料",
            lastUpdatedAt: lastUpdated,
            sourceRoleLabel: hasUsableSummaries ? "History Summary + Trend Snapshot" : "Trend Snapshot Fallback"
          })
        : !hasUsableSummaries || !hasUsableSnapshots
          ? buildMonitoringSurfaceState({
              category: "degraded",
              detailLabel: hasUsableSummaries
                ? "缺少 trend snapshot，僅能用 history summary 呈現監看結果"
                : "缺少 history summary，僅能用 trend snapshot 維持趨勢判讀",
              emptyStateLabel: "目前沒有可用的歷史資料來源",
              freshnessLabel: "降級資料",
              lastUpdatedAt: lastUpdated,
              sourceRoleLabel: hasUsableSummaries ? "History Summary" : "Trend Snapshot Fallback"
            })
          : buildMonitoringSurfaceState({
              category: "fresh",
              detailLabel: "history summary 與 trend snapshot 皆可用",
              emptyStateLabel: "目前沒有可用的歷史資料來源",
              freshnessLabel: "歷史資料",
              lastUpdatedAt: lastUpdated,
              sourceRoleLabel: "History Summary + Trend Snapshot"
            });

  return {
    bottomSummary: [
      {
        detailLabel: peakGenerationSummary?.peakGenerationTime ?? "--:--",
        label: "尖峰發電",
        valueLabel: peakGenerationSummary?.peakGeneration !== null && peakGenerationSummary?.peakGeneration !== undefined
          ? `${formatInteger(peakGenerationSummary.peakGeneration)} kW`
          : "--"
      },
      {
        detailLabel: peakConsumptionSummary?.peakConsumptionTime ?? "--:--",
        label: "尖峰用電",
        valueLabel: peakConsumptionSummary?.peakConsumption !== null && peakConsumptionSummary?.peakConsumption !== undefined
          ? `${formatInteger(peakConsumptionSummary.peakConsumption)} kW`
          : "--"
      },
      {
        detailLabel: "",
        label: "資料來源",
        valueLabel: rangeHeading.sourceLabel
      },
      {
        detailLabel: "",
        label: "資料更新時間",
        valueLabel: lastUpdatedLabel
      }
    ],
    chartLines: [
      {
        colorToken: "orange",
        key: "generation",
        label: "發電量 (kW)",
        points: snapshots.map((snapshot) => ({
          label: snapshot.capturedAt,
          value: snapshot.generation
        }))
      },
      {
        colorToken: "green",
        key: "selfConsumption",
        label: "自發自用 (kW)",
        points: snapshots.map((snapshot) => ({
          label: snapshot.capturedAt,
          value: snapshot.selfConsumption
        }))
      },
      {
        colorToken: "blue",
        key: "consumption",
        label: "用電量 (kW)",
        points: snapshots.map((snapshot) => ({
          label: snapshot.capturedAt,
          value: snapshot.consumption
        }))
      }
    ],
    chartSubtitle: rangeHeading.subtitle,
    chartTitle: rangeHeading.title,
    metricCards: [
      {
        label: "發電量",
        subtitle: "Energy Generation",
        unitLabel: "kWh",
        valueLabel: formatInteger(generationValue)
      },
      {
        label: "自發自用電量",
        subtitle: "Self-consumption",
        unitLabel: "kWh",
        valueLabel: formatInteger(selfConsumptionValue)
      },
      {
        label: "用電量",
        subtitle: "Consumption",
        unitLabel: "kWh",
        valueLabel: formatInteger(consumptionValue)
      },
      {
        label: "自發自用比例",
        subtitle: "Self-consumption Ratio",
        unitLabel: "%",
        valueLabel: formatInteger(ratioValue)
      },
      {
        label: "CO2 減量",
        subtitle: "CO2 Reduction",
        unitLabel: "t",
        valueLabel: formatCo2Tonnes(co2Value)
      }
    ],
    rangeOptions: rangeOptions.map((option) => ({
      ...option,
      active: option.key === range
    })),
    monitoringState,
    sourceLabel: rangeHeading.sourceLabel,
    tableRows: summaries.map((summary) => ({
      co2Label: formatCo2Tonnes(summary.co2Total),
      consumptionLabel: formatInteger(summary.consumptionTotal),
      dateLabel: summary.date,
      generationLabel: formatInteger(summary.generationTotal),
      peakConsumptionLabel:
        summary.peakConsumption !== null && summary.peakConsumption !== undefined
          ? `${formatInteger(summary.peakConsumption)} kW`
          : "--",
      peakGenerationLabel:
        summary.peakGeneration !== null && summary.peakGeneration !== undefined
          ? `${formatInteger(summary.peakGeneration)} kW`
          : "--",
      selfConsumptionLabel: formatInteger(summary.selfConsumptionTotal)
    }))
  };
}
