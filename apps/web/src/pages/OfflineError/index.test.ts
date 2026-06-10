import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const offlineErrorSource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");

test("offline error observes mqtt status without starting a second bootstrap loop", () => {
  assert.match(offlineErrorSource, /useMqttStatus\(undefined,\s*\{\s*bootstrap:\s*false,\s*connectSocket:\s*false\s*\}\)/);
  assert.match(offlineErrorSource, /getSocketClient\(\)\.connect\(\)/);
  assert.match(offlineErrorSource, /setRetryCountdown\(RETRY_SECONDS\)/);
  assert.match(offlineErrorSource, /navigate\(returnTo/);
});
