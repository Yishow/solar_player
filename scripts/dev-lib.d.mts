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

export function stripAnsi(value: string): string;

export function parseSharedWatchStatusLine(value: string): number | null;

export function isSharedWatchReadyLine(value: string): boolean;