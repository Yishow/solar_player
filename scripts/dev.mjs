import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { readDotEnvFile, resolveDevPorts } from "./dev-lib.mjs";

function listPidsOnPort(port) {
  const result = spawnSync("lsof", ["-ti", `tcp:${port}`], {
    encoding: "utf8"
  });

  if (result.status !== 0 && result.status !== 1) {
    throw new Error(result.stderr.trim() || `Failed to inspect port ${port}`);
  }

  return result.stdout
    .split(/\s+/u)
    .map((value) => value.trim())
    .filter(Boolean);
}

function signalPids(pids, signal) {
  if (pids.length === 0) {
    return;
  }

  const result = spawnSync("kill", [`-${signal}`, ...pids], {
    encoding: "utf8"
  });

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `Failed to send ${signal}`);
  }
}

function wait(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function freePort(port) {
  const pids = listPidsOnPort(port);

  if (pids.length === 0) {
    return;
  }

  console.log(`[dev] freeing tcp:${port} from pid ${pids.join(", ")}`);
  signalPids(pids, "TERM");
  wait(500);

  const remainingPids = listPidsOnPort(port);

  if (remainingPids.length > 0) {
    console.log(`[dev] force killing tcp:${port} from pid ${remainingPids.join(", ")}`);
    signalPids(remainingPids, "KILL");
  }
}

function buildCommands(serverPort) {
  return [
    "pnpm --filter @solar-display/web dev",
    `PORT=${serverPort} pnpm --filter @solar-display/server dev`
  ];
}

const projectRoot = process.cwd();
const dotEnvPath = resolve(projectRoot, ".env");
const dotEnv = existsSync(dotEnvPath) ? readDotEnvFile(dotEnvPath) : {};
const { portsToFree, serverPort } = resolveDevPorts(dotEnv, process.env);

for (const port of portsToFree) {
  freePort(port);
}

const commands = buildCommands(serverPort);

const child = spawn(
  "pnpm",
  ["exec", "concurrently", "-k", "-n", "web,server", ...commands],
  {
    cwd: projectRoot,
    stdio: "inherit",
    env: process.env
  }
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
