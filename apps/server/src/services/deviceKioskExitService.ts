import { execFile } from "node:child_process";
import { accessSync, constants, existsSync } from "node:fs";
import { join } from "node:path";

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

export function scheduleDeviceKioskExit(options: { onError?: (error: Error) => void } = {}) {
  const helperPath = resolveRunnableKioskExitHelperPath();
  setTimeout(() => {
    execFile(helperPath, (error) => {
      if (error) {
        options.onError?.(error);
      }
    });
  }, readExitDelayMs());

  return buildKioskExitResult();
}
