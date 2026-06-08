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
  assert.match(solarSource, /renderDisplayPageIcon\(\{/);
  assert.match(solarSource, /seedSource: seedConfig\.iconSources\.kpiCards\[cardItem\.key\]/);
  assert.match(solarSource, /source: resolvedConfig\.iconSources\.kpiCards\[cardItem\.key\]/);
  assert.match(solarSource, /resolvedConfig\.cardStyles\[cardItem\.key\]/);
  assert.match(solarSource, /cardStyle=\{item\.cardStyle\}/);
  assert.match(solarSource, /DisplayCardValueRow align=\{item\.cardStyle\.valueRowAlign\} unit=\{metric\.unit\} value=\{metric\.value\} \/>/);
});
