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

test("energy trend reloads history data through the monitoring-history runtime refresh contract", () => {
  assert.match(energyTrendSource, /useRuntimeRefreshLifecycle/);
  assert.match(energyTrendSource, /resolveMonitoringHistoryRuntimeRefreshSpec\(range\)/);
  assert.match(energyTrendSource, /refreshKey:\s*historyRefresh\.refreshKey/);
});

test("energy trend seeds route reentry from the last visible history payload", () => {
  assert.match(energyTrendSource, /readCachedEnergyTrendHistoryPayload\(range\)/);
  assert.match(energyTrendSource, /initialPayload:\s*readCachedEnergyTrendHistoryPayload\(range\)/);
  assert.match(energyTrendSource, /rememberEnergyTrendHistoryPayload\(historyRuntime\.payload\)/);
});
