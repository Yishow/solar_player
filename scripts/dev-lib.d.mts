export function parseDotEnv(content: string): Record<string, string>;

export function readDotEnvFile(filePath: string): Record<string, string>;

export function resolveServerPort(
  dotEnv: Record<string, string | undefined>,
  inheritedEnv?: Record<string, string | undefined>
): number;

export function resolveWebPort(
  dotEnv: Record<string, string | undefined>,
  inheritedEnv?: Record<string, string | undefined>
): number;

export function resolveDevPorts(
  dotEnv: Record<string, string | undefined>,
  inheritedEnv?: Record<string, string | undefined>
): {
  webPort: number;
  serverPort: number;
  portsToFree: number[];
};

export function resolvePnpmCommand(platform?: NodeJS.Platform): string;

export function resolveDevBackendHost(): string;

export function buildPnpmSpawnArgs(args: string[], platform?: NodeJS.Platform): string[];

export function listPidsOnPort(
  port: number,
  options?: {
    platform?: NodeJS.Platform;
    runCommand?: (...args: unknown[]) => {
      error?: Error;
      status: number | null;
      stderr?: unknown;
      stdout?: unknown;
    };
  }
): string[];

export function signalPids(
  pids: string[],
  signal: string,
  options?: {
    platform?: NodeJS.Platform;
    runCommand?: (...args: unknown[]) => {
      error?: Error;
      status: number | null;
      stderr?: unknown;
      stdout?: unknown;
    };
  }
): void;

export function stripAnsi(value: string): string;

export function parseSharedWatchStatusLine(value: string): number | null;

export function isSharedWatchReadyLine(value: string): boolean;
