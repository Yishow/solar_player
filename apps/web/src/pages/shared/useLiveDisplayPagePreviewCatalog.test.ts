import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const previewCatalogSource = fs.readFileSync(
  path.join(import.meta.dirname, "useLiveDisplayPagePreviewCatalog.ts"),
  "utf8"
);

test("live preview catalog loads page-instance state from the active registry instead of static template keys", () => {
  assert.match(previewCatalogSource, /getDisplayPageRegistry\(\)/);
  assert.match(previewCatalogSource, /buildLiveDisplayPagePreviewStates\(/);
  assert.match(previewCatalogSource, /readLiveConfig:\s*\(pageKey\)\s*=>\s*getDisplayPageConfig\(pageKey,\s*"live"\)/);
  assert.doesNotMatch(previewCatalogSource, /displayPageKeys\.map\(async \(pageKey\)/);
});
