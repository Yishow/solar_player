import assert from "node:assert/strict";
import test from "node:test";
import { factoryCircuitDisplayPageEditorRegions } from "../FactoryCircuit/displayPageConfig";
import { overviewDisplayPageEditorRegions } from "../Overview/displayPageConfig";
import { solarDisplayPageEditorRegions } from "../Solar/displayPageConfig";

function findRegion(
  regions: typeof overviewDisplayPageEditorRegions,
  regionId: string
) {
  const region = regions.find((candidate) => candidate.id === regionId);
  assert.ok(region, `missing editor region ${regionId}`);
  return region;
}

test("metric-backed editor regions register their shared Data inspector capability", () => {
  assert.deepEqual(findRegion(overviewDisplayPageEditorRegions, "overview-kpi-power").dataBinding, {
    bindingPath: ["dataBindings", "power"],
    itemId: "power",
    sourceType: "metric"
  });
  assert.deepEqual(findRegion(solarDisplayPageEditorRegions, "solar-kpi-generation").dataBinding, {
    bindingPath: ["dataBindings", "generation"],
    itemId: "generation",
    sourceType: "metric"
  });
  assert.deepEqual(findRegion(solarDisplayPageEditorRegions, "solar-flow-solar").dataBinding, {
    bindingPath: ["dataBindings", "flow.solar"],
    itemId: "flow.solar",
    sourceType: "metric"
  });
  assert.deepEqual(findRegion(factoryCircuitDisplayPageEditorRegions, "factory-kpi-totalPower").dataBinding, {
    bindingPath: ["dataBindings", "totalPower"],
    itemId: "totalPower",
    sourceType: "metric"
  });
  assert.deepEqual(findRegion(factoryCircuitDisplayPageEditorRegions, "factory-load-row-stamping").dataBinding, {
    bindingPath: ["dataBindings", "stamping"],
    itemId: "stamping",
    sourceType: "metric"
  });
});

test("non-data editor regions do not expose metric controls", () => {
  assert.equal(findRegion(overviewDisplayPageEditorRegions, "overview-hero-media").dataBinding, undefined);
  assert.equal(findRegion(solarDisplayPageEditorRegions, "solar-connector-solarToInverter").dataBinding, undefined);
  assert.equal(findRegion(factoryCircuitDisplayPageEditorRegions, "factory-load-panel").dataBinding, undefined);
});
