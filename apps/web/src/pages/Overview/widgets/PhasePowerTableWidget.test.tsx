import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PhasePowerTableWidget } from "./PhasePowerTableWidget";

test("PhasePowerTableWidget renders monthly consumption curve title and peak", () => {
  const markup = renderToStaticMarkup(<PhasePowerTableWidget />);

  assert.match(markup, /月用量曲線/);
  assert.match(markup, /Monthly Consumption/);
  assert.match(markup, /overview-trend-chart-svg/);
  assert.match(markup, /4,200 kWh/);
});

test("PhasePowerTableWidget renders SVG gridlines and area gradients", () => {
  const markup = renderToStaticMarkup(<PhasePowerTableWidget />);

  assert.match(markup, /overview-consumption-area-fill/);
  assert.match(markup, /overview-trend-gridline/);
  assert.match(markup, /overview-trend-dot/);
});
