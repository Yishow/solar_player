import type {
  SustainabilityBigNumberKey,
  SustainabilityPeriodKey,
  SustainabilityPeriodStoryInput,
  SustainabilityProvenance,
  SustainabilityStoryComparison,
  SustainabilityStoryInput,
  MetricScope,
  SiteScope
} from "@solar-display/shared";
import {
  co2TreeEquivalentFactor,
  formatMonitoringValue,
  normalizeSustainabilityStory,
  resolveSustainabilityStoryPeriod,
  scopedIdentityKey
} from "@solar-display/shared";
import { getDatabase } from "../db/index.js";
import { readScopedLiveMetricsSnapshot } from "../metrics/liveMetrics.js";
import { readCalculationSettings } from "./calculationSettingsService.js";
import {
  formatDisplayOverrideValue,
  readActiveDisplayValueOverrides
} from "./displayValueOverrideService.js";
import { readHouseholdEquivalenceCards } from "./householdEquivalenceService.js";
import {
  evaluateFactoryGenerationScope,
  resolveFactoryGenerationScope,
  type FactoryGenerationEvaluation,
  type FactoryGenerationScope,
  type FactoryPlaybackPage
} from "./factoryGenerationAggregateService.js";
import { readPlaybackPages } from "./displayRotationService.js";
import { evaluateMetricFreshness } from "./freshnessPolicyService.js";
import { readFreshnessPolicy } from "./freshnessPolicyService.js";

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
type SustainabilityStoryReadOptions = {
  applyDisplayOverrides?: boolean;
  now?: Date;
  siteScope?: SiteScope;
};

export function resolveSustainabilityFactoryScope(
  pages: readonly FactoryPlaybackPage[]
): FactoryGenerationScope {
  return resolveFactoryGenerationScope(pages);
}

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

function formatGenerationMwh(valueGwh: number | null, digits: number) {
  return valueGwh === null
    ? "--"
    : (valueGwh * 1_000).toLocaleString("zh-TW", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
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

function parseFormattedMonitoringNumber(value: string) {
  const parsed = Number(value.replaceAll(",", "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveOverviewTreeEquivalentBasis(carbonReductionTons: number) {
  return parseFormattedMonitoringNumber(formatMonitoringValue(carbonReductionTons, "t"));
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

function readCounterSnapshots(metricScope: MetricScope) {
  const rows = getDatabase()
    .prepare(
      `
        SELECT metric_key, total_value, last_updated
        FROM cumulative_counters
        WHERE metric_scope = ?
      `
    )
    .all(metricScope) as CounterRow[];
  const counterMap = new Map(
    rows.map((row) => [
      row.metric_key,
      {
        updatedAt: row.last_updated ?? null,
        value: typeof row.total_value === "number" ? row.total_value : null
      } satisfies CounterSnapshot
    ])
  ) satisfies CounterMap;
  const liveMetricsSnapshot = readScopedLiveMetricsSnapshot(metricScope);

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

function buildFactoryGenerationProvenance(
  label: string,
  source: string,
  sourceClass: SustainabilityProvenance["sourceClass"],
  evaluation: FactoryGenerationEvaluation | null,
  fallback: CounterSnapshot
) {
  if (!evaluation) {
    return {
      label,
      source: "未選擇廠區",
      sourceClass: "missing",
      syncState: "missing",
      updatedAt: null
    } satisfies SustainabilityProvenance;
  }

  const issue = evaluation.issues
    .map((item) => `${item.factory} ${item.field} ${item.reason}`)
    .join(", ");

  return {
    label,
    source: issue ? `${source} (${issue})` : source,
    sourceClass:
      evaluation.state !== "ready" && typeof fallback.value !== "number"
        ? "missing"
        : sourceClass,
    syncState:
      evaluation.state === "ready"
        ? "fresh"
        : evaluation.state === "stale"
          ? "stale"
          : evaluation.state === "missing" || evaluation.state === "invalid"
            ? "missing"
            : "warning",
    updatedAt: evaluation.updatedAt ?? fallback.updatedAt
  } satisfies SustainabilityProvenance;
}

function resolveScopedGeneration(
  counterMap: CounterMap,
  now: Date,
  siteScope?: SiteScope
) {
  const scope = siteScope
    ? siteScope === "cl"
      ? "CL"
      : "KN"
    : resolveSustainabilityFactoryScope(readPlaybackPages());
  const combinedFallback = scope === "CL+KN"
    ? readCounter(counterMap, "generation")
    : { updatedAt: null, value: null } satisfies CounterSnapshot;

  if (scope === "none") {
    return {
      evaluation: null,
      generation: combinedFallback,
      source: "未選擇廠區"
    };
  }

  const evaluation = evaluateFactoryGenerationScope(getDatabase(), scope, now);
  const generation = evaluation.state === "ready" && "values" in evaluation
    ? {
        updatedAt: evaluation.updatedAt,
        value: evaluation.values.totalGeneration * 1_000
      }
    : combinedFallback;

  return {
    evaluation,
    generation,
    source: scope === "CL+KN" ? "CL + KN MQTT aggregate" : `${scope} MQTT`
  };
}

function buildBigNumbers(
  counterMap: CounterMap,
  now: Date,
  siteScope?: SiteScope
) {
  const scopedGeneration = resolveScopedGeneration(counterMap, now, siteScope);
  const generation = scopedGeneration.generation;
  const consumption = siteScope
    ? { updatedAt: null, value: null }
    : readCounter(counterMap, "consumption");
  const selfConsumption = siteScope
    ? { updatedAt: null, value: null }
    : readCounter(counterMap, "selfConsumption");
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
      : Math.round(
        (resolveOverviewTreeEquivalentBasis(accumulatedCarbonReductionTons) ??
          accumulatedCarbonReductionTons) * co2TreeEquivalentFactor
      );

  return {
    values: {
      accumulatedCarbonReductionTons,
      accumulatedGenerationGwh:
        typeof generation.value === "number"
          ? roundTo(generation.value / 1_000_000, 6)
          : null,
      annualEnergySavingPercent,
      plantedTreeEquivalent
    } satisfies Record<SustainabilityBigNumberKey, number | null>,
    provenance: {
      accumulatedCarbonReductionTons: buildFactoryGenerationProvenance(
        "累積減碳",
        `${scopedGeneration.source} × carbonEmissionFactor`,
        "derived-metric",
        scopedGeneration.evaluation,
        generation
      ),
      accumulatedGenerationGwh: buildFactoryGenerationProvenance(
        "累積發電",
        scopedGeneration.source,
        "runtime-aggregate",
        scopedGeneration.evaluation,
        generation
      ),
      annualEnergySavingPercent: buildCounterProvenance(
        "年度節能成效",
        "self-consumption-ratio",
        "derived-metric",
        [selfConsumption, consumption]
      ),
      plantedTreeEquivalent: buildFactoryGenerationProvenance(
        "植樹等效",
        `${scopedGeneration.source} × carbonEmissionFactor × co2TreeEquivalentFactor`,
        "derived-metric",
        scopedGeneration.evaluation,
        generation
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
      unit: "MWh",
      value: formatGenerationMwh(bigNumbers.accumulatedGenerationGwh, 0)
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

function buildSustainabilityBigNumberCardId(metricKey: SustainabilityBigNumberKey) {
  return `sustainability.big-number.${metricKey}`;
}

function applyBigNumberDisplayOverrides(
  values: Record<SustainabilityBigNumberKey, number | null>,
  metricScope: MetricScope
) {
  const overrides = readActiveDisplayValueOverrides();

  return Object.fromEntries(
    Object.entries(values).map(([metricKey, value]) => {
      const override = overrides.get(
        scopedIdentityKey(
          metricScope,
          buildSustainabilityBigNumberCardId(metricKey as SustainabilityBigNumberKey)
        )
      );

      return [
        metricKey,
        override ? override.displayValue : value
      ];
    })
  ) as Record<SustainabilityBigNumberKey, number | null>;
}

function mergePeriod(
  periodKey: SustainabilityPeriodKey,
  inputPeriod: SustainabilityPeriodStoryInput | undefined,
  counterMap: CounterMap,
  options: SustainabilityStoryReadOptions
) {
  const derived = buildBigNumbers(
    counterMap,
    options.now ?? new Date(),
    options.siteScope
  );
  const bigNumbers =
    options.applyDisplayOverrides === false
      ? derived.values
      : applyBigNumberDisplayOverrides(
        derived.values,
        options.siteScope ?? "global"
      );
  const periodDefaults = buildPeriodDefaults(periodKey);
  const anyRuntimeValuePresent = Object.values(bigNumbers).some(
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
      accumulatedCarbonReductionTons: derived.provenance.accumulatedCarbonReductionTons,
      accumulatedGenerationGwh: derived.provenance.accumulatedGenerationGwh,
      annualEnergySavingPercent: mergeProvenance(
        derived.provenance.annualEnergySavingPercent,
        inputPeriod?.bigNumberProvenance?.annualEnergySavingPercent
      ),
      plantedTreeEquivalent: derived.provenance.plantedTreeEquivalent
    },
    bigNumbers,
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
        : buildDerivedHighlights(periodKey, bigNumbers, derived.provenance),
    provenance: mergedProvenance
  } satisfies SustainabilityPeriodStoryInput;
}

function applyHouseholdDisplayOverrides(
  householdEquivalents: ReturnType<typeof readHouseholdEquivalenceCards>,
  metricScope: MetricScope
) {
  const overrides = readActiveDisplayValueOverrides();

  return {
    cumulative: (() => {
      const override = overrides.get(
        scopedIdentityKey(metricScope, "sustainability.household.cumulative")
      );
      return override
        ? {
            ...householdEquivalents.cumulative,
            householdCountDisplay: formatDisplayOverrideValue(
              override.displayValue,
              override.unit ?? householdEquivalents.cumulative.householdLabel
            )
          }
        : householdEquivalents.cumulative;
    })(),
    today: (() => {
      const override = overrides.get(
        scopedIdentityKey(metricScope, "sustainability.household.today")
      );
      return override
        ? {
            ...householdEquivalents.today,
            householdCountDisplay: formatDisplayOverrideValue(
              override.displayValue,
              override.unit ?? householdEquivalents.today.householdLabel
            )
          }
        : householdEquivalents.today;
    })()
  };
}

export function readSustainabilityStory(
  period?: SustainabilityPeriodKey,
  options: SustainabilityStoryReadOptions = {}
) {
  const storyConfig = readStoredStory();
  const metricScope = options.siteScope ?? "global";
  const counterMap = readCounterSnapshots(metricScope);
  const householdEquivalents = readHouseholdEquivalenceCards({
    now: options.now,
    siteScope: options.siteScope
  });
  const derivedPeriods = Object.fromEntries(
    storyConfig.availablePeriods.map((periodKey) => [
      periodKey,
      mergePeriod(periodKey, storyConfig.periods[periodKey], counterMap, options)
    ])
  ) as SustainabilityStoryInput["periods"];
  const normalizedStory = normalizeSustainabilityStory({
    ...storyConfig,
    householdEquivalents:
      options.applyDisplayOverrides === false
        ? householdEquivalents
        : applyHouseholdDisplayOverrides(householdEquivalents, metricScope),
    periods: derivedPeriods
  });
  const now = options.now ?? new Date();
  const withFreshness = (
    provenance: SustainabilityProvenance,
    metricKey: string
  ): SustainabilityProvenance => {
    const freshness = evaluateMetricFreshness({
      metricKey,
      nowMs: now.getTime(),
      sourceTimestamp: provenance.updatedAt
    });
    return {
      ...provenance,
      freshness,
      syncState:
        freshness.state === "live"
          ? provenance.syncState
          : freshness.state === "unavailable"
            ? "missing"
            : freshness.state === "delayed"
              ? "warning"
              : "stale"
    };
  };
  const story = {
    ...normalizedStory,
    periods: Object.fromEntries(
      Object.entries(normalizedStory.periods).map(([periodKey, period]) => {
        if (!period) {
          return [periodKey, period];
        }
        return [
          periodKey,
          {
            ...period,
            bigNumberProvenance: {
              accumulatedCarbonReductionTons: withFreshness(
                period.bigNumberProvenance.accumulatedCarbonReductionTons,
                "accumulatedCarbonReductionTons"
              ),
              accumulatedGenerationGwh: withFreshness(
                period.bigNumberProvenance.accumulatedGenerationGwh,
                "accumulatedGenerationGwh"
              ),
              annualEnergySavingPercent: withFreshness(
                period.bigNumberProvenance.annualEnergySavingPercent,
                "annualEnergySavingPercent"
              ),
              plantedTreeEquivalent: withFreshness(
                period.bigNumberProvenance.plantedTreeEquivalent,
                "plantedTreeEquivalent"
              )
            },
            highlights: period.highlights.map((highlight) => ({
              ...highlight,
              provenance: withFreshness(highlight.provenance, "totalGeneration")
            })),
            provenance: withFreshness(period.provenance, "totalGeneration")
          }
        ];
      })
    ) as typeof normalizedStory.periods
  };
  const resolved = resolveSustainabilityStoryPeriod(story, period);

  return {
    ...story,
    freshnessPolicy: readFreshnessPolicy().policy,
    generatedAt: now.toISOString(),
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
