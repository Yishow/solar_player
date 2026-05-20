import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const pageDir = path.resolve(import.meta.dirname);
const slideshowPreviewSource = fs.readFileSync(path.join(pageDir, "index.tsx"), "utf8");

test("slideshow preview renders cards from the shared live preview catalog instead of prototype asset maps", () => {
  assert.match(slideshowPreviewSource, /useLiveDisplayPagePreviewCatalog\(\)/);
  assert.match(slideshowPreviewSource, /<LiveSlideshowPreviewCards/);
  assert.match(slideshowPreviewSource, /viewModel\.debugStatus/);
  assert.doesNotMatch(slideshowPreviewSource, /viewModel\.debugRows/);
  assert.doesNotMatch(slideshowPreviewSource, /viewModel\.skippedDebugRows/);
  assert.doesNotMatch(slideshowPreviewSource, /slideshowPreviewAssetRuntimeMap/);
  assert.doesNotMatch(slideshowPreviewSource, /<img alt=\{card\.labelZh\} src=\{asset\}/);
});
