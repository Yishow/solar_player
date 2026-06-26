import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import { resolve } from "node:path";

import {
  buildPnpmSpawnArgs,
  isSharedWatchReadyLine,
  listPidsOnPort,
  parseSharedWatchStatusLine,
  readDotEnvFile,
  resolveDevBackendHost,
  resolveDevPorts,
  resolvePnpmCommand,
  signalPids
} from "./dev-lib.mjs";

const SHARED_READY_TIMEOUT_MS = 30_000;
const SERVER_READY_TIMEOUT_MS = 30_000;
const SERVER_READY_POLL_INTERVAL_MS = 200;

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

function assertPortAvailable(port) {
  const pids = listPidsOnPort(port);

  if (pids.length === 0) {
    return;
  }

  throw new Error(
    `[dev] tcp:${port} is already in use by pid ${pids.join(", ")}. Stop the existing backend before running pnpm dev.`
  );
}

function buildServerArgs() {
  return ["--filter", "@solar-display/server", "dev"];
}

function buildWebArgs() {
  return ["--filter", "@solar-display/web", "dev"];
}

function prefixOutput(stream, label, writer, onLine) {
  if (!stream) {
    return;
  }

  let buffered = "";
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    const text = buffered + chunk;
    const lines = text.split(/\r?\n/u);
    buffered = lines.pop() ?? "";

    for (const line of lines) {
      writer(`[${label}] ${line}\n`);
      onLine?.(line);
    }
  });
  stream.on("end", () => {
    if (!buffered) {
      return;
    }

    writer(`[${label}] ${buffered}\n`);
    onLine?.(buffered);
    buffered = "";
  });
}

function terminateChild(child, signal = "SIGTERM") {
  if (!child || child.killed || child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  if (process.platform === "win32" && child.pid) {
    try {
      signalPids([String(child.pid)], signal);
      return;
    } catch {
      // Fall back to Node's direct process kill when taskkill cannot inspect the process tree.
    }
  }

  child.kill(signal);
}

async function startSharedWatcher(projectRoot) {
  const child = spawn(
    resolvePnpmCommand(),
    buildPnpmSpawnArgs(["--filter", "@solar-display/shared", "dev"]),
    {
      cwd: projectRoot,
      env: process.env,
      stdio: ["inherit", "pipe", "pipe"]
    }
  );

  return await new Promise((resolvePromise, rejectPromise) => {
    let ready = false;
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      terminateChild(child, "SIGTERM");
      rejectPromise(new Error("Timed out waiting for shared watch to finish its initial compilation."));
    }, SHARED_READY_TIMEOUT_MS);

    const markReady = (line) => {
      if (settled) {
        return;
      }

      const errorCount = parseSharedWatchStatusLine(line);

      if (errorCount === null) {
        return;
      }

      if (!isSharedWatchReadyLine(line)) {
        settled = true;
        clearTimeout(timeout);
        terminateChild(child, "SIGTERM");
        rejectPromise(
          new Error(
            `Shared watcher reported ${errorCount} error${errorCount === 1 ? "" : "s"} during initial compilation.`
          )
        );
        return;
      }

      ready = true;
      settled = true;
      clearTimeout(timeout);
      resolvePromise(child);
    };

    prefixOutput(child.stdout, "shared", process.stdout.write.bind(process.stdout), markReady);
    prefixOutput(child.stderr, "shared", process.stderr.write.bind(process.stderr), markReady);

    child.on("exit", (code, signal) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      rejectPromise(
        new Error(
          signal
            ? `Shared watcher exited before becoming ready (${signal}).`
            : `Shared watcher exited before becoming ready (code ${code ?? 0}).`
        )
      );
    });
  });
}

function startLabeledProcess(command, args, { cwd, env, label }) {
  const child = spawn(command, args, {
    cwd,
    env,
    stdio: ["inherit", "pipe", "pipe"]
  });

  prefixOutput(child.stdout, label, process.stdout.write.bind(process.stdout));
  prefixOutput(child.stderr, label, process.stderr.write.bind(process.stderr));

  return child;
}

function isPortOpen(port, host = resolveDevBackendHost()) {
  return new Promise((resolvePromise) => {
    const socket = net.createConnection({ host, port });

    const settle = (isOpen) => {
      socket.removeAllListeners();
      socket.destroy();
      resolvePromise(isOpen);
    };

    socket.once("connect", () => settle(true));
    socket.once("error", () => settle(false));
  });
}

async function waitForPortOpen(port, timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isPortOpen(port)) {
      return;
    }

    await new Promise((resolvePromise) => {
      setTimeout(resolvePromise, SERVER_READY_POLL_INTERVAL_MS);
    });
  }

  throw new Error(`Timed out waiting for server port ${port} to accept connections.`);
}

async function startServer(projectRoot, serverPort) {
  const child = startLabeledProcess(resolvePnpmCommand(), buildPnpmSpawnArgs(buildServerArgs()), {
    cwd: projectRoot,
    env: {
      ...process.env,
      PORT: String(serverPort)
    },
    label: "server"
  });

  await new Promise((resolvePromise, rejectPromise) => {
    const onExit = (code, signal) => {
      rejectPromise(
        new Error(
          signal
            ? `Server exited before becoming ready (${signal}).`
            : `Server exited before becoming ready (code ${code ?? 0}).`
        )
      );
    };

    child.once("exit", onExit);

    waitForPortOpen(serverPort, SERVER_READY_TIMEOUT_MS)
      .then(() => {
        child.off("exit", onExit);
        resolvePromise();
      })
      .catch((error) => {
        child.off("exit", onExit);
        rejectPromise(error);
      });
  });

  return child;
}

async function main() {
  const projectRoot = process.cwd();
  const dotEnvPath = resolve(projectRoot, ".env");
  const dotEnv = existsSync(dotEnvPath) ? readDotEnvFile(dotEnvPath) : {};
  const { portsToFree, serverPort, webPort } = resolveDevPorts(dotEnv, process.env);

  for (const port of portsToFree) {
    freePort(port);
  }

  assertPortAvailable(serverPort);

  let sharedWatcher = null;
  let serverProcess = null;
  let webProcess = null;
  let shuttingDown = false;

  const shutdown = (signal = "SIGTERM") => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    terminateChild(webProcess, signal);
    terminateChild(serverProcess, signal);
    terminateChild(sharedWatcher, signal);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  try {
    sharedWatcher = await startSharedWatcher(projectRoot);
    console.log("[dev] shared watch ready; starting server");
    serverProcess = await startServer(projectRoot, serverPort);
    console.log(`[dev] server ready on tcp:${serverPort}; starting web`);
    webProcess = startLabeledProcess(resolvePnpmCommand(), buildPnpmSpawnArgs(buildWebArgs()), {
      cwd: projectRoot,
      env: {
        ...process.env,
        VITE_PORT: String(webPort)
      },
      label: "web"
    });

    sharedWatcher.on("exit", (code, signal) => {
      if (shuttingDown) {
        return;
      }

      shutdown();
      process.exitCode = code ?? (signal ? 1 : 0);
    });

    const handleChildExit = (code, signal) => {
      if (!shuttingDown) {
        shutdown();
      }

      if (signal) {
        process.kill(process.pid, signal);
        return;
      }

      process.exit(code ?? 0);
    };

    serverProcess.on("exit", handleChildExit);
    webProcess.on("exit", handleChildExit);
  } catch (error) {
    shutdown();
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

void main();
