import type { FastifyPluginAsync } from "fastify";
import { existsSync, readFileSync, readdirSync, statfsSync } from "node:fs";
import { join } from "node:path";
import { platform, totalmem, cpus, hostname, arch } from "node:os";
import { config } from "../config.js";
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

type HostStats = {
  cpu: { cores: number; loadAvg: [number, number, number] };
  disk: { totalMB: number; usedMB: number; availableMB: number; usePercent: number };
  memory: { totalMB: number; usedMB: number; freeMB: number; usePercent: number };
  uptimeSeconds: number;
};

type HostStatsResult = HostStats & {
  hostStatsAvailable: boolean;
  hostStatsUnavailableReason: string | null;
};

const emptyHostStats: HostStats = {
  cpu: { cores: 0, loadAvg: [0, 0, 0] },
  disk: { totalMB: 0, usedMB: 0, availableMB: 0, usePercent: 0 },
  memory: { totalMB: 0, usedMB: 0, freeMB: 0, usePercent: 0 },
  uptimeSeconds: 0
};

const DEVICE_AGENT_FETCH_TIMEOUT_MS = 3_000;

type DeviceAgentFetch = (input: string, init?: RequestInit) => Promise<Response>;

let deviceAgentFetchOverride: DeviceAgentFetch | undefined;

/** Test-only: inject fetch used for DEVICE_AGENT_URL host-stats. */
export function setDeviceAgentFetchForTests(fetchImpl: DeviceAgentFetch | undefined) {
  deviceAgentFetchOverride = fetchImpl;
}

function boundedHostStatsReason(reason: string): string {
  const compact = reason.replace(/\s+/g, " ").trim();
  if (compact.length === 0) {
    return "device agent unreachable";
  }
  return compact.length > 200 ? `${compact.slice(0, 197)}...` : compact;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseRemoteHostStats(payload: unknown): HostStats | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const body = payload as Record<string, unknown>;
  const disk = body.disk as Record<string, unknown> | undefined;
  const memory = body.memory as Record<string, unknown> | undefined;
  const cpu = body.cpu as Record<string, unknown> | undefined;
  const loadAvg = Array.isArray(cpu?.loadAvg) ? cpu.loadAvg : null;

  if (
    !disk
    || !memory
    || !cpu
    || !loadAvg
    || loadAvg.length < 3
    || !isFiniteNumber(disk.totalMB)
    || !isFiniteNumber(disk.usedMB)
    || !isFiniteNumber(disk.availableMB)
    || !isFiniteNumber(disk.usePercent)
    || !isFiniteNumber(memory.totalMB)
    || !isFiniteNumber(memory.usedMB)
    || !isFiniteNumber(memory.freeMB)
    || !isFiniteNumber(memory.usePercent)
    || !isFiniteNumber(cpu.cores)
    || !isFiniteNumber(loadAvg[0])
    || !isFiniteNumber(loadAvg[1])
    || !isFiniteNumber(loadAvg[2])
    || !isFiniteNumber(body.uptimeSeconds)
  ) {
    return null;
  }

  return {
    disk: {
      totalMB: disk.totalMB,
      usedMB: disk.usedMB,
      availableMB: disk.availableMB,
      usePercent: disk.usePercent
    },
    memory: {
      totalMB: memory.totalMB,
      usedMB: memory.usedMB,
      freeMB: memory.freeMB,
      usePercent: memory.usePercent
    },
    cpu: {
      cores: cpu.cores,
      loadAvg: [loadAvg[0], loadAvg[1], loadAvg[2]]
    },
    uptimeSeconds: body.uptimeSeconds
  };
}

async function fetchRemoteHostStats(agentUrl: string): Promise<HostStatsResult> {
  const base = agentUrl.replace(/\/+$/, "");
  const url = `${base}/stats`;
  const fetchImpl = deviceAgentFetchOverride ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEVICE_AGENT_FETCH_TIMEOUT_MS);

  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
    if (!response.ok) {
      return {
        ...emptyHostStats,
        hostStatsAvailable: false,
        hostStatsUnavailableReason: boundedHostStatsReason(
          `device agent returned HTTP ${response.status}`
        )
      };
    }
    const payload: unknown = await response.json();
    const parsed = parseRemoteHostStats(payload);
    if (!parsed) {
      return {
        ...emptyHostStats,
        hostStatsAvailable: false,
        hostStatsUnavailableReason: boundedHostStatsReason("device agent returned invalid host stats")
      };
    }
    return {
      ...parsed,
      hostStatsAvailable: true,
      hostStatsUnavailableReason: null
    };
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "device agent request timed out"
        : error instanceof Error
          ? error.message
          : "device agent unreachable";
    return {
      ...emptyHostStats,
      hostStatsAvailable: false,
      hostStatsUnavailableReason: boundedHostStatsReason(message)
    };
  } finally {
    clearTimeout(timer);
  }
}

async function readHostStats(): Promise<HostStatsResult> {
  const agentUrl = config.deviceAgentUrl;
  if (agentUrl) {
    return fetchRemoteHostStats(agentUrl);
  }

  return {
    cpu: getCpuUsage(),
    disk: getDiskUsage(process.env.DATA_DIR ?? "/tmp"),
    memory: getMemoryUsage(),
    uptimeSeconds: getUptimeSeconds(),
    hostStatsAvailable: true,
    hostStatsUnavailableReason: null
  };
}

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

type DeviceTelemetryRoots = {
  coolingRoot: string;
  hwmonRoot: string;
  thermalRoot: string;
};

type FanTelemetry = {
  available: boolean;
  coolingState: number | null;
  rpm: number | null;
  status: "running" | "stopped" | "unavailable";
};

const defaultTelemetryRoots: DeviceTelemetryRoots = {
  coolingRoot: "/sys/class/thermal",
  hwmonRoot: "/sys/class/hwmon",
  thermalRoot: "/sys/class/thermal"
};

let deviceTelemetryRootsOverride: DeviceTelemetryRoots | undefined;

/** Test-only: point sysfs telemetry reads at bounded fixtures. */
export function setDeviceTelemetryRootsForTests(roots: DeviceTelemetryRoots | undefined) {
  deviceTelemetryRootsOverride = roots;
}

function listEntries(path: string): string[] {
  try {
    return readdirSync(path).sort();
  } catch {
    return [];
  }
}

function readText(path: string): string | null {
  try {
    return readFileSync(path, "utf8").trim();
  } catch {
    return null;
  }
}

function readNonNegativeNumber(path: string): number | null {
  const text = readText(path);
  if (text === null || text === "") {
    return null;
  }

  const value = Number(text);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function getTemperature(roots: DeviceTelemetryRoots): { available: boolean; celsius: number | null } {
  const zones = listEntries(roots.thermalRoot).filter((name) => name.startsWith("thermal_zone"));
  zones.sort((left, right) => {
    const leftType = readText(join(roots.thermalRoot, left, "type"))?.toLowerCase() ?? "";
    const rightType = readText(join(roots.thermalRoot, right, "type"))?.toLowerCase() ?? "";
    return Number(rightType.includes("cpu")) - Number(leftType.includes("cpu"));
  });

  for (const zone of zones) {
    const rawValue = readNonNegativeNumber(join(roots.thermalRoot, zone, "temp"));
    if (rawValue === null) {
      continue;
    }
    const celsius = rawValue >= 1000 ? rawValue / 1000 : rawValue;
    return { available: true, celsius: Math.round(celsius * 10) / 10 };
  }

  return { available: false, celsius: null };
}

function getFanTelemetry(roots: DeviceTelemetryRoots): FanTelemetry {
  for (const hwmon of listEntries(roots.hwmonRoot)) {
    const hwmonPath = join(roots.hwmonRoot, hwmon);
    for (const input of listEntries(hwmonPath).filter((name) => /^fan\d+_input$/.test(name))) {
      const rpm = readNonNegativeNumber(join(hwmonPath, input));
      if (rpm !== null) {
        return {
          available: true,
          coolingState: null,
          rpm: Math.round(rpm),
          status: rpm > 0 ? "running" : "stopped"
        };
      }
    }
  }

  for (const device of listEntries(roots.coolingRoot).filter((name) => name.startsWith("cooling_device"))) {
    const devicePath = join(roots.coolingRoot, device);
    if (readText(join(devicePath, "type"))?.toLowerCase() !== "pwm-fan") {
      continue;
    }
    const coolingState = readNonNegativeNumber(join(devicePath, "cur_state"));
    if (coolingState !== null) {
      return {
        available: true,
        coolingState: Math.round(coolingState),
        rpm: null,
        status: coolingState > 0 ? "running" : "stopped"
      };
    }
  }

  return {
    available: false,
    coolingState: null,
    rpm: null,
    status: "unavailable"
  };
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

    // Host-stats (disk/mem/cpu/uptime) may come from DEVICE_AGENT_URL (Pi agent).
    // Logs always stay server-side and never consult the agent.
    const hostStats = await readHostStats();
    const telemetryRoots = deviceTelemetryRootsOverride ?? defaultTelemetryRoots;
    const temperature = platform() === "linux" || deviceTelemetryRootsOverride
      ? getTemperature(telemetryRoots)
      : { available: false, celsius: null };
    const fan = platform() === "linux" || deviceTelemetryRootsOverride
      ? getFanTelemetry(telemetryRoots)
      : {
          available: false,
          coolingState: null,
          rpm: null,
          status: "unavailable" as const
        };
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
        uptimeSeconds: hostStats.uptimeSeconds,
        cpu: hostStats.cpu,
        memory: hostStats.memory,
        disk: hostStats.disk,
        hostStatsAvailable: hostStats.hostStatsAvailable,
        hostStatsUnavailableReason: hostStats.hostStatsUnavailableReason,
        temperature,
        fan,
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
