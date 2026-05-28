import assert from "node:assert/strict";
import test from "node:test";

import {
  isSharedWatchReadyLine,
  parseSharedWatchStatusLine,
  parseDotEnv,
  resolveDevPorts,
  resolveServerPort,
  stripAnsi
} from "./dev-lib.mjs";

test("parseDotEnv ignores comments and trims quoted values", () => {
  const parsed = parseDotEnv(`
# comment
PORT=3000
HOST="0.0.0.0"
EMPTY=
MQTT_CLIENT_ID='solar-display'
`);

  assert.deepEqual(parsed, {
    PORT: "3000",
    HOST: "0.0.0.0",
    EMPTY: "",
    MQTT_CLIENT_ID: "solar-display"
  });
});

test("resolveServerPort prefers repo .env over inherited PORT", () => {
  assert.equal(
    resolveServerPort({ PORT: "3000" }, { PORT: "3333" }),
    3000
  );
});

test("resolveServerPort falls back to inherited PORT when .env omits it", () => {
  assert.equal(
    resolveServerPort({}, { PORT: "3333" }),
    3333
  );
});

test("resolveDevPorts only frees the web port and leaves the server port guarded", () => {
  assert.deepEqual(
    resolveDevPorts({ PORT: "5173" }, { PORT: "3333" }),
    {
      webPort: 5173,
      serverPort: 5173,
      portsToFree: [5173]
    }
  );

  assert.deepEqual(
    resolveDevPorts({ PORT: "3000" }, { PORT: "3333" }),
    {
      webPort: 5173,
      serverPort: 3000,
      portsToFree: [5173]
    }
  );
});

test("stripAnsi removes terminal color escape sequences", () => {
  assert.equal(
    stripAnsi("\u001B[0m[shared]\u001B[0m 2:05:50 AM - Found 0 errors. Watching for file changes."),
    "[shared] 2:05:50 AM - Found 0 errors. Watching for file changes."
  );
});

test("parseSharedWatchStatusLine extracts the shared watch error count", () => {
  assert.equal(
    parseSharedWatchStatusLine(
      "\u001B[0m[shared]\u001B[0m 2:05:50 AM - Found 0 errors. Watching for file changes."
    ),
    0
  );
  assert.equal(
    parseSharedWatchStatusLine("2:05:50 AM - Found 2 errors. Watching for file changes."),
    2
  );
  assert.equal(
    parseSharedWatchStatusLine("2:05:50 AM - Starting compilation in watch mode..."),
    null
  );
});

test("isSharedWatchReadyLine only accepts the successful shared watch ready message", () => {
  assert.equal(
    isSharedWatchReadyLine("\u001B[0m[shared]\u001B[0m 2:05:50 AM - Found 0 errors. Watching for file changes."),
    true
  );
  assert.equal(
    isSharedWatchReadyLine("2:05:50 AM - Found 1 error. Watching for file changes."),
    false
  );
});
