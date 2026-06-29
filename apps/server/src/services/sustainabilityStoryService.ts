import type {
  SustainabilityBigNumberKey,
  SustainabilityPeriodKey,
  SustainabilityPeriodStoryInput,
  SustainabilityProvenance,
  SustainabilityStoryComparison,
  SustainabilityStoryInput
} from "@solar-display/shared";
import {
  normalizeSustainabilityStory,
  resolveSustainabilityStoryPeriod
} from "@solar-display/shared";
import { getDatabase } from "../db/index.js";
import { readLiveMetricsSnapshot } from "../metrics/liveMetrics.js";
import { readCalculationSettings } from "./calculationSettingsService.js";
import { readHouseholdEquivalenceCards } from "./householdEquivalenceService.js";

const settingKey = "sustainability_story";

type CounterMetricKey = "co2" | "consumption" | "generation" | "selfConsumption";

type CounterRow = {
  last_updated: string | null;
  metric_key: string;
  total_value: number | null;
};

type CounterSnapshot = {
  updatedAt: string | null;
  value: number | null;
};

type CounterMap = Map<string, CounterSnapshot>;

const liveMetricCounterFallbackMap: Record<CounterMetricKey, string> = {
  co2: "totalCo2Reduction",
  consumption: "consumptionEnergy",
  generation: "totalGeneration",
  selfConsumption: "selfConsumptionEnergy"
};

function roundTo(value: number, digits: number) {
  return Number(value.toFixed(digits));
}

function normalizeUnit(unit: string | null | undefined) {
  return unit?.trim().toLowerCase() ?? "";
}

function normalizeEnergyToKwh(value: number, unit: string | null | undefined) {
  switch (normalizeUnit(unit)) {
    case "gwh":
      return value * 1_000_000;
    case "mwh":
      return value * 1_000;
    case "wh":
      return value / 1_000;
    default:
      return value;
  }
}

function resolveLiveMetricCounterFallbackValue(
  counterKey: CounterMetricKey,
  value: number,
  unit: string | null | undefined
) {
  if (counterKey === "generation") {
    return normalizeEnergyToKwh(value, unit);
  }

  return value;
}

function defaultStory(): SustainabilityStoryInput {
  return {
    availablePeriods: ["month", "quarter", "year", "lifetime"],
    householdEquivalents: {},
    modules: [
      {
        description: "內容整理中",
        id: "procurement-default",
        title: "綠色採購敘事",
        type: "project-outcome"
      },
      {
        description: "內容整理中",
        id: "esg-default",
        title: "ESG 行動摘要",
        type: "esg-summary"
      },
      {
        description: "內容整理中",
        id: "milestone-default",
        title: "年度里程碑",
        type: "milestone"
      }
    ],
    periods: {},
    selectedPeriod: "lifetime"
  };
}

function readStoredStory() {
  const row = getDatabase()
    .prepare("SELECT value FROM system_settings WHERE key = ?")
    .get(settingKey) as { value: string | null } | undefined;
  if (!row?.value) {
    return defaultStory();
  }

  try {
    return JSON.parse(row.value) as SustainabilityStoryInput;
  } catch {
    return defaultStory();
  }
}

function readCounterSnapshots() {
  const rows = getDatabase()
    .prepare(
      `
        SELECT metric_key, total_value, last_updated
        FROM cumulative_counters
      `
    )
    .all() as CounterRow[];
  const counterMap = new Map(
    rows.map((row) => [
      row.metric_key,
      {
        updatedAt: row.last_updated ?? null,
        value: typeof row.total_value === "number" ? row.total_value : null
      } satisfies CounterSnapshot
    ])
  ) satisfies CounterMap;
  const liveMetricsSnapshot = readLiveMetricsSnapshot();

  for (const [counterKey, liveMetricKey] of Object.entries(liveMetricCounterFallbackMap)) {
    if (counterMap.has(counterKey)) {
      continue;
    }

    const reading = liveMetricsSnapshot.metrics[liveMetricKey];
    if (typeof reading?.value !== "number") {
      continue;
    }

    counterMap.set(counterKey, {
      updatedAt: reading.timestamp,
      value: resolveLiveMetricCounterFallbackValue(counterKey as CounterMetricKey, reading.value, reading.unit)
    });
  }

  return counterMap;
}

function buildPeriodDefaults(period: SustainabilityPeriodKey) {
  switch (period) {
    case "month":
      return {
        comparison: {
          delta: null,
          fallbackReason: "comparison-baseline-missing",
          label: "缺少上月基準，月增比較未提供",
          state: "unavailable"
        } satisfies SustainabilityStoryComparison,
        provenance: {
          label: "月期聚合",
          source: "cumulative-counters",
          sourceClass: "runtime-aggregate",
          syncState: "fresh",
          updatedAt: null
        } satisfies SustainabilityProvenance
      };
    case "quarter":
      return {
        comparison: {
          delta: null,
          fallbackReason: "comparison-baseline-missing",
          label: "缺少前季基準，季增比較未提供",
          state: "unavailable"
        } satisfies SustainabilityStoryComparison,
        provenance: {
          label: "季度聚合",
          source: "cumulative-counters",
          sourceClass: "runtime-aggregate",
          syncState: "fresh",
          updatedAt: null
        } satisfies SustainabilityProvenance
      };
    case "year":
      return {
        comparison: {
          delta: null,
          fallbackReason: "comparison-baseline-missing",
          label: "缺少去年基準，年增比較未提供",
          state: "unavailable"
        } satisfies SustainabilityStoryComparison,
        provenance: {
          label: "年度聚合",
          source: "cumulative-counters",
          sourceClass: "runtime-aggregate",
          syncState: "fresh",
          updatedAt: null
        } satisfies SustainabilityProvenance
      };
    default:
      return {
        comparison: {
          delta: null,
          fallbackReason: "comparison-baseline-missing",
          label: "累積視角不提供期間比較",
          state: "unavailable"
        } satisfies SustainabilityStoryComparison,
        provenance: {
          label: "歷史累積",
          source: "cumulative-counters",
          sourceClass: "runtime-aggregate",
          syncState: "fresh",
          updatedAt: null
        } satisfies SustainabilityProvenance
      };
  }
}

function buildMissingProvenance(label: string) {
  return {
    label,
    source: "aggregate-missing",
    sourceClass: "missing",
    syncState: "missing",
    updatedAt: null
  } satisfies SustainabilityProvenance;
}

function mergeProvenance(
  base: SustainabilityProvenance,
  override?: Partial<SustainabilityProvenance>
) {
  return {
    label: override?.label?.trim() || base.label,
    source: override?.source?.trim() || base.source,
    sourceClass: override?.sourceClass ?? base.sourceClass,
    syncState: override?.syncState ?? base.syncState,
    updatedAt: override?.updatedAt ?? base.updatedAt
  } satisfies SustainabilityProvenance;
}

function buildCounterProvenance(
  label: string,
  source: string,
  sourceClass: SustainabilityProvenance["sourceClass"],
  snapshots: CounterSnapshot[]
) {
  const availableSnapshots = snapshots.filter(
    (snapshot) => typeof snapshot.value === "number"
  );

  if (availableSnapshots.length !== snapshots.length) {
    return buildMissingProvenance(label);
  }

  return {
    label,
    source,
    sourceClass,
    syncState: "fresh",
    updatedAt: availableSnapshots
      .map((snapshot) => snapshot.updatedAt)
      .find((value) => value !== null) ?? null
  } satisfies SustainabilityProvenance;
}

function readCounter(counterMap: CounterMap, metricKey: CounterMetricKey) {
  return counterMap.get(metricKey) ?? {
    updatedAt: null,
    value: null
  };
}

function buildBigNumbers(counterMap: CounterMap) {
  const generation = readCounter(counterMap, "generation");
  const consumption = readCounter(counterMap, "consumption");
  const selfConsumption = readCounter(counterMap, "selfConsumption");
  const calculationSettings = readCalculationSettings();
  const accumulatedCarbonReductionTons =
    typeof generation.value === "number"
      ? roundTo((generation.value * calculationSettings.carbonEmissionFactor) / 1000, 3)
      : null;

  const annualEnergySavingPercent =
    typeof selfConsumption.value === "number" &&
    typeof consumption.value === "number" &&
    consumption.value > 0
      ? roundTo((selfConsumption.value / consumption.value) * 100, 1)
      : null;
  const plantedTreeEquivalent =
    accumulatedCarbonReductionTons === null
      ? null
      : Math.round(accumulatedCarbonReductionTons * calculationSettings.treeEquivalentFactor);

  return {
    values: {
      accumulatedCarbonReductionTons,
      accumulatedGenerationGwh:
        typeof generation.value === "number"
          ? roundTo(generation.value / 1_000_000, 1)
          : null,
      annualEnergySavingPercent,
      plantedTreeEquivalent
    } satisfies Record<SustainabilityBigNumberKey, number | null>,
    provenance: {
      accumulatedCarbonReductionTons: buildCounterProvenance(
        "累積減碳",
        "generation-carbon-reduction",
        "derived-metric",
        [generation]
      ),
      accumulatedGenerationGwh: buildCounterProvenance(
        "累積發電",
        "cumulative-counters",
        "runtime-aggregate",
        [generation]
      ),
      annualEnergySavingPercent: buildCounterProvenance(
        "年度節能成效",
        "self-consumption-ratio",
        "derived-metric",
        [selfConsumption, consumption]
      ),
      plantedTreeEquivalent: buildCounterProvenance(
        "植樹等效",
        "generation-tree-equivalent",
        "derived-metric",
        [generation]
      )
    }
  };
}

function buildDerivedHighlights(
  periodKey: SustainabilityPeriodKey,
  bigNumbers: ReturnType<typeof buildBigNumbers>["values"],
  provenance: ReturnType<typeof buildBigNumbers>["provenance"]
) {
  const prefix =
    periodKey === "month"
      ? "本月"
      : periodKey === "quarter"
        ? "本季"
        : periodKey === "year"
          ? "本年"
          : "累積";

  return [
    {
      label: `${prefix}發電`,
      provenance: provenance.accumulatedGenerationGwh,
      unit: "GWh",
      value:
        bigNumbers.accumulatedGenerationGwh === null
          ? "--"
          : bigNumbers.accumulatedGenerationGwh.toFixed(1)
    },
    {
      label: `${prefix}減碳`,
      provenance: provenance.accumulatedCarbonReductionTons,
      unit: "tCO₂e",
      value:
        bigNumbers.accumulatedCarbonReductionTons === null
          ? "--"
          : bigNumbers.accumulatedCarbonReductionTons.toLocaleString("zh-TW")
    },
    {
      label: "節能成效",
      provenance: provenance.annualEnergySavingPercent,
      unit: "%",
      value:
        bigNumbers.annualEnergySavingPercent === null
          ? "--"
          : bigNumbers.annualEnergySavingPercent.toFixed(1)
    },
    {
      label: "植樹等效",
      provenance: provenance.plantedTreeEquivalent,
      unit: "株",
      value:
        bigNumbers.plantedTreeEquivalent === null
          ? "--"
          : bigNumbers.plantedTreeEquivalent.toLocaleString("zh-TW")
    }
  ];
}

function mergePeriod(
  periodKey: SustainabilityPeriodKey,
  inputPeriod: SustainabilityPeriodStoryInput | undefined,
  counterMap: CounterMap
) {
  const derived = buildBigNumbers(counterMap);
  const periodDefaults = buildPeriodDefaults(periodKey);
  const anyRuntimeValuePresent = Object.values(derived.values).some(
    (value) => value !== null
  );
  const mergedProvenance = mergeProvenance(
    anyRuntimeValuePresent
      ? {
          ...periodDefaults.provenance,
          updatedAt:
            Object.values(derived.provenance)
              .map((item) => item.updatedAt)
              .find((value) => value !== null) ?? null
        }
      : buildMissingProvenance(periodDefaults.provenance.label),
    inputPeriod?.provenance
  );

  return {
    bigNumberProvenance: {
      accumulatedCarbonReductionTons: mergeProvenance(
        derived.provenance.accumulatedCarbonReductionTons,
        inputPeriod?.bigNumberProvenance?.accumulatedCarbonReductionTons
      ),
      accumulatedGenerationGwh: mergeProvenance(
        derived.provenance.accumulatedGenerationGwh,
        inputPeriod?.bigNumberProvenance?.accumulatedGenerationGwh
      ),
      annualEnergySavingPercent: mergeProvenance(
        derived.provenance.annualEnergySavingPercent,
        inputPeriod?.bigNumberProvenance?.annualEnergySavingPercent
      ),
      plantedTreeEquivalent: mergeProvenance(
        derived.provenance.plantedTreeEquivalent,
        inputPeriod?.bigNumberProvenance?.plantedTreeEquivalent
      )
    },
    bigNumbers: derived.values,
    comparison:
      inputPeriod?.comparison?.state === "available"
        ? {
            delta: inputPeriod.comparison.delta ?? null,
            fallbackReason: inputPeriod.comparison.fallbackReason ?? null,
            label: inputPeriod.comparison.label?.trim() || "比較資料已同步",
            state: "available"
          }
        : {
            ...periodDefaults.comparison,
            ...inputPeriod?.comparison
          },
    highlights:
      inputPeriod?.highlights.length
        ? inputPeriod.highlights
        : buildDerivedHighlights(periodKey, derived.values, derived.provenance),
    provenance: mergedProvenance
  } satisfies SustainabilityPeriodStoryInput;
}

export function readSustainabilityStory(period?: SustainabilityPeriodKey) {
  const storyConfig = readStoredStory();
  const counterMap = readCounterSnapshots();
  const householdEquivalents = readHouseholdEquivalenceCards();
  const derivedPeriods = Object.fromEntries(
    storyConfig.availablePeriods.map((periodKey) => [
      periodKey,
      mergePeriod(periodKey, storyConfig.periods[periodKey], counterMap)
    ])
  ) as SustainabilityStoryInput["periods"];
  const story = normalizeSustainabilityStory({
    ...storyConfig,
    householdEquivalents,
    periods: derivedPeriods
  });
  const resolved = resolveSustainabilityStoryPeriod(story, period);

  return {
    ...story,
    generatedAt: new Date().toISOString(),
    period: resolved.period,
    selectedPeriod: resolved.selectedPeriod
  };
}

export function saveSustainabilityStory(story: SustainabilityStoryInput) {
  getDatabase()
    .prepare(
      `
        INSERT INTO system_settings (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = CURRENT_TIMESTAMP
      `
    )
    .run(settingKey, JSON.stringify(story));
}
