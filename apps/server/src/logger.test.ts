import assert from "node:assert/strict";
import test from "node:test";

import { createFastifyOptions } from "./app.js";
import { createLoggerOptions } from "./logger.js";

test("createFastifyOptions disables automatic 2xx request access logs", () => {
  assert.equal(createFastifyOptions().disableRequestLogging, true);
});

test("createLoggerOptions uses pino-pretty outside production", () => {
  const originalNodeTestContext = process.env.NODE_TEST_CONTEXT;
  const originalNodeTestWorkerId = process.env.NODE_TEST_WORKER_ID;

  delete process.env.NODE_TEST_CONTEXT;
  delete process.env.NODE_TEST_WORKER_ID;

  try {
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
  } finally {
    if (originalNodeTestContext === undefined) {
      delete process.env.NODE_TEST_CONTEXT;
    } else {
      process.env.NODE_TEST_CONTEXT = originalNodeTestContext;
    }

    if (originalNodeTestWorkerId === undefined) {
      delete process.env.NODE_TEST_WORKER_ID;
    } else {
      process.env.NODE_TEST_WORKER_ID = originalNodeTestWorkerId;
    }
  }
});

test("createLoggerOptions keeps JSON logger in production", () => {
  assert.equal(createLoggerOptions("production"), true);
});

test("createLoggerOptions disables threaded pretty logging in tests", () => {
  assert.equal(createLoggerOptions("test"), false);
});

test("createLoggerOptions disables threaded pretty logging when the test flag is only present in argv", () => {
  const originalArgv = process.argv;
  const originalExecArgv = process.execArgv;

  Object.defineProperty(process, "argv", {
    configurable: true,
    value: [...originalArgv, "--test"]
  });
  Object.defineProperty(process, "execArgv", {
    configurable: true,
    value: []
  });

  try {
    assert.equal(createLoggerOptions("development"), false);
  } finally {
    Object.defineProperty(process, "argv", {
      configurable: true,
      value: originalArgv
    });
    Object.defineProperty(process, "execArgv", {
      configurable: true,
      value: originalExecArgv
    });
  }
});

test("createLoggerOptions disables threaded pretty logging when node:test worker env is present", () => {
  const originalNodeTestContext = process.env.NODE_TEST_CONTEXT;
  const originalNodeTestWorkerId = process.env.NODE_TEST_WORKER_ID;

  process.env.NODE_TEST_CONTEXT = "child-v8";
  process.env.NODE_TEST_WORKER_ID = "1";

  try {
    assert.equal(createLoggerOptions("development"), false);
  } finally {
    if (originalNodeTestContext === undefined) {
      delete process.env.NODE_TEST_CONTEXT;
    } else {
      process.env.NODE_TEST_CONTEXT = originalNodeTestContext;
    }

    if (originalNodeTestWorkerId === undefined) {
      delete process.env.NODE_TEST_WORKER_ID;
    } else {
      process.env.NODE_TEST_WORKER_ID = originalNodeTestWorkerId;
    }
  }
});
