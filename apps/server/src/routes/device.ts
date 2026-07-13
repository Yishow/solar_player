import type { FastifyPluginAsync } from "fastify";
import { existsSync, readFileSync, statfsSync } from "node:fs";
import { platform, totalmem, cpus, hostname, arch } from "node:os";
import {
  buildUnsupportedDeviceControlResult,
  readDeviceDisplayOpsSummary
} from "../services/deviceDisplayOpsService.js";
import {
  KioskExitUnavailableError,
  scheduleDeviceKioskExit
} from "../services/deviceKioskExitService.js";
import {
  clampDeviceLogLimit,
  exportDeviceLogs,
  readDeviceLogSummary,
  type JournalRunner
} from "../services/deviceLogService.js";
import { readReleaseIdentity } from "../services/releaseIdentityService.js";

function getUptimeSeconds(): number {
  if (platform() === "linux") {
    try {
      const content = readFileSync("/proc/uptime", "utf-8");
      return Math.floor(Number.parseFloat(content.split(" ")[0] ?? "0"));
    } catch {
      // fallback
    }
  }
  return Math.floor(process.uptime());
}

function getDiskUsage(path: string): { totalMB: number; usedMB: number; availableMB: number; usePercent: number } {
  try {
    const stats = statfsSync(path);
    const totalBytes = stats.blocks * stats.bsize;
    const usedBytes = Math.max(0, (stats.blocks - stats.bfree) * stats.bsize);
    const availableBytes = Math.max(0, stats.bavail * stats.bsize);
    const totalMB = Math.round(totalBytes / 1024 / 1024);
    const usedMB = Math.round(usedBytes / 1024 / 1024);
    const availableMB = Math.round(availableBytes / 1024 / 1024);
    const usePercent = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0;
    return { totalMB, usedMB, availableMB, usePercent };
  } catch {
    return { totalMB: 0, usedMB: 0, availableMB: 0, usePercent: 0 };
  }
}

function getMemoryUsage(): { totalMB: number; usedMB: number; freeMB: number; usePercent: number } {
  const totalMB = Math.round(totalmem() / 1024 / 1024);
  if (platform() === "linux" && existsSync("/proc/meminfo")) {
    try {
      const meminfo = readFileSync("/proc/meminfo", "utf-8");
      const memTotal = Number.parseInt(meminfo.match(/MemTotal:\s+(\d+)/)?.[1] ?? "0", 10);
      const memAvailable = Number.parseInt(meminfo.match(/MemAvailable:\s+(\d+)/)?.[1] ?? "0", 10);
      const usedMB = Math.round((memTotal - memAvailable) / 1024);
      const freeMB = Math.round(memAvailable / 1024);
      return { totalMB: Math.round(memTotal / 1024), usedMB, freeMB, usePercent: totalMB > 0 ? Math.round((usedMB / totalMB) * 100) : 0 };
    } catch {
      // fallback
    }
  }
  // Node.js estimate
  return { totalMB, usedMB: Math.round(totalMB * 0.5), freeMB: Math.round(totalMB * 0.5), usePercent: 50 };
}

function getCpuUsage(): { cores: number; loadAvg: [number, number, number] } {
  const loadAvg: [number, number, number] = [0, 0, 0];
  if (platform() === "linux" && existsSync("/proc/loadavg")) {
    try {
      const content = readFileSync("/proc/loadavg", "utf-8");
      const parts = content.trim().split(/\s+/);
      loadAvg[0] = Number.parseFloat(parts[0] ?? "0");
      loadAvg[1] = Number.parseFloat(parts[1] ?? "0");
      loadAvg[2] = Number.parseFloat(parts[2] ?? "0");
    } catch {
      // fallback
    }
  }
  return { cores: cpus().length, loadAvg };
}

let journalRunnerOverride: JournalRunner | undefined;

/** Test-only: inject a journal runner so routes never spawn host helpers. */
export function setDeviceLogJournalRunnerForTests(runner: JournalRunner | undefined) {
  journalRunnerOverride = runner;
}

const deviceRoute: FastifyPluginAsync = async (app) => {
  // GET /api/device/status
  app.get("/api/device/status", async (request, reply) => {
    if (!app.managementAccess.isTrustedManagementReadRequest(request)) {
      return app.managementAccess.deny(reply);
    }

    const disk = getDiskUsage(process.env.DATA_DIR ?? "/tmp");
    const memory = getMemoryUsage();
    const cpu = getCpuUsage();
    const displayOps = readDeviceDisplayOpsSummary({
      mqttStatus: app.mqttClientService.getStatus()
    });
    const release = readReleaseIdentity();

    return {
      success: true,
      data: {
        hostname: hostname(),
        platform: platform(),
        arch: arch(),
        nodeVersion: process.version,
        uptimeSeconds: getUptimeSeconds(),
        cpu,
        memory,
        disk,
        displayOps,
        displayClients: app.socketService.getDisplayClientLivenessSnapshot(),
        pid: process.pid,
        release
      }
    };
  });

  // POST /api/device/reboot
  app.post("/api/device/reboot", async (_request, reply) => {
    return reply.status(501).send({
      data: undefined,
      error: "Unsupported device control",
      result: buildUnsupportedDeviceControlResult("reboot"),
      success: false,
      timestamp: new Date().toISOString()
    });
  });

  // POST /api/device/clear-cache
  app.post("/api/device/clear-cache", async (_request, reply) => {
    return reply.status(501).send({
      data: undefined,
      error: "Unsupported device control",
      result: buildUnsupportedDeviceControlResult("clear-cache"),
      success: false,
      timestamp: new Date().toISOString()
    });
  });

  // POST /api/device/kiosk-exit
  app.post("/api/device/kiosk-exit", async (request, reply) => {
    if (!app.managementAccess.isTrustedManagementReadRequest(request)) {
      return app.managementAccess.deny(reply);
    }

    try {
      return {
        success: true,
        data: scheduleDeviceKioskExit({
          onError: (error) => app.log.error({ err: error }, "device kiosk exit helper failed")
        })
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Kiosk exit helper failed.";
      const statusCode = error instanceof KioskExitUnavailableError ? 503 : 500;
      app.log.error({ err: error }, "device kiosk exit failed");
      reply.code(statusCode);
      return {
        success: false,
        error: message,
        timestamp: new Date().toISOString()
      };
    }
  });

  // GET /api/device/logs — bounded solar-display journal summary (trusted only)
  app.get<{ Querystring: { limit?: string } }>("/api/device/logs", async (request, reply) => {
    if (!app.managementAccess.isTrustedManagementReadRequest(request)) {
      return app.managementAccess.deny(reply);
    }

    const limit = clampDeviceLogLimit(request.query.limit);
    const summary = await readDeviceLogSummary({
      limit,
      runner: journalRunnerOverride
    });

    if (!summary.available) {
      reply.code(503);
      return {
        success: false,
        error: summary.unavailableReason ?? "Device logs unavailable",
        data: summary,
        timestamp: new Date().toISOString()
      };
    }

    return {
      success: true,
      data: summary
    };
  });

  // GET /api/device/logs/export — bounded text/plain attachment (trusted only)
  app.get<{ Querystring: { limit?: string } }>("/api/device/logs/export", async (request, reply) => {
    if (!app.managementAccess.isTrustedManagementReadRequest(request)) {
      return app.managementAccess.deny(reply);
    }

    const limit = clampDeviceLogLimit(request.query.limit ?? "200");
    const exported = await exportDeviceLogs({
      limit,
      runner: journalRunnerOverride
    });

    if (!exported.available) {
      reply.code(503);
      return {
        success: false,
        error: exported.unavailableReason ?? "Device logs unavailable",
        data: {
          source: exported.source,
          available: false,
          retention: exported.retention,
          unavailableReason: exported.unavailableReason
        },
        timestamp: new Date().toISOString()
      };
    }

    reply
      .header("Content-Type", "text/plain; charset=utf-8")
      .header("Content-Disposition", `attachment; filename="${exported.filename}"`)
      .code(200)
      .send(exported.content);
  });
};

export default deviceRoute;
