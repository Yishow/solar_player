import assert from "node:assert/strict";
import test from "node:test";

import { resolveEnvFilePath } from "./env.js";

test("resolveEnvFilePath maps src entrypoint to workspace .env", () => {
    assert.equal(
        resolveEnvFilePath("file:///opt/solar-display/apps/server/src/server.ts"),
        "/opt/solar-display/.env"
    );
});

test("resolveEnvFilePath maps dist entrypoint to workspace .env", () => {
    assert.equal(
        resolveEnvFilePath("file:///opt/solar-display/apps/server/dist/server.js"),
        "/opt/solar-display/.env"
    );
});