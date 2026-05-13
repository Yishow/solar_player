import { liveMetrics } from "../../mocks/metrics";
import type { LiveMetricsSnapshot } from "../../services/socket";

type SolarMetricKey =
  | "realTimePower"
  | "todayGeneration"
  | "selfConsumptionRatio"
  | "todayCo2Reduction"
  | "totalCo2Reduction"
  | "systemEfficiency";

type SolarMetricBinding = {
  fallbackIndex: number;
  fallbackValue?: string;
  fallbackHelper?: string;
  icon: string;
  key: SolarMetricKey;
  label: string;
  unit: string;
};

type BuildSolarViewModelArgs = {
  isSocketConnected: boolean;
  snapshot: LiveMetricsSnapshot;
};

const kpiBindings: SolarMetricBinding[] = [
  { fallbackIndex: 1, icon: "☀️", key: "todayGeneration", label: "今日發電量", unit: "kWh" },
  { fallbackIndex: 2, icon: "🏭", key: "selfConsumptionRatio", label: "自發自用比例", unit: "%" },
  { fallbackIndex: 3, icon: "🌿", key: "todayCo2Reduction", label: "今日減碳量", unit: "t" },
  {
    fallbackHelper: "累積成果",
    fallbackIndex: 3,
    fallbackValue: "9,842",
    icon: "🍃",
    key: "totalCo2Reduction",
    label: "累積減碳量",
    unit: "t"
  },
  { fallbackIndex: 4, icon: "🛰️", key: "systemEfficiency", label: "系統效率", unit: "%" }
];

function formatMetricValue(value: number, unit: string | null) {
  const digits = unit === "%" ? 1 : Math.abs(value) >= 100 ? 0 : Math.abs(value) >= 10 ? 1 : 2;

  return value.toLocaleString("zh-TW", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits === 0 ? 0 : 1
  });
}

function resolveMetricValue(
  binding: SolarMetricBinding,
  isSocketConnected: boolean,
  snapshot: LiveMetricsSnapshot
) {
  const { fallbackHelper, fallbackIndex, fallbackValue, key, unit } = binding;
  const fallbackMetric = liveMetrics[fallbackIndex]!;
  const liveMetric = snapshot.metrics[key];

  if (!isSocketConnected || !liveMetric) {
    return {
      helper: fallbackHelper ?? fallbackMetric.helper,
      unit,
      value: fallbackValue ?? fallbackMetric.value
    };
  }

  return {
    helper: fallbackMetric.helper,
    unit: liveMetric.unit ?? unit,
    value: formatMetricValue(liveMetric.value, liveMetric.unit ?? unit)
  };
}

export function buildSolarViewModel({
  isSocketConnected,
  snapshot
}: BuildSolarViewModelArgs) {
  const power = resolveMetricValue(
    { fallbackIndex: 0, icon: "⚡", key: "realTimePower", label: "即時功率", unit: "kW" },
    isSocketConnected,
    snapshot
  );
  const efficiency = resolveMetricValue(
    { fallbackIndex: 4, icon: "🛰️", key: "systemEfficiency", label: "系統效率", unit: "%" },
    isSocketConnected,
    snapshot
  );
  const selfConsumption = resolveMetricValue(
    { fallbackIndex: 2, icon: "🏭", key: "selfConsumptionRatio", label: "自發自用比例", unit: "%" },
    isSocketConnected,
    snapshot
  );
  const co2Today = resolveMetricValue(
    { fallbackIndex: 3, icon: "🌿", key: "todayCo2Reduction", label: "今日減碳量", unit: "t" },
    isSocketConnected,
    snapshot
  );

  return {
    flowNodes: [
      {
        footnote: "Solar Panels",
        icon: "☀️",
        label: "太陽能板",
        value: `${power.value} ${power.unit}`
      },
      {
        footnote: "Inverter",
        icon: "🔄",
        label: "變流器",
        value: `${efficiency.value}${efficiency.unit}`
      },
      {
        footnote: "Factory Consumption",
        icon: "🏭",
        label: "工廠用電",
        value: `${selfConsumption.value}${selfConsumption.unit}`
      },
      {
        footnote: "Carbon Reduction",
        icon: "🌿",
        label: "減碳效益",
        value: `${co2Today.value} ${co2Today.unit}`
      }
    ],
    hero: {
      eyebrow: "綠能驅動・永續未來",
      subtitleLines: ["乾淨的太陽能，為工廠注入綠色動能", "Clean solar energy powers our factory"],
      titleLines: ["太陽能驅動", "製造新能源"]
    },
    kpis: kpiBindings.map((binding) => {
      const resolved = resolveMetricValue(binding, isSocketConnected, snapshot);

      return {
        helper: resolved.helper,
        icon: binding.icon,
        label: binding.label,
        unit: resolved.unit,
        value: resolved.value
      };
    })
  };
}
