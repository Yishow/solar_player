import assert from "node:assert/strict";
import test from "node:test";
import { toSparklineCoordinates, toSparklinePolyline, toSparklineSmoothPath } from "./Sparkline";

test("sparkline coordinates span the full horizontal extent", () => {
  const coords = toSparklineCoordinates([1, 5, 2]);
  assert.equal(coords.length, 3);
  assert.equal(coords[0]!.x, 0);
  assert.equal(coords[2]!.x, 100);
});

test("non-smooth polyline keeps the existing straight-segment formatting", () => {
  const coords = toSparklineCoordinates([0, 10, 5]);
  const polyline = toSparklinePolyline(coords);
  assert.equal(polyline.split(" ").length, 3);
  assert.match(polyline, /^0,/);
});

test("smooth path emits a cubic bezier curve through the points", () => {
  const path = toSparklineSmoothPath(toSparklineCoordinates([1, 8, 3, 9, 2]));
  assert.match(path, /^M/);
  assert.match(path, /C/);
});

test("smooth path of a single point degrades to a move command without curves", () => {
  const path = toSparklineSmoothPath(toSparklineCoordinates([4]));
  assert.match(path, /^M/);
  assert.doesNotMatch(path, /C/);
});

test("sparkline geometry handles an empty series without throwing", () => {
  assert.deepEqual(toSparklineCoordinates([]), []);
  assert.equal(toSparklinePolyline([]), "");
  assert.equal(toSparklineSmoothPath([]), "");
});
