#!/usr/bin/env node
/**
 * Generate release-manifest.json for a production deploy bundle.
 *
 * Usage:
 *   node scripts/generate-release-manifest.mjs [--out path] [--project-root path]
 *
 * Fields: releaseId, commit, builtAt, packageVersion, schemaVersion, sourceDirty
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultProjectRoot = resolve(scriptDir, "..");

function parseArgs(argv) {
  let projectRoot = defaultProjectRoot;
  let outPath = null;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--project-root") {
      projectRoot = resolve(argv[++i] ?? "");
      continue;
    }
    if (arg === "--out") {
      outPath = resolve(argv[++i] ?? "");
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      process.stdout.write(
        "Usage: node scripts/generate-release-manifest.mjs [--out path] [--project-root path]\n"
      );
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return {
    outPath: outPath ?? join(projectRoot, "release-manifest.json"),
    projectRoot
  };
}

function runGit(projectRoot, args) {
  const result = spawnSync("git", args, {
    cwd: projectRoot,
    encoding: "utf8"
  });
  return result;
}

function readCommit(projectRoot) {
  const result = runGit(projectRoot, ["rev-parse", "HEAD"]);
  if (result.status !== 0) {
    throw new Error(
      `Unable to read git commit: ${(result.stderr || result.stdout || "git rev-parse failed").trim()}`
    );
  }
  const commit = result.stdout.trim();
  if (!/^[0-9a-f]{7,40}$/i.test(commit)) {
    throw new Error(`Unexpected git commit identifier: ${commit}`);
  }
  return commit;
}

function readSourceDirty(projectRoot) {
  const result = runGit(projectRoot, ["status", "--porcelain"]);
  if (result.status !== 0) {
    throw new Error(
      `Unable to read git status: ${(result.stderr || result.stdout || "git status failed").trim()}`
    );
  }
  return result.stdout.trim().length > 0;
}

function readPackageVersion(projectRoot) {
  const packagePath = join(projectRoot, "apps/server/package.json");
  if (!existsSync(packagePath)) {
    throw new Error(`Missing server package.json at ${packagePath}`);
  }
  const raw = JSON.parse(readFileSync(packagePath, "utf8"));
  const version = typeof raw.version === "string" ? raw.version.trim() : "";
  if (!version) {
    throw new Error("apps/server/package.json is missing a version field");
  }
  return version;
}

function readHighestSchemaVersion(projectRoot) {
  const migrationsDir = join(projectRoot, "apps/server/src/db/migrations");
  if (!existsSync(migrationsDir)) {
    throw new Error(`Missing migrations directory at ${migrationsDir}`);
  }

  const versions = readdirSync(migrationsDir)
    .map((name) => {
      const match = name.match(/^(\d+)_.*\.sql$/);
      return match ? Number.parseInt(match[1], 10) : null;
    })
    .filter((value) => Number.isFinite(value));

  if (versions.length === 0) {
    throw new Error(`No numeric migration files found in ${migrationsDir}`);
  }

  return Math.max(...versions);
}

export function buildReleaseManifest(options = {}) {
  const projectRoot = resolve(options.projectRoot ?? defaultProjectRoot);
  const builtAt = options.builtAt ?? new Date().toISOString();
  const commit = options.commit ?? readCommit(projectRoot);
  const sourceDirty =
    typeof options.sourceDirty === "boolean" ? options.sourceDirty : readSourceDirty(projectRoot);
  const packageVersion = options.packageVersion ?? readPackageVersion(projectRoot);
  const schemaVersion =
    typeof options.schemaVersion === "number"
      ? options.schemaVersion
      : readHighestSchemaVersion(projectRoot);

  if (!Number.isInteger(schemaVersion) || schemaVersion < 0) {
    throw new Error(`Invalid schemaVersion: ${schemaVersion}`);
  }

  const shortCommit = commit.slice(0, 12);
  const releaseId = `${packageVersion}+${shortCommit}${sourceDirty ? "-dirty" : ""}`;

  return {
    releaseId,
    commit,
    builtAt,
    packageVersion,
    schemaVersion,
    sourceDirty
  };
}

export function writeReleaseManifest(options = {}) {
  const projectRoot = resolve(options.projectRoot ?? defaultProjectRoot);
  const outPath = resolve(options.outPath ?? join(projectRoot, "release-manifest.json"));
  const manifest = buildReleaseManifest({ ...options, projectRoot });
  writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { manifest, outPath };
}

const isDirectRun =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const { manifest, outPath } = writeReleaseManifest(args);
    process.stdout.write(`Wrote release manifest to ${outPath}\n`);
    process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}
