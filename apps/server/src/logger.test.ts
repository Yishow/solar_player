import assert from "node:assert/strict";
import test from "node:test";

import { createLoggerOptions } from "./logger.js";

test("createLoggerOptions uses pino-pretty outside production", () => {
  const logger = createLoggerOptions("development");

  assert.ok(logger && typeof logger !== "boolean");

  const prettyLogger = logger as Exclude<typeof logger, boolean | undefined>;
  const transport = prettyLogger.transport as {
    options?: {
      ignore?: string;
      singleLine?: boolean;
    };
    target?: string;
  };

  assert.equal(transport.target, "pino-pretty");
  assert.equal(transport.options?.ignore, "pid,hostname");
  assert.equal(transport.options?.singleLine, true);
});

test("createLoggerOptions keeps JSON logger in production", () => {
  assert.equal(createLoggerOptions("production"), true);
});

test("createLoggerOptions disables threaded pretty logging in tests", () => {
  assert.equal(createLoggerOptions("test"), false);
});
