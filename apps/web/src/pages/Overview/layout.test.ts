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
    top: 172,
    width: 642
  });
  assert.deepEqual(overviewHeroLayout, {
    height: 820,
    left: 430,
    top: 140,
    width: 1490
  });
  assert.deepEqual(overviewLeafLayout, {
    height: 168,
    left: 420,
    top: 528,
    width: 296
  });
  assert.deepEqual(overviewGoldLineLayout, {
    left: 12,
    top: 610,
    width: 760
  });
  assert.deepEqual(overviewSummaryLayout, {
    left: 88,
    top: 602,
    width: 376
  });
  assert.deepEqual(overviewKpiLayout.power, {
    height: 250,
    left: 40,
    top: 760,
    width: 352
  });
  assert.deepEqual(overviewKpiLayout.today, {
    height: 250,
    left: 412,
    top: 760,
    width: 352
  });
  assert.deepEqual(overviewKpiLayout.total, {
    height: 250,
    left: 784,
    top: 760,
    width: 352
  });
  assert.deepEqual(overviewKpiLayout.co2Today, {
    height: 250,
    left: 1156,
    top: 760,
    width: 352
  });
  assert.deepEqual(overviewKpiLayout.co2Total, {
    height: 250,
    left: 1528,
    top: 760,
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
