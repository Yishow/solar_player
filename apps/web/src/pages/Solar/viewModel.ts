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
  iconKey: SolarKpiIconKey;
  key: SolarMetricKey;
  label: string;
  unit: string;
};

type SolarFlowAssetKey =
  | "solar-panel-display"
  | "inverter-display"
  | "factory-consumption-display"
  | "carbon-reduction-display";

type SolarKpiIconKey =
  | "metric-generation-sun"
  | "metric-self-consumption"
  | "metric-co2-today"
  | "metric-co2-total"
  | "metric-efficiency";

type BuildSolarViewModelArgs = {
  isSocketConnected: boolean;
  snapshot: LiveMetricsSnapshot;
};

const kpiBindings: SolarMetricBinding[] = [
  {
    fallbackIndex: 1,
    iconKey: "metric-generation-sun",
    key: "todayGeneration",
    label: "今日發電量",
    unit: "kWh"
  },
  {
    fallbackIndex: 2,
    iconKey: "metric-self-consumption",
    key: "selfConsumptionRatio",
    label: "自發自用比例",
    unit: "%"
  },
  {
    fallbackIndex: 3,
    iconKey: "metric-co2-today",
    key: "todayCo2Reduction",
    label: "今日減碳量",
    unit: "t"
  },
  {
    fallbackHelper: "累積成果",
    fallbackIndex: 3,
    fallbackValue: "9,842",
    iconKey: "metric-co2-total",
    key: "totalCo2Reduction",
    label: "累積減碳量",
    unit: "t"
  },
  {
    fallbackIndex: 4,
    iconKey: "metric-efficiency",
    key: "systemEfficiency",
    label: "系統效率",
    unit: "%"
  }
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
    {
      fallbackIndex: 0,
      iconKey: "metric-generation-sun",
      key: "realTimePower",
      label: "即時功率",
      unit: "kW"
    },
    isSocketConnected,
    snapshot
  );
  const efficiency = resolveMetricValue(
    {
      fallbackIndex: 4,
      iconKey: "metric-efficiency",
      key: "systemEfficiency",
      label: "系統效率",
      unit: "%"
    },
    isSocketConnected,
    snapshot
  );
  const selfConsumption = resolveMetricValue(
    {
      fallbackIndex: 2,
      iconKey: "metric-self-consumption",
      key: "selfConsumptionRatio",
      label: "自發自用比例",
      unit: "%"
    },
    isSocketConnected,
    snapshot
  );
  const co2Today = resolveMetricValue(
    {
      fallbackIndex: 3,
      iconKey: "metric-co2-today",
      key: "todayCo2Reduction",
      label: "今日減碳量",
      unit: "t"
    },
    isSocketConnected,
    snapshot
  );

  return {
    flowNodes: [
      {
        assetKey: "solar-panel-display" as SolarFlowAssetKey,
        footnote: "Solar Panels",
        label: "太陽能板",
        value: `${power.value} ${power.unit}`
      },
      {
        assetKey: "inverter-display" as SolarFlowAssetKey,
        footnote: "Inverter",
        label: "變流器",
        value: `${efficiency.value}${efficiency.unit}`
      },
      {
        assetKey: "factory-consumption-display" as SolarFlowAssetKey,
        footnote: "Factory Consumption",
        label: "工廠用電",
        value: `${selfConsumption.value}${selfConsumption.unit}`
      },
      {
        assetKey: "carbon-reduction-display" as SolarFlowAssetKey,
        footnote: "Carbon Reduction",
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
        iconKey: binding.iconKey,
        label: binding.label,
        unit: resolved.unit,
        value: resolved.value
      };
    })
  };
}
