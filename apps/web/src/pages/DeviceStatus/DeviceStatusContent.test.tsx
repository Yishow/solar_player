import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const deviceStatusContentSource = [
  readFileSync(path.join(import.meta.dirname, "DeviceStatusContent.tsx"), "utf8"),
  readFileSync(path.join(import.meta.dirname, "LeftWingTriagePanel.tsx"), "utf8"),
  readFileSync(path.join(import.meta.dirname, "RightWingMetricsPanel.tsx"), "utf8")
].join("\n");

test("device status content renders degraded display operations summary wiring", () => {
  assert.match(deviceStatusContentSource, /viewModel\.displayOpsSummary\.degraded \? "is-warning" : "is-neutral"/);
  assert.match(deviceStatusContentSource, /displayOpsErrorMessage\s*\?\s*"摘要不可用"\s*:\s*viewModel\.displayOpsSummary\.statusTitle/s);
  assert.match(deviceStatusContentSource, /viewModel\.displayOpsSummary\.configurationReadinessLabel/);
  assert.match(deviceStatusContentSource, /viewModel\.displayOpsSummary\.operationalHealthLabel/);
  assert.match(deviceStatusContentSource, /mgmt-surface--status-dashboard/);
  assert.match(deviceStatusContentSource, /事件分流/);
  assert.match(deviceStatusContentSource, /ds-hero-grid/);
  assert.match(deviceStatusContentSource, /安全診斷結果/);
  assert.match(deviceStatusContentSource, /viewModel\.heroCards\.map/);
  assert.match(deviceStatusContentSource, /主機層處置/);
  assert.match(deviceStatusContentSource, /ds-triage-grid/);
  assert.match(deviceStatusContentSource, /mgmt-stat-strip ds-display-ops-stats/);
  assert.match(deviceStatusContentSource, /alert\.domainLabel/);
  assert.match(deviceStatusContentSource, /viewModel\.displayOpsSummary\.alerts\)\.map/);
  assert.match(deviceStatusContentSource, /handleDiagnostic\(action\.action, action\.label\)/);
  assert.match(deviceStatusContentSource, /displayOpsSummary\.helper/);
  assert.match(deviceStatusContentSource, /展示端心跳/);
  assert.match(deviceStatusContentSource, /viewModel\.displayClientSummary\.badges\.map/);
  assert.match(deviceStatusContentSource, /viewModel\.displayClientSummary\.rows\.map/);
  assert.match(deviceStatusContentSource, /目前沒有展示端 heartbeat/);
  assert.match(deviceStatusContentSource, /viewModel\.logsSummary\.statusTitle/);
  assert.match(deviceStatusContentSource, /Journald/);
  assert.match(deviceStatusContentSource, /exportAvailable/);
  assert.match(deviceStatusContentSource, /handleKioskExit/);
  assert.match(deviceStatusContentSource, /離開系統/);
  assert.match(deviceStatusContentSource, /離開展示模式/);
});

test("device status content gates safe diagnostics on display ops loading separately", () => {
  assert.match(deviceStatusContentSource, /displayOpsLoading/);
  assert.match(deviceStatusContentSource, /displayOpsLoading \|\| displayOpsAccessDenied/);
  assert.match(deviceStatusContentSource, /activeAction !== null \|\| displayOpsLoading/);
});
