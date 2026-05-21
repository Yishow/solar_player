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
  const today = "2026-05-21";
  getDatabase().prepare("DELETE FROM daily_energy_summaries").run();
  getDatabase()
    .prepare(
      `
        INSERT INTO daily_energy_summaries (
          date,
          generation_total,
          consumption_total,
          self_consumption_total,
          co2_total,
          peak_generation,
          peak_generation_time,
          peak_consumption,
          peak_consumption_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(today, 120, 92, 72, 18, 30, `${today}T10:00:00.000Z`, 24, `${today}T11:00:00.000Z`);
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/sustainability-story?period=year"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      story: {
        householdEquivalents: {
          today: {
            calcProfile?: {
              label: string;
            } | null;
            derivedStatus: string;
            disclaimer?: string;
            householdCountDisplay: string;
          };
        };
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
    assert.equal(body.story.householdEquivalents.today.householdCountDisplay, "18");
    assert.equal(body.story.householdEquivalents.today.calcProfile?.label, "預設四口之家");
    assert.equal(body.story.householdEquivalents.today.derivedStatus, "available");
    assert.match(body.story.householdEquivalents.today.disclaimer ?? "", /估算/);
  } finally {
    await app.close();
  }
});

test("PUT /api/sustainability-story persists editorial modules without overriding runtime aggregates", async () => {
  seedSustainabilityCounters();
  const app = await buildApp();
  const originalEmitDisplaySync = app.socketService.emitDisplaySync.bind(app.socketService);
  const emitted: Array<{ reason: string; scope: string }> = [];

  app.socketService.emitDisplaySync = (payload) => {
    emitted.push({ reason: payload.reason, scope: payload.scope });
    originalEmitDisplaySync(payload);
  };

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
    assert.deepEqual(emitted, [{ reason: "sustainability-story-updated", scope: "sustainability" }]);
  } finally {
    app.socketService.emitDisplaySync = originalEmitDisplaySync;
    await app.close();
  }
});

test("GET /api/sustainability-story marks missing aggregate dependencies explicitly instead of returning silent fallback numbers", async () => {
  const database = getDatabase();
  database.prepare("DELETE FROM cumulative_counters").run();
  database.prepare("DELETE FROM daily_energy_summaries").run();
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/sustainability-story?period=lifetime"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      story: {
        householdEquivalents: {
          cumulative: {
            derivedStatus: string;
            householdCountDisplay: string;
          };
          today: {
            derivedStatus: string;
            householdCountDisplay: string;
          };
        };
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
    assert.equal(body.story.householdEquivalents.today.derivedStatus, "unavailable");
    assert.equal(body.story.householdEquivalents.today.householdCountDisplay, "--");
    assert.equal(body.story.householdEquivalents.cumulative.derivedStatus, "unavailable");
    assert.equal(body.story.householdEquivalents.cumulative.householdCountDisplay, "--");
  } finally {
    await app.close();
  }
});
