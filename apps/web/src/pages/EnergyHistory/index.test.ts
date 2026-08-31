import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const energyHistorySource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");

test("energy history stops remapping year to total and queries summaries with the selected range", () => {
  assert.doesNotMatch(energyHistorySource, /range === "year" \? "total" : range/);
  assert.match(energyHistorySource, /getEnergyHistory\(metricScope,\s*range\)/);
  assert.doesNotMatch(energyHistorySource, /\/api\/metrics\/(history|daily-summary|cumulative)/);
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
  assert.match(energyHistorySource, /resolveMonitoringHistoryRuntimeRefreshSpec\(range,\s*metricScope\)/);
  assert.match(energyHistorySource, /refreshKey:\s*historyRefresh\.refreshKey/);
  assert.match(energyHistorySource, /shouldRefreshMonitoringHistory\(event,\s*metricScope\)/);
});

test("energy history loads the combined persisted history source as one staged lane", () => {
  assert.doesNotMatch(energyHistorySource, /Promise\.all\(/);
  assert.match(energyHistorySource, /historyRuntime\s*=\s*useRuntimeRefreshLifecycle/);
  assert.match(energyHistorySource, /const snapshots = historyPayload\?\.snapshots/);
  assert.match(energyHistorySource, /const summaries = historyPayload\?\.summaries/);
  assert.match(energyHistorySource, /const counters = historyPayload\?\.counters/);
  assert.match(energyHistorySource, /historySourceErrorMessage/);
});

test("energy history uses the combined scoped payload and rejects stale scope or range data", () => {
  assert.match(energyHistorySource, /getEnergyHistory\(metricScope,\s*range\)/);
  assert.match(energyHistorySource, /isEnergyHistoryPayloadForSelection\(historyRuntime\.payload,\s*selection\)/);
  assert.doesNotMatch(energyHistorySource, /monitoringHistoryPayloadCache/);
  assert.doesNotMatch(energyHistorySource, /readCachedMonitoringHistoryPayload/);
  assert.doesNotMatch(energyHistorySource, /rememberMonitoringHistoryPayload/);
  assert.doesNotMatch(energyHistorySource, /resolveMonitoringHistoryPayloadForRange/);
});

test("energy history keeps scope and range explicit in URL state", () => {
  assert.match(energyHistorySource, /useSearchParams/);
  assert.match(energyHistorySource, /resolveEnergyHistorySelection\(searchParams\)/);
  assert.match(energyHistorySource, /updateEnergyHistorySearchParams/);
});

test("energy history exposes a visible global cross-site scope", () => {
  assert.match(energyHistorySource, /viewModel\.scopeLabel/);
  assert.match(energyHistorySource, /energyHistoryScopeOptions/);
  assert.match(energyHistorySource, /管理範圍|資料範圍/);
});
