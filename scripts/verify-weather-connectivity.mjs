import { lookup } from "node:dns/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { connect as connectTls } from "node:tls";
import { fileURLToPath } from "node:url";

import { readDotEnvFile } from "./dev-lib.mjs";

const DEFAULT_DATASET_URL = "https://opendata.cwa.gov.tw/api/v1/rest/datastore/O-A0001-001";
const DEFAULT_REQUEST_TIMEOUT_MS = 5_000;
const TLS_ERROR_CODES = new Set([
  "CERT_HAS_EXPIRED",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "ERR_TLS_CERT_ALTNAME_INVALID",
  "SELF_SIGNED_CERT_IN_CHAIN",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE"
]);

function result(startedAt, now, options) {
  return {
    exitCode: options.state === "ok" ? 0 : 1,
    output: {
      code: options.code,
      durationMs: Math.max(0, Math.round(now() - startedAt)),
      failedStage: options.failedStage,
      httpStatus: options.httpStatus ?? null,
      safeSummary: options.safeSummary,
      state: options.state
    }
  };
}

function failure(startedAt, now, failedStage, code, safeSummary, httpStatus = null) {
  return result(startedAt, now, {
    code,
    failedStage,
    httpStatus,
    safeSummary,
    state: "error"
  });
}

function readErrorCode(error) {
  let current = error;
  for (let depth = 0; depth < 3 && current && typeof current === "object"; depth += 1) {
    if (typeof current.code === "string") {
      return current.code;
    }
    current = current.cause;
  }
  return null;
}

function isValidConfig(config) {
  if (!config || typeof config !== "object") return false;
  if (typeof config.authorization !== "string" || config.authorization.trim() === "") return false;
  if (!Number.isFinite(config.requestTimeoutMs) || config.requestTimeoutMs <= 0) return false;

  try {
    const datasetUrl = new URL(config.datasetUrl);
    const baseUrl = new URL(config.baseUrl);
    return datasetUrl.protocol === "https:" && ["http:", "https:"].includes(baseUrl.protocol);
  } catch {
    return false;
  }
}

function hasValidDatasetShape(payload) {
  return Boolean(
    payload
    && typeof payload === "object"
    && payload.records
    && typeof payload.records === "object"
    && Array.isArray(payload.records.Station)
  );
}

function transportFailure(error) {
  const code = readErrorCode(error);
  if (code && TLS_ERROR_CODES.has(code)) {
    return {
      code: "WEATHER_TLS_FAILED",
      failedStage: "tls",
      safeSummary: "Weather TLS connection failed"
    };
  }

  return {
    code: "WEATHER_CONNECTION_TIMEOUT",
    failedStage: "connect",
    safeSummary: "Weather connection timed out"
  };
}

function fetchFailure(error) {
  const code = readErrorCode(error);
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
    return {
      code: "WEATHER_DNS_LOOKUP_FAILED",
      failedStage: "dns",
      safeSummary: "Weather hostname lookup failed"
    };
  }
  if (code && TLS_ERROR_CODES.has(code)) {
    return {
      code: "WEATHER_TLS_FAILED",
      failedStage: "tls",
      safeSummary: "Weather TLS connection failed"
    };
  }
  if (code === "ETIMEDOUT") {
    return {
      code: "WEATHER_CONNECTION_TIMEOUT",
      failedStage: "connect",
      safeSummary: "Weather connection timed out"
    };
  }

  return {
    code: "WEATHER_REQUEST_TIMEOUT",
    failedStage: "http",
    safeSummary: "Weather upstream request failed"
  };
}

export async function verifyWeatherConnectivity(dependencies) {
  const startedAt = dependencies.now();
  let config;
  try {
    config = dependencies.loadConfig();
  } catch {
    return failure(
      startedAt,
      dependencies.now,
      "configuration",
      "WEATHER_UNCONFIGURED",
      "Weather configuration is incomplete"
    );
  }

  if (!isValidConfig(config)) {
    return failure(
      startedAt,
      dependencies.now,
      "configuration",
      "WEATHER_UNCONFIGURED",
      "Weather configuration is incomplete"
    );
  }

  const datasetUrl = new URL(config.datasetUrl);
  let address;
  try {
    const resolved = await dependencies.resolveDns(datasetUrl.hostname);
    address = typeof resolved === "string" ? resolved : resolved?.address;
  } catch {
    return failure(
      startedAt,
      dependencies.now,
      "dns",
      "WEATHER_DNS_LOOKUP_FAILED",
      "Weather hostname lookup failed"
    );
  }

  try {
    await dependencies.probeTransport({
      address,
      hostname: datasetUrl.hostname,
      port: Number(datasetUrl.port || 443),
      timeoutMs: config.requestTimeoutMs
    });
  } catch (error) {
    const classified = transportFailure(error);
    return failure(
      startedAt,
      dependencies.now,
      classified.failedStage,
      classified.code,
      classified.safeSummary
    );
  }

  let response;
  try {
    const requestUrl = new URL(config.datasetUrl);
    requestUrl.searchParams.set("Authorization", config.authorization);
    requestUrl.searchParams.set("format", "JSON");
    response = await dependencies.fetchDataset(requestUrl, config.requestTimeoutMs);
  } catch (error) {
    const classified = fetchFailure(error);
    return failure(
      startedAt,
      dependencies.now,
      classified.failedStage,
      classified.code,
      classified.safeSummary
    );
  }

  if (!response.ok) {
    return failure(
      startedAt,
      dependencies.now,
      "http",
      "WEATHER_HTTP_ERROR",
      "Weather upstream returned an HTTP error",
      Number.isInteger(response.status) ? response.status : null
    );
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    return failure(
      startedAt,
      dependencies.now,
      "payload",
      "WEATHER_INVALID_PAYLOAD",
      "Weather upstream returned an invalid payload"
    );
  }

  if (!hasValidDatasetShape(payload)) {
    return failure(
      startedAt,
      dependencies.now,
      "payload",
      "WEATHER_INVALID_PAYLOAD",
      "Weather upstream returned an invalid payload"
    );
  }

  try {
    const application = await dependencies.probeApplication(config);
    if (application?.diagnostic?.state !== "ok" || application?.diagnostic?.source !== "upstream") {
      return failure(
        startedAt,
        dependencies.now,
        "application",
        "WEATHER_APPLICATION_PROBE_FAILED",
        "Weather application refresh did not reach upstream"
      );
    }
  } catch {
    return failure(
      startedAt,
      dependencies.now,
      "application",
      "WEATHER_APPLICATION_PROBE_FAILED",
      "Weather application refresh did not reach upstream"
    );
  }

  return result(startedAt, dependencies.now, {
    code: "WEATHER_OK",
    failedStage: null,
    safeSummary: "Weather connectivity verified",
    state: "ok"
  });
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseBaseUrl(argv) {
  const index = argv.indexOf("--base-url");
  return index === -1 ? "http://127.0.0.1:3000" : argv[index + 1] ?? "";
}

export function resolveInstalledEnvFilePath(env = process.env, moduleUrl = import.meta.url) {
  const explicitPath = env.SOLAR_DISPLAY_ENV_FILE?.trim();
  return explicitPath
    ? resolve(explicitPath)
    : resolve(dirname(fileURLToPath(moduleUrl)), "..", ".env");
}

function loadInstalledConfig(argv, env = process.env) {
  const envPath = resolveInstalledEnvFilePath(env);
  const dotEnv = existsSync(envPath) ? readDotEnvFile(envPath) : {};
  const values = { ...dotEnv, ...env };

  return {
    authorization: values.CWA_AUTHORIZATION?.trim() ?? "",
    baseUrl: parseBaseUrl(argv),
    datasetUrl: values.CWA_OPEN_DATA_URL?.trim() || DEFAULT_DATASET_URL,
    managementAccessToken: values.MANAGEMENT_ACCESS_TOKEN?.trim() || null,
    requestTimeoutMs: parsePositiveInteger(
      values.WEATHER_REQUEST_TIMEOUT_MS,
      DEFAULT_REQUEST_TIMEOUT_MS
    )
  };
}

function probeTls(options) {
  return new Promise((resolveProbe, rejectProbe) => {
    const socket = connectTls({
      host: options.address || options.hostname,
      port: options.port,
      rejectUnauthorized: true,
      servername: options.hostname
    });
    const timeout = setTimeout(() => {
      socket.destroy(Object.assign(new Error("connection timeout"), { code: "ETIMEDOUT" }));
    }, options.timeoutMs);

    socket.once("secureConnect", () => {
      clearTimeout(timeout);
      socket.end();
      resolveProbe();
    });
    socket.once("error", (error) => {
      clearTimeout(timeout);
      rejectProbe(error);
    });
  });
}

async function fetchWithTimeout(url, timeoutMs, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function probeApplication(config) {
  const headers = config.managementAccessToken
    ? { "x-solar-management-token": config.managementAccessToken }
    : undefined;
  const refreshUrl = new URL("/api/weather/refresh", config.baseUrl);
  const diagnosticsUrl = new URL("/api/weather/diagnostics", config.baseUrl);
  const refreshResponse = await fetchWithTimeout(refreshUrl, config.requestTimeoutMs, {
    headers,
    method: "POST"
  });
  if (!refreshResponse.ok) return null;

  const diagnosticsResponse = await fetchWithTimeout(
    diagnosticsUrl,
    config.requestTimeoutMs,
    { headers }
  );
  if (!diagnosticsResponse.ok) return null;
  return diagnosticsResponse.json();
}

function createRuntimeDependencies(argv) {
  return {
    fetchDataset: fetchWithTimeout,
    loadConfig: () => loadInstalledConfig(argv),
    now: () => Date.now(),
    probeApplication,
    probeTransport: probeTls,
    resolveDns: (hostname) => lookup(hostname)
  };
}

async function main() {
  const verification = await verifyWeatherConnectivity(createRuntimeDependencies(process.argv.slice(2)));
  process.stdout.write(`${JSON.stringify(verification.output)}\n`);
  process.exitCode = verification.exitCode;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await main();
}
