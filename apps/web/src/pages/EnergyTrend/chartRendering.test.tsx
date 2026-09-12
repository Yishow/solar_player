import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { register } from "node:module";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { clearMonitoringHistoryPayloadCacheForTest, rememberMonitoringHistoryPayload, type MonitoringHistorySnapshot } from "../shared/monitoringHistoryPayloadCache";

register("data:text/javascript," + encodeURIComponent("export async function load(url, context, next) { if (url.endsWith('.css')) return {format:'module', shortCircuit:true, source:''}; return next(url, context); }"));
const { EnergyTrend } = await import("./index");

function renderCharts(t: TestContext, values: Array<Partial<MonitoringHistorySnapshot>>) {
  rememberMonitoringHistoryPayload({ range: "day", snapshots: values.map((value, index) => ({ capturedAt: `2026-09-12T0${index}:00:00.000Z`, ...value })) });
  const dom = new JSDOM(renderToStaticMarkup(<EnergyTrend />));
  t.after(() => { dom.window.close(); clearMonitoringHistoryPayloadCacheForTest(); });
  return [...dom.window.document.querySelectorAll(".et-card")];
}

test("trend-axis-shares-domain: real trend cards label each chart with its metric unit", (t) => {
  const cards = renderCharts(t, [
    { generation: 0, consumption: 0, co2: 0, ratio: 20 },
    { generation: 1200, consumption: 1200, co2: 0.5, ratio: 40 },
    { generation: 2400, consumption: 2400, co2: 1, ratio: 40 }
  ]);
  for (const [index, unit] of ["kW", "kWh", "kWh", "%", "t"].entries()) {
    const axis = cards[index]!.querySelector(".et-axis-labels")!;
    for (const tick of axis.querySelectorAll("span")) assert.ok(tick.textContent?.endsWith(unit), `card ${index} ticks use ${unit}`);
  }
  assert.equal(cards[1]!.querySelector(".et-area-line")?.getAttribute("d"), "M 8,212 L 136,110 L 264,8");
});

test("trend-percent-40-of-100: 40 percent occupies forty percent of the plot", (t) => {
  const cards = renderCharts(t, [{ ratio: 20 }, { ratio: 40 }]);
  const path = cards[3]!.querySelector(".et-area-line")!.getAttribute("d")!;
  const coordinates = [...path.matchAll(/\d+(?:\.\d+)?/g)].map(([value]) => Number(value));
  [8, 171.2, 264, 130.4].forEach((expected, index) => assert.ok(Math.abs(coordinates[index]! - expected) < 1e-9));
  assert.equal(cards[3]!.querySelector(".et-axis-labels span")?.textContent, "100%");
});

test("trend-zero-and-missing: measured zero has a line and missing readings stay empty", (t) => {
  const cards = renderCharts(t, [{ generation: 0, consumption: null }, { generation: 0, consumption: null }]);
  assert.equal(cards[0]!.querySelector(".et-area-line")?.getAttribute("d"), "M 8,212 L 264,212");
  assert.equal(cards[2]!.querySelector(".et-area-line"), null);
  assert.ok(cards[2]!.querySelector(".et-empty"));
});


test("trend time labels remain readable without changing timestamp order", (t) => {
  const cards = renderCharts(t, [{ generation: 0 }, { generation: 1200 }]);
  const times = [...cards[0]!.querySelectorAll(".et-axis-times span")].map((node) => node.textContent);
  assert.equal(times[0], "09-12 00:00");
  assert.equal(times[times.length - 1], "09-12 01:00");
});
