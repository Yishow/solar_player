import type { LiveMetricsSnapshot } from "../../services/socket";

export type EnergyTrendRange = "day" | "week" | "month" | "total";

export type EnergyTrendSnapshot = {
  capturedAt: string;
  co2: number | null;
  consumption: number | null;
  efficiency: number | null;
  generation: number | null;
  ratio: number | null;
  selfConsumption: number | null;
};

type BuildEnergyTrendViewModelArgs = {
  liveSnapshot: LiveMetricsSnapshot;
  range: EnergyTrendRange;
  snapshots: EnergyTrendSnapshot[];
};

const rangeTabs = [
  { key: "day", label: "日 Day" },
  { key: "week", label: "週 Week" },
  { key: "month", label: "月 Month" },
  { key: "total", label: "累積 Total" }
] as const;

function formatValue(value: number | null, minimumFractionDigits = 0, maximumFractionDigits = 0) {
  if (value === null) {
    return "--";
  }

  return value.toLocaleString("zh-TW", {
    maximumFractionDigits,
    minimumFractionDigits
  });
}

function readLiveMetric(snapshot: LiveMetricsSnapshot, key: string) {
  return snapshot.metrics[key]?.value ?? null;
}

function buildChartPoints(
  snapshots: EnergyTrendSnapshot[],
  picker: (snapshot: EnergyTrendSnapshot) => number | null
) {
  return snapshots.map((snapshot) => ({
    label: snapshot.capturedAt,
    value: picker(snapshot)
  }));
}

function sumMetric(snapshots: EnergyTrendSnapshot[], picker: (snapshot: EnergyTrendSnapshot) => number | null) {
  return snapshots.reduce((sum, snapshot) => sum + (picker(snapshot) ?? 0), 0);
}

function averageMetric(snapshots: EnergyTrendSnapshot[], picker: (snapshot: EnergyTrendSnapshot) => number | null) {
  const values = snapshots.map(picker).filter((value): value is number => value !== null);

  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildEnergyTrendViewModel({
  liveSnapshot,
  range,
  snapshots
}: BuildEnergyTrendViewModelArgs) {
  const generationTotal = readLiveMetric(liveSnapshot, "todayGeneration") ?? sumMetric(snapshots, (snapshot) => snapshot.generation);
  const consumptionTotal =
    readLiveMetric(liveSnapshot, "consumptionEnergy") ?? sumMetric(snapshots, (snapshot) => snapshot.consumption);
  const ratioValue =
    readLiveMetric(liveSnapshot, "selfConsumptionRatio") ?? averageMetric(snapshots, (snapshot) => snapshot.ratio);
  const co2Value =
    readLiveMetric(liveSnapshot, "todayCo2Reduction") ?? sumMetric(snapshots, (snapshot) => snapshot.co2);
  const powerValue =
    readLiveMetric(liveSnapshot, "realTimePower") ??
    (snapshots.length > 0 ? snapshots[snapshots.length - 1]?.generation ?? null : null);

  return {
    cards: [
      {
        chartPoints: buildChartPoints(snapshots, (snapshot) => snapshot.generation),
        icon: "bolt",
        titleEn: "Power",
        titleZh: "發電功率",
        unitLabel: "kW",
        valueLabel: formatValue(powerValue)
      },
      {
        chartPoints: buildChartPoints(snapshots, (snapshot) => snapshot.generation),
        icon: "sun",
        titleEn: "Energy",
        titleZh: "發電量",
        unitLabel: "kWh",
        valueLabel: formatValue(generationTotal)
      },
      {
        chartPoints: buildChartPoints(snapshots, (snapshot) => snapshot.consumption),
        icon: "plug",
        titleEn: "Consumption",
        titleZh: "用電量",
        unitLabel: "kWh",
        valueLabel: formatValue(consumptionTotal)
      },
      {
        chartPoints: buildChartPoints(snapshots, (snapshot) => snapshot.ratio),
        icon: "refresh",
        titleEn: "Self-consumption",
        titleZh: "自發自用比例",
        unitLabel: "%",
        valueLabel: formatValue(ratioValue)
      },
      {
        chartPoints: buildChartPoints(snapshots, (snapshot) => snapshot.co2),
        icon: "co2",
        titleEn: "CO2 Reduction",
        titleZh: "減碳量",
        unitLabel: "t",
        valueLabel: formatValue(co2Value, 2, 2)
      }
    ],
    leadDescription:
      "掌握綠電發電、用電與減碳趨勢，持續優化能源使用效率，推動低碳營運與永續未來。",
    refreshLabel: "資料每 30 秒更新一次",
    tabs: rangeTabs.map((tab) => ({
      ...tab,
      active: tab.key === range
    }))
  };
}
