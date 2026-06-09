import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGenerationTrendAxisLabels,
  buildGenerationTrendYTicks,
  findGenerationTrendPeak,
  mapGenerationTrendCoordinates
} from "./generationTrendChart";

test("generation trend axis labels span the intraday window", () => {
  const labels = buildGenerationTrendAxisLabels();
  assert.equal(labels.length, 5);
  assert.equal(labels[0]!.position, 0);
  assert.equal(labels[labels.length - 1]!.position, 100);
  assert.equal(labels[0]!.label, "00:00");
  assert.equal(labels[labels.length - 1]!.label, "24:00");
});

test("generation trend peak reports the maximum sample and its position", () => {
  const peak = findGenerationTrendPeak([1, 5, 3]);
  assert.ok(peak);
  assert.equal(peak.index, 1);
  assert.equal(peak.value, 5);
  assert.equal(peak.position, 50);
});

test("generation trend peak is null for an empty series", () => {
  assert.equal(findGenerationTrendPeak([]), null);
});

test("generation trend y ticks round the peak up to a nice scale spanning top to bottom", () => {
  const ticks = buildGenerationTrendYTicks([1087, 2100, 4200, 2100, 0]);
  assert.ok(ticks.length >= 2);
  assert.equal(ticks[0]!.position, 0);
  assert.equal(ticks[ticks.length - 1]!.position, 100);
  assert.ok(ticks[0]!.value >= 4200, `top tick ${ticks[0]!.value} should be >= peak`);
  assert.equal(ticks[ticks.length - 1]!.value, 0);
});

test("generation trend coordinates fill the plot height against the nice maximum", () => {
  const coords = mapGenerationTrendCoordinates([0, 5000], 5000);
  assert.equal(coords.length, 2);
  assert.equal(coords[0]!.x, 0);
  assert.equal(coords[1]!.x, 100);
  // Zero sits near the bottom, the maximum near the top.
  assert.ok(coords[0]!.y > coords[1]!.y);
  assert.ok(coords[0]!.y >= 90 && coords[0]!.y <= 100);
  assert.ok(coords[1]!.y >= 0 && coords[1]!.y <= 10);
});

test("generation trend coordinates handle an empty series", () => {
  assert.deepEqual(mapGenerationTrendCoordinates([], 5000), []);
});

test("generation trend coordinates honor explicit hourly positions for partial-day series", () => {
  const coords = mapGenerationTrendCoordinates([3200, 4100], 5000, [9, 10]);
  assert.equal(Math.round(coords[0]!.x * 100) / 100, 37.5);
  assert.equal(Math.round(coords[1]!.x * 100) / 100, 41.67);
});

test("generation trend peak uses explicit hour positions when provided", () => {
  const peak = findGenerationTrendPeak([3200, 4100], [9, 10]);
  assert.ok(peak);
  assert.equal(Math.round(peak.position * 100) / 100, 41.67);
});
