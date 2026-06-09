import type { FastifyPluginAsync } from "fastify";
import { existsSync, readFileSync, readdirSync, statSync, statfsSync } from "node:fs";
import { platform, totalmem, cpus, hostname, arch } from "node:os";
import { join } from "node:path";
import {
  buildUnsupportedDeviceControlResult,
  readDeviceDisplayOpsSummary
} from "../services/deviceDisplayOpsService.js";
import {
  KioskExitUnavailableError,
  runDeviceKioskExit
} from "../services/deviceKioskExitService.js";

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

function getRecentLogs(logDir: string, limit: number): Array<{ file: string; size: number; modified: string }> {
  if (!existsSync(logDir)) return [];
  const files = readdirSync(logDir)
    .filter((f) => f.endsWith(".log"))
    .map((f) => {
      const stat = statSync(join(logDir, f));
      return {
        file: f,
        size: stat.size,
        modified: stat.mtime.toISOString()
      };
    })
    .sort((a, b) => b.modified.localeCompare(a.modified))
    .slice(0, limit);
  return files;
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
        pid: process.pid
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
        data: await runDeviceKioskExit()
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

  // GET /api/device/logs
  app.get<{ Querystring: { limit?: string } }>("/api/device/logs", async (request, reply) => {
    if (!app.managementAccess.isTrustedManagementReadRequest(request)) {
      return app.managementAccess.deny(reply);
    }

    const limit = Number.parseInt(request.query.limit ?? "20", 10) || 20;
    const logDir = process.env.LOG_DIR ?? join(process.cwd(), "logs");
    if (!existsSync(logDir)) {
      reply.code(404);
      return {
        success: false,
        error: "No logs directory",
        timestamp: new Date().toISOString()
      };
    }
    return {
      success: true,
      data: getRecentLogs(logDir, limit)
    };
  });

  // GET /api/device/logs/export
  app.get("/api/device/logs/export", async (request, reply) => {
    if (!app.managementAccess.isTrustedManagementReadRequest(request)) {
      return app.managementAccess.deny(reply);
    }

    const logDir = process.env.LOG_DIR ?? join(process.cwd(), "logs");
    if (!existsSync(logDir)) {
      reply.code(404);
      return {
        success: false,
        error: "No logs directory",
        timestamp: new Date().toISOString()
      };
    }
    // Return list of log files for download
    const files = readdirSync(logDir).filter((f) => f.endsWith(".log"));
    return { success: true, data: { directory: logDir, files } };
  });
};

export default deviceRoute;
