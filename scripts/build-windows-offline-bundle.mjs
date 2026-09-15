#!/usr/bin/env node
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = resolve(import.meta.dirname, "..");
const outputDir = join(projectRoot, "dist", "deploy-bundles");
const stageDir = join(outputDir, "solar-player-windows-x64-offline");
const archivePath = join(outputDir, "solar-player-windows-x64-offline.zip");
const portableStageDir = join(outputDir, "solar-player-windows-x64-portable");
const portableArchivePath = join(outputDir, "solar-player-windows-x64-portable.zip");
const nodeExecutable = join(stageDir, "runtime/node/node.exe");
const cacheDir = process.env.SOLAR_WINDOWS_OFFLINE_CACHE || join(outputDir, ".windows-offline-cache");
const nodeVersion = process.env.SOLAR_WINDOWS_NODE_VERSION || process.versions.node;
const pnpmVersion = "10.33.2";

const nodeArchive = `node-v${nodeVersion}-win-x64.zip`;
const nodeUrl = `https://nodejs.org/dist/v${nodeVersion}/${nodeArchive}`;
const nssmArchive = "nssm-2.24.zip";
const nssmUrl = `https://nssm.cc/release/${nssmArchive}`;
const pnpmArchive = `https://registry.npmjs.org/pnpm/-/pnpm-${pnpmVersion}.tgz`;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: projectRoot, encoding: "utf8", stdio: "pipe", ...options });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed:\n${result.stderr || result.stdout}`);
  }
  return result;
}

function download(url, destination) {
  if (!existsSync(destination)) {
    mkdirSync(dirname(destination), { recursive: true });
    run("curl", ["--fail", "--location", "--retry", "2", "--output", destination, url]);
  }
}

function copyRequired(source, destination) {
  if (!existsSync(source)) throw new Error(`Missing built runtime input: ${source}`);
  cpSync(source, destination, { recursive: true, force: true });
}

function findBetterSqlitePackage(root) {
  // Avoid `find -path`: platform find implementations disagree on separators.
  const pnpmDir = join(root, "node_modules", ".pnpm");
  const candidates = readdirSync(pnpmDir).filter((name) => name.startsWith("better-sqlite3@"));
  for (const candidate of candidates) {
    const packageJson = join(pnpmDir, candidate, "node_modules", "better-sqlite3", "package.json");
    if (existsSync(packageJson)) return dirname(packageJson);
  }
  throw new Error("better-sqlite3 package was not produced by pnpm deploy");
}

function collectPaths(root) {
  const out = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      out.push(full);
      if (!entry.isSymbolicLink() && entry.isDirectory()) stack.push(full);
    }
  }
  return out;
}

function copyTreeWindows(source, destination) {
  // robocopy follows pnpm junctions and tolerates long paths where cp -RL fails on Windows.
  const result = spawnSync("robocopy", [source, destination, "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/NP"], { encoding: "utf8", stdio: "pipe" });
  if (result.status !== null && result.status <= 8) return;
  // robocopy counts the self-referential workspace junction
  // (@solar-display/server -> payload/apps/server) recursion as a failure and
  // may drop unrelated files in the same pass; reconcile every source file.
  try {
    const srcFiles = collectPaths(source).map((p) => [p, p.slice(source.length).toLowerCase()]);
    const dstFiles = new Set(collectPaths(destination).map((p) => p.slice(destination.length).toLowerCase()));
    let repaired = 0;
    for (const [full, rel] of srcFiles) {
      if (dstFiles.has(rel)) continue;
      const target = join(destination, rel);
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(full, target);
      repaired += 1;
    }
    if (repaired > 0) console.log(`robocopy status ${result.status}: reconciled ${repaired} missing path(s)`);
    return;
  } catch (repairError) {
    throw new Error(`robocopy ${source} ${destination} failed (reconcile also failed: ${repairError.message}):\n${result.stderr || result.stdout}`);
  }
}

function materializeRuntimeDependencies(serverDir) {
  const nodeModules = join(serverDir, "node_modules");
  const portableNodeModules = join(serverDir, "node_modules.portable");
  rmSync(portableNodeModules, { recursive: true, force: true });
  copyTreeWindows(join(serverDir, "node_modules"), portableNodeModules);
  rmSync(nodeModules, { recursive: true, force: true });
  renameSync(portableNodeModules, nodeModules);
  const hoistedDependencies = join(nodeModules, ".pnpm", "node_modules");
  for (const dependency of readdirSync(hoistedDependencies)) {
    const source = join(hoistedDependencies, dependency);
    const destination = join(nodeModules, dependency);
    if (dependency.startsWith("@")) {
      mkdirSync(destination, { recursive: true });
      for (const scopedDependency of readdirSync(source)) {
        const scopedDestination = join(destination, scopedDependency);
        if (!existsSync(scopedDestination)) copyTreeWindows(join(source, scopedDependency), scopedDestination);
      }
    } else if (!existsSync(destination)) {
      copyTreeWindows(source, destination);
    }
  }
  const symlinks = run("find", [nodeModules, "-type", "l", "-print"]).stdout.trim();
  if (symlinks) throw new Error(`Portable bundle contains symlinked dependencies:\n${symlinks}`);
}

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function build() {
  for (const path of [join(projectRoot, "apps/server/dist/server.js"), join(projectRoot, "apps/web/dist"), join(projectRoot, "packages/shared/dist")]) {
    if (!existsSync(path)) throw new Error(`Run pnpm build first: ${path}`);
  }
  rmSync(stageDir, { recursive: true, force: true });
  rmSync(archivePath, { force: true });
  rmSync(portableStageDir, { recursive: true, force: true });
  rmSync(portableArchivePath, { force: true });
  mkdirSync(cacheDir, { recursive: true });

  const nodeZip = join(cacheDir, nodeArchive);
  const nssmZip = join(cacheDir, nssmArchive);
  const pnpmTgz = join(cacheDir, `pnpm-${pnpmVersion}.tgz`);
  download(nodeUrl, nodeZip);
  download(nssmUrl, nssmZip);
  download(pnpmArchive, pnpmTgz);

  const payload = join(stageDir, "payload");
  const serverDir = join(payload, "apps", "server");
  mkdirSync(payload, { recursive: true });
  mkdirSync(portableStageDir, { recursive: true });
  run("pnpm", ["--filter", "@solar-display/server", "deploy", "--legacy", "--prod", "--ignore-scripts", "--frozen-lockfile", serverDir]);
  rmSync(join(serverDir, "data"), { recursive: true, force: true });
  rmSync(join(serverDir, "logs"), { recursive: true, force: true });
  rmSync(join(serverDir, "uploads"), { recursive: true, force: true });
  materializeRuntimeDependencies(serverDir);
  copyRequired(join(projectRoot, "apps/server/dist"), join(serverDir, "dist"));
  copyRequired(join(projectRoot, "apps/server/src/db/migrations"), join(serverDir, "src/db/migrations"));
  copyRequired(join(projectRoot, "apps/web/dist"), join(payload, "apps/web/dist"));
  copyRequired(join(projectRoot, "packages/shared/dist"), join(payload, "packages/shared/dist"));
  copyRequired(join(projectRoot, "packages/shared/package.json"), join(payload, "packages/shared/package.json"));
  copyRequired(join(projectRoot, "docs/openapi.yaml"), join(payload, "docs/openapi.yaml"));
  copyRequired(join(projectRoot, ".env.example"), join(payload, ".env.example"));
  copyRequired(join(projectRoot, "deploy/windows-offline/Install-SolarPlayer.ps1"), join(stageDir, "Install-SolarPlayer.ps1"));
  copyRequired(join(projectRoot, "deploy/windows-offline/Start-SolarPlayer.cmd"), join(portableStageDir, "Start-SolarPlayer.cmd"));
  copyRequired(join(projectRoot, "deploy/windows-offline/Manage-SolarPlayer.ps1"), join(portableStageDir, "Manage-SolarPlayer.ps1"));

  const sqlitePackagePath = findBetterSqlitePackage(serverDir);
  const sqliteVersion = JSON.parse(readFileSync(join(sqlitePackagePath, "package.json"), "utf8")).version;
  const sqliteBinary = join(sqlitePackagePath, "prebuilds/win32-x64.node");
  if (!existsSync(sqliteBinary)) throw new Error(`Windows x64 better-sqlite3 prebuild is missing: ${sqliteBinary}`);
  const keptSuffix = `${sep}better-sqlite3${sep}prebuilds${sep}win32-x64.node`.toLowerCase();
  const deleteOtherNodeBinaries = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) deleteOtherNodeBinaries(full);
      else if (entry.name.endsWith(".node") && !full.toLowerCase().endsWith(keptSuffix)) rmSync(full, { force: true });
    }
  };
  deleteOtherNodeBinaries(serverDir);

  const nodeExtract = join(cacheDir, "node-win-x64");
  rmSync(nodeExtract, { recursive: true, force: true });
  mkdirSync(nodeExtract, { recursive: true });
  run("unzip", ["-q", nodeZip, "-d", nodeExtract]);
  copyRequired(join(nodeExtract, `node-v${nodeVersion}-win-x64`), join(stageDir, "runtime/node"));
  if (!existsSync(nodeExecutable)) throw new Error(`Portable node.exe is missing from ${nodeExecutable}`);

  const nssmExtract = join(cacheDir, "nssm");
  rmSync(nssmExtract, { recursive: true, force: true });
  mkdirSync(nssmExtract, { recursive: true });
  run("unzip", ["-q", nssmZip, "-d", nssmExtract]);
  copyRequired(join(nssmExtract, "nssm-2.24/win64/nssm.exe"), join(stageDir, "runtime/nssm/nssm.exe"));

  const pnpmExtract = join(cacheDir, "pnpm");
  rmSync(pnpmExtract, { recursive: true, force: true });
  mkdirSync(pnpmExtract, { recursive: true });
  run("tar", ["-xzf", pnpmTgz, "-C", pnpmExtract]);
  copyRequired(join(pnpmExtract, "package"), join(stageDir, "runtime/pnpm"));
  run("find", [join(stageDir, "runtime/pnpm"), "-name", "*darwin*", "-delete"]);

  const manifest = {
    nodeVersion,
    pnpmVersion,
    sqliteVersion,
    defaultPort: 4000,
    sha256: {
      node: sha256(nodeZip),
      nssm: sha256(nssmZip),
      pnpm: sha256(pnpmTgz),
      betterSqlite3: sha256(sqliteBinary)
    }
  };
  writeFileSync(join(stageDir, "bundle-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  copyRequired(payload, portableStageDir);
  copyRequired(join(stageDir, "runtime"), join(portableStageDir, "runtime"));
  writeFileSync(join(portableStageDir, "bundle-manifest.json"), `${JSON.stringify({ ...manifest, mode: "portable" }, null, 2)}\n`);
  // Info-ZIP prefers -qry; the Windows zip port lacks -y and spawnSync cannot
  // launch .cmd wrappers, so fall back to 7-Zip when Info-ZIP is unusable.
  const zipDir = (archivePath, dirName) => {
    try {
      run("zip", ["-qry", archivePath, dirName], { cwd: outputDir });
    } catch {
      run("7z", ["a", "-tzip", "-y", archivePath, dirName], { cwd: outputDir });
    }
  };
  zipDir(archivePath, basename(stageDir));
  zipDir(portableArchivePath, basename(portableStageDir));
  console.log(`Built ${archivePath}`);
  console.log(`sha256=${sha256(archivePath)}`);
  console.log(`Built ${portableArchivePath}`);
  console.log(`sha256=${sha256(portableArchivePath)}`);
}

build();
