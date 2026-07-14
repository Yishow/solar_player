import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const DEVICE_LOG_SOURCE = "journald" as const;
export const DEVICE_LOG_UNIT = "solar-display" as const;
export const DEVICE_LOG_MIN_LIMIT = 1;
export const DEVICE_LOG_MAX_LIMIT = 500;
export const DEFAULT_DEVICE_LOG_HELPER_PATH = "/usr/local/sbin/read-solar-display-journal.sh";

export type DeviceLogEntry = {
  message: string;
  priority: string;
  timestamp: string;
};

export type DeviceLogRetention = {
  maxEntries: number;
  scope: "current-boot";
  unit: typeof DEVICE_LOG_UNIT;
};

export type DeviceLogSummary = {
  available: boolean;
  entries: DeviceLogEntry[];
  retention: DeviceLogRetention;
  source: typeof DEVICE_LOG_SOURCE;
  unavailableReason: string | null;
};

export type DeviceLogExport = {
  available: boolean;
  content: string;
  filename: string;
  retention: DeviceLogRetention;
  source: typeof DEVICE_LOG_SOURCE;
  unavailableReason: string | null;
};

export type JournalRunnerResult = {
  exitCode: number;
  stderr: string;
  stdout: string;
};

export type JournalRunner = (input: {
  limit: number;
  mode: "export" | "recent";
}) => Promise<JournalRunnerResult>;

export type JournalExecResult = { stdout: string; stderr: string };

export type JournalExecFunction = (
  file: string,
  args: readonly string[],
  options: { encoding: "utf8"; maxBuffer: number; timeout: number }
) => Promise<JournalExecResult>;

export function clampDeviceLogLimit(raw: unknown): number {
  const parsed =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
        ? Number.parseInt(raw, 10)
        : Number.NaN;

  if (!Number.isFinite(parsed)) {
    return 20;
  }

  return Math.min(DEVICE_LOG_MAX_LIMIT, Math.max(DEVICE_LOG_MIN_LIMIT, Math.trunc(parsed)));
}

export function buildDeviceLogRetention(limit: number): DeviceLogRetention {
  return {
    maxEntries: clampDeviceLogLimit(limit),
    scope: "current-boot",
    unit: DEVICE_LOG_UNIT
  };
}

function boundedReason(reason: string): string {
  const compact = reason.replace(/\s+/g, " ").trim();
  if (compact.length === 0) {
    return "Device logs unavailable";
  }
  return compact.length > 200 ? `${compact.slice(0, 197)}...` : compact;
}

function unavailableSummary(limit: number, reason: string): DeviceLogSummary {
  return {
    available: false,
    entries: [],
    retention: buildDeviceLogRetention(limit),
    source: DEVICE_LOG_SOURCE,
    unavailableReason: boundedReason(reason)
  };
}

function unavailableExport(limit: number, reason: string): DeviceLogExport {
  return {
    available: false,
    content: "",
    filename: "solar-display-journal.txt",
    retention: buildDeviceLogRetention(limit),
    source: DEVICE_LOG_SOURCE,
    unavailableReason: boundedReason(reason)
  };
}

function resolveHelperPath(): string {
  const explicit = process.env.DEVICE_LOG_HELPER_PATH?.trim();
  return explicit && explicit.length > 0 ? explicit : DEFAULT_DEVICE_LOG_HELPER_PATH;
}

function shouldUseSudo(): boolean {
  const raw = process.env.DEVICE_LOG_HELPER_USE_SUDO?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "no") {
    return false;
  }
  // Explicit helper path in tests usually runs without sudo.
  if (process.env.DEVICE_LOG_HELPER_PATH?.trim()) {
    return raw === "1" || raw === "true" || raw === "yes";
  }
  return true;
}

export function createDefaultJournalRunner(
  exec: JournalExecFunction = execFileAsync
): JournalRunner {
  return async ({ mode, limit }) => {
    const helperPath = resolveHelperPath();
    if (!existsSync(helperPath)) {
      return {
        exitCode: 127,
        stderr: "journal reader helper is not installed",
        stdout: ""
      };
    }

    const clamped = clampDeviceLogLimit(limit);
    const useSudo = shouldUseSudo();
    const file = useSudo ? "sudo" : helperPath;
    const args = useSudo
      ? ["-n", helperPath, mode, String(clamped)]
      : [mode, String(clamped)];

    try {
      const result = await exec(file, args, {
        encoding: "utf8",
        maxBuffer: 2 * 1024 * 1024,
        timeout: 10_000
      });
      return {
        exitCode: 0,
        stderr: result.stderr ?? "",
        stdout: result.stdout ?? ""
      };
    } catch (error) {
      const err = error as {
        code?: number | string;
        killed?: boolean;
        signal?: string | null;
        message?: string;
        stderr?: string;
        stdout?: string;
      };

      if (err.code === "ENOENT") {
        return {
          exitCode: 127,
          stderr: useSudo ? "sudo is not available" : "journal reader helper is not installed",
          stdout: ""
        };
      }

      const stderr = String(err.stderr ?? err.message ?? "journal reader failed");
      // After the ENOENT (spawn-failure) guard, a numeric non-zero exit code lives
      // on err.code. A timeout (or any signal kill) is reported as the conventional
      // 124 so callers/mapRunnerFailure can distinguish it from a normal failure.
      const exitCode = err.killed || err.signal ? 124 : typeof err.code === "number" ? err.code : 1;

      if (/password is required|a password is required|sudo:\s*a password/i.test(stderr)) {
        return {
          exitCode: 1,
          stderr: "journal access denied",
          stdout: ""
        };
      }

      return {
        exitCode,
        stderr,
        stdout: String(err.stdout ?? "")
      };
    }
  };
}

function priorityToLabel(value: unknown): string {
  const labels = ["emerg", "alert", "crit", "err", "warning", "notice", "info", "debug"];
  if (typeof value === "number" && Number.isFinite(value)) {
    return labels[value] ?? String(value);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const trimmed = value.trim();
    if (/^[0-7]$/.test(trimmed)) {
      return labels[Number.parseInt(trimmed, 10)] ?? trimmed;
    }
    return trimmed;
  }
  return "info";
}

function timestampFromJournalRecord(record: Record<string, unknown>): string {
  const realtime = record.__REALTIME_TIMESTAMP;
  if (typeof realtime === "string" || typeof realtime === "number") {
    const micros = Number(realtime);
    if (Number.isFinite(micros) && micros > 0) {
      return new Date(Math.floor(micros / 1000)).toISOString();
    }
  }

  const syslog = record.SYSLOG_TIMESTAMP;
  if (typeof syslog === "string" && syslog.trim().length > 0) {
    const parsed = new Date(syslog);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date(0).toISOString();
}

function messageFromJournalRecord(record: Record<string, unknown>): string {
  const message = record.MESSAGE;
  if (typeof message === "string") {
    return message;
  }
  if (Array.isArray(message)) {
    return message.map(String).join("");
  }
  return "";
}

export function parseJournalJsonLines(stdout: string): DeviceLogEntry[] {
  const lines = stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const entries: DeviceLogEntry[] = [];

  for (const line of lines) {
    let record: Record<string, unknown>;
    try {
      record = JSON.parse(line) as Record<string, unknown>;
    } catch {
      throw new Error("malformed journal output");
    }

    entries.push({
      message: messageFromJournalRecord(record),
      priority: priorityToLabel(record.PRIORITY),
      timestamp: timestampFromJournalRecord(record)
    });
  }

  return entries;
}

function mapRunnerFailure(stderr: string, exitCode: number): string {
  const text = stderr.replace(/\s+/g, " ").trim().toLowerCase();
  if (exitCode === 127 || text.includes("not installed") || text.includes("no such file")) {
    return "journal reader helper is unavailable";
  }
  if (
    text.includes("journal access denied")
    || text.includes("password is required")
    || text.includes("not allowed")
    || text.includes("permission denied")
  ) {
    return "journal access denied";
  }
  if (text.includes("journalctl is not available") || text.includes("no journal")) {
    return "journald is unavailable";
  }
  return "journald is unavailable";
}

export async function readDeviceLogSummary(
  options: {
    limit?: number;
    runner?: JournalRunner;
  } = {}
): Promise<DeviceLogSummary> {
  const limit = clampDeviceLogLimit(options.limit ?? 20);
  const runner = options.runner ?? createDefaultJournalRunner();

  let result: JournalRunnerResult;
  try {
    result = await runner({ limit, mode: "recent" });
  } catch (error) {
    return unavailableSummary(
      limit,
      error instanceof Error ? error.message : "journald is unavailable"
    );
  }

  if (result.exitCode !== 0) {
    return unavailableSummary(limit, mapRunnerFailure(result.stderr, result.exitCode));
  }

  try {
    const entries = parseJournalJsonLines(result.stdout);
    return {
      available: true,
      entries,
      retention: buildDeviceLogRetention(limit),
      source: DEVICE_LOG_SOURCE,
      unavailableReason: null
    };
  } catch {
    return unavailableSummary(limit, "malformed journal output");
  }
}

export async function exportDeviceLogs(
  options: {
    limit?: number;
    runner?: JournalRunner;
  } = {}
): Promise<DeviceLogExport> {
  const limit = clampDeviceLogLimit(options.limit ?? 200);
  const runner = options.runner ?? createDefaultJournalRunner();
  const filename = `solar-display-journal-${limit}.txt`;

  let result: JournalRunnerResult;
  try {
    result = await runner({ limit, mode: "export" });
  } catch (error) {
    return {
      ...unavailableExport(limit, error instanceof Error ? error.message : "journald is unavailable"),
      filename
    };
  }

  if (result.exitCode !== 0) {
    return {
      ...unavailableExport(limit, mapRunnerFailure(result.stderr, result.exitCode)),
      filename
    };
  }

  return {
    available: true,
    content: result.stdout,
    filename,
    retention: buildDeviceLogRetention(limit),
    source: DEVICE_LOG_SOURCE,
    unavailableReason: null
  };
}
