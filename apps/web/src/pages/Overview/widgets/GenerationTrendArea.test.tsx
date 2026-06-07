import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { GenerationTrendWidget } from "./GenerationTrendWidget";

test("GenerationTrendWidget renders a filled area treatment for the trend", () => {
  const markup = renderToStaticMarkup(<GenerationTrendWidget series={[82, 95, 101, 108]} />);

  assert.match(markup, /overview-trend-area/);
  assert.match(markup, /overview-widget-trend-sparkline/);
});

test("GenerationTrendWidget omits the area treatment when there is no series", () => {
  const markup = renderToStaticMarkup(<GenerationTrendWidget series={[]} />);

  assert.doesNotMatch(markup, /overview-trend-area/);
  assert.match(markup, /尚無發電趨勢資料/);
});
