import assert from "node:assert/strict";
import test from "node:test";
import { resolveDisplayCanvasSurfaceStyle } from "./displayCanvasSurfaceStyle";

test("missing settings resolve to an identity surface style", () => {
  assert.deepEqual(resolveDisplayCanvasSurfaceStyle({}), {});
});

test("brightness of 100 is identity (no filter)", () => {
  assert.deepEqual(resolveDisplayCanvasSurfaceStyle({ brightness: 100 }), {});
});

test("brightness below 100 darkens via a brightness filter", () => {
  assert.equal(resolveDisplayCanvasSurfaceStyle({ brightness: 60 }).filter, "brightness(0.6)");
});

test("brightness above 100 brightens via a brightness filter", () => {
  assert.equal(resolveDisplayCanvasSurfaceStyle({ brightness: 150 }).filter, "brightness(1.5)");
});

test("brightness is clamped to the 0-200 range", () => {
  assert.equal(resolveDisplayCanvasSurfaceStyle({ brightness: 300 }).filter, "brightness(2)");
  assert.equal(resolveDisplayCanvasSurfaceStyle({ brightness: -50 }).filter, "brightness(0)");
});

test("portrait orientation rotates the surface 90 degrees and swaps dimensions", () => {
  const style = resolveDisplayCanvasSurfaceStyle({ orientation: "portrait" });
  assert.ok(String(style.transform).includes("rotate(90deg)"));
  assert.equal(style.position, "fixed");
  assert.equal(style.width, "100vh");
  assert.equal(style.height, "100vw");
});

test("landscape orientation applies no rotation", () => {
  assert.equal(resolveDisplayCanvasSurfaceStyle({ orientation: "landscape" }).transform, undefined);
});

test("brightness and portrait compose", () => {
  const style = resolveDisplayCanvasSurfaceStyle({ brightness: 80, orientation: "portrait" });
  assert.equal(style.filter, "brightness(0.8)");
  assert.ok(String(style.transform).includes("rotate(90deg)"));
});
