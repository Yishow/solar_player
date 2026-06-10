import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const hookDir = path.resolve(import.meta.dirname);
const controllerSource = fs.readFileSync(path.join(hookDir, "usePlaybackController.ts"), "utf8");

test("usePlaybackController reuses the server rotation preview for runtime page selection", () => {
  assert.match(controllerSource, /getDisplayRotationPreview\(\)/);
  assert.match(controllerSource, /const runtimePages = rotationPreview\.playablePages;/);
  assert.match(controllerSource, /setFallbackRoute\(rotationPreview\.fallbackRoute\)/);
  assert.match(controllerSource, /setPages\(runtimePages\)/);
});

test("usePlaybackController can defer management diagnostics with injected settings and preview", () => {
  assert.match(controllerSource, /enabled = options\.enabled \?\? true/);
  assert.match(controllerSource, /providedSettings \? Promise\.resolve\(providedSettings\) : getPlaybackSettings\(\)/);
  assert.match(controllerSource, /providedRotationPreview \? Promise\.resolve\(providedRotationPreview\) : getDisplayRotationPreview\(\)/);
  assert.match(controllerSource, /\[enabled, options\.rotationPreview, options\.settings\]/);
});
