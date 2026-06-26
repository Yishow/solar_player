import { dirname, posix, resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";

function isWindowsDrivePathname(pathname: string) {
    return /^\/[A-Za-z]:\//.test(pathname);
}

export function resolveEnvFilePath(moduleUrl: string): string {
    const url = new URL(moduleUrl);

    if (url.protocol !== "file:") {
        throw new TypeError(`Unsupported module URL protocol: ${url.protocol}`);
    }

    const pathname = decodeURIComponent(url.pathname);

    if (!isWindowsDrivePathname(pathname)) {
        return posix.resolve(posix.dirname(pathname), "../../..", ".env");
    }

    const entrypointDir = dirname(fileURLToPath(url));

    return resolve(entrypointDir, "../../..", ".env");
}