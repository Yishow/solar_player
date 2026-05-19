import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const solarSource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");

test("solar KPI cards use the shared display card family", () => {
  assert.match(solarSource, /DisplayCardFrame/);
  assert.match(solarSource, /DisplayCardHeader/);
  assert.match(solarSource, /DisplayCardValueRow/);
  assert.match(solarSource, /DisplayCardFooter/);
  assert.match(solarSource, /solarAssetRuntimeMap\.kpi\[metric\.iconKey\]/);
  assert.match(solarSource, /<img alt=\{metric\.label\} className=\"solar-kpi-icon\" src=\{assetSrc\} \/>/);
  assert.match(solarSource, /DisplayCardValueRow align=\"center\" unit=\{metric\.unit\} value=\{metric\.value\} \/>/);
});
