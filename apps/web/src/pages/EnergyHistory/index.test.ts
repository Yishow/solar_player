import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const energyHistorySource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");

test("energy history stops remapping year to total and queries summaries with the selected range", () => {
  assert.doesNotMatch(energyHistorySource, /range === "year" \? "total" : range/);
  assert.match(energyHistorySource, /\/api\/metrics\/history\?range=\$\{range\}/);
  assert.match(energyHistorySource, /\/api\/metrics\/daily-summary\?range=\$\{range\}/);
});

test("energy history renders range-aware chart headings from the view model contract", () => {
  assert.match(energyHistorySource, /viewModel\.chartTitle/);
  assert.match(energyHistorySource, /viewModel\.chartSubtitle/);
  assert.match(energyHistorySource, /viewModel\.bottomSummary/);
});
