import { execFileSync } from "node:child_process";
import { closeSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type RuntimeLockPayload = {
  bootSessionId?: string;
  createdAt: string;
  pid: number;
  token: string;
};

export type ServerRuntimeGuardOptions = {
  bootSessionId?: () => string | null;
  dataDir: string;
  now?: () => Date;
  pid?: number;
  token?: string;
};

function buildLockPath(dataDir: string) {
  return join(dataDir, "server-runtime.lock.json");
}

function isProcessAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const code = error instanceof Error && "code" in error ? error.code : null;
    if (code === "EPERM") {
      return true;
    }

    return false;
  }
}

function readLockPayload(lockPath: string): RuntimeLockPayload | null {
  try {
    const payload = JSON.parse(readFileSync(lockPath, "utf8")) as Partial<RuntimeLockPayload>;

    if (
      typeof payload.pid !== "number"
      || typeof payload.token !== "string"
      || typeof payload.createdAt !== "string"
    ) {
      return null;
    }

    return {
      bootSessionId: typeof payload.bootSessionId === "string" ? payload.bootSessionId : undefined,
      createdAt: payload.createdAt,
      pid: payload.pid,
      token: payload.token
    };
  } catch {
    return null;
  }
}

function writeLockPayload(lockPath: string, payload: RuntimeLockPayload) {
  const fd = openSync(lockPath, "wx");

  try {
    writeFileSync(fd, JSON.stringify(payload));
  } finally {
    closeSync(fd);
  }
}

function resolveBootSessionId() {
  if (process.platform === "linux") {
    try {
      const bootId = readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim();
      return bootId || null;
    } catch {
      return null;
    }
  }

  if (process.platform === "darwin") {
    try {
      const bootSessionId = execFileSync("sysctl", ["-n", "kern.bootsessionuuid"], {
        encoding: "utf8"
      }).trim();
      return bootSessionId || null;
    } catch {
      return null;
    }
  }

  return null;
}

function lockComesFromDifferentBoot(
  activePayload: RuntimeLockPayload,
  currentBootSessionId: string | null
) {
  return Boolean(
    currentBootSessionId
    && activePayload.bootSessionId
    && activePayload.bootSessionId !== currentBootSessionId
  );
}

export function acquireServerRuntimeGuard(options: ServerRuntimeGuardOptions) {
  mkdirSync(options.dataDir, { recursive: true });

  const lockPath = buildLockPath(options.dataDir);
  const bootSessionId = (options.bootSessionId ?? resolveBootSessionId)();
  const pid = options.pid ?? process.pid;
  const token = options.token ?? `${pid}-${Math.random().toString(16).slice(2, 10)}`;
  const now = options.now ?? (() => new Date());
  const payload: RuntimeLockPayload = {
    ...(bootSessionId ? { bootSessionId } : {}),
    createdAt: now().toISOString(),
    pid,
    token
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      writeLockPayload(lockPath, payload);

      return () => {
        const activePayload = readLockPayload(lockPath);
        if (!activePayload || activePayload.token !== token) {
          return;
        }

        rmSync(lockPath, { force: true });
      };
    } catch (error) {
      const code = error instanceof Error && "code" in error ? error.code : null;
      if (code !== "EEXIST") {
        throw error;
      }

      const activePayload = readLockPayload(lockPath);
      if (
        !activePayload
        || !isProcessAlive(activePayload.pid)
        || lockComesFromDifferentBoot(activePayload, bootSessionId)
      ) {
        rmSync(lockPath, { force: true });
        continue;
      }

      throw new Error(
        `Another solar-display backend is already running (pid ${activePayload.pid}, started ${activePayload.createdAt}, lock ${lockPath}). Stop it before starting a new server.`
      );
    }
  }

  throw new Error("Failed to acquire solar-display backend runtime lock.");
}
