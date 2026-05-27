import type {
  SustainabilityPeriodKey,
  SustainabilityProvenance,
  SustainabilityStoryInput
} from "@solar-display/shared";
import {
  normalizeSustainabilityStory,
  resolveSustainabilityStoryPeriod
} from "@solar-display/shared";

type BuildSustainabilityViewModelArgs = {
  selectedPeriod?: SustainabilityPeriodKey;
  story?: SustainabilityStoryInput;
};

function buildMissingProvenance(label: string) {
  return {
    label,
    source: "aggregate-missing",
    sourceClass: "missing",
    syncState: "missing",
    updatedAt: null
  } satisfies SustainabilityProvenance;
}

function buildDefaultStory(): SustainabilityStoryInput {
  return {
    availablePeriods: ["lifetime"],
    modules: [
      {
        bullets: ["推動再生能源使用", "落實節能減碳行動", "強化供應鏈永續管理"],
        id: "reference-esg-summary",
        title: "ESG 行動摘要",
        type: "esg-summary"
      }
    ],
    periods: {
      lifetime: {
        bigNumbers: {
          annualEnergySavingPercent: 12.4,
          accumulatedCarbonReductionTons: 9842,
          accumulatedGenerationGwh: 18.6,
          plantedTreeEquivalent: 25600
        },
        comparison: {
          delta: "+2.1%",
          fallbackReason: null,
          label: "較去年成長 2.1%",
          state: "available"
        },
        highlights: [],
        provenance: {
          label: "Reference fallback",
          source: "reference-display-default",
          sourceClass: "manual-module",
          syncState: "fresh",
          updatedAt: null
        }
      }
    },
    selectedPeriod: "lifetime"
  };
}

function formatFixed(value: number | null, digits: number) {
  return value === null ? "--" : value.toFixed(digits);
}

function formatInteger(value: number | null) {
  return value === null ? "--" : value.toLocaleString("zh-TW");
}

function buildDerivedHighlights(
  period: ReturnType<typeof resolveSustainabilityStoryPeriod>["period"]
) {
  return [
    {
      label: "累積發電",
      provenance: period.bigNumberProvenance.accumulatedGenerationGwh,
      unit: "GWh",
      value: formatFixed(period.bigNumbers.accumulatedGenerationGwh, 1)
    },
    {
      label: "累積減碳",
      provenance: period.bigNumberProvenance.accumulatedCarbonReductionTons,
      unit: "tCO₂e",
      value: formatInteger(period.bigNumbers.accumulatedCarbonReductionTons)
    },
    {
      label: "節能成效",
      provenance: period.bigNumberProvenance.annualEnergySavingPercent,
      unit: "%",
      value: formatFixed(period.bigNumbers.annualEnergySavingPercent, 1)
    },
    {
      label: "植樹等效",
      provenance: period.bigNumberProvenance.plantedTreeEquivalent,
      unit: "株",
      value: formatInteger(period.bigNumbers.plantedTreeEquivalent)
    }
  ];
}

function buildModuleCard(
  module:
    | ReturnType<typeof normalizeSustainabilityStory>["modules"][number]
    | undefined,
  args: {
    allowReferenceFallback: boolean;
    iconKey: "esg-doc" | "procure";
    label: string;
    subtitle: string;
  }
) {
  if (!module) {
    if (args.allowReferenceFallback && args.iconKey === "procure") {
      return {
        iconKey: args.iconKey,
        label: args.label,
        provenance: buildMissingProvenance(args.label),
        subtitle: args.subtitle,
        value: "NT$ 60M+"
      };
    }

    return {
      iconKey: args.iconKey,
      items: args.allowReferenceFallback && args.iconKey === "esg-doc"
        ? ["推動再生能源使用", "落實節能減碳行動", "強化供應鏈永續管理"]
        : ["模組未提供"],
      label: args.label,
      provenance: buildMissingProvenance(args.label),
      subtitle: args.subtitle
    };
  }

  return {
    iconKey: args.iconKey,
    items: module.bullets.length > 0 ? module.bullets : [module.description],
    label: module.title,
    provenance: module.provenance,
    subtitle: args.subtitle
  };
}

export function buildSustainabilityViewModel({
  selectedPeriod,
  story
}: BuildSustainabilityViewModelArgs) {
  const allowReferenceFallback = story === undefined;
  const normalized = normalizeSustainabilityStory(story ?? buildDefaultStory());
  const resolved = resolveSustainabilityStoryPeriod(normalized, selectedPeriod);
  const procurementModule = normalized.modules.find(
    (module) => module.type === "project-outcome"
  );
  const esgModule = normalized.modules.find((module) => module.type === "esg-summary");

  return {
    bigNumbers: [
      {
        helper: "Total Generation",
        iconKey: "bars" as const,
        label: "累積發電量",
        provenance: resolved.period.bigNumberProvenance.accumulatedGenerationGwh,
        unit: "GWh",
        value: formatFixed(resolved.period.bigNumbers.accumulatedGenerationGwh, 1)
      },
      {
        helper: "Total CO₂ Reduction",
        iconKey: "co2" as const,
        label: "累積 CO₂ 減量",
        provenance: resolved.period.bigNumberProvenance.accumulatedCarbonReductionTons,
        unit: "t",
        value: formatInteger(resolved.period.bigNumbers.accumulatedCarbonReductionTons)
      },
      {
        helper: "Annual Energy Saving",
        iconKey: "leaf" as const,
        label: "年度節能成效",
        provenance: resolved.period.bigNumberProvenance.annualEnergySavingPercent,
        unit: "%",
        value: formatFixed(resolved.period.bigNumbers.annualEnergySavingPercent, 1)
      }
    ],
    comparison: resolved.period.comparison,
    esgCards: [
      buildModuleCard(procurementModule, {
        allowReferenceFallback,
        iconKey: "procure",
        label: "綠色採購金額",
        subtitle: "Green Procurement"
      }),
      buildModuleCard(esgModule, {
        allowReferenceFallback,
        iconKey: "esg-doc",
        label: "ESG 行動摘要",
        subtitle: "ESG Highlights"
      }),
      {
        iconKey: "tree" as const,
        label: "相當於種樹",
        provenance: resolved.period.bigNumberProvenance.plantedTreeEquivalent,
        subtitle: "Trees Planted",
        unit: "trees",
        value: formatInteger(resolved.period.bigNumbers.plantedTreeEquivalent)
      }
    ],
    hero: {
      copyEnLines: [
        "Kuozui Motors is committed to green manufacturing and",
        "environmental stewardship, steadily advancing sustainable",
        "practices to create a better future for our planet and society."
      ],
      copyZhLines: [
        "國瑞汽車致力推動綠色製造，落實環境管理與資源循環，",
        "以行動實踐企業永續承諾，與社會共創更美好的未來。"
      ],
      eyebrow: "綠能驅動・永續未來",
      subtitle: "Sustainability in Action",
      title: ["永續成果", "持續累積"]
    },
    highlights:
      resolved.period.highlights.length > 0
        ? resolved.period.highlights
        : buildDerivedHighlights(resolved.period),
    householdEquivalents: normalized.householdEquivalents,
    periodOptions: normalized.availablePeriods,
    provenance: resolved.period.provenance,
    selectedPeriod: resolved.selectedPeriod,
    storyModules: normalized.modules
  };
}
