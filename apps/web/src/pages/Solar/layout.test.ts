import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  solarAssetMap,
  solarConnectorLayout,
  solarContentTopOffset,
  solarFlowNodeLayout,
  solarHeroLayout,
  solarKpiLayout,
  solarTitleLayout
} from "./layout";

const solarCss = readFileSync(path.join(import.meta.dirname, "solar.css"), "utf8");
const connectorArrowWidth = 18;
const connectorNodeGap = 14;

function cssBlock(selector: string) {
  const match = solarCss.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([\\s\\S]*?)\\}`));
  assert.ok(match, `missing CSS block: ${selector}`);
  return match[1]!;
}

function keyframesBlock(name: string) {
  const start = solarCss.indexOf(`@keyframes ${name}`);
  const next = solarCss.indexOf("@keyframes", start + 1);

  assert.ok(start >= 0, `missing keyframes: ${name}`);

  return solarCss.slice(start, next > start ? next : undefined);
}

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
    width: 148
  });
  assert.deepEqual(solarKpiLayout.totalCo2, {
    height: 220,
    left: 1150,
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

test("solar runtime offsets canonical FHD coordinates by the current shell header height", () => {
  assert.equal(solarContentTopOffset, 110);
});

test("solar flow diagram keeps circular energy nodes and directional connectors", () => {
  assert.match(solarCss, /\.solar-flow-node\s*\{[\s\S]*?border-radius:\s*(?:50%|999px);/);
  assert.match(solarCss, /\.solar-flow-node-co2 h3\s*\{[\s\S]*?top:\s*calc\(132px \+/);
  assert.match(solarCss, /\.solar-connector::after\s*\{/);
  assert.match(solarCss, /border-left:\s*18px solid currentColor;/);
  assert.match(solarCss, /\.solar-connector-l::before\s*\{/);
});

test("solar flow animation keeps motion without animating SVG filters", () => {
  assert.match(cssBlock(".solar-flow-line-1"), /animation:\s*solar-energy-flow-1 1\.5s linear infinite;/);
  assert.match(cssBlock(".solar-flow-line-2"), /solar-energy-flow-2 1\.5s 1\.5s linear infinite/);
  assert.match(cssBlock(".solar-flow-line-orange"), /solar-energy-flow-orange 1\.5s 1\.5s linear infinite/);

  for (const keyframeName of [
    "solar-energy-flow-1",
    "solar-energy-flow-2",
    "solar-energy-flow-orange"
  ]) {
    assert.doesNotMatch(keyframesBlock(keyframeName), /filter:/);
  }
});

test("solar CO2 node keeps its title, footnote, and value separated inside the circle", () => {
  assert.match(solarCss, /\.solar-flow-node-co2 h3\s*\{[\s\S]*?line-height:\s*1\.08;/);
  assert.match(solarCss, /\.solar-flow-node-co2 p\s*\{[\s\S]*?top:\s*calc\(166px \+/);
  assert.match(solarCss, /\.solar-flow-node-co2 \.solar-flow-value\s*\{[\s\S]*?bottom:\s*8px;/);
});

test("solar connector arrows stop before entering the target flow nodes", () => {
  assert.ok(
    solarConnectorLayout.solarToInverter.left + solarConnectorLayout.solarToInverter.width + connectorArrowWidth <=
      solarFlowNodeLayout.inverter.left - connectorNodeGap
  );
  assert.ok(
    solarConnectorLayout.inverterToFactory.left + solarConnectorLayout.inverterToFactory.width + connectorArrowWidth <=
      solarFlowNodeLayout.factory.left - connectorNodeGap
  );
  assert.ok(
    solarConnectorLayout.inverterToCo2.left + solarConnectorLayout.inverterToCo2.width + connectorArrowWidth <=
      solarFlowNodeLayout.co2.left - connectorNodeGap
  );
});
