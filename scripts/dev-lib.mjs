import { readFileSync } from "node:fs";

const DEFAULT_WEB_PORT = 5173;
const DEFAULT_SERVER_PORT = 3000;

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

export function resolveDevPorts(dotEnv, inheritedEnv = process.env) {
  const serverPort = resolveServerPort(dotEnv, inheritedEnv);

  return {
    webPort: DEFAULT_WEB_PORT,
    serverPort,
    portsToFree: [...new Set([DEFAULT_WEB_PORT, serverPort])]
  };
}
