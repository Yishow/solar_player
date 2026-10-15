import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const defaultSrcRoot = join(packageRoot, "src");

/**
 * Walk a directory tree and collect every `*.test.ts` path relative to `packageRootDir`.
 * Returns a lexical-sorted list. Throws if the root cannot be read.
 */
export function discoverServerTests(srcRoot = defaultSrcRoot, packageRootDir = packageRoot) {
  const collected = [];

  function walk(dir) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch (error) {
      const err = new Error(`Server test discovery failed: cannot read ${dir}: ${error.message}`);
      err.cause = error;
      throw err;
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith(".test.ts")) {
        collected.push(relative(packageRootDir, fullPath).split("\\").join("/"));
      }
    }
  }

  // Fail closed if the root itself is missing or not a directory.
  try {
    const st = statSync(srcRoot);
    if (!st.isDirectory()) {
      throw new Error(`Server test discovery failed: ${srcRoot} is not a directory`);
    }
  } catch (error) {
    if (error.message?.startsWith("Server test discovery failed:")) {
      throw error;
    }
    const err = new Error(`Server test discovery failed: cannot access ${srcRoot}: ${error.message}`);
    err.cause = error;
    throw err;
  }

  walk(srcRoot);
  collected.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return collected;
}

export function resolveTestRunnerCommand(platform = process.platform) {
  return platform === "win32" ? process.execPath : "tsx";
}

export function buildTestRunnerArgs(testTargets, platform = process.platform, testOptions = []) {
  // --test-force-exit: server-startup and similar suites leave MQTT/timers open;
  // without force-exit, Node process isolation never reaps the child after pass.
  const testArgs = [
    ...(platform === "win32" ? ["--import", "tsx"] : []),
    "--test",
    "--test-concurrency=1",
    "--test-force-exit",
    ...testOptions,
    ...testTargets
  ];
  return testArgs;
}

class InvalidTestRunnerArguments extends Error {}

/**
 * Resolve test file targets: explicit argv overrides full discovery.
 * Empty discovery or discovery errors yield a nonzero status without spawning a test runner.
 */
export function resolveTestTargets({
  argv = process.argv,
  discover = () => discoverServerTests(),
  srcRoot,
  packageRootDir
} = {}) {
  const explicit = [];
  const testOptions = [];
  const args = argv.slice(2);

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--test-name-pattern") {
      const pattern = args[index + 1];
      if (!pattern || pattern.startsWith("-")) {
        throw new InvalidTestRunnerArguments(
          "--test-name-pattern requires a non-empty pattern"
        );
      }
      testOptions.push(`--test-name-pattern=${pattern}`);
      index += 1;
      continue;
    }

    if (arg.startsWith("--test-name-pattern=")) {
      const pattern = arg.slice("--test-name-pattern=".length);
      if (!pattern) {
        throw new InvalidTestRunnerArguments(
          "--test-name-pattern requires a non-empty pattern"
        );
      }
      testOptions.push(`--test-name-pattern=${pattern}`);
      continue;
    }

    if (arg.startsWith("-")) {
      throw new InvalidTestRunnerArguments(
        `Unsupported server test runner option: ${arg}`
      );
    }

    explicit.push(arg);
  }

  if (explicit.length > 0) {
    return { targets: explicit, source: "explicit", testOptions };
  }

  const discoverFn =
    srcRoot !== undefined || packageRootDir !== undefined
      ? () =>
          discoverServerTests(
            srcRoot ?? defaultSrcRoot,
            packageRootDir ?? packageRoot
          )
      : discover;

  const targets = discoverFn();
  return { targets, source: "discovery", testOptions };
}

export function runTests({
  argv = process.argv,
  platform = process.platform,
  runCommand = spawnSync,
  discover,
  srcRoot,
  packageRootDir,
  cwd = packageRoot
} = {}) {
  let targets;
  let testOptions;
  try {
    const resolved = resolveTestTargets({
      argv,
      discover,
      srcRoot,
      packageRootDir
    });
    targets = resolved.targets;
    testOptions = resolved.testOptions;
  } catch (error) {
    if (error instanceof InvalidTestRunnerArguments) {
      process.stderr.write(`${error.message}\n`);
    }
    return 1;
  }

  if (!targets || targets.length === 0) {
    return 1;
  }

  const command = resolveTestRunnerCommand(platform);
  const args = buildTestRunnerArgs(targets, platform, testOptions);
  const result = runCommand(command, args, {
    stdio: "inherit",
    cwd
  });

  if (result.error) {
    return 1;
  }

  if (result.signal) {
    return 1;
  }

  return result.status ?? 1;
}

const entryFile = process.argv[1];

if (entryFile && import.meta.url === pathToFileURL(resolve(entryFile)).href) {
  process.exit(runTests());
}
