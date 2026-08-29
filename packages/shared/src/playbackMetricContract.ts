import type { DisplayPageKey } from "./displayPageConfig.js";
import {
  displayMetricRequirements,
  displayCircuitSlotKeys,
  resolveFactoryCircuitSlotKeys,
  resolveFactoryCircuitSlotMetricKey,
  type FactoryCircuitPageKey,
  type DisplayRequirementDescriptor
} from "./displayReadiness.js";
import type { MonitoringMetricSourceClass } from "./displayStory.js";
import type {
  MetricBoundItem,
  MetricBindingItemConstraint,
  MetricCatalogEntry,
  MetricValueType,
  WidgetDataBindingPageKey
} from "./widgetDataBinding.js";

export type PlaybackDisplayMetricBinding = {
  dependencyKeys: string[];
  metricKey: string;
  sourceClass: MonitoringMetricSourceClass;
};

function inheritMetric(itemId: string, metricKey: string): MetricBoundItem {
  return {
    dataBinding: {
      metricKey,
      scope: "inherit-device",
      sourceType: "metric"
    },
    itemId
  };
}

const overviewDefaultMetricBoundItems = [
  inheritMetric("power", "realTimePower"),
  inheritMetric("today", "todayGeneration"),
  inheritMetric("total", "totalGeneration"),
  inheritMetric("co2Today", "todayCo2Reduction"),
  inheritMetric("co2Total", "totalCo2Reduction")
] as const;

const solarDefaultMetricBoundItems = [
  inheritMetric("generation", "todayGeneration"),
  inheritMetric("selfConsumption", "selfConsumptionRatio"),
  inheritMetric("co2", "todayCo2Reduction"),
  inheritMetric("totalCo2", "totalCo2Reduction"),
  inheritMetric("efficiency", "systemEfficiency"),
  inheritMetric("flow.solar", "realTimePower"),
  inheritMetric("flow.inverter", "systemEfficiency"),
  inheritMetric("flow.factory", "selfConsumptionRatio"),
  inheritMetric("flow.co2", "todayCo2Reduction")
] as const;

function createFactoryCircuitDefaultMetricBoundItems(pageKey: FactoryCircuitPageKey) {
  return [
    inheritMetric("totalPower", "totalPower"),
    inheritMetric("solarShare", "solarShare"),
    inheritMetric("selfConsumption", "selfConsumption"),
    inheritMetric("peak", "peak"),
    inheritMetric("flow", "flow"),
    ...displayCircuitSlotKeys.map((slotKey) =>
      inheritMetric(slotKey, resolveFactoryCircuitSlotMetricKey(pageKey, slotKey))
    )
  ];
}

const defaultMetricBoundItemsByPage: Record<
  WidgetDataBindingPageKey,
  readonly MetricBoundItem[]
> = {
  "factory-circuit": createFactoryCircuitDefaultMetricBoundItems("factory-circuit"),
  "factory-circuit-guanyin": createFactoryCircuitDefaultMetricBoundItems(
    "factory-circuit-guanyin"
  ),
  overview: overviewDefaultMetricBoundItems,
  solar: solarDefaultMetricBoundItems
};

const overviewBindingConstraints: Record<string, MetricBindingItemConstraint> = {
  co2Today: { valueType: "numeric", widgetRole: "numeric-kpi" },
  co2Total: { valueType: "numeric", widgetRole: "numeric-kpi" },
  power: { valueType: "numeric", widgetRole: "numeric-kpi" },
  today: { valueType: "numeric", widgetRole: "numeric-kpi" },
  total: { valueType: "numeric", widgetRole: "numeric-kpi" }
};

const solarBindingConstraints: Record<string, MetricBindingItemConstraint> = {
  co2: { valueType: "numeric", widgetRole: "numeric-kpi" },
  efficiency: { valueType: "numeric", widgetRole: "numeric-kpi" },
  "flow.co2": { valueType: "numeric", widgetRole: "numeric-flow" },
  "flow.factory": { valueType: "numeric", widgetRole: "numeric-flow" },
  "flow.inverter": { valueType: "numeric", widgetRole: "numeric-flow" },
  "flow.solar": { valueType: "numeric", widgetRole: "numeric-flow" },
  generation: { valueType: "numeric", widgetRole: "numeric-kpi" },
  selfConsumption: { valueType: "numeric", widgetRole: "numeric-kpi" },
  totalCo2: { valueType: "numeric", widgetRole: "numeric-kpi" }
};

const factoryCircuitBindingConstraints = Object.fromEntries([
  ["flow", { valueType: "state", widgetRole: "state-kpi" }],
  ...["peak", "selfConsumption", "solarShare", "totalPower"].map((itemId) => [
    itemId,
    { valueType: "numeric", widgetRole: "numeric-kpi" }
  ]),
  ...displayCircuitSlotKeys.map((itemId) => [
    itemId,
    { valueType: "numeric", widgetRole: "numeric-circuit-slot" }
  ])
]) as Record<string, MetricBindingItemConstraint>;

const bindingConstraintsByPage: Record<
  WidgetDataBindingPageKey,
  Readonly<Record<string, MetricBindingItemConstraint>>
> = {
  "factory-circuit": factoryCircuitBindingConstraints,
  "factory-circuit-guanyin": factoryCircuitBindingConstraints,
  overview: overviewBindingConstraints,
  solar: solarBindingConstraints
};

function resolveCatalogDependencies(pageKey: string, metricKey: string): readonly string[] {
  const requirement = displayMetricRequirements.find(
    (candidate) => candidate.pageId === pageKey && candidate.requirementKey === metricKey
  );
  return requirement?.dependencyKeys ?? [metricKey];
}

function createCatalogEntry(args: {
  compatibleWidgetRoles: readonly string[];
  dependencyKeys?: readonly string[];
  globalDependencyKeys?: readonly string[];
  label: string;
  metricKey: string;
  pageKey: string;
  sourceClass: MonitoringMetricSourceClass;
  unit: string | null;
  valueType?: MetricValueType;
}): MetricCatalogEntry {
  return {
    allowedScopes: ["inherit-device", "cl", "kn", "global"],
    compatibleWidgetRoles: args.compatibleWidgetRoles,
    dependencyKeys: args.dependencyKeys ?? resolveCatalogDependencies(args.pageKey, args.metricKey),
    ...(args.globalDependencyKeys
      ? { globalDependencyKeys: args.globalDependencyKeys }
      : {}),
    label: args.label,
    metricKey: args.metricKey,
    sourceClass: args.sourceClass,
    unit: args.unit,
    unitFamily: args.unit,
    valueType: args.valueType ?? "numeric"
  };
}

// Client audit (task 1.1): Overview value subtree reads KPI + phase live keys only.
// Factory generation upstream keys are server-materialized into canonical metrics.
const overviewRuntimeMetricKeys = [
  "phaseRCurrent",
  "phaseRPower",
  "phaseRVoltage",
  "phaseSCurrent",
  "phaseSPower",
  "phaseSVoltage",
  "phaseTCurrent",
  "phaseTPower",
  "phaseTVoltage",
  "realTimePower",
  "todayCo2Reduction",
  "todayGeneration",
  "totalCo2Reduction",
  "totalGeneration"
] as const;

// Client audit (task 1.1): Solar client reads only binding metricKeys + power/efficiency.
// selfConsumptionEnergy / consumptionEnergy remain server-only dependencies for story derivation.
const solarRuntimeMetricKeys = [
  "realTimePower",
  "systemEfficiency",
  "selfConsumptionRatio",
  "todayGeneration",
  "todayCo2Reduction",
  "totalCo2Reduction"
] as const;

const overviewDisplayMetricBindings: readonly PlaybackDisplayMetricBinding[] = [
  { dependencyKeys: ["realTimePower"], metricKey: "realTimePower", sourceClass: "mqtt-live" },
  {
    dependencyKeys: ["todayGeneration"],
    metricKey: "todayGeneration",
    sourceClass: "derived-metric"
  },
  {
    dependencyKeys: ["totalGeneration"],
    metricKey: "totalGeneration",
    sourceClass: "cumulative-counter"
  },
  {
    dependencyKeys: ["todayCo2Reduction"],
    metricKey: "todayCo2Reduction",
    sourceClass: "derived-metric"
  },
  {
    dependencyKeys: ["totalCo2Reduction"],
    metricKey: "totalCo2Reduction",
    sourceClass: "cumulative-counter"
  }
];

const solarDisplayMetricBindings: readonly PlaybackDisplayMetricBinding[] = [
  { dependencyKeys: ["realTimePower"], metricKey: "realTimePower", sourceClass: "mqtt-live" },
  {
    dependencyKeys: ["todayGeneration"],
    metricKey: "todayGeneration",
    sourceClass: "derived-metric"
  },
  {
    dependencyKeys: ["selfConsumptionRatio", "selfConsumptionEnergy", "consumptionEnergy"],
    metricKey: "selfConsumptionRatio",
    sourceClass: "derived-metric"
  },
  {
    dependencyKeys: ["todayCo2Reduction"],
    metricKey: "todayCo2Reduction",
    sourceClass: "derived-metric"
  },
  {
    dependencyKeys: ["totalCo2Reduction"],
    metricKey: "totalCo2Reduction",
    sourceClass: "cumulative-counter"
  },
  {
    dependencyKeys: ["systemEfficiency"],
    metricKey: "systemEfficiency",
    sourceClass: "mqtt-live"
  }
];

const metricAuthoringMetadata: Record<
  string,
  {
    compatibleWidgetRoles: readonly string[];
    label: string;
    unit: string | null;
    valueType?: MetricValueType;
  }
> = {
  realTimePower: { compatibleWidgetRoles: ["numeric-kpi", "numeric-flow"], label: "即時功率", unit: "kW" },
  selfConsumptionRatio: { compatibleWidgetRoles: ["numeric-kpi", "numeric-flow"], label: "自發自用比例", unit: "%" },
  systemEfficiency: { compatibleWidgetRoles: ["numeric-kpi", "numeric-flow"], label: "系統效率", unit: "%" },
  todayCo2Reduction: { compatibleWidgetRoles: ["numeric-kpi", "numeric-flow"], label: "今日減碳量", unit: "t" },
  todayGeneration: { compatibleWidgetRoles: ["numeric-kpi"], label: "今日發電量", unit: "kWh" },
  totalCo2Reduction: { compatibleWidgetRoles: ["numeric-kpi"], label: "累積減碳量", unit: "t" },
  totalGeneration: { compatibleWidgetRoles: ["numeric-kpi"], label: "累積發電量", unit: "kWh" }
};

function createCatalogFromDisplayBindings(
  pageKey: "overview" | "solar",
  bindings: readonly PlaybackDisplayMetricBinding[]
): MetricCatalogEntry[] {
  return bindings.map((binding) => {
    const metadata = metricAuthoringMetadata[binding.metricKey];
    if (!metadata) {
      throw new Error(`Missing playback metric authoring metadata: ${binding.metricKey}`);
    }
    return createCatalogEntry({
      ...metadata,
      metricKey: binding.metricKey,
      pageKey,
      sourceClass: binding.sourceClass
    });
  });
}

function createFactoryCircuitMetricCatalog(pageKey: FactoryCircuitPageKey): MetricCatalogEntry[] {
  const slotMetricKeys = resolveFactoryCircuitSlotKeys(pageKey).map((slotKey) =>
    resolveFactoryCircuitSlotMetricKey(pageKey, slotKey)
  );
  const numericKpiRole = ["numeric-kpi"] as const;

  return [
    createCatalogEntry({
      compatibleWidgetRoles: numericKpiRole,
      dependencyKeys: slotMetricKeys,
      label: "廠區總用電",
      metricKey: "totalPower",
      pageKey,
      sourceClass: "slot-aggregate",
      unit: "kW"
    }),
    createCatalogEntry({
      compatibleWidgetRoles: numericKpiRole,
      dependencyKeys: ["realTimePower", ...slotMetricKeys],
      label: "太陽能供電占比",
      metricKey: "solarShare",
      pageKey,
      sourceClass: "derived-metric",
      unit: "%"
    }),
    createCatalogEntry({
      compatibleWidgetRoles: numericKpiRole,
      dependencyKeys: ["selfConsumptionEnergy", "todayGeneration"],
      label: "今日自發自用電量",
      metricKey: "selfConsumption",
      pageKey,
      sourceClass: "derived-metric",
      unit: "kWh"
    }),
    createCatalogEntry({
      compatibleWidgetRoles: numericKpiRole,
      dependencyKeys: ["factoryPeakMultiplier", ...slotMetricKeys],
      globalDependencyKeys: ["factoryPeakMultiplier"],
      label: "尖峰負載",
      metricKey: "peak",
      pageKey,
      sourceClass: "derived-metric",
      unit: "kW"
    }),
    createCatalogEntry({
      compatibleWidgetRoles: ["state-kpi"],
      dependencyKeys: slotMetricKeys,
      label: "綠能流向",
      metricKey: "flow",
      pageKey,
      sourceClass: "derived-metric",
      unit: null,
      valueType: "state"
    }),
    ...displayCircuitSlotKeys.map((slotKey) =>
      createCatalogEntry({
        compatibleWidgetRoles: ["numeric-circuit-slot"],
        label: slotKey,
        metricKey: resolveFactoryCircuitSlotMetricKey(pageKey, slotKey),
        pageKey,
        sourceClass: "mqtt-live",
        unit: "kW"
      })
    )
  ];
}

const metricCatalogByPage: Record<WidgetDataBindingPageKey, readonly MetricCatalogEntry[]> = {
  "factory-circuit": createFactoryCircuitMetricCatalog("factory-circuit"),
  "factory-circuit-guanyin": createFactoryCircuitMetricCatalog("factory-circuit-guanyin"),
  overview: createCatalogFromDisplayBindings("overview", overviewDisplayMetricBindings),
  solar: createCatalogFromDisplayBindings("solar", solarDisplayMetricBindings)
};

const runtimeMetricKeysByPage: Partial<Record<DisplayPageKey, readonly string[]>> = {
  overview: overviewRuntimeMetricKeys,
  solar: solarRuntimeMetricKeys
};

function cloneMetricBoundItem(item: MetricBoundItem): MetricBoundItem {
  return {
    dataBinding: {
      ...(item.dataBinding.format ? { format: { ...item.dataBinding.format } } : {}),
      metricKey: item.dataBinding.metricKey,
      scope: item.dataBinding.scope,
      sourceType: "metric"
    },
    itemId: item.itemId
  };
}

function cloneMetricCatalogEntry(entry: MetricCatalogEntry): MetricCatalogEntry {
  return {
    ...entry,
    ...(entry.allowedScopes ? { allowedScopes: [...entry.allowedScopes] } : {}),
    ...(entry.compatibleWidgetRoles
      ? { compatibleWidgetRoles: [...entry.compatibleWidgetRoles] }
      : {}),
    dependencyKeys: [...entry.dependencyKeys],
    ...(entry.globalDependencyKeys
      ? { globalDependencyKeys: [...entry.globalDependencyKeys] }
      : {})
  };
}

export function resolvePlaybackDefaultMetricBoundItems(
  pageKey: WidgetDataBindingPageKey
): readonly MetricBoundItem[] {
  return defaultMetricBoundItemsByPage[pageKey].map(cloneMetricBoundItem);
}

export function resolvePlaybackBindingItemConstraints(
  pageKey: WidgetDataBindingPageKey
): Readonly<Record<string, MetricBindingItemConstraint>> {
  return Object.fromEntries(
    Object.entries(bindingConstraintsByPage[pageKey]).map(([itemId, constraint]) => [
      itemId,
      { ...constraint }
    ])
  );
}

export function resolvePlaybackMetricCatalog(
  pageKey: WidgetDataBindingPageKey
): readonly MetricCatalogEntry[] {
  return metricCatalogByPage[pageKey].map(cloneMetricCatalogEntry);
}

export function resolvePlaybackBindingDependencyKeys(
  pageKey: WidgetDataBindingPageKey,
  boundItems: readonly MetricBoundItem[]
): readonly string[] {
  const catalogByMetricKey = new Map(
    metricCatalogByPage[pageKey].map((entry) => [entry.metricKey, entry])
  );
  const dependencyKeys = new Set<string>();

  for (const item of boundItems) {
    const metric = catalogByMetricKey.get(item.dataBinding.metricKey);
    if (!metric) {
      throw new Error(
        `Unknown playback metric binding: ${pageKey}.${item.dataBinding.metricKey}`
      );
    }
    for (const dependencyKey of metric.dependencyKeys) {
      dependencyKeys.add(dependencyKey);
    }
  }

  return [...dependencyKeys];
}

export function resolvePlaybackGateRequirements(
  pageKey: string
): DisplayRequirementDescriptor[] {
  return displayMetricRequirements.filter((requirement) => requirement.pageId === pageKey);
}

export function resolvePlaybackRuntimeMetricKeys(
  pageKey: string,
  boundItems?: readonly MetricBoundItem[]
): readonly string[] {
  if (boundItems) {
    return resolvePlaybackBindingDependencyKeys(
      pageKey as WidgetDataBindingPageKey,
      boundItems
    );
  }
  return runtimeMetricKeysByPage[pageKey as DisplayPageKey] ?? [];
}

export function resolvePlaybackDisplayMetricBindings(
  pageKey: string
): readonly PlaybackDisplayMetricBinding[] {
  return (metricCatalogByPage[pageKey as WidgetDataBindingPageKey] ?? []).map(
    ({ dependencyKeys, metricKey, sourceClass }) => ({
      dependencyKeys: [...dependencyKeys],
      metricKey,
      sourceClass
    })
  );
}

export function resolvePlaybackDisplayMetricSourceClass(
  pageKey: string,
  metricKey: string
): MonitoringMetricSourceClass | null {
  const binding = metricCatalogByPage[pageKey as WidgetDataBindingPageKey]?.find(
    (entry) => entry.metricKey === metricKey
  );
  return binding?.sourceClass ?? null;
}
