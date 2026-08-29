import type {
  MonitoringMetricBinding,
  MonitoringMetricProvenance,
  MonitoringMetricSourceClass,
  SolarComparisonTarget
} from "@solar-display/shared";
import {
  resolveMonitoringMetricBinding,
  resolveFreshnessPresentation,
  resolvePlaybackDisplayMetricSourceClass,
  resolveSolarComparison,
  resolveSolarFlowState
} from "@solar-display/shared";
import { liveMetrics } from "../../mocks/metrics";
import type { LiveMetricsSnapshot } from "../../services/socket";
import { buildMonitoringSourceTooltip } from "../shared/monitoringSourceTooltip";

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
  itemId: string;
} & MonitoringMetricBinding<SolarMetricKey>;

type BuildSolarViewModelArgs = {
  comparisonTargets?: Partial<Record<SolarMetricKey, SolarComparisonTarget>>;
  isSocketConnected: boolean;
  snapshot: LiveMetricsSnapshot;
  solarStory?: {
    kpis: Array<{
      alertTone?: string;
      bindingState?: string;
      comparison: {
        state: string;
        delta: string | null;
        fallbackReason: string | null;
        label: string;
      };
      dependencyKeys?: string[];
      helper?: string;
      fallbackReason?: string | null;
      fallbackStrategy?: string;
      freshnessState?: string;
      itemId?: string;
      metricKey: string;
      label: string;
      provenance?: string;
      sourceClass?: string;
      sourceTopics?: Array<{ metricKey: string; topic: string }>;
      unit: string;
      value?: string;
    }>;
    story: {
      flowState: {
        label?: string;
        state: string;
        reason: string | null;
      };
    };
  };
};

// sourceClass 的單一真相在 @solar-display/shared 的 playback metric contract；
// 下列 metricKey 皆為 contract 涵蓋鍵，非空斷言由 contract 測試保證。
const solarSourceClass = (metricKey: string) =>
  resolvePlaybackDisplayMetricSourceClass("solar", metricKey)!;

const kpiBindings: SolarMetricBinding[] = [
  {
    dependencyKeys: ["todayGeneration"],
    fallbackIndex: 1,
    iconKey: "metric-generation-sun",
    itemId: "generation",
    metricKey: "todayGeneration",
    label: "今日發電量",
    sourceClass: solarSourceClass("todayGeneration"),
    unit: "kWh"
  },
  {
    dependencyKeys: ["selfConsumptionRatio", "selfConsumptionEnergy", "consumptionEnergy"],
    fallbackHelper: "缺少自發自用比例所需輸入",
    fallbackIndex: 2,
    fallbackStrategy: "derive-from-dependencies",
    iconKey: "metric-self-consumption",
    itemId: "selfConsumption",
    metricKey: "selfConsumptionRatio",
    label: "自發自用比例",
    sourceClass: solarSourceClass("selfConsumptionRatio"),
    unit: "%"
  },
  {
    dependencyKeys: ["todayCo2Reduction"],
    fallbackIndex: 3,
    iconKey: "metric-co2-today",
    itemId: "co2",
    metricKey: "todayCo2Reduction",
    label: "今日減碳量",
    sourceClass: solarSourceClass("todayCo2Reduction"),
    unit: "t"
  },
  {
    dependencyKeys: ["totalCo2Reduction"],
    fallbackHelper: "累積成果",
    fallbackIndex: 3,
    fallbackValue: "9,842",
    iconKey: "metric-co2-total",
    itemId: "totalCo2",
    metricKey: "totalCo2Reduction",
    label: "累積減碳量",
    sourceClass: solarSourceClass("totalCo2Reduction"),
    unit: "t"
  },
  {
    dependencyKeys: ["systemEfficiency"],
    fallbackIndex: 4,
    iconKey: "metric-efficiency",
    itemId: "efficiency",
    metricKey: "systemEfficiency",
    label: "系統效率",
    sourceClass: solarSourceClass("systemEfficiency"),
    unit: "%"
  }
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
    metricScope: "global",
    reading: snapshot.metrics[binding.metricKey] ?? null
  });
}

function buildFreshnessView(
  freshness: LiveMetricsSnapshot["metrics"][string]["freshness"]
) {
  if (!freshness) {
    return null;
  }
  return {
    ...resolveFreshnessPresentation(freshness.state),
    sourceTimestamp: freshness.sourceTimestamp
  };
}

export function buildSolarViewModel({
  comparisonTargets,
  isSocketConnected,
  snapshot,
  solarStory
}: BuildSolarViewModelArgs) {
  const shouldUseStory = solarStory !== undefined && solarStory.kpis.length >= 3;

  if (shouldUseStory) {
    const storyKpiByItemId = new Map(
      solarStory.kpis
        .filter((kpi) => kpi.itemId !== undefined)
        .map((kpi) => [kpi.itemId!, kpi])
    );
    const legacyStoryKpiByKey = new Map(
      solarStory.kpis
        .filter((kpi) => kpi.itemId === undefined)
        .map((kpi) => [kpi.metricKey, kpi])
    );
    const resolveStoryItem = (itemId: string, legacyMetricKey: string) =>
      storyKpiByItemId.get(itemId) ?? legacyStoryKpiByKey.get(legacyMetricKey);
    const power = resolveMetricValue(
      { fallbackIndex: 0, iconKey: "metric-generation-sun", itemId: "flow.solar", metricKey: "realTimePower", label: "即時功率", unit: "kW" },
      isSocketConnected,
      snapshot
    );
    const kpis = kpiBindings.map((binding) => {
      const storyKpi = resolveStoryItem(binding.itemId, binding.metricKey);
      const fallbackResolved = resolveMetricValue(binding, isSocketConnected, snapshot);
      const value = storyKpi?.value ?? fallbackResolved.value;
      const resolved = storyKpi
        ? {
            alertTone: storyKpi.alertTone ?? fallbackResolved.alertTone,
            bindingState: storyKpi.bindingState ?? fallbackResolved.bindingState,
            dependencyKeys: storyKpi.dependencyKeys ?? binding.dependencyKeys ?? fallbackResolved.dependencyKeys,
            fallbackReason: storyKpi.fallbackReason ?? fallbackResolved.fallbackReason,
            fallbackStrategy: storyKpi.fallbackStrategy ?? fallbackResolved.fallbackStrategy,
            freshnessState: storyKpi.freshnessState ?? fallbackResolved.freshnessState,
            helper: storyKpi.helper ?? fallbackResolved.helper,
            provenance: (storyKpi.provenance as MonitoringMetricProvenance | undefined) ?? fallbackResolved.provenance,
            sourceClass: (storyKpi.sourceClass as MonitoringMetricSourceClass | undefined) ?? binding.sourceClass ?? fallbackResolved.sourceClass,
            sourceTopics: storyKpi.sourceTopics,
            unit: storyKpi.unit ?? fallbackResolved.unit
          }
        : fallbackResolved;
      return {
        alertTone: resolved.alertTone,
        bindingState: resolved.bindingState,
        comparison: storyKpi?.comparison ?? resolveSolarComparison({
          actualUnit: resolved.unit,
          actualValue: isSocketConnected ? snapshot.metrics[binding.metricKey]?.value ?? null : null,
          target: comparisonTargets?.[binding.metricKey]
        }),
        dependencyKeys: resolved.dependencyKeys,
        fallbackReason: resolved.fallbackReason,
        fallbackStrategy: resolved.fallbackStrategy,
        freshness: snapshot.metrics[binding.metricKey]?.freshness
          ?? ("freshness" in resolved ? resolved.freshness : undefined),
        freshnessView: buildFreshnessView(
          snapshot.metrics[binding.metricKey]?.freshness
            ?? ("freshness" in resolved ? resolved.freshness : undefined)
        ),
        freshnessState: resolved.freshnessState,
        helper: resolved.helper,
        iconKey: binding.iconKey,
        itemId: binding.itemId,
        label: storyKpi?.label ?? binding.label,
        metricKey: storyKpi?.metricKey ?? binding.metricKey,
        provenance: resolved.provenance,
        sourceTooltip: buildMonitoringSourceTooltip({
          dependencyKeys: resolved.dependencyKeys,
          label: storyKpi?.label ?? binding.label,
          metricKey: binding.metricKey,
          sourceTopics: storyKpi?.sourceTopics,
          sourceClass: resolved.sourceClass,
          unit: storyKpi?.unit ?? resolved.unit
        }),
        sourceClass: resolved.sourceClass,
        unit: storyKpi?.unit ?? resolved.unit,
        value
      };
    });

    const flowPower = resolveStoryItem("flow.solar", "realTimePower");
    const flowEfficiency = resolveStoryItem("flow.inverter", "systemEfficiency");
    const flowConsumption = resolveStoryItem("flow.factory", "selfConsumptionRatio");
    const flowCo2 = resolveStoryItem("flow.co2", "todayCo2Reduction");
    const powerValue = flowPower?.value ?? power.value;
    const powerUnit = flowPower?.unit ?? power.unit;
    const efficiencyValue = flowEfficiency?.value ?? "--";
    const efficiencyUnit = flowEfficiency?.unit ?? "%";
    const selfConsumptionValue = flowConsumption?.value ?? "--";
    const selfConsumptionUnit = flowConsumption?.unit ?? "%";
    const co2TodayValue = flowCo2?.value ?? "--";
    const co2TodayUnit = flowCo2?.unit ?? "t";

    return {
      flowNodes: [
        { assetKey: "solar-panel-display" as SolarFlowAssetKey, footnote: "Solar Panels", itemId: "flow.solar", label: "太陽能板", value: `${powerValue} ${powerUnit}` },
        { assetKey: "inverter-display" as SolarFlowAssetKey, footnote: "Inverter", itemId: "flow.inverter", label: "變流器", value: `${efficiencyValue}${efficiencyUnit}` },
        { assetKey: "factory-consumption-display" as SolarFlowAssetKey, footnote: "Factory Consumption", itemId: "flow.factory", label: "工廠用電", value: `${selfConsumptionValue}${selfConsumptionUnit}` },
        { assetKey: "carbon-reduction-display" as SolarFlowAssetKey, footnote: "Carbon Reduction", itemId: "flow.co2", label: "減碳效益", value: `${co2TodayValue} ${co2TodayUnit}` }
      ],
      hero: {
        eyebrow: "綠能驅動・永續未來",
        subtitleLines: ["乾淨的太陽能，為工廠注入綠色動能", "Clean solar energy powers our factory"],
        titleLines: ["太陽能驅動", "製造新能量"]
      },
      kpis,
      story: {
        flowState:
          snapshot.metrics.realTimePower?.freshness
          && snapshot.metrics.realTimePower.freshness.state !== "live"
            ? { reason: "socket-disconnected" as const, state: "standby" as const }
            : solarStory.story.flowState
      }
    };
  }

  const power = resolveMetricValue(
    { fallbackIndex: 0, iconKey: "metric-generation-sun", itemId: "flow.solar", metricKey: "realTimePower", label: "即時功率", unit: "kW" },
    isSocketConnected,
    snapshot
  );
  const efficiency = resolveMetricValue(
    { fallbackIndex: 4, iconKey: "metric-efficiency", itemId: "flow.inverter", metricKey: "systemEfficiency", label: "系統效率", unit: "%" },
    isSocketConnected,
    snapshot
  );
  const selfConsumption = resolveMetricValue(
    { fallbackIndex: 2, iconKey: "metric-self-consumption", itemId: "flow.factory", metricKey: "selfConsumptionRatio", label: "自發自用比例", unit: "%" },
    isSocketConnected,
    snapshot
  );
  const co2Today = resolveMetricValue(
    { fallbackIndex: 3, iconKey: "metric-co2-today", itemId: "flow.co2", metricKey: "todayCo2Reduction", label: "今日減碳量", unit: "t" },
    isSocketConnected,
    snapshot
  );
  const powerIsLive =
    snapshot.metrics.realTimePower?.freshness?.state === undefined
    || snapshot.metrics.realTimePower.freshness.state === "live";
  const flowState = resolveSolarFlowState({
    efficiencyPercent: isSocketConnected ? snapshot.metrics.systemEfficiency?.value ?? null : null,
    isConnected: isSocketConnected && powerIsLive,
    powerKw: isSocketConnected ? snapshot.metrics.realTimePower?.value ?? null : null
  });

  return {
    flowNodes: [
      { assetKey: "solar-panel-display" as SolarFlowAssetKey, footnote: "Solar Panels", itemId: "flow.solar", label: "太陽能板", value: `${power.value} ${power.unit}` },
      { assetKey: "inverter-display" as SolarFlowAssetKey, footnote: "Inverter", itemId: "flow.inverter", label: "變流器", value: `${efficiency.value}${efficiency.unit}` },
      { assetKey: "factory-consumption-display" as SolarFlowAssetKey, footnote: "Factory Consumption", itemId: "flow.factory", label: "工廠用電", value: `${selfConsumption.value}${selfConsumption.unit}` },
      { assetKey: "carbon-reduction-display" as SolarFlowAssetKey, footnote: "Carbon Reduction", itemId: "flow.co2", label: "減碳效益", value: `${co2Today.value} ${co2Today.unit}` }
    ],
    hero: {
      eyebrow: "綠能驅動・永續未來",
      subtitleLines: ["乾淨的太陽能，為工廠注入綠色動能", "Clean solar energy powers our factory"],
      titleLines: ["太陽能驅動", "製造新能量"]
    },
    kpis: kpiBindings.map((binding) => {
      const resolved = resolveMetricValue(binding, isSocketConnected, snapshot);
      return {
        alertTone: resolved.alertTone,
        bindingState: resolved.bindingState,
        comparison: resolveSolarComparison({
          actualUnit: resolved.unit,
          actualValue: isSocketConnected ? snapshot.metrics[binding.metricKey]?.value ?? null : null,
          target: comparisonTargets?.[binding.metricKey]
        }),
        dependencyKeys: resolved.dependencyKeys,
        fallbackReason: resolved.fallbackReason,
        fallbackStrategy: resolved.fallbackStrategy,
        freshness: resolved.freshness,
        freshnessView: buildFreshnessView(resolved.freshness),
        freshnessState: resolved.freshnessState,
        helper: resolved.helper,
        iconKey: binding.iconKey,
        itemId: binding.itemId,
        label: binding.label,
        metricKey: binding.metricKey,
        provenance: resolved.provenance,
        sourceTooltip: buildMonitoringSourceTooltip({
          dependencyKeys: resolved.dependencyKeys,
          label: binding.label,
          metricKey: binding.metricKey,
          sourceClass: resolved.sourceClass,
          unit: resolved.unit
        }),
        sourceClass: resolved.sourceClass,
        unit: resolved.unit,
        value: resolved.value
      };
    }),
    story: {
      flowState
    }
  };
}
