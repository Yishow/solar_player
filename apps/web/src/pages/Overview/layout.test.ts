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
test("overview layout centralizes reference hero and KPI geometry", () => {
  assert.deepEqual(overviewTitleLayout, {
    left: 86,
    top: 210,
    width: 600
  });
  assert.deepEqual(overviewHeroLayout, {
    height: 690,
    left: 540,
    top: 182,
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
    height: 232,
    left: 40,
    top: 758,
    width: 352
  });
  assert.deepEqual(overviewKpiLayout.today, {
    height: 232,
    left: 412,
    top: 758,
    width: 352
  });
  assert.deepEqual(overviewKpiLayout.total, {
    height: 232,
    left: 784,
    top: 758,
    width: 352
  });
  assert.deepEqual(overviewKpiLayout.co2Today, {
    height: 232,
    left: 1156,
    top: 758,
    width: 352
  });
  assert.deepEqual(overviewKpiLayout.co2Total, {
    height: 232,
    left: 1528,
    top: 758,
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
