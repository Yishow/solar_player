import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const deviceStatusSource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");

test("device status loads host status and log export metadata as independent sources", () => {
  assert.match(deviceStatusSource, /loadDeviceStatus\s*=\s*async/);
  assert.match(deviceStatusSource, /loadLogExportMetadata\s*=\s*async/);
  assert.doesNotMatch(deviceStatusSource, /Promise\.allSettled/);
  assert.match(deviceStatusSource, /void loadDeviceStatus\(\)/);
  assert.match(deviceStatusSource, /void loadLogExportMetadata\(\)/);
});

test("device status exposes display ops loading separately from host status loading", () => {
  assert.match(deviceStatusSource, /isLoading:\s*displayOpsLoading/);
  assert.match(deviceStatusSource, /isLoading:\s*statusLoading/);
  assert.match(deviceStatusSource, /displayOpsLoading=\{displayOpsLoading\}/);
  assert.match(deviceStatusSource, /isLoading=\{statusLoading\}/);
});
