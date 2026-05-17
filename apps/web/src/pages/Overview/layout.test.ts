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
import { solarKpiLayout } from "../Solar/layout";

test("overview layout centralizes reference hero and KPI geometry", () => {
  assert.deepEqual(overviewTitleLayout, {
    left: 86,
    top: 172,
    width: 642
  });
  assert.deepEqual(overviewHeroLayout, {
    height: 820,
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
  assert.deepEqual(overviewKpiLayout.power, solarKpiLayout.generation);
  assert.deepEqual(overviewKpiLayout.today, solarKpiLayout.selfConsumption);
  assert.deepEqual(overviewKpiLayout.total, solarKpiLayout.co2);
  assert.deepEqual(overviewKpiLayout.co2Today, solarKpiLayout.totalCo2);
  assert.deepEqual(overviewKpiLayout.co2Total, solarKpiLayout.efficiency);
});

test("overview asset map keeps hero image page-local", () => {
  assert.match(overviewAssetMap.hero.src, /overview-hero-ref\.jpg$/);
});
