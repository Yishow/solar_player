import assert from "node:assert/strict";
import test from "node:test";
import {
  buildApp
} from "./display-pages-asset-governance.test-support.js";

test("GET /api/sustainability-story returns periodized story with provenance", async () => {
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/sustainability-story?period=quarter"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      story: {
        period: {
          provenance: {
            source: string;
            syncState: string;
          };
        };
        selectedPeriod: string;
      };
    };

    assert.equal(body.story.selectedPeriod, "quarter");
    assert.equal(body.story.period.provenance.source, "quarterly-rollup");
    assert.equal(body.story.period.provenance.syncState, "warning");
  } finally {
    await app.close();
  }
});

test("PUT /api/sustainability-story persists story modules and readable fallbacks", async () => {
  const app = await buildApp();

  try {
    const saveResponse = await app.inject({
      method: "PUT",
      payload: {
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
          title: string;
        }>;
        period: {
          provenance: {
            syncState: string;
          };
        };
        selectedPeriod: string;
      };
    };

    assert.equal(body.story.selectedPeriod, "year");
    assert.equal(body.story.period.provenance.syncState, "stale");
    assert.equal(body.story.modules[0]?.title, "年度里程碑");
    assert.match(body.story.modules[0]?.description ?? "", /內容整理中/);
    assert.deepEqual(body.story.modules[1]?.bullets, ["推動再生能源使用", "強化供應鏈永續管理"]);
  } finally {
    await app.close();
  }
});
