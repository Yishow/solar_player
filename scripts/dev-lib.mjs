import { readFileSync } from "node:fs";

const DEFAULT_WEB_PORT = 5173;
const DEFAULT_SERVER_PORT = 3000;
const sharedWatchStatusPattern = /Found (?<count>\d+) errors?\. Watching for file changes\./u;

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
    portsToFree: [webPort]
  };
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
