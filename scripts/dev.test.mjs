import assert from "node:assert/strict";
import test from "node:test";

import { parseDotEnv, resolveDevPorts, resolveServerPort } from "./dev-lib.mjs";

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

test("resolveDevPorts always frees configured web port and deduplicates ports", () => {
  assert.deepEqual(
    resolveDevPorts({ PORT: "5173" }, { PORT: "3333" }),
    {
      webPort: 5173,
      serverPort: 5173,
      portsToFree: [5173]
    }
  );
});
