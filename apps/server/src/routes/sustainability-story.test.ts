import assert from "node:assert/strict";
import test from "node:test";
import {
  buildApp,
  getDatabase
} from "./display-pages-asset-governance.test-support.js";

function seedSustainabilityCounters() {
  const database = getDatabase();
  database.prepare("DELETE FROM cumulative_counters").run();
  database
    .prepare(
      `
        INSERT INTO cumulative_counters (metric_key, total_value, last_updated, reset_count)
        VALUES
          ('generation', 18600000, '2026-05-13T10:00:00.000Z', 0),
          ('co2', 9842, '2026-05-13T10:00:00.000Z', 0),
          ('consumption', 6000, '2026-05-13T10:00:00.000Z', 0),
          ('selfConsumption', 4200, '2026-05-13T10:00:00.000Z', 0)
      `
    )
    .run();
}

test("GET /api/sustainability-story derives periodized aggregates and exposes unavailable comparison provenance", async () => {
  seedSustainabilityCounters();
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/sustainability-story?period=year"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      story: {
        period: {
          bigNumberProvenance: {
            accumulatedGenerationGwh: {
              sourceClass: string;
            };
          };
          bigNumbers: {
            accumulatedGenerationGwh: number;
          };
          comparison: {
            fallbackReason: string | null;
            label: string;
            state: string;
          };
          provenance: {
            source: string;
            syncState: string;
          };
        };
        selectedPeriod: string;
      };
    };

    assert.equal(body.story.selectedPeriod, "year");
    assert.equal(body.story.period.bigNumbers.accumulatedGenerationGwh, 18.6);
    assert.equal(body.story.period.bigNumberProvenance.accumulatedGenerationGwh.sourceClass, "runtime-aggregate");
    assert.equal(body.story.period.comparison.state, "unavailable");
    assert.equal(body.story.period.comparison.fallbackReason, "comparison-baseline-missing");
    assert.match(body.story.period.comparison.label, /未提供|無法/);
    assert.equal(body.story.period.provenance.source, "cumulative-counters");
    assert.equal(body.story.period.provenance.syncState, "fresh");
  } finally {
    await app.close();
  }
});

test("PUT /api/sustainability-story persists editorial modules without overriding runtime aggregates", async () => {
  seedSustainabilityCounters();
  const app = await buildApp();

  try {
    const saveResponse = await app.inject({
      method: "PUT",
      payload: {
        availablePeriods: ["month", "quarter", "year", "lifetime"],
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
              annualEnergySavingPercent: 999.9,
              accumulatedCarbonReductionTons: 888888,
              accumulatedGenerationGwh: 777.7,
              plantedTreeEquivalent: 666666
            },
            highlights: [],
            provenance: {
              label: "歷史累積",
              source: "cumulative-counters",
              syncState: "fresh",
              updatedAt: "2026-05-13T10:00:00.000Z"
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
        selectedPeriod: "year"
      },
      url: "/api/sustainability-story"
    });

    assert.equal(saveResponse.statusCode, 200);

    const response = await app.inject({
      method: "GET",
      url: "/api/sustainability-story?period=year"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      story: {
        modules: Array<{
          bullets: string[];
          description: string;
          provenance: {
            sourceClass: string;
          };
          type: string;
          title: string;
        }>;
        period: {
          bigNumbers: {
            accumulatedCarbonReductionTons: number;
            accumulatedGenerationGwh: number;
          };
        };
        selectedPeriod: string;
      };
    };

    assert.equal(body.story.selectedPeriod, "year");
    assert.equal(body.story.period.bigNumbers.accumulatedGenerationGwh, 18.6);
    assert.equal(body.story.period.bigNumbers.accumulatedCarbonReductionTons, 9842);
    assert.equal(body.story.modules[0]?.type, "project-outcome");
    assert.match(body.story.modules[0]?.description ?? "", /綠色採購/);
    assert.equal(body.story.modules[0]?.provenance.sourceClass, "manual-module");
    assert.deepEqual(body.story.modules[1]?.bullets, ["導入再生能源", "供應鏈碳管理"]);
  } finally {
    await app.close();
  }
});

test("GET /api/sustainability-story marks missing aggregate dependencies explicitly instead of returning silent fallback numbers", async () => {
  const database = getDatabase();
  database.prepare("DELETE FROM cumulative_counters").run();
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/sustainability-story?period=lifetime"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      story: {
        period: {
          bigNumberProvenance: {
            accumulatedGenerationGwh: {
              sourceClass: string;
              syncState: string;
            };
          };
          bigNumbers: {
            accumulatedGenerationGwh: number | null;
          };
        };
      };
    };

    assert.equal(body.story.period.bigNumbers.accumulatedGenerationGwh, null);
    assert.equal(body.story.period.bigNumberProvenance.accumulatedGenerationGwh.sourceClass, "missing");
    assert.equal(body.story.period.bigNumberProvenance.accumulatedGenerationGwh.syncState, "missing");
  } finally {
    await app.close();
  }
});
