import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTestRunnerArgs,
  resolveTestRunnerCommand,
  runTests
} from "./run-tests.mjs";

test("test runner wraps tsx through cmd.exe only on Windows", () => {
  const testTargets = ["src/pages/MqttSettings/loadModel.test.ts"];

  assert.equal(resolveTestRunnerCommand("win32"), "cmd.exe");
  assert.deepEqual(buildTestRunnerArgs(testTargets, "win32"), [
    "/d",
    "/s",
    "/c",
    "tsx",
    "--test",
    ...testTargets
  ]);

  assert.equal(resolveTestRunnerCommand("darwin"), "tsx");
  assert.deepEqual(buildTestRunnerArgs(testTargets, "darwin"), ["--test", ...testTargets]);
});

test("runTests returns the child status code", () => {
  const calls = [];
  const status = runTests({
    argv: ["node", "run-tests.mjs", "src/example.test.ts"],
    platform: "linux",
    runCommand(command, args, options) {
      calls.push({ command, args, options });
      return { status: 7 };
    }
  });

  assert.equal(status, 7);
  assert.deepEqual(calls, [
    {
      command: "tsx",
      args: ["--test", "src/example.test.ts"],
      options: { stdio: "inherit" }
    }
  ]);
});
