import type {
  DisplayCircuitSlotKey,
  DisplayCardDataAction,
  DisplayCardDataDependency,
  DisplayCardDataPageId,
  DisplayCardDataResponse,
  DisplayCardDataRow,
  DisplayCardDataStatus,
  DisplayStoryPayloadByPageId,
  FactoryCircuitPageKey,
  ResolvedMonitoringMetricBinding
} from "@solar-display/shared";
import {
  resolveFactoryCircuitSlotMetricKey
} from "@solar-display/shared";
import { getDatabase } from "../db/index.js";
import { readLiveMetricsSnapshot } from "../metrics/liveMetrics.js";
import { readDisplayStoryPages } from "./displayStoryService.js";
import {
  formatDisplayOverrideValue,
  readDisplayValueOverrides
} from "./displayValueOverrideService.js";
import { readSustainabilityStory } from "./sustainabilityStoryService.js";

type TopicMappingRow = {
  enabled: number;
  metric_key: string;
  topic: string | null;
};

type TopicMapping = {
  enabled: boolean;
  topic: string | null;
};

type LiveMetricLookup = ReturnType<typeof readLiveMetricsSnapshot>["metrics"];
type OverrideLookup = ReturnType<typeof readDisplayValueOverrides>;
type SustainabilityStory = ReturnType<typeof readSustainabilityStory>;

function readTopicMappings() {
  const rows = getDatabase()
    .prepare("SELECT metric_key, topic, enabled FROM topic_mappings")
    .all() as TopicMappingRow[];

  return new Map(
    rows.map((row) => [
      row.metric_key,
      {
        enabled: row.enabled === 1,
        topic: row.topic?.trim() || null
      } satisfies TopicMapping
    ])
  );
}

function formatLatestValue(
  metricKey: string,
  liveMetrics: LiveMetricLookup
) {
  const reading = liveMetrics[metricKey];

  if (!reading) {
    return null;
  }

  return `${reading.value}${reading.unit ? ` ${reading.unit}` : ""}`;
}

function statusForDependency(
  metricKey: string,
  topics: Map<string, TopicMapping>,
  liveMetrics: LiveMetricLookup
): DisplayCardDataStatus {
  const topic = topics.get(metricKey);

  if (!topic?.topic || !topic.enabled) {
    return "missing-topic";
  }

  return liveMetrics[metricKey] ? "ready" : "idle-topic";
}

function buildDependencies(args: {
  dependencyKeys: string[];
  liveMetrics: LiveMetricLookup;
  topics: Map<string, TopicMapping>;
}) {
  return args.dependencyKeys.map((metricKey) => {
    const topic = args.topics.get(metricKey);

    return {
      latestValue: formatLatestValue(metricKey, args.liveMetrics),
      metricKey,
      status: statusForDependency(metricKey, args.topics, args.liveMetrics),
      topic: topic?.enabled ? topic.topic : null
    } satisfies DisplayCardDataDependency;
  });
}

function deriveMonitoringStatus(args: {
  dependencies: DisplayCardDataDependency[];
  metric: ResolvedMonitoringMetricBinding<string>;
}) {
  if (args.metric.bindingState === "bound" && args.metric.freshnessState === "fresh") {
    return "ready" satisfies DisplayCardDataStatus;
  }

  if (
    args.metric.sourceClass === "derived-metric" &&
    args.dependencies.some((dependency) => dependency.latestValue === null)
  ) {
    return "formula-input-missing" satisfies DisplayCardDataStatus;
  }

  if (args.dependencies.some((dependency) => dependency.status === "missing-topic")) {
    return "missing-topic" satisfies DisplayCardDataStatus;
  }

  if (args.dependencies.some((dependency) => dependency.status === "idle-topic")) {
    return "idle-topic" satisfies DisplayCardDataStatus;
  }

  return "waiting-aggregate" satisfies DisplayCardDataStatus;
}

function actionsForDependencies(dependencies: DisplayCardDataDependency[]) {
  const actions: DisplayCardDataAction[] = [];
  for (const dependency of dependencies) {
    actions.push({
      metricKey: dependency.metricKey,
      type: dependency.topic ? "publish-test-value" : "configure-topic"
    });
  }
  actions.push({ type: "set-display-override" });
  return actions;
}

function displayOnlyActions(): DisplayCardDataAction[] {
  return [{ type: "set-display-override" }];
}

function applyDisplayCardOverride(
  row: DisplayCardDataRow,
  overrides: OverrideLookup
): DisplayCardDataRow {
  const override = overrides.get(row.cardId) ?? null;

  if (!override?.active) {
    return {
      ...row,
      override
    };
  }

  return {
    ...row,
    displayValue: formatDisplayOverrideValue(override.displayValue, override.unit ?? row.unit),
    originalValue: row.originalValue ?? row.displayValue,
    override,
    status: "overridden"
  };
}

function monitoringRow(args: {
  cardId: string;
  formula: string | null;
  metric: ResolvedMonitoringMetricBinding<string>;
  pageId: DisplayCardDataPageId;
  liveMetrics: LiveMetricLookup;
  overrides: OverrideLookup;
  topics: Map<string, TopicMapping>;
}) {
  const dependencies = buildDependencies({
    dependencyKeys: args.metric.dependencyKeys,
    liveMetrics: args.liveMetrics,
    topics: args.topics
  });
  const status = deriveMonitoringStatus({
    dependencies,
    metric: args.metric
  });

  return applyDisplayCardOverride({
    actions: actionsForDependencies(dependencies),
    aggregateSource: null,
    calculationFields: [],
    cardId: args.cardId,
    dependencies,
    displayValue: args.metric.value,
    formula: args.formula,
    label: args.metric.label,
    lastUpdatedAt:
      dependencies.map((dependency) => args.liveMetrics[dependency.metricKey]?.timestamp ?? null)
        .find((value) => value !== null) ?? null,
    metricKey: args.metric.metricKey,
    originalValue: args.metric.value,
    override: null,
    pageId: args.pageId,
    sourceClassification: args.metric.sourceClass,
    sourceTopics: args.metric.sourceTopics ?? [],
    status,
    unit: args.metric.unit
  } satisfies DisplayCardDataRow, args.overrides);
}

function monitoringRows(
  story: DisplayStoryPayloadByPageId,
  topics: Map<string, TopicMapping>,
  liveMetrics: LiveMetricLookup,
  overrides: OverrideLookup
) {
  const overviewRows = story.overview.metrics.map((metric) =>
    monitoringRow({
      cardId: `overview.${metric.metricKey}`,
      formula: null,
      liveMetrics,
      metric,
      overrides,
      pageId: "overview",
      topics
    })
  );
  const solarRows = story.solar.kpis.map((metric) =>
    monitoringRow({
      cardId: `solar.${metric.metricKey}`,
      formula:
        metric.metricKey === "selfConsumptionRatio"
          ? "selfConsumptionEnergy / consumptionEnergy * 100"
          : null,
      liveMetrics,
      metric,
      overrides,
      pageId: "solar",
      topics
    })
  );
  const factoryRows = (["factory-circuit", "factory-circuit-guanyin"] as const).flatMap((pageId) =>
    story[pageId].kpis.map((metric) =>
      monitoringRow({
        cardId: `${pageId}.${metric.metricKey}`,
        formula:
          metric.sourceClass === "slot-aggregate"
            ? "sum(display circuit slots)"
            : metric.metricKey === "selfConsumption" &&
              metric.dependencyKeys.includes("todayGeneration")
              ? "todayGeneration fallback"
              : null,
        liveMetrics,
        metric,
        overrides,
        pageId,
        topics
      })
    )
  );

  return [...overviewRows, ...solarRows, ...factoryRows];
}

function formatIntegerValue(value: number | null) {
  return value === null ? "--" : Math.round(value).toLocaleString("zh-TW");
}

function formatFixedValue(value: number | null, digits: number) {
  return value === null
    ? "--"
    : value.toLocaleString("zh-TW", {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits
    });
}

function formatGenerationMwh(valueGwh: number | null) {
  return valueGwh === null ? "--" : formatIntegerValue(valueGwh * 1000);
}

function sustainabilityNumericRows(
  story: SustainabilityStory,
  overrides: OverrideLookup
) {
  const bigNumbers = story.period.bigNumbers;
  const provenance = story.period.bigNumberProvenance;
  const definitions = [
    {
      cardId: "sustainability.big-number.accumulatedGenerationGwh",
      displayValue: formatGenerationMwh(bigNumbers.accumulatedGenerationGwh),
      label: "累積發電量",
      metricKey: "accumulatedGenerationGwh",
      provenance: provenance.accumulatedGenerationGwh,
      unit: "MWh",
      value: bigNumbers.accumulatedGenerationGwh
    },
    {
      cardId: "sustainability.big-number.accumulatedCarbonReductionTons",
      displayValue: formatIntegerValue(bigNumbers.accumulatedCarbonReductionTons),
      label: "累積 CO₂ 減量",
      metricKey: "accumulatedCarbonReductionTons",
      provenance: provenance.accumulatedCarbonReductionTons,
      unit: "t",
      value: bigNumbers.accumulatedCarbonReductionTons
    },
    {
      cardId: "sustainability.big-number.annualEnergySavingPercent",
      displayValue: formatFixedValue(bigNumbers.annualEnergySavingPercent, 1),
      label: "年度節能成效",
      metricKey: "annualEnergySavingPercent",
      provenance: provenance.annualEnergySavingPercent,
      unit: "%",
      value: bigNumbers.annualEnergySavingPercent
    },
    {
      cardId: "sustainability.big-number.plantedTreeEquivalent",
      displayValue: formatIntegerValue(bigNumbers.plantedTreeEquivalent),
      label: "相當於種樹",
      metricKey: "plantedTreeEquivalent",
      provenance: provenance.plantedTreeEquivalent,
      unit: "trees",
      value: bigNumbers.plantedTreeEquivalent
    }
  ];

  return definitions.map((definition) =>
    applyDisplayCardOverride({
      actions: displayOnlyActions(),
      aggregateSource: definition.provenance.source,
      calculationFields: [],
      cardId: definition.cardId,
      dependencies: [
        {
          latestValue: definition.value === null ? null : `${definition.displayValue} ${definition.unit}`,
          metricKey: definition.metricKey,
          status: definition.value === null ? "waiting-aggregate" : "ready",
          topic: null
        }
      ],
      displayValue: definition.displayValue,
      formula: null,
      label: definition.label,
      lastUpdatedAt: definition.provenance.updatedAt,
      metricKey: definition.metricKey,
      originalValue: definition.displayValue,
      override: null,
      pageId: "sustainability",
      sourceClassification: definition.provenance.sourceClass,
      sourceTopics: [],
      status: definition.value === null ? "waiting-aggregate" : "ready",
      unit: definition.unit
    } satisfies DisplayCardDataRow, overrides)
  );
}

function factorySlotRows(
  pageId: FactoryCircuitPageKey,
  story: DisplayStoryPayloadByPageId[FactoryCircuitPageKey],
  topics: Map<string, TopicMapping>,
  liveMetrics: LiveMetricLookup,
  overrides: OverrideLookup
) {
  return story.slots.map((slot) => {
    const metricKey = slot.metricKey ?? resolveFactoryCircuitSlotMetricKey(pageId, slot.slotKey);
    const dependencies = buildDependencies({
      dependencyKeys: [metricKey],
      liveMetrics,
      topics
    });
    const dependency = dependencies[0]!;
    const displayValue =
      typeof slot.livePowerKw === "number"
        ? formatDisplayOverrideValue(slot.livePowerKw, "kW")
        : "--";
    const status =
      slot.livePowerKw !== null
        ? "ready"
        : dependency.status === "missing-topic" || dependency.status === "idle-topic"
          ? dependency.status
          : "waiting-aggregate";

    return applyDisplayCardOverride({
      actions: actionsForDependencies(dependencies),
      aggregateSource: null,
      calculationFields: [],
      cardId: `${pageId}.slot.${slot.slotKey}`,
      dependencies,
      displayValue,
      formula: null,
      label: slot.label,
      lastUpdatedAt: liveMetrics[metricKey]?.timestamp ?? null,
      metricKey,
      originalValue: displayValue,
      override: null,
      pageId,
      sourceClassification: "mqtt-live",
      sourceTopics: dependency.topic ? [{ metricKey, topic: dependency.topic }] : [],
      status,
      unit: "kW"
    } satisfies DisplayCardDataRow, overrides);
  });
}

function householdRows(story: SustainabilityStory, overrides: OverrideLookup) {
  const cards = story.householdEquivalents;

  return [
    {
      card: cards.today,
      cardId: "sustainability.household.today",
      calculationFields: ["householdDailyUsageKwh"],
      metricKey: "householdEquivalent.today",
      sourceClassification: "daily-summary"
    },
    {
      card: cards.cumulative,
      cardId: "sustainability.household.cumulative",
      calculationFields: ["householdDailyUsageKwh"],
      metricKey: "householdEquivalent.cumulative",
      sourceClassification: "cumulative-counter"
    }
  ].map((entry) => {
    const usesLiveTodayGenerationFallback =
      entry.metricKey === "householdEquivalent.today" &&
      entry.card.provenance.source === "live-today-generation-fallback";

    return applyDisplayCardOverride({
      actions: [
        { fields: entry.calculationFields, type: "edit-calculation-settings" },
        ...displayOnlyActions()
      ],
      aggregateSource: entry.card.provenance.source,
      calculationFields: entry.calculationFields,
      cardId: entry.cardId,
      dependencies: [
        {
          latestValue:
            entry.card.derivedStatus === "available"
              ? `${entry.card.householdCountDisplay} ${entry.card.householdLabel}`
              : null,
          metricKey: entry.metricKey,
          status: entry.card.derivedStatus === "available" ? "ready" : "waiting-aggregate",
          topic: null
        }
      ],
      displayValue: entry.card.householdCountDisplay,
      formula:
        usesLiveTodayGenerationFallback
          ? "todayGeneration / householdDailyUsageKwh"
          : entry.metricKey === "householdEquivalent.today"
          ? "daily selfConsumption / householdDailyUsageKwh"
          : "cumulative generation / householdDailyUsageKwh",
      label: entry.card.eyebrow,
      lastUpdatedAt: entry.card.provenance.updatedAt,
      metricKey: entry.metricKey,
      originalValue: entry.card.householdCountDisplay,
      override: null,
      pageId: "sustainability",
      sourceClassification: usesLiveTodayGenerationFallback ? "mqtt-live" : entry.sourceClassification,
      sourceTopics: [],
      status: entry.card.derivedStatus === "available" ? "ready" : "waiting-aggregate",
      unit: entry.card.householdLabel
    } satisfies DisplayCardDataRow, overrides);
  });
}

export function readDisplayCardData(): DisplayCardDataResponse {
  const story = readDisplayStoryPages(undefined, { applyDisplayOverrides: false });
  const sustainabilityStory = readSustainabilityStory(undefined, { applyDisplayOverrides: false });
  const snapshot = readLiveMetricsSnapshot();
  const topics = readTopicMappings();
  const overrides = readDisplayValueOverrides();

  return {
    generatedAt: new Date().toISOString(),
    rows: [
      ...monitoringRows(story, topics, snapshot.metrics, overrides),
      ...factorySlotRows("factory-circuit", story["factory-circuit"], topics, snapshot.metrics, overrides),
      ...factorySlotRows("factory-circuit-guanyin", story["factory-circuit-guanyin"], topics, snapshot.metrics, overrides),
      ...sustainabilityNumericRows(sustainabilityStory, overrides),
      ...householdRows(sustainabilityStory, overrides)
    ]
  };
}
