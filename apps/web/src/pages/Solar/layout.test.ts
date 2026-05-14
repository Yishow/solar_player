import assert from "node:assert/strict";
import test from "node:test";
import {
  solarAssetMap,
  solarConnectorLayout,
  solarFlowNodeLayout,
  solarHeroLayout,
  solarKpiLayout,
  solarTitleLayout
} from "./layout";

test("solar layout centralizes main region geometry", () => {
  assert.deepEqual(solarTitleLayout, {
    left: 88,
    top: 166,
    width: 650
  });
  assert.deepEqual(solarHeroLayout, {
    height: 205,
    left: 0,
    top: 540,
    width: 1070
  });
  assert.deepEqual(solarFlowNodeLayout.solar, {
    height: 230,
    left: 795,
    top: 162,
    width: 230
  });
  assert.deepEqual(solarConnectorLayout.inverterToCo2, {
    height: 5,
    left: 1365,
    top: 582,
    verticalHeight: 170,
    width: 180
  });
  assert.deepEqual(solarKpiLayout.totalCo2, {
    height: 220,
    left: 1140,
    top: 760,
    width: 350
  });
});

test("solar asset map resolves generated raster assets by display purpose", () => {
  assert.match(solarAssetMap.hero.src, /solar-carport-hero\.png$/);
  assert.match(solarAssetMap.flow["solar-panel-display"].src, /solar-panel-display-source\.png$/);
  assert.match(solarAssetMap.flow["factory-consumption-display"].src, /factory-consumption-display-source\.png$/);
  assert.match(solarAssetMap.kpi["metric-generation-sun"].src, /metric-generation-sun-source\.png$/);
  assert.match(solarAssetMap.kpi["metric-co2-total"].src, /metric-co2-total-source\.png$/);
});
