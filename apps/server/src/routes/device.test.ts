import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
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
        clientTime: "2026-05-22T12:00:05.000Z",
        connected: true,
        connectedAt: "2026-05-22T12:00:00.000Z",
        isIdle: false,
        isPlaying: true,
        lastSeenAt: "2026-05-22T12:00:10.000Z",
        pageKey: "overview",
        remoteAddress: "10.0.0.42",
        route: "/overview",
        sessionClass: "playback-safe",
        socketId: "socket-1",
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
