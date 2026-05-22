import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const deviceStatusContentSource = readFileSync(path.join(import.meta.dirname, "DeviceStatusContent.tsx"), "utf8");

test("device status content renders degraded display operations summary wiring", () => {
  assert.match(deviceStatusContentSource, /viewModel\.displayOpsSummary\.degraded \? "is-warning" : "is-neutral"/);
  assert.match(deviceStatusContentSource, /displayOpsErrorMessage\s*\?\s*"摘要不可用"\s*:\s*viewModel\.displayOpsSummary\.statusTitle/s);
  assert.match(deviceStatusContentSource, /viewModel\.displayOpsSummary\.configurationReadinessLabel/);
  assert.match(deviceStatusContentSource, /viewModel\.displayOpsSummary\.operationalHealthLabel/);
  assert.match(deviceStatusContentSource, /alert\.domainLabel/);
  assert.match(deviceStatusContentSource, /viewModel\.displayOpsSummary\.alerts\)\.map/);
  assert.match(deviceStatusContentSource, /handleDiagnostic\(action\.action, action\.label\)/);
  assert.match(deviceStatusContentSource, /displayOpsSummary\.helper/);
  assert.match(deviceStatusContentSource, /viewModel\.logsSummary\.statusTitle/);
  assert.match(deviceStatusContentSource, /Recent Logs/);
});
