import type { SustainabilityStoryInput } from "@solar-display/shared";
import {
  normalizeSustainabilityStory,
  resolveSustainabilityStoryPeriod
} from "@solar-display/shared";
import type { sustainabilityHighlights, sustainabilitySummary } from "../../mocks/sustainability";

type SustainabilitySummary = typeof sustainabilitySummary;
type SustainabilityHighlight = (typeof sustainabilityHighlights)[number];

type BuildSustainabilityViewModelArgs = {
  highlights?: SustainabilityHighlight[];
  selectedPeriod?: "lifetime" | "month" | "quarter" | "year";
  story?: SustainabilityStoryInput;
  summary: SustainabilitySummary | null;
};

const fallbackSummary = {
  accumulatedCarbonReductionTons: 9842,
  accumulatedGenerationGwh: 18.6,
  annualEnergySavingPercent: 12.4,
  plantedTreeEquivalent: 25600
};

function buildDefaultStory(
  highlights: SustainabilityHighlight[],
  summary: SustainabilitySummary | null
): SustainabilityStoryInput {
  const lifetime = {
    annualEnergySavingPercent: fallbackSummary.annualEnergySavingPercent,
    accumulatedCarbonReductionTons:
      summary?.accumulatedCarbonReductionTons ?? fallbackSummary.accumulatedCarbonReductionTons,
    accumulatedGenerationGwh:
      summary === null
        ? fallbackSummary.accumulatedGenerationGwh
        : Number((summary.accumulatedGenerationMwh / 1000).toFixed(1)),
    plantedTreeEquivalent:
      summary?.plantedTreeEquivalent ?? fallbackSummary.plantedTreeEquivalent
  };

  return {
    availablePeriods: ["month", "quarter", "year", "lifetime"],
    modules: [
      { description: "內容整理中", id: "milestone-default", title: "年度里程碑", type: "milestone" },
      { bullets: ["推動再生能源使用", "落實節能減碳行動", "強化供應鏈永續管理"], id: "esg-default", title: "ESG 行動摘要", type: "esg-summary" }
    ],
    periods: {
      lifetime: {
        bigNumbers: lifetime,
        highlights: highlights.length > 0
          ? highlights
          : [
              { label: "本月減碳", unit: "tCO₂e", value: "38.4" },
              { label: "年度節電", unit: "MWh", value: "214" },
              { label: "綠電自用", unit: "%", value: "71" },
              { label: "等效植樹", unit: "株", value: "25,600" }
            ],
        provenance: {
          label: "累積資料",
          source: "fallback-story",
          syncState: summary === null ? "missing" : "fresh",
          updatedAt: null
        }
      },
      month: {
        bigNumbers: {
          annualEnergySavingPercent: 2.4,
          accumulatedCarbonReductionTons: 38.4,
          accumulatedGenerationGwh: 0.6,
          plantedTreeEquivalent: 180
        },
        highlights,
        provenance: {
          label: "月報",
          source: "fallback-month",
          syncState: "warning",
          updatedAt: null
        }
      },
      quarter: {
        bigNumbers: {
          annualEnergySavingPercent: 7.2,
          accumulatedCarbonReductionTons: 312,
          accumulatedGenerationGwh: 4.8,
          plantedTreeEquivalent: 980
        },
        highlights: highlights.slice(0, 2),
        provenance: {
          label: "季報",
          source: "fallback-quarter",
          syncState: "warning",
          updatedAt: null
        }
      },
      year: {
        bigNumbers: lifetime,
        highlights,
        provenance: {
          label: "年報",
          source: "fallback-year",
          syncState: summary === null ? "stale" : "fresh",
          updatedAt: null
        }
      }
    },
    selectedPeriod: "lifetime"
  };
}

export function buildSustainabilityViewModel({
  highlights = [],
  selectedPeriod,
  story,
  summary
}: BuildSustainabilityViewModelArgs) {
  const normalized = normalizeSustainabilityStory(story ?? buildDefaultStory(highlights, summary));
  const resolved = resolveSustainabilityStoryPeriod(normalized, selectedPeriod);

  return {
    bigNumbers: [
      { helper: "Total Generation", iconKey: "bars" as const, label: "累積發電量", unit: "GWh", value: resolved.period.bigNumbers.accumulatedGenerationGwh.toFixed(1) },
      { helper: "Total CO₂ Reduction", iconKey: "co2" as const, label: "累積 CO₂ 減量", unit: "t", value: resolved.period.bigNumbers.accumulatedCarbonReductionTons.toLocaleString("zh-TW") },
      { helper: "Annual Energy Saving", iconKey: "leaf" as const, label: "年度節能成效", unit: "%", value: resolved.period.bigNumbers.annualEnergySavingPercent.toFixed(1) }
    ],
    esgCards: [
      { iconKey: "procure" as const, label: "綠色採購金額", subtitle: "Green Procurement", value: "NT$ 60 M+" },
      { iconKey: "esg-doc" as const, items: ["推動再生能源使用", "落實節能減碳行動", "強化供應鏈永續管理"], label: "ESG 行動摘要", subtitle: "ESG Highlights" },
      { iconKey: "tree" as const, label: "相當於種樹", subtitle: "Trees Planted", value: resolved.period.bigNumbers.plantedTreeEquivalent.toLocaleString("zh-TW") }
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
    highlights: resolved.period.highlights.length > 0
      ? resolved.period.highlights
      : [
          { label: "本月減碳", unit: "tCO₂e", value: "38.4" },
          { label: "年度節電", unit: "MWh", value: "214" },
          { label: "綠電自用", unit: "%", value: "71" },
          { label: "等效植樹", unit: "株", value: "25,600" }
        ],
    periodOptions: normalized.availablePeriods,
    provenance: resolved.period.provenance,
    selectedPeriod: resolved.selectedPeriod,
    storyModules: normalized.modules
  };
}
