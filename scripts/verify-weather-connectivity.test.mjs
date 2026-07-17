import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import * as verifierModule from "./verify-weather-connectivity.mjs";
import { verifyWeatherConnectivity } from "./verify-weather-connectivity.mjs";

const safeConfig = {
  authorization: "secret-authorization",
  baseUrl: "http://127.0.0.1:3000",
  datasetUrl: "https://secret-weather-host.example/dataset",
  requestTimeoutMs: 1_000
};

const validDataset = {
  records: {
    Station: []
  }
};

test("verifier resolves the installed env independently of the working directory", () => {
  const expectedDefault = resolve(dirname(fileURLToPath(import.meta.url)), "..", ".env");
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "solar-weather-verifier-env-"));
  const explicitEnvPath = join(temporaryDirectory, "installed.env");
  const previousWorkingDirectory = process.cwd();

  try {
    process.chdir(temporaryDirectory);
    assert.equal(verifierModule.resolveInstalledEnvFilePath({}), expectedDefault);
    assert.equal(
      verifierModule.resolveInstalledEnvFilePath({
        SOLAR_DISPLAY_ENV_FILE: explicitEnvPath
      }),
      explicitEnvPath
    );
  } finally {
    process.chdir(previousWorkingDirectory);
    rmSync(temporaryDirectory, { force: true, recursive: true });
  }
});

function createDependencies(overrides = {}) {
  return {
    fetchDataset: async () => ({
      json: async () => validDataset,
      ok: true,
      status: 200
    }),
    loadConfig: () => safeConfig,
    now: () => 100,
    probeApplication: async () => ({
      diagnostic: {
        source: "upstream",
        state: "ok"
      }
    }),
    probeTransport: async () => {},
    resolveDns: async () => {},
    ...overrides
  };
}

function assertBoundedResult(result, expected) {
  assert.equal(result.exitCode, expected.exitCode);
  assert.deepEqual(result.output, {
    code: expected.code,
    durationMs: 25,
    failedStage: expected.failedStage,
    httpStatus: expected.httpStatus ?? null,
    safeSummary: expected.safeSummary,
    state: expected.state
  });

  const serialized = JSON.stringify(result.output);
  assert.doesNotMatch(
    serialized,
    /secret-authorization|secret-weather-host|https?:\/\/|proxy|credential|certificate|stack|raw exception/i
  );
  assert.ok(serialized.length <= 512);
}

test("Verify weather connectivity through the application transport path", async (t) => {
  await t.test("reports a successful application refresh", async () => {
    const result = await verifyWeatherConnectivity(createDependencies({
      now: (() => {
        const values = [100, 125];
        return () => values.shift() ?? 125;
      })()
    }));

    assertBoundedResult(result, {
      code: "WEATHER_OK",
      exitCode: 0,
      failedStage: null,
      safeSummary: "Weather connectivity verified",
      state: "ok"
    });
  });

  const failures = [
    {
      code: "WEATHER_UNCONFIGURED",
      dependencies: {
        loadConfig: () => ({ ...safeConfig, authorization: "" })
      },
      failedStage: "configuration",
      safeSummary: "Weather configuration is incomplete"
    },
    {
      code: "WEATHER_UNCONFIGURED",
      dependencies: {
        loadConfig: () => {
          throw new Error("raw exception reading secret-weather-host.example/.env");
        }
      },
      failedStage: "configuration",
      safeSummary: "Weather configuration is incomplete"
    },
    {
      code: "WEATHER_DNS_LOOKUP_FAILED",
      dependencies: {
        resolveDns: async () => {
          throw Object.assign(new Error("getaddrinfo secret-weather-host.example"), { code: "ENOTFOUND" });
        }
      },
      failedStage: "dns",
      safeSummary: "Weather hostname lookup failed"
    },
    {
      code: "WEATHER_CONNECTION_TIMEOUT",
      dependencies: {
        probeTransport: async () => {
          throw Object.assign(new Error("connect 10.0.0.7:443"), { code: "ETIMEDOUT" });
        }
      },
      failedStage: "connect",
      safeSummary: "Weather connection timed out"
    },
    {
      code: "WEATHER_TLS_FAILED",
      dependencies: {
        probeTransport: async () => {
          throw Object.assign(new Error("certificate has expired"), { code: "CERT_HAS_EXPIRED" });
        }
      },
      failedStage: "tls",
      safeSummary: "Weather TLS connection failed"
    },
    {
      code: "WEATHER_HTTP_ERROR",
      dependencies: {
        fetchDataset: async () => ({
          json: async () => ({}),
          ok: false,
          status: 503
        })
      },
      failedStage: "http",
      httpStatus: 503,
      safeSummary: "Weather upstream returned an HTTP error"
    },
    {
      code: "WEATHER_INVALID_PAYLOAD",
      dependencies: {
        fetchDataset: async () => ({
          json: async () => ({ success: "false", secret: "secret-authorization" }),
          ok: true,
          status: 200
        })
      },
      failedStage: "payload",
      safeSummary: "Weather upstream returned an invalid payload"
    },
    {
      code: "WEATHER_APPLICATION_PROBE_FAILED",
      dependencies: {
        probeApplication: async () => ({
          diagnostic: {
            code: "WEATHER_REQUEST_TIMEOUT",
            safeSummary: "raw exception at secret-weather-host.example",
            source: "stale",
            state: "error"
          }
        })
      },
      failedStage: "application",
      safeSummary: "Weather application refresh did not reach upstream"
    }
  ];

  for (const scenario of failures) {
    await t.test(`reports ${scenario.failedStage} failure as bounded JSON`, async () => {
      const result = await verifyWeatherConnectivity(createDependencies({
        ...scenario.dependencies,
        now: (() => {
          const values = [100, 125];
          return () => values.shift() ?? 125;
        })()
      }));

      assertBoundedResult(result, {
        ...scenario,
        exitCode: 1,
        state: "error"
      });
    });
  }
});

test("application probe performs a trusted manual refresh before reading diagnostics", async (t) => {
  assert.equal(typeof verifierModule.probeApplication, "function");

  const requests = [];
  const server = createServer((request, response) => {
    requests.push({
      managementToken: request.headers["x-solar-management-token"],
      method: request.method,
      url: request.url
    });
    response.setHeader("content-type", "application/json");
    response.end(request.url === "/api/weather/diagnostics"
      ? JSON.stringify({ diagnostic: { source: "upstream", state: "ok" } })
      : JSON.stringify({ current: { fetchState: "fresh" } }));
  });
  await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  t.after(() => server.close());

  const address = server.address();
  assert.ok(address && typeof address === "object");
  const response = await verifierModule.probeApplication({
    baseUrl: `http://127.0.0.1:${address.port}`,
    managementAccessToken: "secret-management-token",
    requestTimeoutMs: 1_000
  });

  assert.deepEqual(response, { diagnostic: { source: "upstream", state: "ok" } });
  assert.deepEqual(requests, [
    {
      managementToken: "secret-management-token",
      method: "POST",
      url: "/api/weather/refresh"
    },
    {
      managementToken: "secret-management-token",
      method: "GET",
      url: "/api/weather/diagnostics"
    }
  ]);
});
