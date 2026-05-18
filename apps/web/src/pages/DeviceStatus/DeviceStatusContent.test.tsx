import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const deviceStatusContentSource = readFileSync(path.join(import.meta.dirname, "DeviceStatusContent.tsx"), "utf8");

test("device status content renders degraded display operations summary wiring", () => {
  assert.match(deviceStatusContentSource, /viewModel\.displayOpsSummary\.degraded \? "is-warning" : "is-neutral"/);
  assert.match(deviceStatusContentSource, /displayOpsErrorMessage \? "摘要不可用" : viewModel\.displayOpsSummary\.statusTitle/);
  assert.match(deviceStatusContentSource, /viewModel\.displayOpsSummary\.alerts\)\.map/);
  assert.match(deviceStatusContentSource, /handleDiagnostic\(action\.action, action\.label\)/);
  assert.match(deviceStatusContentSource, /displayOpsSummary\.helper/);
});
