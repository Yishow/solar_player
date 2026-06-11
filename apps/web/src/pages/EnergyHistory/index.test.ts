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

test("energy history renders explicit operator-facing monitoring state semantics", () => {
  assert.match(energyHistorySource, /viewModel\.monitoringState\.statusLabel/);
  assert.match(energyHistorySource, /viewModel\.monitoringState\.sourceRoleLabel/);
  assert.match(energyHistorySource, /viewModel\.monitoringState\.freshnessLabel/);
  assert.match(energyHistorySource, /viewModel\.monitoringState\.emptyStateLabel/);
});

test("energy history reloads all persisted history datasets through the monitoring-history runtime refresh contract", () => {
  assert.match(energyHistorySource, /useRuntimeRefreshLifecycle/);
  assert.match(energyHistorySource, /resolveMonitoringHistoryRuntimeRefreshSpec\(range\)/);
  assert.match(energyHistorySource, /refreshKey:\s*historyRefresh\.refreshKey/);
});

test("energy history loads snapshots summaries and counters as independent staged sources", () => {
  assert.doesNotMatch(energyHistorySource, /Promise\.all\(/);
  assert.match(energyHistorySource, /historySnapshotsRuntime\s*=\s*useRuntimeRefreshLifecycle/);
  assert.match(energyHistorySource, /dailySummariesRuntime\s*=\s*useRuntimeRefreshLifecycle/);
  assert.match(energyHistorySource, /cumulativeCountersRuntime\s*=\s*useRuntimeRefreshLifecycle/);
  assert.match(energyHistorySource, /historySourceErrorMessage/);
});

test("energy history reuses the shared warm history payload without flattening source lanes", () => {
  assert.match(energyHistorySource, /readCachedMonitoringHistoryPayload(?:<[^>]+>)?\(range\)/);
  assert.match(energyHistorySource, /initialPayload:\s*cachedHistoryPayload/);
  assert.match(energyHistorySource, /rememberMonitoringHistoryPayload\(historySnapshotsRuntime\.payload\)/);
  assert.match(energyHistorySource, /resolveMonitoringHistoryPayloadForRange/);
  assert.match(energyHistorySource, /const snapshots = historyPayload\?\.snapshots \?\? \[\]/);
  assert.doesNotMatch(energyHistorySource, /dailySummariesRuntime[^;]+initialPayload/s);
  assert.doesNotMatch(energyHistorySource, /cumulativeCountersRuntime[^;]+initialPayload/s);
});
