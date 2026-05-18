import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeSustainabilityStory,
  resolveSustainabilityStoryPeriod,
  type SustainabilityStoryInput
} from "@solar-display/shared";

const story: SustainabilityStoryInput = {
  availablePeriods: ["month", "quarter", "year", "lifetime"],
  modules: [
    {
      bullets: ["推動再生能源使用", "", "強化供應鏈永續管理"],
      id: "esg-1",
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
      highlights: [],
      provenance: {
        label: "累積",
        source: "cumulative-counters",
        syncState: "fresh",
        updatedAt: "2026-05-13T10:00:00.000Z"
      }
    },
    month: {
      bigNumbers: {
        annualEnergySavingPercent: 2.4,
        accumulatedCarbonReductionTons: 38.4,
        accumulatedGenerationGwh: 0.6,
        plantedTreeEquivalent: 180
      },
      highlights: [],
      provenance: {
        label: "月報",
        source: "monthly-rollup",
        syncState: "fresh",
        updatedAt: "2026-05-13T10:00:00.000Z"
      }
    },
    quarter: {
      bigNumbers: {
        annualEnergySavingPercent: 7.2,
        accumulatedCarbonReductionTons: 312,
        accumulatedGenerationGwh: 4.8,
        plantedTreeEquivalent: 980
      },
      highlights: [],
      provenance: {
        label: "季報",
        source: "quarterly-rollup",
        syncState: "warning",
        updatedAt: "2026-05-01T00:00:00.000Z"
      }
    },
    year: {
      bigNumbers: {
        annualEnergySavingPercent: 12.4,
        accumulatedCarbonReductionTons: 9842,
        accumulatedGenerationGwh: 18.6,
        plantedTreeEquivalent: 25600
      },
      highlights: [],
      provenance: {
        label: "年報",
        source: "yearly-rollup",
        syncState: "stale",
        updatedAt: "2026-04-30T23:00:00.000Z"
      }
    }
  },
  selectedPeriod: "quarter"
};

test("sustainability story keeps the selected period consistent across periodized outputs", () => {
  const normalized = normalizeSustainabilityStory(story);
  const resolved = resolveSustainabilityStoryPeriod(normalized, "quarter");

  assert.equal(resolved.selectedPeriod, "quarter");
  assert.equal(resolved.period.bigNumbers.accumulatedGenerationGwh, 4.8);
  assert.equal(resolved.period.provenance.syncState, "warning");
});

test("sustainability story preserves readable module fallbacks when optional content is incomplete", () => {
  const normalized = normalizeSustainabilityStory(story);

  assert.deepEqual(normalized.modules[0]?.bullets, ["推動再生能源使用", "強化供應鏈永續管理"]);
  assert.match(normalized.modules[0]?.description ?? "", /內容整理中/);
});
