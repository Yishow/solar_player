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

export function buildEnergyHistoryViewModel({
  counters,
  range,
  snapshots,
  summaries
}: BuildEnergyHistoryViewModelArgs) {
  const headlineSummary = summaries[0] ?? null;
  const generationValue =
    range === "total" ? getCounterValue(counters, "generation") : headlineSummary?.generationTotal ?? sumSummaries(summaries, (summary) => summary.generationTotal);
  const selfConsumptionValue =
    range === "total"
      ? getCounterValue(counters, "selfConsumption")
      : headlineSummary?.selfConsumptionTotal ?? sumSummaries(summaries, (summary) => summary.selfConsumptionTotal);
  const consumptionValue =
    range === "total"
      ? getCounterValue(counters, "consumption")
      : headlineSummary?.consumptionTotal ?? sumSummaries(summaries, (summary) => summary.consumptionTotal);
  const ratioValue = getCounterValue(counters, "ratio");
  const co2Value =
    range === "total" ? getCounterValue(counters, "co2") : headlineSummary?.co2Total ?? sumSummaries(summaries, (summary) => summary.co2Total);

  return {
    bottomSummary: [
      {
        detailLabel: headlineSummary?.peakGenerationTime ?? "--:--",
        label: "尖峰發電",
        valueLabel: headlineSummary?.peakGeneration !== null && headlineSummary?.peakGeneration !== undefined
          ? `${formatInteger(headlineSummary.peakGeneration)} kW`
          : "--"
      },
      {
        detailLabel: headlineSummary?.peakConsumptionTime ?? "--:--",
        label: "尖峰用電",
        valueLabel: headlineSummary?.peakConsumption !== null && headlineSummary?.peakConsumption !== undefined
          ? `${formatInteger(headlineSummary.peakConsumption)} kW`
          : "--"
      },
      {
        detailLabel: "",
        label: "資料來源",
        valueLabel: "MQTT Live"
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
