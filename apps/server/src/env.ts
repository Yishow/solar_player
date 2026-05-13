import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export function resolveEnvFilePath(moduleUrl: string): string {
    const entrypointDir = dirname(fileURLToPath(moduleUrl));

    return resolve(entrypointDir, "../../..", ".env");
}