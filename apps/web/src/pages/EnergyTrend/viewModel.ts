import type { LiveMetricsSnapshot } from "../../services/socket";
import {
  buildMonitoringSurfaceState,
  isMonitoringSourceStale
} from "../energyMonitoringState";

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
  now?: Date | string;
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
  const values = snapshots.map(picker).filter((value): value is number => value !== null);

  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0);
}

function averageMetric(snapshots: EnergyTrendSnapshot[], picker: (snapshot: EnergyTrendSnapshot) => number | null) {
  const values = snapshots.map(picker).filter((value): value is number => value !== null);

  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function hasTrendSnapshotData(snapshots: EnergyTrendSnapshot[]) {
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

export function buildEnergyTrendViewModel({
  liveSnapshot,
  now,
  range,
  snapshots
}: BuildEnergyTrendViewModelArgs) {
  const liveGenerationTotal = readLiveMetric(liveSnapshot, "todayGeneration");
  const liveConsumptionTotal = readLiveMetric(liveSnapshot, "consumptionEnergy");
  const liveRatioValue = readLiveMetric(liveSnapshot, "selfConsumptionRatio");
  const liveCo2Value = readLiveMetric(liveSnapshot, "todayCo2Reduction");
  const livePowerValue = readLiveMetric(liveSnapshot, "realTimePower");
  const generationTotal = liveGenerationTotal ?? sumMetric(snapshots, (snapshot) => snapshot.generation);
  const consumptionTotal =
    liveConsumptionTotal ?? sumMetric(snapshots, (snapshot) => snapshot.consumption);
  const ratioValue =
    liveRatioValue ?? averageMetric(snapshots, (snapshot) => snapshot.ratio);
  const co2Value =
    liveCo2Value ?? sumMetric(snapshots, (snapshot) => snapshot.co2);
  const powerValue =
    livePowerValue ??
    (snapshots.length > 0 ? snapshots[snapshots.length - 1]?.generation ?? null : null);
  const hasLiveMetrics = [liveGenerationTotal, liveConsumptionTotal, liveRatioValue, liveCo2Value, livePowerValue]
    .some((value) => value !== null);
  const hasHistoryData = hasTrendSnapshotData(snapshots);
  const liveSnapshotStale = hasLiveMetrics
    ? isMonitoringSourceStale(liveSnapshot.timestamp, {
        now,
        staleAfterMs: 5 * 60 * 1000
      })
    : false;
  const monitoringState = !hasLiveMetrics && !hasHistoryData
    ? buildMonitoringSurfaceState({
        category: "empty",
        detailLabel: "尚未收到可用的 live 或 history 趨勢資料",
        emptyStateLabel: "目前沒有可用的趨勢資料來源",
        freshnessLabel: "無資料",
        lastUpdatedAt: null,
        sourceRoleLabel: "No Source"
      })
    : liveSnapshotStale
      ? buildMonitoringSurfaceState({
          category: "stale",
          detailLabel: "即時 MQTT 已停止更新，畫面改用最近一次累積 telemetry",
          emptyStateLabel: "目前沒有可用的趨勢資料來源",
          freshnessLabel: "逾時資料",
          lastUpdatedAt: liveSnapshot.timestamp,
          sourceRoleLabel: "Cumulative Telemetry Fallback"
        })
      : !hasLiveMetrics || !hasHistoryData
        ? buildMonitoringSurfaceState({
            category: "degraded",
            detailLabel: hasLiveMetrics
              ? "缺少 history 趨勢點位，僅保留累積 telemetry 摘要"
              : "缺少即時 MQTT，畫面改用 history snapshot 維持趨勢判讀",
            emptyStateLabel: "目前沒有可用的趨勢資料來源",
            freshnessLabel: "降級資料",
            lastUpdatedAt: liveSnapshot.timestamp ?? snapshots[snapshots.length - 1]?.capturedAt ?? null,
            sourceRoleLabel: hasLiveMetrics ? "Cumulative Telemetry Fallback" : "History Snapshot Fallback"
          })
        : buildMonitoringSurfaceState({
            category: "fresh",
            detailLabel: "即時 telemetry 與 history 趨勢皆可用",
            emptyStateLabel: "目前沒有可用的趨勢資料來源",
            freshnessLabel: "即時資料",
            lastUpdatedAt: liveSnapshot.timestamp,
            sourceRoleLabel: "MQTT Live + History Snapshot"
          });

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
    monitoringState,
    refreshLabel: "資料每 30 秒更新一次",
    tabs: rangeTabs.map((tab) => ({
      ...tab,
      active: tab.key === range
    }))
  };
}
