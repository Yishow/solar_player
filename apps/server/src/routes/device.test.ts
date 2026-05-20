import assert from "node:assert/strict";
import { mkdirSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
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
