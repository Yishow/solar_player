import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import {
  buildApp,
  tempDir
} from "./display-pages-asset-governance.test-support.js";

test("GET /api/device/logs and /api/device/logs/export return safe log metadata in the ESM runtime", async () => {
  const logDir = join(tempDir, "logs");
  mkdirSync(logDir, { recursive: true });
  writeFileSync(join(logDir, "older.log"), "older");
  writeFileSync(join(logDir, "newer.log"), "newer");
  writeFileSync(join(logDir, "ignore.txt"), "ignore");
  utimesSync(join(logDir, "older.log"), new Date("2026-05-18T08:00:00.000Z"), new Date("2026-05-18T08:00:00.000Z"));
  utimesSync(join(logDir, "newer.log"), new Date("2026-05-18T09:00:00.000Z"), new Date("2026-05-18T09:00:00.000Z"));

  const previousLogDir = process.env.LOG_DIR;
  process.env.LOG_DIR = logDir;
  const app = await buildApp();

  try {
    const [logsResponse, exportResponse] = await Promise.all([
      app.inject({
        method: "GET",
        url: "/api/device/logs?limit=1"
      }),
      app.inject({
        method: "GET",
        url: "/api/device/logs/export"
      })
    ]);

    assert.equal(logsResponse.statusCode, 200);
    assert.equal(exportResponse.statusCode, 200);

    const logsBody = logsResponse.json() as {
      data: Array<{ file: string; modified: string; size: number }>;
      success: boolean;
    };
    const exportBody = exportResponse.json() as {
      data: { directory: string; files: string[] };
      success: boolean;
    };

    assert.equal(logsBody.success, true);
    assert.equal(logsBody.data.length, 1);
    assert.equal(logsBody.data[0]?.file, "newer.log");
    assert.equal(typeof logsBody.data[0]?.size, "number");
    assert.equal(exportBody.success, true);
    assert.equal(exportBody.data.directory, logDir);
    assert.deepEqual(exportBody.data.files.sort(), ["newer.log", "older.log"]);
  } finally {
    await app.close();
    if (previousLogDir === undefined) {
      delete process.env.LOG_DIR;
    } else {
      process.env.LOG_DIR = previousLogDir;
    }
  }
});

test("GET /api/device/logs and /api/device/logs/export return safe error envelopes when the log directory is missing", async () => {
  const previousLogDir = process.env.LOG_DIR;
  process.env.LOG_DIR = join(tempDir, "missing-logs");
  const app = await buildApp();

  try {
    const [logsResponse, exportResponse] = await Promise.all([
      app.inject({
        method: "GET",
        url: "/api/device/logs"
      }),
      app.inject({
        method: "GET",
        url: "/api/device/logs/export"
      })
    ]);

    assert.equal(logsResponse.statusCode, 404);
    assert.equal(exportResponse.statusCode, 404);

    const logsBody = logsResponse.json() as {
      error: string;
      success: boolean;
      timestamp: string;
    };
    const exportBody = exportResponse.json() as {
      error: string;
      success: boolean;
      timestamp: string;
    };

    assert.equal(logsBody.success, false);
    assert.equal(logsBody.error, "No logs directory");
    assert.equal(typeof logsBody.timestamp, "string");
    assert.equal(exportBody.success, false);
    assert.equal(exportBody.error, "No logs directory");
    assert.equal(typeof exportBody.timestamp, "string");
  } finally {
    await app.close();
    if (previousLogDir === undefined) {
      delete process.env.LOG_DIR;
    } else {
      process.env.LOG_DIR = previousLogDir;
    }
  }
});

test("device status and log metadata deny untrusted remote readers", async () => {
  const logDir = join(tempDir, "logs");
  mkdirSync(logDir, { recursive: true });
  writeFileSync(join(logDir, "player.log"), "ready\n", "utf8");
  process.env.LOG_DIR = logDir;

  const app = await buildApp();

  try {
    const responses = await Promise.all([
      app.inject({
        method: "GET",
        url: "/api/device/status",
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

    responses.forEach((response) => {
      assert.equal(response.statusCode, 403);
      assert.equal(response.json<{ access: string }>().access, "denied");
    });
  } finally {
    await app.close();
    delete process.env.LOG_DIR;
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
  const helperPath = join(tempDir, "stop-solar-kiosk-test.sh");
  const markerPath = join(tempDir, "stop-solar-kiosk.marker");
  const previousHelperPath = process.env.KIOSK_EXIT_HELPER_PATH;
  const previousExitDelayMs = process.env.KIOSK_EXIT_DELAY_MS;

  rmSync(markerPath, { force: true });
  writeFileSync(helperPath, `#!/bin/sh\nsleep 0.2\nprintf 'closed' > "${markerPath}"\n`, "utf8");
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
    assert.ok(elapsedMs < 200, `expected response before kiosk helper finishes, got ${elapsedMs}ms`);

    const body = response.json() as {
      data: {
        executed: boolean;
        launcherName: string;
        reentryHint: string;
      };
      success: boolean;
    };

    assert.equal(body.success, true);
    assert.equal(body.data.executed, true);
    assert.equal(body.data.launcherName, "Solar Display Kiosk");
    assert.match(body.data.reentryHint, /Solar Display Kiosk/);
    await delay(1500);
    assert.equal(existsSync(markerPath), true);
  } finally {
    await app.close();
    rmSync(helperPath, { force: true });
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
