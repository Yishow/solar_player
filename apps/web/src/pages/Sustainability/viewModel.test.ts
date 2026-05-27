import assert from "node:assert/strict";
import test from "node:test";
import type { SustainabilityStoryInput } from "@solar-display/shared";
import { buildSustainabilityViewModel } from "./viewModel";

const periodStory: SustainabilityStoryInput = {
  availablePeriods: ["month", "quarter", "year", "lifetime"],
  householdEquivalents: {
    cumulative: {
      basisSourceLabel: "累積自發自用量",
      calcProfile: {
        id: "default-four-person",
        label: "預設四口之家"
      },
      derivedStatus: "available",
      disclaimer: "依四口之家平均用電與估算電價換算",
      eyebrow: "累積綠能成果",
      householdCountDisplay: "35",
      householdLabel: "戶4口之家",
      provenance: {
        label: "累積自發自用量",
        source: "cumulative-self-consumption",
        sourceClass: "derived-metric",
        syncState: "fresh",
        updatedAt: "2026-05-21T10:00:00.000Z"
      },
      supportingLine: "約相當於一個月電費"
    },
    today: {
      basisSourceLabel: "今日自發自用量",
      calcProfile: {
        id: "default-four-person",
        label: "預設四口之家"
      },
      derivedStatus: "available",
      disclaimer: "依四口之家平均用電與估算電價換算",
      eyebrow: "今日綠電效益",
      householdCountDisplay: "18",
      householdLabel: "戶4口之家",
      provenance: {
        label: "今日自發自用量",
        source: "daily-self-consumption",
        sourceClass: "derived-metric",
        syncState: "fresh",
        updatedAt: "2026-05-21T10:00:00.000Z"
      },
      supportingLine: "約可折抵一日電費"
    }
  },
  modules: [
    {
      description: "2026 年綠色採購聚焦低碳供應鏈",
      id: "procurement-1",
      title: "綠色採購敘事",
      type: "project-outcome"
    },
    {
      bullets: ["導入再生能源", "", "供應鏈碳管理"],
      id: "esg-1",
      title: "ESG 行動摘要",
      type: "esg-summary"
    },
    {
      description: "年度減碳盤點完成並對外揭露",
      id: "milestone-1",
      title: "年度里程碑",
      type: "milestone"
    }
  ],
  periods: {
    lifetime: {
      bigNumbers: {
        annualEnergySavingPercent: 70,
        accumulatedCarbonReductionTons: 9842,
        accumulatedGenerationGwh: 18.6,
        plantedTreeEquivalent: 25600
      },
      bigNumberProvenance: {
        accumulatedCarbonReductionTons: {
          label: "累積減碳",
          source: "cumulative-counters",
          sourceClass: "runtime-aggregate",
          syncState: "fresh",
          updatedAt: "2026-05-13T10:00:00.000Z"
        },
        accumulatedGenerationGwh: {
          label: "累積發電",
          source: "cumulative-counters",
          sourceClass: "runtime-aggregate",
          syncState: "fresh",
          updatedAt: "2026-05-13T10:00:00.000Z"
        },
        annualEnergySavingPercent: {
          label: "年度節能成效",
          source: "self-consumption-ratio",
          sourceClass: "derived-metric",
          syncState: "fresh",
          updatedAt: "2026-05-13T10:00:00.000Z"
        },
        plantedTreeEquivalent: {
          label: "植樹等效",
          source: "co2-tree-equivalent",
          sourceClass: "derived-metric",
          syncState: "fresh",
          updatedAt: "2026-05-13T10:00:00.000Z"
        }
      },
      comparison: {
        delta: null,
        fallbackReason: "comparison-baseline-missing",
        label: "缺少去年基準，暫無年增比較",
        state: "unavailable"
      },
      highlights: [
        {
          label: "累積發電",
          provenance: {
            label: "累積發電",
            source: "cumulative-counters",
            sourceClass: "runtime-aggregate",
            syncState: "fresh",
            updatedAt: "2026-05-13T10:00:00.000Z"
          },
          unit: "GWh",
          value: "18.6"
        }
      ],
      provenance: {
        label: "歷史累積",
        source: "cumulative-counters",
        syncState: "fresh",
        updatedAt: "2026-05-13T10:00:00.000Z",
        sourceClass: "runtime-aggregate"
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
        updatedAt: "2026-05-13T10:00:00.000Z",
        sourceClass: "runtime-aggregate"
      }
    },
    quarter: {
      bigNumbers: {
        annualEnergySavingPercent: 68.4,
        accumulatedCarbonReductionTons: 312,
        accumulatedGenerationGwh: 4.8,
        plantedTreeEquivalent: 980
      },
      comparison: {
        delta: "+4.2%",
        fallbackReason: null,
        label: "較前季提升 4.2%",
        state: "available"
      },
      highlights: [
        {
          label: "本季減碳",
          provenance: {
            label: "本季減碳",
            source: "quarterly-rollup",
            sourceClass: "runtime-aggregate",
            syncState: "warning",
            updatedAt: "2026-05-01T00:00:00.000Z"
          },
          unit: "tCO₂e",
          value: "312"
        },
        {
          label: "本季節電",
          provenance: {
            label: "本季節電",
            source: "quarterly-rollup",
            sourceClass: "runtime-aggregate",
            syncState: "warning",
            updatedAt: "2026-05-01T00:00:00.000Z"
          },
          unit: "MWh",
          value: "82"
        }
      ],
      provenance: {
        label: "季報",
        source: "quarterly-rollup",
        syncState: "warning",
        updatedAt: "2026-05-01T00:00:00.000Z",
        sourceClass: "runtime-aggregate"
      }
    },
    year: {
      bigNumbers: {
        annualEnergySavingPercent: 70,
        accumulatedCarbonReductionTons: 9842,
        accumulatedGenerationGwh: 18.6,
        plantedTreeEquivalent: 25600
      },
      comparison: {
        delta: null,
        fallbackReason: "comparison-baseline-missing",
        label: "缺少去年基準，暫無年增比較",
        state: "unavailable"
      },
      highlights: [],
      provenance: {
        label: "年報",
        source: "cumulative-counters",
        syncState: "stale",
        updatedAt: "2026-04-30T23:00:00.000Z",
        sourceClass: "runtime-aggregate"
      }
    }
  },
  selectedPeriod: "quarter"
};

test("buildSustainabilityViewModel applies the selected period consistently across story blocks", () => {
  const model = buildSustainabilityViewModel({
    selectedPeriod: "quarter",
    story: periodStory
  });

  assert.equal(model.selectedPeriod, "quarter");
  assert.equal(model.bigNumbers[0]?.value, "4.8");
  assert.equal(model.highlights[0]?.label, "本季減碳");
  assert.equal(model.highlights[0]?.value, "312");
  assert.equal(model.provenance.label, "季報");
  assert.equal(model.provenance.updatedAt, "2026-05-01T00:00:00.000Z");
  assert.equal(model.provenance.syncState, "warning");
  assert.equal(model.comparison.state, "available");
  assert.equal(model.comparison.delta, "+4.2%");
});

test("buildSustainabilityViewModel provides reference-like fallback values for display playback", () => {
  const model = buildSustainabilityViewModel({});

  assert.equal(model.bigNumbers[0]?.value, "18.6");
  assert.equal(model.bigNumbers[1]?.value, "9,842");
  assert.equal(model.bigNumbers[2]?.value, "12.4");
  assert.equal(model.comparison.state, "available");
  assert.equal(model.comparison.label, "較去年成長 2.1%");
  assert.equal(model.esgCards[0]?.label, "綠色採購金額");
  assert.equal(model.esgCards[0]?.subtitle, "Green Procurement");
  assert.equal(model.esgCards[0] && "value" in model.esgCards[0] ? model.esgCards[0].value : null, "NT$ 60M+");
  assert.deepEqual(
    model.esgCards[1] && "items" in model.esgCards[1] ? model.esgCards[1].items : [],
    ["推動再生能源使用", "落實節能減碳行動", "強化供應鏈永續管理"]
  );
  assert.equal(model.esgCards[2] && "value" in model.esgCards[2] ? model.esgCards[2].value : null, "25,600");
  assert.equal(model.esgCards[2] && "unit" in model.esgCards[2] ? model.esgCards[2].unit : null, "trees");
});

test("buildSustainabilityViewModel preserves runtime module content and provenance without page-local hardcodes", () => {
  const model = buildSustainabilityViewModel({
    selectedPeriod: "year",
    story: periodStory
  });

  assert.equal(model.provenance.label, "年報");
  assert.equal(model.provenance.source, "cumulative-counters");
  assert.equal(model.provenance.syncState, "stale");
  assert.equal(model.provenance.updatedAt, "2026-04-30T23:00:00.000Z");
  assert.equal(model.comparison.state, "unavailable");
  assert.equal(model.comparison.fallbackReason, "comparison-baseline-missing");
  assert.doesNotMatch(model.comparison.label, /2\.1%/);
  assert.equal(model.esgCards[0]?.provenance.sourceClass, "manual-module");
  assert.equal(model.esgCards[1]?.provenance.sourceClass, "manual-module");
  assert.equal(model.esgCards[0] && "value" in model.esgCards[0] ? model.esgCards[0].value : null, null);
  assert.deepEqual(model.storyModules[1]?.bullets, ["導入再生能源", "供應鏈碳管理"]);
  assert.equal(model.householdEquivalents.today.householdCountDisplay, "18");
  assert.equal(model.householdEquivalents.today.calcProfile?.label, "預設四口之家");
  assert.match(model.householdEquivalents.today.disclaimer ?? "", /估算電價/);
});

test("buildSustainabilityViewModel marks missing editorial and aggregate data explicitly instead of using silent mocks", () => {
  const model = buildSustainabilityViewModel({
    selectedPeriod: "lifetime",
    story: {
      availablePeriods: ["lifetime"],
      modules: [],
      periods: {
        lifetime: {
          bigNumbers: {
            annualEnergySavingPercent: null,
            accumulatedCarbonReductionTons: null,
            accumulatedGenerationGwh: null,
            plantedTreeEquivalent: null
          },
          comparison: {
            delta: null,
            fallbackReason: "comparison-baseline-missing",
            label: "缺少比較基準",
            state: "unavailable"
          },
          highlights: [],
          provenance: {
            label: "累積資料",
            source: "aggregate-missing",
            sourceClass: "missing",
            syncState: "missing",
            updatedAt: null
          }
        }
      },
      selectedPeriod: "lifetime"
    }
  });

  assert.equal(model.bigNumbers[0]?.value, "--");
  assert.equal(model.bigNumbers[1]?.value, "--");
  assert.equal(model.comparison.state, "unavailable");
  assert.equal(model.esgCards[0]?.provenance.sourceClass, "missing");
  assert.equal(model.esgCards[1]?.provenance.sourceClass, "missing");
  const firstEsgCard = model.esgCards[0];
  assert.equal(firstEsgCard && "items" in firstEsgCard ? (firstEsgCard.items?.[0] ?? null) : null, "模組未提供");
  assert.equal(model.householdEquivalents.today.derivedStatus, "unavailable");
  assert.equal(model.householdEquivalents.today.householdCountDisplay, "--");
  assert.equal(model.householdEquivalents.cumulative.derivedStatus, "unavailable");
});

test("buildSustainabilityViewModel keeps four compatibility highlight slots when explicit runtime highlights are absent", () => {
  const model = buildSustainabilityViewModel({
    selectedPeriod: "year",
    story: periodStory
  });

  assert.deepEqual(
    model.highlights.map((item) => item.label),
    ["累積發電", "累積減碳", "節能成效", "植樹等效"]
  );
  assert.deepEqual(
    model.highlights.map((item) => item.unit),
    ["GWh", "tCO₂e", "%", "株"]
  );
});
