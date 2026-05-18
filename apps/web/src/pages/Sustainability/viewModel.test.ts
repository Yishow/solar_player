import assert from "node:assert/strict";
import test from "node:test";
import type { SustainabilityStoryInput } from "@solar-display/shared";
import { sustainabilityHighlights, sustainabilitySummary } from "../../mocks/sustainability";
import { buildSustainabilityViewModel } from "./viewModel";

test("buildSustainabilityViewModel falls back to readable storytelling cards when summary data is missing", () => {
  const model = buildSustainabilityViewModel({
    highlights: [],
    summary: null
  });

  assert.equal(model.bigNumbers[0]?.value, "18.6");
  assert.equal(model.bigNumbers[0]?.unit, "GWh");
  assert.equal(model.bigNumbers[0]?.iconKey, "bars");
  assert.equal(model.bigNumbers[1]?.value, "9,842");
  assert.equal(model.esgCards[0]?.iconKey, "procure");
  assert.equal(model.esgCards.length, 3);
  assert.match(model.hero.copyZhLines[0] ?? "", /國瑞汽車致力推動綠色製造/);
});

test("buildSustainabilityViewModel keeps the sustainability witness numbers aligned with the current mock summary", () => {
  const model = buildSustainabilityViewModel({
    highlights: [],
    summary: sustainabilitySummary
  });

  assert.equal(model.bigNumbers[0]?.value, "18.6");
  assert.equal(model.bigNumbers[1]?.value, "9,842");
  assert.equal(model.esgCards[2]?.iconKey, "tree");
  assert.equal(model.esgCards[2] && "value" in model.esgCards[2] ? model.esgCards[2].value : null, "25,600");
});

const periodStory: SustainabilityStoryInput = {
  availablePeriods: ["month", "quarter", "year", "lifetime"],
  modules: [
    {
      id: "milestone-1",
      title: "年度里程碑",
      type: "milestone"
    },
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
      highlights: sustainabilityHighlights,
      provenance: {
        label: "歷史累積",
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
      highlights: sustainabilityHighlights,
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
      highlights: [
        { label: "本季減碳", unit: "tCO₂e", value: "312" },
        { label: "本季節電", unit: "MWh", value: "82" }
      ],
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
      highlights: sustainabilityHighlights,
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

test("buildSustainabilityViewModel applies the selected period consistently across story blocks", () => {
  const model = buildSustainabilityViewModel({
    selectedPeriod: "quarter",
    story: periodStory,
    summary: sustainabilitySummary
  });

  assert.equal(model.selectedPeriod, "quarter");
  assert.equal(model.bigNumbers[0]?.value, "4.8");
  assert.equal(model.highlights[0]?.label, "本季減碳");
  assert.equal(model.highlights[0]?.value, "312");
  assert.equal(model.provenance.syncState, "warning");
});

test("buildSustainabilityViewModel preserves provenance and module fallbacks when content is incomplete", () => {
  const model = buildSustainabilityViewModel({
    selectedPeriod: "year",
    story: periodStory,
    summary: sustainabilitySummary
  });

  assert.equal(model.provenance.source, "yearly-rollup");
  assert.equal(model.provenance.syncState, "stale");
  assert.equal(model.storyModules[0]?.title, "年度里程碑");
  assert.deepEqual(model.storyModules[1]?.bullets, ["推動再生能源使用", "強化供應鏈永續管理"]);
  assert.match(model.storyModules[0]?.description ?? "", /內容整理中/);
});
