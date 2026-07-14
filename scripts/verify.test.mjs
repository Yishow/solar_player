import assert from "node:assert/strict";
import test from "node:test";

import { VERIFY_STAGES, runVerifyStages } from "./verify.mjs";

test("root verify stages are build → bundle-budget → server → web → deploy → server-runner", () => {
  assert.deepEqual(
    VERIFY_STAGES.map((s) => s.label),
    ["build", "bundle-budget", "server", "web", "deploy", "server-runner"]
  );
});

test("Verification failures propagate to the caller with original stage label", () => {
  const logs = [];
  const calls = [];

  // Top-level server stage failure must stop and keep the label.
  const serverFail = runVerifyStages({
    stages: [
      { label: "build", command: "true", args: [] },
      { label: "server", command: "false", args: [] },
      { label: "web", command: "true", args: [] },
      { label: "deploy", command: "true", args: [] },
      { label: "server-runner", command: "true", args: [] }
    ],
    runCommand(command, args, options) {
      calls.push({ command, args, options });
      if (command === "false") {
        return { status: 1 };
      }
      return { status: 0 };
    },
    log: (line) => logs.push(String(line))
  });

  assert.equal(serverFail.status, 1);
  assert.equal(serverFail.failedStage, "server");
  assert.ok(logs.some((l) => l.includes("stage failed: server")));
  // Later stages must not run after failure.
  assert.equal(
    calls.filter((c) => c.command === "true" || c.command === "false").length,
    2,
    "only build + server should have been invoked"
  );

  // Deploy stage failure must identify deploy and not be replaced by later stages.
  const deployLogs = [];
  const deployCalls = [];
  const deployFail = runVerifyStages({
    stages: VERIFY_STAGES.map((s) => ({
      label: s.label,
      command: s.label,
      args: []
    })),
    runCommand(command) {
      deployCalls.push(command);
      if (command === "deploy") {
        return { status: 3 };
      }
      return { status: 0 };
    },
    log: (line) => deployLogs.push(String(line))
  });

  assert.equal(deployFail.status, 3);
  assert.equal(deployFail.failedStage, "deploy");
  assert.ok(deployLogs.some((l) => l.includes("stage failed: deploy")));
  assert.ok(!deployCalls.includes("server-runner"));
  assert.ok(!deployCalls.includes("web") || deployCalls.indexOf("web") < deployCalls.indexOf("deploy"));
});
