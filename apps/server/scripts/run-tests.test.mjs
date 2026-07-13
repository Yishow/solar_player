import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  buildTestRunnerArgs,
  discoverServerTests,
  resolveTestRunnerCommand,
  resolveTestTargets,
  runTests
} from "./run-tests.mjs";

const TOP_LEVEL_REQUIRED = [
  "src/config.test.ts",
  "src/env.test.ts",
  "src/logger.test.ts",
  "src/server-startup.test.ts",
  "src/serverRuntimeGuard.test.ts"
];

function makeTempTree(structure) {
  const root = mkdtempSync(join(tmpdir(), "server-run-tests-"));
  for (const [rel, content] of Object.entries(structure)) {
    const full = join(root, rel);
    mkdirSync(join(full, ".."), { recursive: true });
    if (content === null) {
      mkdirSync(full, { recursive: true });
    } else {
      writeFileSync(full, content ?? "");
    }
  }
  return root;
}

test("Server test discovery includes top-level and nested tests", () => {
  const pkgRoot = makeTempTree({
    "src/config.test.ts": "export {};",
    "src/env.test.ts": "export {};",
    "src/logger.test.ts": "export {};",
    "src/server-startup.test.ts": "export {};",
    "src/serverRuntimeGuard.test.ts": "export {};",
    "src/routes/images.test.ts": "export {};",
    "src/services/weatherService.test.ts": "export {};",
    "src/db/migrations/topicDisplayNames.test.ts": "export {};",
    "src/not-a-test.ts": "export {};"
  });

  try {
    const discovered = discoverServerTests(join(pkgRoot, "src"), pkgRoot);
    for (const required of TOP_LEVEL_REQUIRED) {
      assert.ok(
        discovered.includes(required),
        `expected ${required} in discovery, got ${JSON.stringify(discovered)}`
      );
    }
    assert.ok(discovered.includes("src/routes/images.test.ts"));
    assert.ok(discovered.includes("src/services/weatherService.test.ts"));
    assert.ok(discovered.includes("src/db/migrations/topicDisplayNames.test.ts"));
    assert.ok(!discovered.includes("src/not-a-test.ts"));

    // Lexical sort
    const sorted = [...discovered].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    assert.deepEqual(discovered, sorted);
  } finally {
    rmSync(pkgRoot, { recursive: true, force: true });
  }
});

test("discoverServerTests returns empty list for empty src tree", () => {
  const pkgRoot = makeTempTree({ "src/.keep": "" });
  try {
    const discovered = discoverServerTests(join(pkgRoot, "src"), pkgRoot);
    assert.deepEqual(discovered, []);
  } finally {
    rmSync(pkgRoot, { recursive: true, force: true });
  }
});

test("discoverServerTests fails closed when src root is missing", () => {
  assert.throws(
    () => discoverServerTests(join(tmpdir(), "no-such-server-src-" + Date.now())),
    /Server test discovery failed/
  );
});

test("explicit argv targets skip full discovery", () => {
  let discoverCalls = 0;
  const { targets, source } = resolveTestTargets({
    argv: ["node", "run-tests.mjs", "src/config.test.ts", "src/env.test.ts"],
    discover() {
      discoverCalls += 1;
      return ["src/should-not-appear.test.ts"];
    }
  });
  assert.equal(source, "explicit");
  assert.deepEqual(targets, ["src/config.test.ts", "src/env.test.ts"]);
  assert.equal(discoverCalls, 0);
});

test("test runner wraps tsx through cmd.exe only on Windows and keeps concurrency one", () => {
  const testTargets = ["src/config.test.ts", "src/routes/images.test.ts"];

  assert.equal(resolveTestRunnerCommand("win32"), "cmd.exe");
  assert.deepEqual(buildTestRunnerArgs(testTargets, "win32"), [
    "/d",
    "/s",
    "/c",
    "tsx",
    "--test",
    "--test-concurrency=1",
    "--test-force-exit",
    ...testTargets
  ]);

  assert.equal(resolveTestRunnerCommand("darwin"), "tsx");
  assert.deepEqual(buildTestRunnerArgs(testTargets, "darwin"), [
    "--test",
    "--test-concurrency=1",
    "--test-force-exit",
    ...testTargets
  ]);
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
  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, "tsx");
  assert.deepEqual(calls[0].args, [
    "--test",
    "--test-concurrency=1",
    "--test-force-exit",
    "src/example.test.ts"
  ]);
  assert.equal(calls[0].options.stdio, "inherit");
});

test("Verification failures propagate to the caller", () => {
  // Child nonzero status
  assert.equal(
    runTests({
      argv: ["node", "run-tests.mjs", "src/failing.test.ts"],
      platform: "linux",
      runCommand() {
        return { status: 1 };
      }
    }),
    1
  );

  // Spawn error
  assert.equal(
    runTests({
      argv: ["node", "run-tests.mjs", "src/failing.test.ts"],
      platform: "linux",
      runCommand() {
        return { error: new Error("spawn failed"), status: null };
      }
    }),
    1
  );

  // Signal termination
  assert.equal(
    runTests({
      argv: ["node", "run-tests.mjs", "src/failing.test.ts"],
      platform: "linux",
      runCommand() {
        return { status: null, signal: "SIGTERM" };
      }
    }),
    1
  );

  // Empty discovery
  assert.equal(
    runTests({
      argv: ["node", "run-tests.mjs"],
      platform: "linux",
      discover: () => [],
      runCommand() {
        throw new Error("should not spawn when discovery is empty");
      }
    }),
    1
  );

  // Discovery throw
  assert.equal(
    runTests({
      argv: ["node", "run-tests.mjs"],
      platform: "linux",
      discover: () => {
        throw new Error("cannot read");
      },
      runCommand() {
        throw new Error("should not spawn when discovery throws");
      }
    }),
    1
  );
});

test("live package discovery includes required top-level server tests", () => {
  const packageRoot = join(import.meta.dirname, "..");
  const discovered = discoverServerTests(join(packageRoot, "src"), packageRoot);
  for (const required of TOP_LEVEL_REQUIRED) {
    assert.ok(
      discovered.includes(required),
      `live discovery missing ${required}: ${discovered.join(", ")}`
    );
  }
  assert.ok(discovered.length >= 60, `expected many server tests, got ${discovered.length}`);
  const sorted = [...discovered].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  assert.deepEqual(discovered, sorted);
});
