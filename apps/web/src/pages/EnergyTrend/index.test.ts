import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const energyTrendSource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");

test("energy trend renders explicit operator-facing monitoring state semantics", () => {
  assert.match(energyTrendSource, /viewModel\.monitoringState\.statusLabel/);
  assert.match(energyTrendSource, /viewModel\.monitoringState\.sourceRoleLabel/);
  assert.match(energyTrendSource, /viewModel\.monitoringState\.freshnessLabel/);
  assert.match(energyTrendSource, /viewModel\.monitoringState\.emptyStateLabel/);
});
