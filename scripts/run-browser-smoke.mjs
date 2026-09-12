#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  createWriteStream,
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync
} from "node:fs";
import { copyFile, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SMOKE_HOST = "127.0.0.1";
const SMOKE_PORT = 3310;
const BASE_URL = `http://${SMOKE_HOST}:${SMOKE_PORT}`;
const ARTIFACT_ROOT = path.join(repoRoot, "artifacts", "browser-smoke");
const PRODUCTION_DATABASE = path.join(repoRoot, "data", "solar-display.sqlite");
const PRODUCTION_UPLOADS = path.join(repoRoot, "uploads", "images");
const PRODUCTION_BRAND_UPLOADS = path.join(repoRoot, "uploads", "brand");
const PRODUCTION_WEB_DIST = path.join(repoRoot, "apps/web/dist");

function createRunId() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${stamp}-${suffix}`;
}

function hashPathIfPresent(targetPath) {
  if (!existsSync(targetPath) || !statSync(targetPath).isFile()) {
    return null;
  }

  return createHash("sha256").update(readFileSync(targetPath)).digest("hex");
}

function hashDirectorySnapshot(targetDir) {
  if (!existsSync(targetDir)) {
    return null;
  }

  const entries = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, name.name);
      if (name.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (!name.isFile()) {
        continue;
      }
      const relative = path.relative(targetDir, fullPath);
      const digest = createHash("sha256").update(readFileSync(fullPath)).digest("hex");
      entries.push(`${relative}:${digest}`);
    }
  };

  walk(targetDir);
  entries.sort();
  return createHash("sha256").update(entries.join("\n")).digest("hex");
}

function isPortFree(host, port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.unref();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

async function waitForHealth(url, { timeoutMs = 60_000, intervalMs = 250 } = {}) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) {
        return;
      }
      lastError = new Error(`health responded ${response.status}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    `Server health check timed out after ${timeoutMs}ms (${lastError?.message ?? "unknown"})`
  );
}

async function loadBrowserExecutable(browserName) {
  try {
    const playwright = await import("playwright");
    const browserType = playwright[browserName];
    const executablePath = browserType.executablePath();
    if (!executablePath || !existsSync(executablePath)) {
      throw new Error(`${browserName} executable missing at ${executablePath ?? "(unknown)"}`);
    }
    return executablePath;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      [
        `Playwright ${browserName} is unavailable for browser smoke.`,
        `Run \`pnpm install\`, then \`pnpm exec playwright install ${browserName}\`, and retry \`pnpm browser:smoke\`.`,
        detail
      ].join(" ")
    );
  }
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? repoRoot,
      env: options.env ?? process.env,
      stdio: options.stdio ?? "inherit"
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${command} exited via signal ${signal}`));
        return;
      }
      resolve(code ?? 1);
    });
  });
}

function spawnServer({ env, logPath }) {
  const logStream = createWriteStream(logPath, { flags: "a" });
  const child = spawn(process.execPath, [path.join(repoRoot, "apps/server/dist/server.js")], {
    cwd: repoRoot,
    env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  child.stdout?.pipe(logStream, { end: false });
  child.stderr?.pipe(logStream, { end: false });
  child.stdout?.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr?.on("data", (chunk) => process.stderr.write(chunk));

  const exitPromise = new Promise((resolve) => {
    child.once("exit", (code, signal) => {
      logStream.end();
      resolve({ code, signal });
    });
  });

  return {
    child,
    exitPromise,
    logPath,
    async stop() {
      if (child.exitCode !== null || child.killed) {
        await exitPromise;
        return;
      }

      child.kill("SIGTERM");
      const forceTimer = setTimeout(() => {
        if (child.exitCode === null) {
          child.kill("SIGKILL");
        }
      }, 5_000);
      forceTimer.unref?.();
      await exitPromise;
      clearTimeout(forceTimer);
    }
  };
}

async function pathExists(targetPath) {
  try {
    await readdir(targetPath);
    return true;
  } catch {
    return existsSync(targetPath);
  }
}

async function collectFailureArtifacts({
  artifactDir,
  playwrightOutputDir,
  serverLogPath,
  consoleLogPath,
  networkLogPath
}) {
  await mkdir(artifactDir, { recursive: true });

  const copies = [];
  if (existsSync(serverLogPath)) {
    const dest = path.join(artifactDir, "server.log");
    await copyFile(serverLogPath, dest);
    copies.push(dest);
  }
  if (existsSync(consoleLogPath)) {
    const dest = path.join(artifactDir, "browser-console.log");
    await copyFile(consoleLogPath, dest);
    copies.push(dest);
  }
  if (existsSync(networkLogPath)) {
    const dest = path.join(artifactDir, "network-summary.json");
    await copyFile(networkLogPath, dest);
    copies.push(dest);
  }

  if (existsSync(playwrightOutputDir)) {
    const walkCopy = async (fromDir, toDir) => {
      await mkdir(toDir, { recursive: true });
      for (const entry of await readdir(fromDir, { withFileTypes: true })) {
        const from = path.join(fromDir, entry.name);
        const to = path.join(toDir, entry.name);
        if (entry.isDirectory()) {
          await walkCopy(from, to);
        } else if (entry.isFile()) {
          await copyFile(from, to);
          copies.push(to);
        }
      }
    };
    await walkCopy(playwrightOutputDir, path.join(artifactDir, "playwright"));
  }

  const hasScreenshot = copies.some((filePath) => /\.(png|jpe?g|webp)$/i.test(filePath));
  const hasConsole = copies.some((filePath) => /browser-console\.log$/.test(filePath));
  const hasNetwork = copies.some((filePath) => /network-summary\.json$/.test(filePath));
  const hasServer = copies.some((filePath) => /server\.log$/.test(filePath));

  await writeFile(
    path.join(artifactDir, "evidence-index.json"),
    JSON.stringify(
      {
        hasConsole,
        hasNetwork,
        hasScreenshot,
        hasServer,
        files: copies.map((filePath) => path.relative(artifactDir, filePath)),
        generatedAt: new Date().toISOString()
      },
      null,
      2
    )
  );

  return {
    hasConsole,
    hasNetwork,
    hasScreenshot,
    hasServer,
    directory: artifactDir
  };
}

async function main() {
  const runId = process.env.BROWSER_SMOKE_RUN_ID?.trim() || createRunId();
  const skipBuild = process.env.BROWSER_SMOKE_SKIP_BUILD === "1";
  const keepArtifactsOnSuccess = process.env.BROWSER_SMOKE_KEEP_SUCCESS_ARTIFACTS === "1";
  const artifactDir = path.join(ARTIFACT_ROOT, runId);
  const workRoot = await mkdtemp(path.join(tmpdir(), "solar-browser-smoke-"));
  const dataDir = path.join(workRoot, "data");
  const databasePath = path.join(dataDir, "solar-display.sqlite");
  const uploadsDir = path.join(workRoot, "uploads", "images");
  const brandUploadsDir = path.join(workRoot, "uploads", "brand");
  const runtimeDir = path.join(workRoot, "runtime");
  const playwrightOutputDir = path.join(workRoot, "playwright-output");
  const serverLogPath = path.join(workRoot, "server.log");
  const consoleLogPath = path.join(workRoot, "browser-console.log");
  const envFilePath = path.join(workRoot, "browser-smoke.env");
  const networkLogPath = path.join(workRoot, "network-summary.json");
  const runtimeManifestPath = path.join(runtimeDir, "runtime-manifest.json");
  const serverControlPath = path.join(runtimeDir, "server-control.json");
  const serverControlStatusPath = path.join(runtimeDir, "server-control-status.json");
  const webDistDir = skipBuild
    ? PRODUCTION_WEB_DIST
    : path.join(workRoot, "web-dist");

  await mkdir(dataDir, { recursive: true });
  await mkdir(uploadsDir, { recursive: true });
  await mkdir(brandUploadsDir, { recursive: true });
  await mkdir(runtimeDir, { recursive: true });
  await mkdir(playwrightOutputDir, { recursive: true });
  await mkdir(artifactDir, { recursive: true });
  await writeFile(envFilePath, "");

  const productionDbHashBefore = hashPathIfPresent(PRODUCTION_DATABASE);
  const productionUploadsHashBefore = hashDirectorySnapshot(PRODUCTION_UPLOADS);
  const productionBrandHashBefore = hashDirectorySnapshot(PRODUCTION_BRAND_UPLOADS);
  const productionWebDistHashBefore = hashDirectorySnapshot(PRODUCTION_WEB_DIST);

  console.log(`[browser-smoke] run-id=${runId}`);
  console.log(`[browser-smoke] base-url=${BASE_URL}`);
  console.log(`[browser-smoke] temp-root=${workRoot}`);
  console.log(`[browser-smoke] database=${databasePath}`);
  console.log(`[browser-smoke] uploads=${uploadsDir}`);
  console.log(`[browser-smoke] brand-uploads=${brandUploadsDir}`);
  console.log(`[browser-smoke] web-dist=${webDistDir}`);

  let serverHandle = null;
  let exitCode = 1;
  let failureEvidence = null;
  let originalError = null;
  let serverControlTimer = null;

  try {
    if (!(await isPortFree(SMOKE_HOST, SMOKE_PORT))) {
      throw new Error(
        `Port ${SMOKE_PORT} on ${SMOKE_HOST} is already in use. Free it before running browser smoke (runner will not kill other processes).`
      );
    }

    const browserName = process.env.BROWSER_SMOKE_ENGINE === "firefox"
      ? "firefox"
      : "chromium";
    const browserPath = await loadBrowserExecutable(browserName);
    console.log(`[browser-smoke] ${browserName}=${browserPath}`);

    if (!skipBuild) {
      // Emit the same production assets as `pnpm build` (shared → web dist → server dist).
      // Web uses `vite build` directly so ambient package-level `tsc --noEmit` failures from
      // unrelated WIP on the branch cannot block isolated smoke asset emission.
      console.log("[browser-smoke] building production assets (shared → web vite → server)...");
      const buildEnv = {
        ...process.env,
        FORCE_COLOR: process.env.FORCE_COLOR ?? "0"
      };
      const sharedCode = await runCommand("pnpm", ["run", "build:shared"], { env: buildEnv });
      if (sharedCode !== 0) {
        throw new Error(`Shared build failed with exit code ${sharedCode}`);
      }
      const webCode = await runCommand(
        "pnpm",
        ["--filter", "@solar-display/web", "exec", "vite", "build", "--outDir", webDistDir],
        { env: buildEnv }
      );
      if (webCode !== 0) {
        throw new Error(`Web vite build failed with exit code ${webCode}`);
      }
      const serverCode = await runCommand("pnpm", ["run", "build:server"], { env: buildEnv });
      if (serverCode !== 0) {
        throw new Error(`Server build failed with exit code ${serverCode}`);
      }
    } else {
      console.log("[browser-smoke] skipping build (BROWSER_SMOKE_SKIP_BUILD=1)");
    }

    if (!existsSync(path.join(repoRoot, "apps/server/dist/server.js"))) {
      throw new Error("Missing apps/server/dist/server.js after build");
    }
    if (!existsSync(path.join(webDistDir, "index.html"))) {
      throw new Error(`Missing ${path.join(webDistDir, "index.html")} after build`);
    }

    const runtimeManifest = {
      artifactDir,
      baseUrl: BASE_URL,
      brandUploadsDir,
      consoleLogPath,
      dataDir,
      databasePath,
      host: SMOKE_HOST,
      mqttDataMode: "mock",
      networkLogPath,
      port: SMOKE_PORT,
      runId,
      serverControlPath,
      serverControlStatusPath,
      uploadsDir,
      webDistDir,
      workRoot
    };
    await writeFile(runtimeManifestPath, JSON.stringify(runtimeManifest, null, 2));

    const serverEnv = {
      ...process.env,
      BRAND_UPLOADS_DIR: brandUploadsDir,
      DATA_DIR: dataDir,
      DATABASE_PATH: databasePath,
      HOST: SMOKE_HOST,
      MQTT_DATA_MODE: "mock",
      NODE_ENV: "production",
      PORT: String(SMOKE_PORT),
      SOLAR_DISPLAY_ENV_FILE: envFilePath,
      UPLOADS_DIR: uploadsDir,
      WEB_DIST_DIR: webDistDir
    };
    // Isolation: never inherit a management token from the ambient shell/.env.
    delete serverEnv.MANAGEMENT_ACCESS_TOKEN;

    console.log("[browser-smoke] starting isolated server...");
    serverHandle = spawnServer({ env: serverEnv, logPath: serverLogPath });

    const earlyExit = await Promise.race([
      serverHandle.exitPromise.then((result) => result),
      waitForHealth(`${BASE_URL}/health`).then(() => null)
    ]);

    if (earlyExit) {
      throw new Error(
        `Server exited before becoming ready (code=${earlyExit.code}, signal=${earlyExit.signal}). See ${serverLogPath}`
      );
    }

    let handledControlId = null;
    let handlingControl = false;
    serverControlTimer = setInterval(async () => {
      if (handlingControl || !existsSync(serverControlPath)) return;
      handlingControl = true;
      try {
        const command = JSON.parse(
          await readFile(serverControlPath, "utf8")
        );
        if (!command?.id || command.id === handledControlId) return;
        if (command.action === "stop") {
          await serverHandle?.stop();
          serverHandle = null;
        } else if (command.action === "start") {
          if (!serverHandle) {
            serverHandle = spawnServer({ env: serverEnv, logPath: serverLogPath });
            await waitForHealth(`${BASE_URL}/health`);
          }
        } else {
          throw new Error(`Unknown server control action: ${command.action}`);
        }
        handledControlId = command.id;
        await writeFile(serverControlStatusPath, JSON.stringify({
          action: command.action,
          id: command.id,
          status: "completed"
        }));
      } catch (error) {
        await writeFile(serverControlStatusPath, JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
          status: "failed"
        }));
      } finally {
        handlingControl = false;
      }
    }, 100);
    serverControlTimer.unref?.();

    console.log("[browser-smoke] health ok; launching Playwright (workers=1)...");
    const playwrightEnv = {
      ...process.env,
      BROWSER_SMOKE_ARTIFACT_DIR: artifactDir,
      BROWSER_SMOKE_BASE_URL: BASE_URL,
      BROWSER_SMOKE_CONSOLE_LOG: consoleLogPath,
      BROWSER_SMOKE_NETWORK_LOG: networkLogPath,
      BROWSER_SMOKE_RUNTIME_MANIFEST: runtimeManifestPath,
      BROWSER_SMOKE_RUN_ID: runId,
      PLAYWRIGHT_HTML_REPORT: path.join(workRoot, "playwright-report")
    };

    const browserSmokeArgs = [
      "exec",
      "playwright",
      "test",
      "--config",
      "playwright.config.ts",
      "--output",
      playwrightOutputDir,
      "--workers=1",
      "--reporter=line"
    ];
    if (process.env.BROWSER_SMOKE_GREP) {
      browserSmokeArgs.push("--grep", process.env.BROWSER_SMOKE_GREP);
    }
    exitCode = await runCommand(
      "pnpm",
      browserSmokeArgs,
      {
        env: playwrightEnv
      }
    );

    if (exitCode !== 0) {
      failureEvidence = await collectFailureArtifacts({
        artifactDir,
        consoleLogPath,
        networkLogPath,
        playwrightOutputDir,
        serverLogPath
      });
      console.error(
        `[browser-smoke] FAILED run-id=${runId} artifacts=${failureEvidence.directory}`
      );
      console.error(
        `[browser-smoke] evidence types: screenshot=${failureEvidence.hasScreenshot} console=${failureEvidence.hasConsole} network=${failureEvidence.hasNetwork} server=${failureEvidence.hasServer}`
      );
    } else {
      console.log(`[browser-smoke] PASSED run-id=${runId}`);
    }
  } catch (error) {
    originalError = error instanceof Error ? error : new Error(String(error));
    exitCode = 1;
    try {
      failureEvidence = await collectFailureArtifacts({
        artifactDir,
        consoleLogPath,
        networkLogPath,
        playwrightOutputDir,
        serverLogPath
      });
      console.error(
        `[browser-smoke] FAILED run-id=${runId} artifacts=${failureEvidence.directory}`
      );
    } catch (collectError) {
      console.error(
        `[browser-smoke] also failed collecting artifacts: ${
          collectError instanceof Error ? collectError.message : String(collectError)
        }`
      );
    }
    console.error(
      `[browser-smoke] ${originalError.stack ?? originalError.message}`
    );
  } finally {
    if (serverControlTimer) {
      clearInterval(serverControlTimer);
    }
    let cleanupError = null;
    try {
      if (serverHandle) {
        await serverHandle.stop();
      }
    } catch (error) {
      cleanupError = error instanceof Error ? error : new Error(String(error));
    }

    const productionDbHashAfter = hashPathIfPresent(PRODUCTION_DATABASE);
    const productionUploadsHashAfter = hashDirectorySnapshot(PRODUCTION_UPLOADS);
    const productionBrandHashAfter = hashDirectorySnapshot(PRODUCTION_BRAND_UPLOADS);
    const productionWebDistHashAfter = hashDirectorySnapshot(PRODUCTION_WEB_DIST);

    if (
      productionDbHashBefore !== productionDbHashAfter
      || productionUploadsHashBefore !== productionUploadsHashAfter
      || productionBrandHashBefore !== productionBrandHashAfter
      || productionWebDistHashBefore !== productionWebDistHashAfter
    ) {
      const driftError = new Error(
        "Production database/uploads/web-dist hash changed during browser smoke; isolation contract broken."
      );
      originalError = originalError ?? driftError;
      exitCode = 1;
      console.error(`[browser-smoke] ${driftError.message}`);
    }

    if (exitCode === 0 && !keepArtifactsOnSuccess) {
      try {
        if (await pathExists(artifactDir)) {
          await rm(artifactDir, { recursive: true, force: true });
        }
      } catch (error) {
        cleanupError =
          cleanupError
          ?? (error instanceof Error ? error : new Error(String(error)));
      }
    }

    try {
      await rm(workRoot, { recursive: true, force: true });
    } catch (error) {
      cleanupError =
        cleanupError
        ?? (error instanceof Error ? error : new Error(String(error)));
    }

    if (cleanupError) {
      console.error(
        `[browser-smoke] cleanup failed: ${cleanupError.stack ?? cleanupError.message}`
      );
      // Cleanup failure must not hide the original failure, but still exits nonzero.
      if (exitCode === 0) {
        exitCode = 1;
      }
    }
  }

  process.exit(exitCode);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
