import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const DEFAULT_WEB_PORT = 5173;
const DEFAULT_SERVER_PORT = 3000;
const DEFAULT_DEV_BACKEND_HOST = "localhost";
const sharedWatchStatusPattern = /Found (?<count>\d+) errors?\. Watching for file changes\./u;

function commandFailureMessage(result, fallback) {
  const stderr = result.stderr == null ? "" : String(result.stderr).trim();
  const errorMessage = result.error == null ? "" : String(result.error.message ?? result.error).trim();

  return stderr || errorMessage || fallback;
}

function parseWindowsNetstatPids(output, port) {
  const requestedPortSuffix = `:${port}`;
  const pids = new Set();

  for (const rawLine of output.split(/\r?\n/u)) {
    const parts = rawLine.trim().split(/\s+/u);

    if (parts.length < 5) {
      continue;
    }

    const [protocol, localAddress, , state, pid] = parts;

    if (
      protocol?.toUpperCase() !== "TCP" ||
      state?.toUpperCase() !== "LISTENING" ||
      !localAddress?.endsWith(requestedPortSuffix) ||
      !/^\d+$/u.test(pid)
    ) {
      continue;
    }

    pids.add(pid);
  }

  return Array.from(pids);
}

function parseInteger(value) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function parseDotEnv(content) {
  const result = {};

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

export function readDotEnvFile(filePath) {
  return parseDotEnv(readFileSync(filePath, "utf8"));
}

export function resolveServerPort(dotEnv, inheritedEnv) {
  return (
    parseInteger(dotEnv.PORT) ??
    parseInteger(inheritedEnv.PORT) ??
    DEFAULT_SERVER_PORT
  );
}

export function resolveWebPort(dotEnv, inheritedEnv) {
  return (
    parseInteger(dotEnv.VITE_PORT) ??
    parseInteger(inheritedEnv.VITE_PORT) ??
    DEFAULT_WEB_PORT
  );
}

export function resolveDevPorts(dotEnv, inheritedEnv = process.env) {
  const serverPort = resolveServerPort(dotEnv, inheritedEnv);
  const configuredWebPort = parseInteger(dotEnv.VITE_PORT) ?? parseInteger(inheritedEnv.VITE_PORT);

  if (configuredWebPort === serverPort) {
    throw new Error(
      `[dev] VITE_PORT (${configuredWebPort}) must differ from backend PORT (${serverPort}).`
    );
  }

  const webPort = configuredWebPort ?? (serverPort === DEFAULT_WEB_PORT ? DEFAULT_WEB_PORT + 1 : DEFAULT_WEB_PORT);

  return {
    webPort,
    serverPort,
    portsToFree: Array.from(new Set([webPort, serverPort]))
  };
}

export function resolvePnpmCommand(platform = process.platform) {
  return platform === "win32" ? "cmd.exe" : "pnpm";
}

export function resolveDevBackendHost() {
  return DEFAULT_DEV_BACKEND_HOST;
}

export function buildPnpmSpawnArgs(args, platform = process.platform) {
  return platform === "win32" ? ["/d", "/s", "/c", "pnpm", ...args] : args;
}

export function listPidsOnPort(port, { platform = process.platform, runCommand = spawnSync } = {}) {
  if (platform === "win32") {
    const result = runCommand("netstat", ["-ano", "-p", "tcp"], {
      encoding: "utf8"
    });

    if (result.error || result.status !== 0) {
      throw new Error(commandFailureMessage(result, `Failed to inspect port ${port}`));
    }

    return parseWindowsNetstatPids(result.stdout ?? "", port);
  }

  const result = runCommand("lsof", ["-ti", `tcp:${port}`], {
    encoding: "utf8"
  });

  if (result.error || (result.status !== 0 && result.status !== 1)) {
    throw new Error(commandFailureMessage(result, `Failed to inspect port ${port}`));
  }

  return (result.stdout ?? "")
    .split(/\s+/u)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function signalPids(pids, signal, { platform = process.platform, runCommand = spawnSync } = {}) {
  if (pids.length === 0) {
    return;
  }

  const normalizedSignal = signal.toUpperCase().replace(/^SIG/u, "");
  const command = platform === "win32" ? "taskkill" : "kill";
  const args =
    platform === "win32"
      ? [
          ...pids.flatMap((pid) => ["/PID", pid]),
          "/T",
          "/F"
        ]
      : [`-${normalizedSignal}`, ...pids];
  const result = runCommand(command, args, {
    encoding: "utf8"
  });

  if (result.error || result.status !== 0) {
    throw new Error(commandFailureMessage(result, `Failed to send ${signal}`));
  }
}

export function stripAnsi(value) {
  return value.replace(/\u001B\[[0-9;]*m/gu, "");
}

export function parseSharedWatchStatusLine(value) {
  const matched = sharedWatchStatusPattern.exec(stripAnsi(value));

  if (!matched?.groups?.count) {
    return null;
  }

  return Number.parseInt(matched.groups.count, 10);
}

export function isSharedWatchReadyLine(value) {
  return parseSharedWatchStatusLine(value) === 0;
}
