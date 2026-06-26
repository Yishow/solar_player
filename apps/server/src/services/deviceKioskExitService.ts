import { exec, execFile } from "node:child_process";
import { accessSync, constants, existsSync } from "node:fs";
import { extname, join } from "node:path";

const DEFAULT_EXIT_DELAY_MS = 750;

export const KIOSK_LAUNCHER_NAME = "Solar Display Kiosk";
export const KIOSK_REENTRY_HINT = `回到桌面後點擊 ${KIOSK_LAUNCHER_NAME} 重新進入。`;

export class KioskExitUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KioskExitUnavailableError";
  }
}

function resolveKioskExitHelperCandidates() {
  const kioskUser = process.env.KIOSK_USER?.trim() || "pi";
  const explicitHelperPath = process.env.KIOSK_EXIT_HELPER_PATH?.trim();
  const installedHelperPath = `/home/${kioskUser}/bin/stop-solar-kiosk.sh`;
  const bundledHelperPath = join(process.cwd(), "deploy", "stop-solar-kiosk.sh");

  return [explicitHelperPath, installedHelperPath, bundledHelperPath].filter(
    (value, index, values): value is string => Boolean(value) && values.indexOf(value) === index
  );
}

function resolveRunnableKioskExitHelperPath() {
  const helperCandidates = resolveKioskExitHelperCandidates();

  for (const helperPath of helperCandidates) {
    if (!existsSync(helperPath)) {
      continue;
    }

    try {
      accessSync(helperPath, constants.X_OK);
      return helperPath;
    } catch {
      continue;
    }
  }

  throw new KioskExitUnavailableError(
    `Kiosk exit helper is unavailable. Expected one of: ${helperCandidates.join(", ")}`
  );
}

function readExitDelayMs() {
  const parsed = Number.parseInt(process.env.KIOSK_EXIT_DELAY_MS ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_EXIT_DELAY_MS;
}

function buildKioskExitResult() {
  return {
    scheduled: true,
    launcherName: KIOSK_LAUNCHER_NAME,
    reentryHint: KIOSK_REENTRY_HINT
  };
}

function resolveKioskExitInvocation(helperPath: string) {
  const extension = extname(helperPath).toLowerCase();

  if (process.platform !== "win32") {
    return {
      args: [] as string[],
      file: helperPath,
      kind: "execFile" as const
    };
  }

  if (extension === ".ps1") {
    return {
      args: ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", helperPath],
      file: "powershell.exe",
      kind: "execFile" as const
    };
  }

  if (extension === ".cmd" || extension === ".bat") {
    return {
      command: `"${helperPath}"`,
      kind: "exec" as const
    };
  }

  return {
    args: [] as string[],
    file: helperPath,
    kind: "execFile" as const
  };
}

export function scheduleDeviceKioskExit(options: { onError?: (error: Error) => void } = {}) {
  const helperPath = resolveRunnableKioskExitHelperPath();
  const invocation = resolveKioskExitInvocation(helperPath);
  setTimeout(() => {
    try {
      if (invocation.kind === "exec") {
        exec(invocation.command, (error) => {
          if (error) {
            options.onError?.(error);
          }
        });
        return;
      }

      execFile(invocation.file, invocation.args, (error) => {
        if (error) {
          options.onError?.(error);
        }
      });
    } catch (error) {
      if (error instanceof Error) {
        options.onError?.(error);
      } else {
        options.onError?.(new Error(String(error)));
      }
    }
  }, readExitDelayMs());

  return buildKioskExitResult();
}
