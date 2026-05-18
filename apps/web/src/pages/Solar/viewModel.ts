import type { MonitoringMetricBinding, SolarComparisonTarget } from "@solar-display/shared";
import {
  resolveMonitoringMetricBinding,
  resolveSolarComparison,
  resolveSolarFlowState
} from "@solar-display/shared";
import { liveMetrics } from "../../mocks/metrics";
import type { LiveMetricsSnapshot } from "../../services/socket";

type SolarMetricKey =
  | "realTimePower"
  | "todayGeneration"
  | "selfConsumptionRatio"
  | "todayCo2Reduction"
  | "totalCo2Reduction"
  | "systemEfficiency";

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

type SolarMetricBinding = {
  iconKey: SolarKpiIconKey;
} & MonitoringMetricBinding<SolarMetricKey>;

type BuildSolarViewModelArgs = {
  comparisonTargets?: Partial<Record<SolarMetricKey, SolarComparisonTarget>>;
  isSocketConnected: boolean;
  snapshot: LiveMetricsSnapshot;
  solarStory?: {
    kpis: Array<{
      metricKey: string;
      label: string;
      unit: string;
      value?: string;
      comparison: {
        state: string;
        delta: number | null;
        fallbackReason: string | null;
        label: string;
      };
      helper?: string;
      fallbackReason?: string | null;
      freshnessState?: string;
      bindingState?: string;
      alertTone?: string;
    }>;
    story: {
      flowState: {
        state: string;
        reason: string | null;
        label: string;
      };
    };
  };
};

const kpiBindings: SolarMetricBinding[] = [
  { fallbackIndex: 1, iconKey: "metric-generation-sun", metricKey: "todayGeneration", label: "今日發電量", unit: "kWh" },
  { fallbackIndex: 2, iconKey: "metric-self-consumption", metricKey: "selfConsumptionRatio", label: "自發自用比例", unit: "%" },
  { fallbackIndex: 3, iconKey: "metric-co2-today", metricKey: "todayCo2Reduction", label: "今日減碳量", unit: "t" },
  { fallbackHelper: "累積成果", fallbackIndex: 3, fallbackValue: "9,842", iconKey: "metric-co2-total", metricKey: "totalCo2Reduction", label: "累積減碳量", unit: "t" },
  { fallbackIndex: 4, iconKey: "metric-efficiency", metricKey: "systemEfficiency", label: "系統效率", unit: "%" }
];

function resolveMetricValue(
  binding: SolarMetricBinding,
  isSocketConnected: boolean,
  snapshot: LiveMetricsSnapshot
) {
  const fallbackMetric = liveMetrics[binding.fallbackIndex]!;
  return resolveMonitoringMetricBinding({
    binding: {
      ...binding,
      fallbackHelper: binding.fallbackHelper ?? fallbackMetric.helper,
      fallbackValue: binding.fallbackValue ?? fallbackMetric.value
    },
    isConnected: isSocketConnected,
    reading: snapshot.metrics[binding.metricKey] ?? null
  });
}

export function buildSolarViewModel({
  comparisonTargets,
  isSocketConnected,
  snapshot,
  solarStory
}: BuildSolarViewModelArgs) {
  const shouldUseStory = solarStory !== undefined && solarStory.kpis.length >= 3;

  if (shouldUseStory) {
    const storyKpiByKey = new Map(solarStory.kpis.map((kpi) => [kpi.metricKey, kpi]));
    const kpis = kpiBindings.map((binding) => {
      const storyKpi = storyKpiByKey.get(binding.metricKey);
      const value = storyKpi?.value ?? resolveMetricValue(binding, isSocketConnected, snapshot).value;
      const resolved = storyKpi
        ? { helper: storyKpi.helper ?? "", ...storyKpi }
        : resolveMetricValue(binding, isSocketConnected, snapshot);
      return {
        comparison: storyKpi?.comparison ?? resolveSolarComparison({
          actualUnit: resolved.unit,
          actualValue: isSocketConnected ? snapshot.metrics[binding.metricKey]?.value ?? null : null,
          target: comparisonTargets?.[binding.metricKey]
        }),
        helper: resolved.helper,
        iconKey: binding.iconKey,
        label: storyKpi?.label ?? binding.label,
        unit: storyKpi?.unit ?? resolved.unit,
        value
      };
    });

    const powerValue = storyKpiByKey.get("realTimePower")?.value ?? "--";
    const powerUnit = storyKpiByKey.get("realTimePower")?.unit ?? "kW";
    const efficiencyValue = storyKpiByKey.get("systemEfficiency")?.value ?? "--";
    const efficiencyUnit = storyKpiByKey.get("systemEfficiency")?.unit ?? "%";
    const selfConsumptionValue = storyKpiByKey.get("selfConsumptionRatio")?.value ?? "--";
    const selfConsumptionUnit = storyKpiByKey.get("selfConsumptionRatio")?.unit ?? "%";
    const co2TodayValue = storyKpiByKey.get("todayCo2Reduction")?.value ?? "--";
    const co2TodayUnit = storyKpiByKey.get("todayCo2Reduction")?.unit ?? "t";

    return {
      flowNodes: [
        { assetKey: "solar-panel-display" as SolarFlowAssetKey, footnote: "Solar Panels", label: "太陽能板", value: `${powerValue} ${powerUnit}` },
        { assetKey: "inverter-display" as SolarFlowAssetKey, footnote: "Inverter", label: "變流器", value: `${efficiencyValue}${efficiencyUnit}` },
        { assetKey: "factory-consumption-display" as SolarFlowAssetKey, footnote: "Factory Consumption", label: "工廠用電", value: `${selfConsumptionValue}${selfConsumptionUnit}` },
        { assetKey: "carbon-reduction-display" as SolarFlowAssetKey, footnote: "Carbon Reduction", label: "減碳效益", value: `${co2TodayValue} ${co2TodayUnit}` }
      ],
      hero: {
        eyebrow: "綠能驅動・永續未來",
        subtitleLines: ["乾淨的太陽能，為工廠注入綠色動能", "Clean solar energy powers our factory"],
        titleLines: ["太陽能驅動", "製造新能量"]
      },
      kpis,
      story: {
        flowState: solarStory.story.flowState
      }
    };
  }

  const power = resolveMetricValue(
    { fallbackIndex: 0, iconKey: "metric-generation-sun", metricKey: "realTimePower", label: "即時功率", unit: "kW" },
    isSocketConnected,
    snapshot
  );
  const efficiency = resolveMetricValue(
    { fallbackIndex: 4, iconKey: "metric-efficiency", metricKey: "systemEfficiency", label: "系統效率", unit: "%" },
    isSocketConnected,
    snapshot
  );
  const selfConsumption = resolveMetricValue(
    { fallbackIndex: 2, iconKey: "metric-self-consumption", metricKey: "selfConsumptionRatio", label: "自發自用比例", unit: "%" },
    isSocketConnected,
    snapshot
  );
  const co2Today = resolveMetricValue(
    { fallbackIndex: 3, iconKey: "metric-co2-today", metricKey: "todayCo2Reduction", label: "今日減碳量", unit: "t" },
    isSocketConnected,
    snapshot
  );
  const flowState = resolveSolarFlowState({
    efficiencyPercent: isSocketConnected ? snapshot.metrics.systemEfficiency?.value ?? null : null,
    isConnected: isSocketConnected,
    powerKw: isSocketConnected ? snapshot.metrics.realTimePower?.value ?? null : null
  });

  return {
    flowNodes: [
      { assetKey: "solar-panel-display" as SolarFlowAssetKey, footnote: "Solar Panels", label: "太陽能板", value: `${power.value} ${power.unit}` },
      { assetKey: "inverter-display" as SolarFlowAssetKey, footnote: "Inverter", label: "變流器", value: `${efficiency.value}${efficiency.unit}` },
      { assetKey: "factory-consumption-display" as SolarFlowAssetKey, footnote: "Factory Consumption", label: "工廠用電", value: `${selfConsumption.value}${selfConsumption.unit}` },
      { assetKey: "carbon-reduction-display" as SolarFlowAssetKey, footnote: "Carbon Reduction", label: "減碳效益", value: `${co2Today.value} ${co2Today.unit}` }
    ],
    hero: {
      eyebrow: "綠能驅動・永續未來",
      subtitleLines: ["乾淨的太陽能，為工廠注入綠色動能", "Clean solar energy powers our factory"],
      titleLines: ["太陽能驅動", "製造新能量"]
    },
    kpis: kpiBindings.map((binding) => {
      const resolved = resolveMetricValue(binding, isSocketConnected, snapshot);
      return {
        comparison: resolveSolarComparison({
          actualUnit: resolved.unit,
          actualValue: isSocketConnected ? snapshot.metrics[binding.metricKey]?.value ?? null : null,
          target: comparisonTargets?.[binding.metricKey]
        }),
        helper: resolved.helper,
        iconKey: binding.iconKey,
        label: binding.label,
        unit: resolved.unit,
        value: resolved.value
      };
    }),
    story: {
      flowState
    }
  };
}
