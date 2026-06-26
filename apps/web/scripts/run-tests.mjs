import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export function resolveTestRunnerCommand(platform = process.platform) {
  return platform === "win32" ? "cmd.exe" : "tsx";
}

export function buildTestRunnerArgs(testTargets, platform = process.platform) {
  const tsxArgs = ["--test", ...(testTargets.length > 0 ? testTargets : ["src/**/*.test.ts"])];

  return platform === "win32" ? ["/d", "/s", "/c", "tsx", ...tsxArgs] : tsxArgs;
}

export function runTests({
  argv = process.argv,
  platform = process.platform,
  runCommand = spawnSync
} = {}) {
  const testTargets = argv.slice(2);
  const command = resolveTestRunnerCommand(platform);
  const args = buildTestRunnerArgs(testTargets, platform);
  const result = runCommand(command, args, {
    stdio: "inherit"
  });

  if (result.error) {
    throw result.error;
  }

  return result.status ?? 1;
}

const entryFile = process.argv[1];

if (entryFile && import.meta.url === pathToFileURL(resolve(entryFile)).href) {
  process.exit(runTests());
}
