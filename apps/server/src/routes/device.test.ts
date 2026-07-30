import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { chmodSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AddressInfo } from "node:net";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import {
  buildApp,
  tempDir
} from "./display-pages-asset-governance.test-support.js";
import {
  setDeviceLogJournalRunnerForTests,
  setDeviceTelemetryRootsForTests
} from "./device.js";
import type { JournalRunner } from "../services/deviceLogService.js";

const remoteAgentStats = {
  disk: { totalMB: 64000, usedMB: 12000, availableMB: 52000, usePercent: 19 },
  memory: { totalMB: 8192, usedMB: 2048, freeMB: 6144, usePercent: 25 },
  cpu: { cores: 4, loadAvg: [0.42, 0.31, 0.18] as [number, number, number] },
  uptimeSeconds: 987654
};

async function startMockAgent(handler: (req: IncomingMessage, res: ServerResponse) => void): Promise<{
  baseUrl: string;
  close: () => Promise<void>;
  server: Server;
}> {
  const server = createServer(handler);
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    server,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      })
  };
}

const sampleJsonLine = JSON.stringify({
  __REALTIME_TIMESTAMP: "1716022800000000",
  MESSAGE: "injected solar-display error: fixture boom",
  PRIORITY: "3"
});

function availableRunner(stdout = `${sampleJsonLine}\n`): JournalRunner {
  return async ({ mode, limit }) => {
    if (mode === "export") {
      return {
        exitCode: 0,
        stdout: `2026-05-18T09:00:00+00:00 host solar-display[1]: export line limit=${limit}\n`,
        stderr: ""
      };
    }
    return { exitCode: 0, stdout, stderr: "" };
  };
}

function createDeviceTelemetryFixture() {
  const root = join(tempDir, "device-telemetry");
  const thermalRoot = join(root, "thermal");
  const hwmonRoot = join(root, "hwmon");
  const coolingRoot = join(root, "cooling");
  rmSync(root, { force: true, recursive: true });
  mkdirSync(thermalRoot, { recursive: true });
  mkdirSync(hwmonRoot, { recursive: true });
  mkdirSync(coolingRoot, { recursive: true });
  return { coolingRoot, hwmonRoot, root, thermalRoot };
}

test("GET /api/device/logs returns journald summary for trusted callers", async () => {
  setDeviceLogJournalRunnerForTests(availableRunner());
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/device/logs?limit=20"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      data: {
        available: boolean;
        entries: Array<{ message: string; priority: string; timestamp: string }>;
        retention: { maxEntries: number; scope: string; unit: string };
        source: string;
        unavailableReason: string | null;
      };
      success: boolean;
    };

    assert.equal(body.success, true);
    assert.equal(body.data.source, "journald");
    assert.equal(body.data.available, true);
    assert.equal(body.data.unavailableReason, null);
    assert.equal(body.data.retention.unit, "solar-display");
    assert.equal(body.data.retention.scope, "current-boot");
    assert.equal(body.data.retention.maxEntries, 20);
    assert.equal(body.data.entries.length, 1);
    assert.match(body.data.entries[0]?.message ?? "", /fixture boom/);
    assert.equal(JSON.stringify(body.data).includes("LOG_DIR"), false);
  } finally {
    setDeviceLogJournalRunnerForTests(undefined);
    await app.close();
  }
});

test("GET /api/device/logs clamps limit and returns 503 unavailable envelopes", async () => {
  setDeviceLogJournalRunnerForTests(async ({ limit }) => {
    assert.equal(limit, 500);
    return {
      exitCode: 1,
      stdout: "",
      stderr: "sudo: a password is required"
    };
  });
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/device/logs?limit=9999"
    });

    assert.equal(response.statusCode, 503);
    const body = response.json() as {
      data: {
        available: boolean;
        entries: unknown[];
        source: string;
        unavailableReason: string | null;
      };
      error: string;
      success: boolean;
      timestamp: string;
    };

    assert.equal(body.success, false);
    assert.equal(body.data.source, "journald");
    assert.equal(body.data.available, false);
    assert.equal(body.data.entries.length, 0);
    assert.equal(body.data.unavailableReason, "journal access denied");
    assert.equal(typeof body.timestamp, "string");
    assert.equal(Array.isArray(body.data.entries) && body.data.entries.length === 0, true);
  } finally {
    setDeviceLogJournalRunnerForTests(undefined);
    await app.close();
  }
});

test("GET /api/device/logs/export returns text/plain attachment with Content-Disposition", async () => {
  setDeviceLogJournalRunnerForTests(availableRunner());
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/device/logs/export?limit=50"
    });

    assert.equal(response.statusCode, 200);
    assert.match(response.headers["content-type"] ?? "", /text\/plain/);
    assert.match(
      response.headers["content-disposition"] ?? "",
      /attachment; filename="solar-display-journal-50\.txt"/
    );
    assert.match(response.body, /export line limit=50/);
  } finally {
    setDeviceLogJournalRunnerForTests(undefined);
    await app.close();
  }
});

test("device status includes release identity and log routes deny untrusted callers without spawning", async () => {
  let spawnCount = 0;
  setDeviceLogJournalRunnerForTests(async () => {
    spawnCount += 1;
    return { exitCode: 0, stdout: `${sampleJsonLine}\n`, stderr: "" };
  });

  const previousManifest = process.env.RELEASE_MANIFEST_PATH;
  const manifestPath = join(tempDir, "release-manifest.json");
  writeFileSync(
    manifestPath,
    JSON.stringify({
      releaseId: "0.1.0+deadbeefcafe",
      commit: "deadbeefcafe0123456789abcdef0123456789ab",
      builtAt: "2026-07-14T01:02:03.000Z",
      packageVersion: "0.1.0",
      schemaVersion: 22,
      sourceDirty: true
    }),
    "utf8"
  );
  process.env.RELEASE_MANIFEST_PATH = manifestPath;

  const app = await buildApp();

  try {
    const [statusResponse, logsResponse, exportResponse] = await Promise.all([
      app.inject({
        method: "GET",
        url: "/api/device/status"
      }),
      app.inject({
        method: "GET",
        url: "/api/device/logs",
        headers: {
          host: "player.example",
          origin: "https://evil.example"
        }
      }),
      app.inject({
        method: "GET",
        url: "/api/device/logs/export",
        headers: {
          host: "player.example",
          origin: "https://evil.example"
        }
      })
    ]);

    assert.equal(statusResponse.statusCode, 200);
    const statusBody = statusResponse.json() as {
      data: {
        release: {
          available: boolean;
          releaseId: string | null;
          sourceDirty: boolean | null;
          schemaVersion: number | null;
        };
      };
    };
    assert.equal(statusBody.data.release.available, true);
    assert.equal(statusBody.data.release.releaseId, "0.1.0+deadbeefcafe");
    assert.equal(statusBody.data.release.sourceDirty, true);
    assert.equal(statusBody.data.release.schemaVersion, 22);

    assert.equal(logsResponse.statusCode, 403);
    assert.equal(exportResponse.statusCode, 403);
    assert.equal(logsResponse.json<{ access: string }>().access, "denied");
    assert.equal(exportResponse.json<{ access: string }>().access, "denied");
    assert.equal(spawnCount, 0, "untrusted requests must not execute the journal helper");
  } finally {
    setDeviceLogJournalRunnerForTests(undefined);
    await app.close();
    if (previousManifest === undefined) {
      delete process.env.RELEASE_MANIFEST_PATH;
    } else {
      process.env.RELEASE_MANIFEST_PATH = previousManifest;
    }
  }
});

test("GET /api/device/status reads Pi temperature and fan RPM on demand", async () => {
  const roots = createDeviceTelemetryFixture();
  const thermalZone = join(roots.thermalRoot, "thermal_zone0");
  const hwmon = join(roots.hwmonRoot, "hwmon0");
  mkdirSync(thermalZone);
  mkdirSync(hwmon);
  writeFileSync(join(thermalZone, "type"), "cpu-thermal\n", "utf8");
  writeFileSync(join(thermalZone, "temp"), "48750\n", "utf8");
  writeFileSync(join(hwmon, "fan1_input"), "2450\n", "utf8");
  setDeviceTelemetryRootsForTests(roots);
  const app = await buildApp();

  try {
    const runningResponse = await app.inject({ method: "GET", url: "/api/device/status" });
    assert.equal(runningResponse.statusCode, 200);
    assert.deepEqual(runningResponse.json().data.temperature, {
      available: true,
      celsius: 48.8
    });
    assert.deepEqual(runningResponse.json().data.fan, {
      available: true,
      coolingState: null,
      rpm: 2450,
      status: "running"
    });

    writeFileSync(join(hwmon, "fan1_input"), "0\n", "utf8");
    const stoppedResponse = await app.inject({ method: "GET", url: "/api/device/status" });
    assert.equal(stoppedResponse.json().data.fan.status, "stopped");
    assert.equal(stoppedResponse.json().data.fan.rpm, 0);
  } finally {
    setDeviceTelemetryRootsForTests(undefined);
    await app.close();
    rmSync(roots.root, { force: true, recursive: true });
  }
});

test("GET /api/device/status falls back to pwm-fan cooling state without inventing RPM", async () => {
  const roots = createDeviceTelemetryFixture();
  const coolingDevice = join(roots.coolingRoot, "cooling_device0");
  mkdirSync(coolingDevice);
  writeFileSync(join(coolingDevice, "type"), "pwm-fan\n", "utf8");
  writeFileSync(join(coolingDevice, "cur_state"), "3\n", "utf8");
  setDeviceTelemetryRootsForTests(roots);
  const app = await buildApp();

  try {
    const response = await app.inject({ method: "GET", url: "/api/device/status" });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json().data.fan, {
      available: true,
      coolingState: 3,
      rpm: null,
      status: "running"
    });
  } finally {
    setDeviceTelemetryRootsForTests(undefined);
    await app.close();
    rmSync(roots.root, { force: true, recursive: true });
  }
});

test("GET /api/device/status keeps host telemetry available when thermal sources are invalid", async () => {
  const roots = createDeviceTelemetryFixture();
  const thermalZone = join(roots.thermalRoot, "thermal_zone0");
  const hwmon = join(roots.hwmonRoot, "hwmon0");
  mkdirSync(thermalZone);
  mkdirSync(hwmon);
  writeFileSync(join(thermalZone, "type"), "cpu-thermal\n", "utf8");
  writeFileSync(join(thermalZone, "temp"), "not-a-temperature\n", "utf8");
  writeFileSync(join(hwmon, "fan1_input"), "not-an-rpm\n", "utf8");
  setDeviceTelemetryRootsForTests(roots);
  const app = await buildApp();

  try {
    const response = await app.inject({ method: "GET", url: "/api/device/status" });
    assert.equal(response.statusCode, 200);
    const data = response.json().data;
    assert.deepEqual(data.temperature, { available: false, celsius: null });
    assert.deepEqual(data.fan, {
      available: false,
      coolingState: null,
      rpm: null,
      status: "unavailable"
    });
    assert.equal(typeof data.cpu.cores, "number");
    assert.equal(typeof data.memory.totalMB, "number");
    assert.equal(typeof data.disk.totalMB, "number");
  } finally {
    setDeviceTelemetryRootsForTests(undefined);
    await app.close();
    rmSync(roots.root, { force: true, recursive: true });
  }
});

test("/health stays cheap and does not require a release manifest", async () => {
  const previousManifest = process.env.RELEASE_MANIFEST_PATH;
  process.env.RELEASE_MANIFEST_PATH = join(tempDir, "definitely-missing-release-manifest.json");
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/health"
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as { status: string; timestamp: string };
    assert.equal(body.status, "ok");
    assert.equal(typeof body.timestamp, "string");
    assert.equal("release" in body, false);
  } finally {
    await app.close();
    if (previousManifest === undefined) {
      delete process.env.RELEASE_MANIFEST_PATH;
    } else {
      process.env.RELEASE_MANIFEST_PATH = previousManifest;
    }
  }
});

test("trusted device status responses include display client liveness while untrusted requests stay denied", async () => {
  const app = await buildApp();
  const originalGetSnapshot = app.socketService.getDisplayClientLivenessSnapshot.bind(app.socketService);
  app.socketService.getDisplayClientLivenessSnapshot = () => ({
    clients: [
      {
        clientId: "display-1",
        connectedCount: 1,
        deviceId: 1,
        duplicateDetectedAt: null,
        duplicateIdentity: false,
        groupId: 10,
        isIdle: false,
        isPlaying: true,
        lastSeenAt: "2026-05-22T12:00:10.000Z",
        pageKey: "overview",
        profileId: 100,
        route: "/overview",
        siteScope: "cl",
        sourceStatus: "same-source",
        state: "online",
        viewport: {
          height: 1080,
          width: 1920
        }
      }
    ],
    summary: {
      offline: 0,
      online: 1,
      stale: 0,
      total: 1
    }
  });

  try {
    const [trustedResponse, untrustedResponse] = await Promise.all([
      app.inject({
        method: "GET",
        url: "/api/device/status"
      }),
      app.inject({
        method: "GET",
        url: "/api/device/status",
        headers: {
          host: "player.example",
          origin: "https://evil.example"
        }
      })
    ]);

    assert.equal(trustedResponse.statusCode, 200);
    assert.deepEqual(
      trustedResponse.json<{
        data: {
          displayClients: {
            summary: {
              offline: number;
              online: number;
              stale: number;
              total: number;
            };
            clients: Array<{ pageKey: string | null; state: string }>;
          };
        };
      }>().data.displayClients.summary,
      {
        offline: 0,
        online: 1,
        stale: 0,
        total: 1
      }
    );
    assert.equal(
      trustedResponse.json<{
        data: {
          displayClients: {
            clients: Array<{ pageKey: string | null; state: string }>;
          };
        };
      }>().data.displayClients.clients[0]?.pageKey,
      "overview"
    );

    assert.equal(untrustedResponse.statusCode, 403);
    const deniedBody = untrustedResponse.json<{
      access: string;
      data?: {
        displayClients?: unknown;
      };
    }>();
    assert.equal(deniedBody.access, "denied");
    assert.equal("data" in deniedBody, false);
  } finally {
    app.socketService.getDisplayClientLivenessSnapshot = originalGetSnapshot;
    await app.close();
  }
});

test("unsupported device controls stay informational and point operators to the host runbook", async () => {
  const app = await buildApp();

  try {
    const [rebootResponse, clearCacheResponse] = await Promise.all([
      app.inject({
        method: "POST",
        url: "/api/device/reboot"
      }),
      app.inject({
        method: "POST",
        url: "/api/device/clear-cache"
      })
    ]);

    assert.equal(rebootResponse.statusCode, 501);
    assert.equal(clearCacheResponse.statusCode, 501);

    const rebootBody = rebootResponse.json() as {
      error: string;
      result: {
        action: string;
        executed: boolean;
        guidance: {
          hostRestartCommand: string;
          runbookPath: string;
        };
      };
      success: boolean;
    };
    const clearCacheBody = clearCacheResponse.json() as {
      result: {
        action: string;
        executed: boolean;
        guidance: {
          hostRestartCommand: string;
          runbookPath: string;
        };
      };
      success: boolean;
    };

    assert.equal(rebootBody.success, false);
    assert.equal(rebootBody.error, "Unsupported device control");
    assert.equal(rebootBody.result.action, "reboot");
    assert.equal(rebootBody.result.executed, false);
    assert.equal(
      rebootBody.result.guidance.hostRestartCommand,
      "systemctl restart solar-display"
    );
    assert.equal(
      rebootBody.result.guidance.runbookPath,
      "docs/runbooks/device-diagnostics-safe-ops.md"
    );
    assert.equal(clearCacheBody.result.action, "clear-cache");
    assert.equal(clearCacheBody.result.executed, false);
  } finally {
    await app.close();
  }
});

test("trusted kiosk exit requests invoke the fixed helper and return desktop re-entry guidance", async () => {
  const helperDir = join(
    tempDir,
    process.platform === "win32" ? "helper scripts" : "helper-scripts"
  );
  const helperPath = join(
    helperDir,
    process.platform === "win32" ? "stop-solar-kiosk-test.cmd" : "stop-solar-kiosk-test.sh"
  );
  const markerPath = join(tempDir, "stop-solar-kiosk.marker");
  const previousHelperPath = process.env.KIOSK_EXIT_HELPER_PATH;
  const previousExitDelayMs = process.env.KIOSK_EXIT_DELAY_MS;

  rmSync(markerPath, { force: true });
  mkdirSync(helperDir, { recursive: true });
  const helperSource = process.platform === "win32"
    ? `@echo off\r\nping 127.0.0.1 -n 2 > nul\r\necho closed>"${markerPath}"\r\n`
    : `#!/bin/sh\nsleep 0.5\nprintf 'closed' > "${markerPath}"\n`;
  writeFileSync(helperPath, helperSource, "utf8");
  chmodSync(helperPath, 0o755);
  process.env.KIOSK_EXIT_HELPER_PATH = helperPath;
  process.env.KIOSK_EXIT_DELAY_MS = "0";

  const app = await buildApp();

  try {
    const startedAt = Date.now();
    const response = await app.inject({
      method: "POST",
      url: "/api/device/kiosk-exit"
    });
    const elapsedMs = Date.now() - startedAt;

    assert.equal(response.statusCode, 200);
    assert.equal(existsSync(markerPath), false);
    assert.ok(elapsedMs < 400, `expected response before kiosk helper finishes, got ${elapsedMs}ms`);

    const body = response.json() as {
      data: {
        scheduled: boolean;
        launcherName: string;
        reentryHint: string;
      };
      success: boolean;
    };

    assert.equal(body.success, true);
    assert.equal(body.data.scheduled, true);
    assert.equal(body.data.launcherName, "Solar Display Kiosk");
    assert.match(body.data.reentryHint, /Solar Display Kiosk/);
    await delay(1500);
    assert.equal(existsSync(markerPath), true);
  } finally {
    await app.close();
    rmSync(helperPath, { force: true });
    rmSync(helperDir, { force: true, recursive: true });
    rmSync(markerPath, { force: true });
    if (previousHelperPath === undefined) {
      delete process.env.KIOSK_EXIT_HELPER_PATH;
    } else {
      process.env.KIOSK_EXIT_HELPER_PATH = previousHelperPath;
    }
    if (previousExitDelayMs === undefined) {
      delete process.env.KIOSK_EXIT_DELAY_MS;
    } else {
      process.env.KIOSK_EXIT_DELAY_MS = previousExitDelayMs;
    }
  }
});

test("kiosk exit returns a safe unavailable envelope when the helper is missing", async () => {
  const previousHelperPath = process.env.KIOSK_EXIT_HELPER_PATH;
  process.env.KIOSK_EXIT_HELPER_PATH = join(tempDir, "missing-stop-solar-kiosk.sh");

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "POST",
      url: "/api/device/kiosk-exit"
    });

    assert.equal(response.statusCode, 503);
    const body = response.json() as {
      error: string;
      success: boolean;
      timestamp: string;
    };

    assert.equal(body.success, false);
    assert.match(body.error, /Kiosk exit helper is unavailable/);
    assert.equal(typeof body.timestamp, "string");
  } finally {
    await app.close();
    if (previousHelperPath === undefined) {
      delete process.env.KIOSK_EXIT_HELPER_PATH;
    } else {
      process.env.KIOSK_EXIT_HELPER_PATH = previousHelperPath;
    }
  }
});

test("GET /api/device/status host-stats reflect remote agent when DEVICE_AGENT_URL is set", async () => {
  const previousAgentUrl = process.env.DEVICE_AGENT_URL;
  let statsHits = 0;
  let logsHits = 0;
  const agent = await startMockAgent((req, res) => {
    if (req.url?.startsWith("/stats")) {
      statsHits += 1;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(remoteAgentStats));
      return;
    }
    if (req.url?.startsWith("/logs")) {
      logsHits += 1;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ entries: ["should-not-be-used"] }));
      return;
    }
    res.writeHead(404);
    res.end();
  });
  process.env.DEVICE_AGENT_URL = agent.baseUrl;
  const app = await buildApp();

  try {
    const response = await app.inject({ method: "GET", url: "/api/device/status" });
    assert.equal(response.statusCode, 200);
    const data = response.json().data;
    assert.equal(statsHits, 1);
    assert.deepEqual(data.disk, remoteAgentStats.disk);
    assert.deepEqual(data.memory, remoteAgentStats.memory);
    assert.deepEqual(data.cpu, remoteAgentStats.cpu);
    assert.equal(data.uptimeSeconds, remoteAgentStats.uptimeSeconds);
    assert.equal(data.hostStatsAvailable, true);
    assert.equal(data.hostStatsUnavailableReason, null);
    assert.equal(logsHits, 0, "status must not fetch agent /logs");
  } finally {
    await app.close();
    await agent.close();
    if (previousAgentUrl === undefined) {
      delete process.env.DEVICE_AGENT_URL;
    } else {
      process.env.DEVICE_AGENT_URL = previousAgentUrl;
    }
  }
});

test("GET /api/device/status host-stats fall back to local /proc when DEVICE_AGENT_URL is unset", async () => {
  const previousAgentUrl = process.env.DEVICE_AGENT_URL;
  delete process.env.DEVICE_AGENT_URL;
  const app = await buildApp();

  try {
    const response = await app.inject({ method: "GET", url: "/api/device/status" });
    assert.equal(response.statusCode, 200);
    const data = response.json().data;
    assert.equal(typeof data.cpu.cores, "number");
    assert.equal(typeof data.memory.totalMB, "number");
    assert.equal(typeof data.disk.totalMB, "number");
    assert.equal(typeof data.uptimeSeconds, "number");
    assert.equal(data.hostStatsAvailable, true);
    assert.equal(data.hostStatsUnavailableReason, null);
    // Local path must not invent the remote fixture values.
    assert.notEqual(data.uptimeSeconds, remoteAgentStats.uptimeSeconds);
  } finally {
    await app.close();
    if (previousAgentUrl === undefined) {
      delete process.env.DEVICE_AGENT_URL;
    } else {
      process.env.DEVICE_AGENT_URL = previousAgentUrl;
    }
  }
});

test("GET /api/device/status returns bounded host-stats unavailable when agent is unreachable", async () => {
  const previousAgentUrl = process.env.DEVICE_AGENT_URL;
  process.env.DEVICE_AGENT_URL = "http://127.0.0.1:1";
  const app = await buildApp();

  try {
    const response = await app.inject({ method: "GET", url: "/api/device/status" });
    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      success: boolean;
      data: {
        hostStatsAvailable: boolean;
        hostStatsUnavailableReason: string | null;
        disk: { totalMB: number };
        memory: { totalMB: number };
        cpu: { cores: number };
        uptimeSeconds: number;
      };
    };
    assert.equal(body.success, true);
    assert.equal(body.data.hostStatsAvailable, false);
    assert.equal(typeof body.data.hostStatsUnavailableReason, "string");
    assert.ok((body.data.hostStatsUnavailableReason ?? "").length > 0);
    assert.equal(body.data.disk.totalMB, 0);
    assert.equal(body.data.memory.totalMB, 0);
    assert.equal(body.data.cpu.cores, 0);
    assert.equal(body.data.uptimeSeconds, 0);

    const health = await app.inject({ method: "GET", url: "/health" });
    assert.equal(health.statusCode, 200);
  } finally {
    await app.close();
    if (previousAgentUrl === undefined) {
      delete process.env.DEVICE_AGENT_URL;
    } else {
      process.env.DEVICE_AGENT_URL = previousAgentUrl;
    }
  }
});

test("GET /api/device/logs stay server-side even when DEVICE_AGENT_URL is set", async () => {
  const previousAgentUrl = process.env.DEVICE_AGENT_URL;
  let agentLogsHits = 0;
  const agent = await startMockAgent((req, res) => {
    if (req.url?.startsWith("/logs")) {
      agentLogsHits += 1;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(remoteAgentStats));
  });
  process.env.DEVICE_AGENT_URL = agent.baseUrl;
  setDeviceLogJournalRunnerForTests(availableRunner());
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/device/logs?limit=20"
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      success: boolean;
      data: { source: string; available: boolean; entries: Array<{ message: string }> };
    };
    assert.equal(body.success, true);
    assert.equal(body.data.source, "journald");
    assert.equal(body.data.available, true);
    assert.match(body.data.entries[0]?.message ?? "", /fixture boom/);
    assert.equal(agentLogsHits, 0, "logs must never call the Pi device-agent");
  } finally {
    setDeviceLogJournalRunnerForTests(undefined);
    await app.close();
    await agent.close();
    if (previousAgentUrl === undefined) {
      delete process.env.DEVICE_AGENT_URL;
    } else {
      process.env.DEVICE_AGENT_URL = previousAgentUrl;
    }
  }
});

test("GET /api/device/logs return unavailable on non-journald hosts without agent fallback", async () => {
  const previousAgentUrl = process.env.DEVICE_AGENT_URL;
  let agentHits = 0;
  const agent = await startMockAgent((_req, res) => {
    agentHits += 1;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ entries: ["agent-should-not-be-used"] }));
  });
  process.env.DEVICE_AGENT_URL = agent.baseUrl;
  // Simulate Windows / missing journal helper: runner reports journald unavailable.
  setDeviceLogJournalRunnerForTests(async () => ({
    exitCode: 1,
    stdout: "",
    stderr: "journalctl is not available"
  }));
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/device/logs?limit=20"
    });
    assert.equal(response.statusCode, 503);
    const body = response.json() as {
      success: boolean;
      data: { available: boolean; unavailableReason: string | null; entries: unknown[] };
      error: string;
    };
    assert.equal(body.success, false);
    assert.equal(body.data.available, false);
    assert.equal(body.data.entries.length, 0);
    assert.ok((body.data.unavailableReason ?? "").length > 0);
    assert.equal(agentHits, 0, "Windows/unavailable logs must not fall back to device-agent");
  } finally {
    setDeviceLogJournalRunnerForTests(undefined);
    await app.close();
    await agent.close();
    if (previousAgentUrl === undefined) {
      delete process.env.DEVICE_AGENT_URL;
    } else {
      process.env.DEVICE_AGENT_URL = previousAgentUrl;
    }
  }
});
