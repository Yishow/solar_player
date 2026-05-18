import type {
  SustainabilityPeriodKey,
  SustainabilityStoryInput
} from "@solar-display/shared";
import {
  normalizeSustainabilityStory,
  resolveSustainabilityStoryPeriod
} from "@solar-display/shared";
import { getDatabase } from "../db/index.js";

const settingKey = "sustainability_story";

function defaultStory(): SustainabilityStoryInput {
  return {
    availablePeriods: ["month", "quarter", "year", "lifetime"],
    modules: [
      { id: "milestone-default", title: "年度里程碑", type: "milestone" },
      {
        bullets: ["推動再生能源使用", "落實節能減碳行動", "強化供應鏈永續管理"],
        id: "esg-default",
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

export function readSustainabilityStory(period?: SustainabilityPeriodKey) {
  const story = normalizeSustainabilityStory(readStoredStory());
  return {
    ...story,
    generatedAt: new Date().toISOString(),
    period: resolveSustainabilityStoryPeriod(story, period).period,
    selectedPeriod: resolveSustainabilityStoryPeriod(story, period).selectedPeriod
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
