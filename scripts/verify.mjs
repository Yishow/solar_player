import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

/** Fixed stage order and labels for root verification. */
export const VERIFY_STAGES = [
  {
    label: "build",
    command: "pnpm",
    args: ["run", "build"],
    shell: false
  },
  {
    label: "bundle-budget",
    command: "node",
    args: ["scripts/check-web-bundle-budget.mjs"],
    shell: false
  },
  {
    label: "server",
    command: "pnpm",
    args: ["--filter", "@solar-display/server", "test"],
    shell: false
  },
  {
    label: "web",
    command: "pnpm",
    args: ["--filter", "@solar-display/web", "test"],
    shell: false
  },
  {
    label: "deploy",
    command: "node",
    args: ["--test", "scripts/deploy.test.mjs"],
    shell: false
  },
  {
    label: "server-runner",
    command: "node",
    args: [
      "--test",
      "apps/server/scripts/run-tests.test.mjs",
      "scripts/verify.test.mjs"
    ],
    shell: false
  }
];

export function runVerifyStages({
  stages = VERIFY_STAGES,
  runCommand = spawnSync,
  cwd = repoRoot,
  log = console.log
} = {}) {
  for (const stage of stages) {
    log(`[verify] stage: ${stage.label}`);
    const result = runCommand(stage.command, stage.args, {
      stdio: "inherit",
      cwd,
      shell: stage.shell ?? false,
      env: process.env
    });

    if (result.error) {
      log(`[verify] stage failed: ${stage.label} (spawn error: ${result.error.message})`);
      return { status: 1, failedStage: stage.label, reason: "spawn-error" };
    }

    if (result.signal) {
      log(`[verify] stage failed: ${stage.label} (signal: ${result.signal})`);
      return { status: 1, failedStage: stage.label, reason: "signal" };
    }

    const status = result.status ?? 1;
    if (status !== 0) {
      log(`[verify] stage failed: ${stage.label} (exit ${status})`);
      return { status, failedStage: stage.label, reason: "nonzero" };
    }

    log(`[verify] stage passed: ${stage.label}`);
  }

  log("[verify] all stages passed");
  return { status: 0, failedStage: null, reason: null };
}

const entryFile = process.argv[1];

if (entryFile && import.meta.url === pathToFileURL(resolve(entryFile)).href) {
  const outcome = runVerifyStages();
  process.exit(outcome.status);
}
