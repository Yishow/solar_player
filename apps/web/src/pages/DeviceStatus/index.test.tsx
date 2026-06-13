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

test("device status reuses a route-loaded status model before deferred refresh", () => {
  assert.match(deviceStatusSource, /export async function loadDeviceStatusRoute\(\)/);
  assert.match(deviceStatusSource, /readCachedDeviceStatusModel\(\)/);
  assert.match(deviceStatusSource, /useState<DeviceStatusResponseData \| null>\(initialDeviceStatusModel\?\.status \?\? null\)/);
  assert.match(deviceStatusSource, /useState\(initialDeviceStatusModel === null\)/);
  assert.match(deviceStatusSource, /useDeviceDisplayOpsSummary\(initialDeviceStatusModel\?\.displayOpsSummary\)/);
  assert.match(deviceStatusSource, /loadDeviceStatus\(\{ preserveProtectedState: true, silent: true \}\)/);
  assert.match(deviceStatusSource, /loadLogExportMetadata\(\{ silent: true \}\)/);
});

test("device status exposes display ops loading separately from host status loading", () => {
  assert.match(deviceStatusSource, /isLoading:\s*displayOpsLoading/);
  assert.match(deviceStatusSource, /isLoading:\s*statusLoading/);
  assert.match(deviceStatusSource, /displayOpsLoading=\{displayOpsLoading\}/);
  assert.match(deviceStatusSource, /isLoading=\{statusLoading\}/);
});

test("device status preserves protected safe-op feedback during background display sync", () => {
  assert.match(deviceStatusSource, /type DeviceStatusLoadOptions = \{\s*preserveProtectedState\?: boolean;\s*silent\?: boolean;\s*\}/);
  assert.match(deviceStatusSource, /loadDeviceStatus\s*=\s*async\s*\(\{\s*preserveProtectedState = false,\s*silent = false\s*\}: DeviceStatusLoadOptions = \{\}\)/);
  assert.match(deviceStatusSource, /if \(!preserveProtectedState\) \{\s*setActionFeedback\(null\);\s*\}/);
  assert.match(deviceStatusSource, /void loadDeviceStatus\(\{\s*preserveProtectedState: true\s*\}\)/);
  assert.match(deviceStatusSource, /setActionFeedback\(\(current\) => \(preserveProtectedState && current \? current : nextFeedback\)\)/);
});
