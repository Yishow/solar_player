import { spawnSync } from "node:child_process";

const testTargets = process.argv.slice(2);
const args = ["--test", ...(testTargets.length > 0 ? testTargets : ["src/**/*.test.ts"])];
const command = process.platform === "win32" ? "tsx.cmd" : "tsx";

const result = spawnSync(command, args, {
  stdio: "inherit"
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);