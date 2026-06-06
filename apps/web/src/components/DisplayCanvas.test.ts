import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const displayCanvasSource = readFileSync(path.join(import.meta.dirname, "DisplayCanvas.tsx"), "utf8");

test("DisplayCanvas uses a single translated uniform scale with stage-bg letterbox", () => {
  assert.match(displayCanvasSource, /computeCanvasLayout/);
  assert.match(
    displayCanvasSource,
    /transform: `translate\(\$\{layout\.offsetX}px, \$\{layout\.offsetY}px\) scale\(\$\{layout\.scale}\)`/
  );
  assert.match(displayCanvasSource, /backgroundColor: "var\(--stage-bg\)"/);
  assert.doesNotMatch(displayCanvasSource, /scale\(\$\{scale\.x}, \$\{scale\.y}\)/);
});

test("DisplayCanvas applies persisted brightness/orientation via the surface style helper", () => {
  assert.match(displayCanvasSource, /resolveDisplayCanvasSurfaceStyle\(\{ brightness, orientation }\)/);
  assert.match(displayCanvasSource, /\.\.\.surfaceStyle/);
});
