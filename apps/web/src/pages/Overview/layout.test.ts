import assert from "node:assert/strict";
import test from "node:test";
import {
  overviewAssetMap,
  overviewGoldLineLayout,
  overviewHeroLayout,
  overviewKpiLayout,
  overviewLeafLayout,
  overviewSummaryLayout,
  overviewTitleLayout
} from "./layout";
import { createOverviewDisplayPageSeedConfig } from "./displayPageConfig";
test("overview layout centralizes reference hero and KPI geometry", () => {
  assert.deepEqual(overviewTitleLayout, {
    left: 86,
    top: 210,
    width: 600
  });
  assert.deepEqual(overviewHeroLayout, {
    height: 466,
    left: 540,
    top: 176,
    width: 1340
  });
  assert.deepEqual(overviewLeafLayout, {
    height: 150,
    left: 430,
    top: 558,
    width: 264
  });
  assert.deepEqual(overviewGoldLineLayout, {
    left: 12,
    top: 642,
    width: 680
  });
  assert.deepEqual(overviewSummaryLayout, {
    left: 88,
    top: 602,
    width: 376
  });
  assert.deepEqual(overviewKpiLayout.power, {
    height: 188,
    left: 40,
    top: 874,
    width: 352
  });
  assert.deepEqual(overviewKpiLayout.today, {
    height: 188,
    left: 412,
    top: 874,
    width: 352
  });
  assert.deepEqual(overviewKpiLayout.total, {
    height: 188,
    left: 784,
    top: 874,
    width: 352
  });
  assert.deepEqual(overviewKpiLayout.co2Today, {
    height: 188,
    left: 1156,
    top: 874,
    width: 352
  });
  assert.deepEqual(overviewKpiLayout.co2Total, {
    height: 188,
    left: 1528,
    top: 874,
    width: 352
  });

  const orderedCards = [
    overviewKpiLayout.power,
    overviewKpiLayout.today,
    overviewKpiLayout.total,
    overviewKpiLayout.co2Today,
    overviewKpiLayout.co2Total
  ];
  const expectedGap = 20;

  for (let index = 0; index < orderedCards.length - 1; index += 1) {
    const current = orderedCards[index]!;
    const next = orderedCards[index + 1]!;

    assert.equal(next.left - (current.left + current.width), expectedGap);
  }
});

test("overview asset map keeps hero image page-local", () => {
  assert.match(overviewAssetMap.hero.src, /overview-hero-ref\.jpg$/);
});

test("overview hero, density widget row, and KPI row are non-overlapping vertical bands", () => {
  const seed = createOverviewDisplayPageSeedConfig();
  const heroBottom = overviewHeroLayout.top + overviewHeroLayout.height;

  const densityWidgets = [
    seed.dashboardWidgets.weather,
    seed.dashboardWidgets.phasePower,
    seed.dashboardWidgets.generationTrend
  ];
  const densityTop = Math.min(...densityWidgets.map((widget) => widget.top));
  const densityBottom = Math.max(...densityWidgets.map((widget) => widget.top + widget.height));

  const kpiCards = [
    overviewKpiLayout.power,
    overviewKpiLayout.today,
    overviewKpiLayout.total,
    overviewKpiLayout.co2Today,
    overviewKpiLayout.co2Total
  ];
  const kpiTop = Math.min(...kpiCards.map((card) => card.top));
  const kpiBottom = Math.max(...kpiCards.map((card) => card.top + card.height));

  // Hero band ends before the density row begins.
  assert.ok(heroBottom <= densityTop, `hero bottom ${heroBottom} <= density top ${densityTop}`);
  // Density row ends before the KPI row begins.
  assert.ok(densityBottom <= kpiTop, `density bottom ${densityBottom} <= kpi top ${kpiTop}`);
  // KPI row fits within the 1080 canvas.
  assert.ok(kpiBottom <= 1080, `kpi bottom ${kpiBottom} <= 1080`);
});
