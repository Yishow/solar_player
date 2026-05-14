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
    height: 700,
    left: 540,
    top: 140,
    width: 1340
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
  assert.deepEqual(overviewKpiLayout.co2Today, {
    height: 228,
    left: 1168,
    top: 724,
    width: 332
  });
});

test("overview asset map keeps hero image page-local", () => {
  assert.match(overviewAssetMap.hero.src, /overview-hero-ref\.jpg$/);
});
