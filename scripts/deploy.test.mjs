import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "..");
const deployScriptPath = path.join(repoRoot, "deploy.sh");
const exportScriptPath = path.join(repoRoot, "deploy/export-runtime-state.sh");
const restoreScriptPath = path.join(repoRoot, "deploy/restore-runtime-state.sh");
const resetDbScriptPath = path.join(repoRoot, "deploy/reset-db-settings.sh");
const browserSmokeRunnerPath = path.join(repoRoot, "scripts/run-browser-smoke.mjs");
const raspiDeployScriptPath = path.join(repoRoot, "scripts/raspi-onekey-deploy.sh");
const prepareUserDataScriptPath = path.join(repoRoot, "scripts/prepare-raspi-user-data.sh");
const prepareUserDataPs1Path = path.join(repoRoot, "scripts/prepare-raspi-user-data.ps1");
const connectRdpPs1Path = path.join(repoRoot, "scripts/connect-raspi-rdp.ps1");
const raspiBootstrapScriptPath = path.join(repoRoot, "deploy/raspi-bootstrap.sh");
const lightweightDesktopScriptPath = path.join(repoRoot, "deploy/configure-lightweight-desktop.sh");
const displaySleepScriptPath = path.join(repoRoot, "deploy/disable-display-sleep.sh");
const displayPopupsScriptPath = path.join(repoRoot, "deploy/disable-xfce-display-popups.sh");
const desktopThemeScriptPath = path.join(repoRoot, "deploy/apply-desktop-theme.sh");
const repairKioskSystemScriptPath = path.join(repoRoot, "deploy/repair-kiosk-system.sh");
const readonlyEnableScriptPath = path.join(repoRoot, "deploy/readonly-system-enable.sh");
const readonlyDisableScriptPath = path.join(repoRoot, "deploy/readonly-system-disable.sh");
const hotspotTriggerScriptPath = path.join(repoRoot, "deploy/tailscale-hotspot-trigger.sh");
const hotspotPolicyScriptPath = path.join(repoRoot, "deploy/configure-hotspot-priority.sh");
const tailscaleInstallScriptPath = path.join(repoRoot, "deploy/install-tailscale.sh");
const fanControlScriptPath = path.join(repoRoot, "deploy/configure-pi5-fan-control.sh");
const deployNotesPath = path.join(repoRoot, "deploy.md");
const raspiDeployRunbookPath = path.join(repoRoot, "docs/runbooks/raspi-onekey-kiosk-deploy.md");
const pi5DeploymentSkillPath = path.join(repoRoot, ".agents/skills/pi5-deployment/SKILL.md");
const pi5DeploymentSkillMetadataPath = path.join(repoRoot, ".agents/skills/pi5-deployment/agents/openai.yaml");
const bashCommand = process.platform === "win32"
  ? path.join(process.env.WINDIR ?? "C:/Windows", "System32", "bash.exe")
  : "bash";

function createSqliteDatabase(dbPath, { schemaVersions = ["001_init"], sentinel = null } = {}) {
  mkdirSync(path.dirname(dbPath), { recursive: true });
  const statements = [
    "CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at DATETIME DEFAULT CURRENT_TIMESTAMP);",
    "CREATE TABLE IF NOT EXISTS restore_sentinel (id INTEGER PRIMARY KEY, note TEXT);",
    ...schemaVersions.map((version) => `INSERT OR IGNORE INTO schema_migrations (version) VALUES ('${version}');`)
  ];

  if (sentinel) {
    statements.push(`INSERT INTO restore_sentinel (id, note) VALUES (1, '${String(sentinel).replace(/'/gu, "''")}');`);
  }

  const result = spawnSync("sqlite3", [dbPath, statements.join(" ")], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `Failed to create sqlite database at ${dbPath}`);
  }
}

function fileMode(filePath) {
  return statSync(filePath).mode & 0o777;
}

test("Raspberry Pi deployment docs resolve connection targets at operation time", () => {
  for (const docPath of [deployNotesPath, raspiDeployRunbookPath]) {
    const contents = readFileSync(docPath, "utf8");

    assert.match(contents, /PI_HOST="<pi-host-or-magicdns>"/u);
    assert.match(contents, /SSH_TARGET="[^\n]*\$\{PI_HOST\}[^\n]*"/u);
    assert.match(contents, /MQTT[^\n]*(?:dependency|外部依賴)/iu);
    assert.match(contents, /fan_temp0=0/u);
    assert.match(contents, /20 seconds/iu);
    assert.match(contents, /cur_state/u);
    assert.match(contents, /fan1_input/u);
    assert.match(contents, /fan_temp0=50000/u);
    assert.match(contents, /Tailscale Deployment Prerequisite/u);
    assert.match(contents, /tailscaled\.service` to be enabled and active/u);
    assert.match(contents, /NeedsLogin/u);
    assert.match(contents, /control plane assigns the IP address and MagicDNS name/iu);
    assert.match(contents, /does not run `tailscale up` or read or write reusable auth keys/iu);
    assert.match(contents, /disable readonly root and reboot/iu);
    assert.doesNotMatch(contents, /\b(?:pi|kz)@(?:\d{1,3}\.){3}\d{1,3}\b/u);
    assert.doesNotMatch(contents, /-HostName\s+(?:\d{1,3}\.){3}\d{1,3}\b/u);
    assert.doesNotMatch(contents, /https?:\/\/(?!127\.0\.0\.1\b)(?:\d{1,3}\.){3}\d{1,3}\b/u);
  }
});

test("Pi 5 deployment skill requires safe update, hotspot, reboot, and recovery gates", () => {
  const skill = readFileSync(pi5DeploymentSkillPath, "utf8");
  const metadata = readFileSync(pi5DeploymentSkillMetadataPath, "utf8");
  const deployNotes = readFileSync(deployNotesPath, "utf8");

  assert.match(skill, /^---\nname: pi5-deployment\ndescription:/u);
  assert.match(skill, /docs\/ops\/conventions\.md/u);
  assert.match(skill, /deploy\.md/u);
  assert.match(skill, /pnpm verify/u);
  assert.match(skill, /scripts\/raspi-onekey-deploy\.sh/u);
  assert.match(skill, /--mode update/u);
  assert.match(skill, /--scope app/u);
  assert.match(skill, /--scope full/u);
  assert.match(skill, /current changes to a test Pi/iu);
  assert.match(skill, /sourceDirty.*true/iu);
  assert.match(skill, /app scope.*must not.*reboot/iu);
  assert.match(skill, /full scope.*reboot witness/iu);
  assert.match(skill, /--skip-disk/u);
  assert.match(skill, /--hotspot-connection-id/u);
  assert.match(skill, /--hotspot-scan-ssid/u);
  assert.match(skill, /--hotspot-priority/u);
  assert.match(skill, /verified backup/iu);
  assert.match(skill, /no automatic production DB rollback/iu);
  assert.match(skill, /reboot witness/iu);
  assert.match(skill, /journalctl -b -u NetworkManager/u);
  assert.match(skill, /nmcli/u);
  assert.match(skill, /tailscale-hotspot-trigger\.timer/u);
  assert.match(skill, /verify-kiosk-install\.sh/u);
  assert.match(skill, /cur_state/u);
  assert.match(skill, /fan1_input/u);
  assert.match(skill, /release-manifest\.json/u);
  assert.match(skill, /\/health/u);
  assert.doesNotMatch(skill, /\b(?:pi|kz)@(?:\d{1,3}\.){3}\d{1,3}\b/u);
  assert.doesNotMatch(skill, /SSH_PASSWORD=(?:pi|kz)\b/u);

  assert.match(metadata, /display_name: "Pi 5 Deployment"/u);
  assert.match(metadata, /default_prompt: "Use \$pi5-deployment/u);
  assert.match(deployNotes, /\.agents\/skills\/pi5-deployment\/SKILL\.md/u);
  assert.match(deployNotes, /--scope app/u);
  assert.match(deployNotes, /--scope full/u);
});

function writeFakeSystemctl(fakeBinDir, { isActive = false, logPath = null } = {}) {
  mkdirSync(fakeBinDir, { recursive: true });
  const systemctlPath = path.join(fakeBinDir, "systemctl");
  const lines = [
    "#!/bin/bash",
    "set -euo pipefail",
    logPath ? `LOG_PATH=${JSON.stringify(toBashPathValue(logPath))}` : "LOG_PATH=",
    'cmd="$1"',
    'case "$cmd" in',
    "  is-active)",
    isActive ? "    exit 0" : "    exit 3",
    "    ;;",
    "  stop|start|restart)",
    '    if [[ -n "${LOG_PATH}" ]]; then echo "$cmd ${@: -1}" >> "${LOG_PATH}"; fi',
    "    exit 0",
    "    ;;",
    "  *)",
    "    exit 0",
    "    ;;",
    "esac"
  ];
  writeFileSync(systemctlPath, `${lines.join("\n")}\n`);
  markBashExecutable(systemctlPath);
  return systemctlPath;
}

function makeFixtureProject() {
  const projectDir = mkdtempSync(path.join(tmpdir(), "solar-display-deploy-test-"));

  mkdirSync(path.join(projectDir, "apps/server/dist"), { recursive: true });
  mkdirSync(path.join(projectDir, "apps/server/src/db/migrations"), { recursive: true });
  mkdirSync(path.join(projectDir, "apps/web/dist"), { recursive: true });
  mkdirSync(path.join(projectDir, "apps/web/src/assets/playback"), { recursive: true });
  mkdirSync(path.join(projectDir, "data"), { recursive: true });
  mkdirSync(path.join(projectDir, "packages/shared/dist"), { recursive: true });
  mkdirSync(path.join(projectDir, "deploy"), { recursive: true });
  mkdirSync(path.join(projectDir, "docs"), { recursive: true });
  mkdirSync(path.join(projectDir, "docs/reference/kuozui-green-fhd-html-prototype/assets/clean"), { recursive: true });
  mkdirSync(path.join(projectDir, "node_modules/fake-package"), { recursive: true });
  mkdirSync(path.join(projectDir, "scripts"), { recursive: true });
  mkdirSync(path.join(projectDir, "uploads/images"), { recursive: true });
  mkdirSync(path.join(projectDir, "uploads/brand"), { recursive: true });

  writeFileSync(path.join(projectDir, "package.json"), JSON.stringify({ name: "fixture" }, null, 2));
  writeFileSync(path.join(projectDir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
  writeFileSync(path.join(projectDir, "pnpm-workspace.yaml"), "packages:\n  - apps/*\n  - packages/*\n");
  writeFileSync(path.join(projectDir, ".env"), "MQTT_BROKER=broker.local\n");
  writeFileSync(path.join(projectDir, ".env.example"), "PORT=3000\n");
  writeFileSync(path.join(projectDir, "apps/server/package.json"), JSON.stringify({ name: "@solar-display/server", type: "module", version: "0.1.0" }, null, 2));
  writeFileSync(path.join(projectDir, "apps/web/package.json"), JSON.stringify({ name: "@solar-display/web", type: "module" }, null, 2));
  writeFileSync(path.join(projectDir, "packages/shared/package.json"), JSON.stringify({ name: "@solar-display/shared", type: "module" }, null, 2));
  writeFileSync(path.join(projectDir, "apps/server/dist/server.js"), "console.log('server');\n");
  writeFileSync(path.join(projectDir, "apps/server/dist/server.test.js"), "console.log('test');\n");
  writeFileSync(path.join(projectDir, "apps/server/dist/server.test.js.map"), "{}\n");
  writeFileSync(path.join(projectDir, "apps/server/src/db/migrations/001_init.sql"), "-- migration\n");
  writeFileSync(path.join(projectDir, "apps/web/dist/index.html"), "<!doctype html>\n");
  writeFileSync(path.join(projectDir, "apps/web/src/assets/playback/slide-overview.jpg"), "seed-playback\n");
  writeFileSync(path.join(projectDir, "packages/shared/dist/index.js"), "export {};\n");
  writeFileSync(path.join(projectDir, "deploy/solar-display.service"), "[Service]\n");
  writeFileSync(path.join(projectDir, "deploy/export-runtime-state.sh"), "#!/bin/bash\n");
  writeFileSync(path.join(projectDir, "deploy/restore-runtime-state.sh"), "#!/bin/bash\n");
  writeFileSync(path.join(projectDir, "deploy/reset-db-settings.sh"), "#!/bin/bash\n");
  writeFileSync(path.join(projectDir, "deploy/enable-readonly-root.sh"), "#!/bin/bash\n");
  writeFileSync(path.join(projectDir, "deploy/raspi-bootstrap.sh"), "#!/bin/bash\n");
  writeFileSync(path.join(projectDir, "deploy/configure-lightweight-desktop.sh"), "#!/bin/bash\n");
  writeFileSync(path.join(projectDir, "deploy/configure-pi5-fan-control.sh"), "#!/bin/bash\n");
  writeFileSync(path.join(projectDir, "deploy/disable-display-sleep.sh"), "#!/bin/bash\n");
  writeFileSync(path.join(projectDir, "deploy/disable-xfce-display-popups.sh"), "#!/bin/bash\n");
  writeFileSync(path.join(projectDir, "deploy/apply-desktop-theme.sh"), "#!/bin/bash\n");
  writeFileSync(path.join(projectDir, "deploy/repair-kiosk-system.sh"), "#!/bin/bash\n");
  writeFileSync(path.join(projectDir, "deploy/readonly-system-enable.sh"), "#!/bin/bash\n");
  writeFileSync(path.join(projectDir, "deploy/readonly-system-disable.sh"), "#!/bin/bash\n");
  writeFileSync(path.join(projectDir, "deploy/install-tailscale.sh"), "#!/bin/bash\n");
  writeFileSync(path.join(projectDir, "deploy/configure-hotspot-priority.sh"), "#!/bin/bash\n");
  writeFileSync(path.join(projectDir, "deploy/tailscale-hotspot-trigger.sh"), "#!/bin/bash\n");
  writeFileSync(path.join(projectDir, "deploy/tailscale-hotspot-trigger.service"), "[Service]\n");
  writeFileSync(path.join(projectDir, "deploy/tailscale-hotspot-trigger.timer"), "[Timer]\n");
  writeFileSync(path.join(projectDir, "deploy/install-kiosk.sh"), "#!/bin/bash\n");
  writeFileSync(path.join(projectDir, "deploy/read-solar-display-journal.sh"), "#!/bin/bash\n");
  writeFileSync(path.join(projectDir, "deploy/start-solar-kiosk.sh"), "#!/bin/bash\n");
  writeFileSync(path.join(projectDir, "deploy/stop-solar-kiosk.sh"), "#!/bin/bash\n");
  writeFileSync(path.join(projectDir, "deploy/verify-kiosk-install.sh"), "#!/bin/bash\n");
  writeFileSync(path.join(projectDir, "deploy/firefox-kiosk.desktop"), "[Desktop Entry]\n");
  writeFileSync(path.join(projectDir, "deploy/enable-readonly-system.desktop"), "[Desktop Entry]\n");
  writeFileSync(path.join(projectDir, "deploy/disable-readonly-system.desktop"), "[Desktop Entry]\n");
  writeFileSync(path.join(projectDir, "scripts/raspi-onekey-deploy.sh"), "#!/bin/bash\n");
  writeFileSync(path.join(projectDir, "scripts/prepare-raspi-user-data.sh"), "#!/bin/bash\n");
  writeFileSync(path.join(projectDir, "scripts/prepare-raspi-user-data.ps1"), "Write-Host 'prepare'\n");
  // Stub release generator for fixture bundles (avoids requiring a full git tree).
  writeFileSync(
    path.join(projectDir, "scripts/generate-release-manifest.mjs"),
    `import { writeFileSync } from "node:fs";
const out = process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1] : "release-manifest.json";
writeFileSync(out, JSON.stringify({
  releaseId: "0.1.0+fixture",
  commit: "fixturecommit0000000000000000000000000000",
  builtAt: "2026-07-14T00:00:00.000Z",
  packageVersion: "0.1.0",
  schemaVersion: 1,
  sourceDirty: false
}, null, 2) + "\\n");
`
  );
  writeFileSync(path.join(projectDir, "docs/openapi.yaml"), "openapi: 3.0.0\n");
  writeFileSync(path.join(projectDir, "docs/reference/kuozui-green-fhd-html-prototype/assets/clean/factory-bg.png"), "seed-image\n");
  writeFileSync(path.join(projectDir, "node_modules/fake-package/index.js"), "module.exports = {};\n");
  createSqliteDatabase(path.join(projectDir, "data/solar-display.sqlite"), {
    schemaVersions: ["001_init"],
    sentinel: "fixture-db"
  });
  writeFileSync(path.join(projectDir, "uploads/images/hero.png"), "img\n");
  writeFileSync(path.join(projectDir, "uploads/brand/logo.png"), "brand\n");
  writeFileSync(path.join(projectDir, "apps/.DS_Store"), "junk\n");

  return projectDir;
}

function runDeploy(projectDir, choice) {
  return spawnSync(bashCommand, ["-lc", "DEPLOY_BUILD_CMD=':' ./deploy.sh"], {
    cwd: projectDir,
    input: `${choice}\n`,
    encoding: "utf8"
  });
}

function toBashScriptPath(cwd, scriptPath) {
  if (!path.isAbsolute(scriptPath)) {
    return scriptPath.split(path.sep).join("/");
  }

  const relativePath = path.relative(cwd, scriptPath).split(path.sep).join("/");
  return relativePath.length > 0 ? relativePath : ".";
}

function toBashPathValue(filePath) {
  if (process.platform !== "win32") {
    return filePath.split(path.sep).join("/");
  }

  if (!path.win32.isAbsolute(filePath)) {
    return filePath.split(path.sep).join("/");
  }

  const normalizedPath = filePath.replace(/\\/gu, "/");
  const driveLetter = normalizedPath.slice(0, 1).toLowerCase();
  const remainder = normalizedPath.slice(2);

  return `/mnt/${driveLetter}${remainder.startsWith("/") ? remainder : `/${remainder}`}`;
}

function buildBashEnv(env, { pathKeys = [], prependPathDirs = [] } = {}) {
  if (!env) {
    return env;
  }

  const nextEnv = { ...env };

  pathKeys.forEach((key) => {
    if (typeof nextEnv[key] === "string") {
      nextEnv[key] = toBashPathValue(nextEnv[key]);
    }
  });

  if (prependPathDirs.length > 0) {
    nextEnv.PATH = `${prependPathDirs.map((value) => toBashPathValue(value)).join(":")}` +
      ":/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin";
  }

  return nextEnv;
}

function quoteForBash(value) {
  return `'${String(value).replace(/'/gu, `"'"'`)}'`;
}

function markBashExecutable(filePath) {
  if (process.platform !== "win32") {
    chmodSync(filePath, 0o755);
    return;
  }

  const result = spawnSync(bashCommand, ["-lc", `chmod 755 ${quoteForBash(toBashPathValue(filePath))}`], {
    encoding: "utf8"
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `Failed to chmod ${filePath}`);
  }
}

function sleepMs(durationMs) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, durationMs);
}

function removeTempDir(dirPath) {
  const transientErrorCodes = new Set(["EBUSY", "ENOTEMPTY", "EPERM"]);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      rmSync(dirPath, { recursive: true, force: true });
      return;
    } catch (error) {
      const errorCode = error instanceof Error ? error.code : undefined;

      if (!transientErrorCodes.has(errorCode ?? "")) {
        throw error;
      }

      sleepMs(50 * (attempt + 1));
    }
  }

  rmSync(dirPath, { recursive: true, force: true });
}

function runBashScript(scriptPath, args = [], options = {}) {
  const cwd = options.cwd ?? repoRoot;
  const {
    bashPathKeys = [],
    bashPrependPathDirs = [],
    env,
    ...spawnOptions
  } = options;

  return spawnSync(bashCommand, [toBashScriptPath(cwd, scriptPath), ...args.map((value) => toBashPathValue(value))], {
    ...spawnOptions,
    cwd,
    env: buildBashEnv(env, {
      pathKeys: bashPathKeys,
      prependPathDirs: bashPrependPathDirs
    })
  });
}

function waitForPathExists(filePath, timeoutMs = 1_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (existsSync(filePath)) {
      return true;
    }

    sleepMs(50);
  }

  return existsSync(filePath);
}

function isExecutable(filePath) {
  if (process.platform === "win32") {
    const result = spawnSync(bashCommand, ["-lc", `test -x ${quoteForBash(toBashPathValue(filePath))}`], {
      encoding: "utf8"
    });

    return result.status === 0;
  }

  return (statSync(filePath).mode & 0o111) !== 0;
}

test("Pi 5 fan helper writes one idempotent four-stage block before dtoverlay", () => {
  const fixtureDir = mkdtempSync(path.join(tmpdir(), "solar-display-pi5-fan-"));
  const modelPath = path.join(fixtureDir, "model");
  const configPath = path.join(fixtureDir, "config.txt");

  try {
    writeFileSync(modelPath, "Raspberry Pi 5 Model B Rev 1.0\0");
    writeFileSync(
      configPath,
      "[all]\ndtparam=audio=on\n# unrelated setting\ndtoverlay=vc4-kms-v3d\n[all]\n"
    );

    const first = runBashScript(
      fanControlScriptPath,
      ["--model-path", modelPath, "--config-path", configPath],
      { cwd: repoRoot, encoding: "utf8" }
    );
    assert.equal(first.status, 0, first.stderr || first.stdout);
    assert.match(first.stdout, /reboot required/i);

    const firstConfig = readFileSync(configPath, "utf8");
    assert.equal((firstConfig.match(/# BEGIN Solar Player Pi 5 fan control/gu) ?? []).length, 1);
    assert.equal((firstConfig.match(/# END Solar Player Pi 5 fan control/gu) ?? []).length, 1);
    assert.ok(firstConfig.indexOf("# END Solar Player Pi 5 fan control") < firstConfig.indexOf("dtoverlay=vc4-kms-v3d"));
    assert.match(firstConfig, /^# unrelated setting$/m);

    for (const [stage, temperature, speed] of [
      [0, 0, 75],
      [1, 60000, 125],
      [2, 67500, 175],
      [3, 75000, 250]
    ]) {
      assert.match(firstConfig, new RegExp(`^dtparam=fan_temp${stage}=${temperature}$`, "m"));
      assert.match(firstConfig, new RegExp(`^dtparam=fan_temp${stage}_hyst=5000$`, "m"));
      assert.match(firstConfig, new RegExp(`^dtparam=fan_temp${stage}_speed=${speed}$`, "m"));
    }

    const second = runBashScript(
      fanControlScriptPath,
      ["--model-path", modelPath, "--config-path", configPath],
      { cwd: repoRoot, encoding: "utf8" }
    );
    assert.equal(second.status, 0, second.stderr || second.stdout);
    assert.match(second.stdout, /profile already configured/i);
    assert.equal(readFileSync(configPath, "utf8"), firstConfig);
  } finally {
    removeTempDir(fixtureDir);
  }
});

test("Pi 5 fan helper skips non-Pi-5 models without changing boot config", () => {
  const fixtureDir = mkdtempSync(path.join(tmpdir(), "solar-display-non-pi5-fan-"));
  const modelPath = path.join(fixtureDir, "model");
  const configPath = path.join(fixtureDir, "config.txt");
  const originalConfig = "[all]\ndtoverlay=vc4-kms-v3d\n";

  try {
    writeFileSync(modelPath, "Raspberry Pi 4 Model B Rev 1.5\0");
    writeFileSync(configPath, originalConfig);

    const result = runBashScript(
      fanControlScriptPath,
      ["--model-path", modelPath, "--config-path", configPath],
      { cwd: repoRoot, encoding: "utf8" }
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /not applicable/i);
    assert.equal(readFileSync(configPath, "utf8"), originalConfig);
  } finally {
    removeTempDir(fixtureDir);
  }
});

test("Pi 5 fan helper fails closed when the boot config is missing", () => {
  const fixtureDir = mkdtempSync(path.join(tmpdir(), "solar-display-missing-pi5-fan-"));
  const modelPath = path.join(fixtureDir, "model");
  const configPath = path.join(fixtureDir, "missing-config.txt");

  try {
    writeFileSync(modelPath, "Raspberry Pi 5 Model B Rev 1.0\0");

    const result = runBashScript(
      fanControlScriptPath,
      ["--model-path", modelPath, "--config-path", configPath],
      { cwd: repoRoot, encoding: "utf8" }
    );

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, new RegExp(configPath.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")));
  } finally {
    removeTempDir(fixtureDir);
  }
});

test("deploy.sh shows two deployment menu options", () => {
  const source = readFileSync(deployScriptPath, "utf8");

  assert.match(source, /1\.\s*Build online deploy bundle/i);
  assert.match(source, /2\.\s*Build offline deploy bundle/i);
});

test("deploy service defaults to the Raspberry Pi kiosk account and exec startup", () => {
  const source = readFileSync(path.join(repoRoot, "deploy/solar-display.service"), "utf8");

  assert.match(source, /^Type=exec$/m);
  assert.match(source, /^User=pi$/m);
  assert.match(source, /^WorkingDirectory=\/data\/solar-display$/m);
  assert.match(source, /^EnvironmentFile=-\/data\/solar-display\/\.env$/m);
  assert.match(source, /^Environment=DATA_DIR=\/data\/solar-display\/data$/m);
  assert.match(source, /^Environment=LOG_DIR=\/data\/solar-display\/logs$/m);
  assert.match(source, /^ExecStart=\/usr\/bin\/node apps\/server\/dist\/server\.js$/m);
  assert.match(source, /^ReadWritePaths=\/data\/solar-display\/data \/data\/solar-display\/logs \/data\/solar-display\/uploads\/images \/data\/solar-display\/uploads\/brand$/m);
});

test("kiosk installer configures gdm autologin and points operators to logs", () => {
  const source = readFileSync(path.join(repoRoot, "deploy/install-kiosk.sh"), "utf8");

  assert.match(source, /\/etc\/gdm3\/custom\.conf/);
  assert.match(source, /AutomaticLoginEnable=True/);
  assert.match(source, /AutomaticLogin=pi/);
  assert.match(source, /NODE_BIN=/);
  assert.match(source, /\.nvm\/nvm\.sh/);
  assert.match(source, /journalctl -u solar-display/);
  assert.match(source, /kiosk-launcher\.log/);
});

test("kiosk installer installs both autostart and desktop launchers for the kiosk user", () => {
  const source = readFileSync(path.join(repoRoot, "deploy/install-kiosk.sh"), "utf8");

  assert.match(source, /KIOSK_DESKTOP_DIR="\$\{KIOSK_HOME\}\/Desktop"/);
  assert.match(source, /KIOSK_DISPLAY_OUTPUT="\$\{KIOSK_DISPLAY_OUTPUT:-\}"/);
  assert.match(source, /Solar Display Kiosk\.desktop/);
  assert.match(source, /\$\{KIOSK_AUTOSTART_DIR\}\/firefox-kiosk\.desktop/);
  assert.match(source, /\$\{KIOSK_DESKTOP_DIR\}\/Solar Display Kiosk\.desktop/);
  assert.match(source, /launcher_exec="\$\{KIOSK_BIN_DIR\}\/start-solar-kiosk\.sh"/);
  assert.match(source, /env KIOSK_DISPLAY_OUTPUT=/);
  assert.match(source, /chmod \+x "\$\{KIOSK_DESKTOP_DIR\}\/Solar Display Kiosk\.desktop"/);
  assert.match(source, /metadata::trusted true/);
});

test("kiosk installer invokes the packaged Pi 5 fan helper fail closed", () => {
  const source = readFileSync(path.join(repoRoot, "deploy/install-kiosk.sh"), "utf8");

  assert.match(source, /FAN_CONTROL_HELPER="\$\{BUNDLE_ROOT\}\/deploy\/configure-pi5-fan-control\.sh"/);
  assert.match(source, /^"\$\{FAN_CONTROL_HELPER\}"$/m);
  assert.doesNotMatch(source, /FAN_CONTROL_HELPER[^\n]*\|\| true/);
});

test("bundle install script can source nvm before running pnpm install", () => {
  const source = readFileSync(path.join(repoRoot, "deploy.sh"), "utf8");

  assert.match(source, /NVM_DIR/);
  assert.match(source, /source_nvm/);
  assert.match(source, /pnpm install --prod --frozen-lockfile/);
});

test("tailscale hotspot trigger documents safe network switching defaults", () => {
  const source = readFileSync(hotspotTriggerScriptPath, "utf8");

  assert.match(source, /HOTSPOT_CONNECTION_ID/);
  assert.match(source, /BLUETOOTH_TRIGGER_MAC/);
  assert.match(source, /HOTSPOT_SCAN_SSID/);
  assert.match(source, /tailscale ip -4/);
  assert.match(source, /active_hotspot_connected/);
  assert.match(source, /nmcli -t -f NAME con show --active/);
  assert.match(source, /nmcli con up id/);
  assert.doesNotMatch(source, /nmcli con down/);
});

test("hotspot policy configures priority and enables the delayed trigger without switching Wi-Fi", () => {
  const fixtureDir = mkdtempSync(path.join(tmpdir(), "solar-hotspot-policy-"));
  const fakeBinDir = path.join(fixtureDir, "bin");
  const commandLog = path.join(fixtureDir, "commands.log");

  try {
    mkdirSync(fakeBinDir, { recursive: true });
    writeFileSync(
      path.join(fakeBinDir, "nmcli"),
      [
        "#!/bin/bash",
        `printf 'nmcli %s\\n' "$*" >> ${quoteForBash(toBashPathValue(commandLog))}`,
        'if [[ "$*" == "-g 802-11-wireless.ssid connection show Yishow" ]]; then',
        "  printf 'Yishow\\n'",
        "  exit 0",
        "fi",
        'if [[ "$*" == "connection show Yishow" ]]; then exit 0; fi',
        'if [[ "$*" == "connection modify Yishow connection.autoconnect yes connection.autoconnect-priority 100" ]]; then exit 0; fi',
        "exit 1",
        ""
      ].join("\n")
    );
    writeFileSync(
      path.join(fakeBinDir, "systemctl"),
      [
        "#!/bin/bash",
        `printf 'systemctl %s\\n' "$*" >> ${quoteForBash(toBashPathValue(commandLog))}`,
        "exit 0",
        ""
      ].join("\n")
    );
    markBashExecutable(path.join(fakeBinDir, "nmcli"));
    markBashExecutable(path.join(fakeBinDir, "systemctl"));

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const result = runBashScript(hotspotPolicyScriptPath, [
        "--connection-id",
        "Yishow",
        "--scan-ssid",
        "Yishow",
        "--priority",
        "100"
      ], {
        cwd: repoRoot,
        bashPrependPathDirs: [fakeBinDir],
        env: {
          ...process.env,
          HOTSPOT_ROOT: fixtureDir
        },
        encoding: "utf8"
      });

      assert.equal(result.status, 0, result.stderr || result.stdout);
    }

    const envFile = readFileSync(path.join(fixtureDir, "etc/solar-display/tailscale-hotspot-trigger.env"), "utf8");
    assert.equal(envFile, [
      "HOTSPOT_CONNECTION_ID=Yishow",
      "HOTSPOT_SCAN_SSID=Yishow",
      "HOTSPOT_PRIORITY=100",
      ""
    ].join("\n"));
    assert.equal(existsSync(path.join(fixtureDir, "usr/local/sbin/tailscale-hotspot-trigger.sh")), true);
    assert.equal(existsSync(path.join(fixtureDir, "etc/systemd/system/tailscale-hotspot-trigger.service")), true);
    assert.equal(existsSync(path.join(fixtureDir, "etc/systemd/system/tailscale-hotspot-trigger.timer")), true);

    const commands = readFileSync(commandLog, "utf8");
    assert.match(commands, /nmcli connection modify Yishow connection\.autoconnect yes connection\.autoconnect-priority 100/u);
    assert.match(commands, /systemctl daemon-reload/u);
    assert.match(commands, /systemctl enable tailscale-hotspot-trigger\.timer/u);
    assert.doesNotMatch(commands, /systemctl (?:start|restart|enable --now)/u);
    assert.doesNotMatch(commands, /nmcli (?:con|connection) (?:up|down)/u);
  } finally {
    removeTempDir(fixtureDir);
  }
});

test("hotspot policy rejects invalid priority before changing target state", () => {
  const fixtureDir = mkdtempSync(path.join(tmpdir(), "solar-hotspot-policy-invalid-"));
  const fakeBinDir = path.join(fixtureDir, "bin");
  const commandLog = path.join(fixtureDir, "commands.log");

  try {
    mkdirSync(fakeBinDir, { recursive: true });
    for (const command of ["nmcli", "systemctl"]) {
      const commandPath = path.join(fakeBinDir, command);
      writeFileSync(commandPath, [
        "#!/bin/bash",
        `printf '${command} %s\\n' "$*" >> ${quoteForBash(toBashPathValue(commandLog))}`,
        "exit 0",
        ""
      ].join("\n"));
      markBashExecutable(commandPath);
    }

    const result = runBashScript(hotspotPolicyScriptPath, [
      "--connection-id",
      "Yishow",
      "--scan-ssid",
      "Yishow",
      "--priority",
      "high"
    ], {
      cwd: repoRoot,
      bashPrependPathDirs: [fakeBinDir],
      env: {
        ...process.env,
        HOTSPOT_ROOT: fixtureDir
      },
      encoding: "utf8"
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /priority must be an integer/u);
    assert.equal(existsSync(commandLog), false);
  } finally {
    removeTempDir(fixtureDir);
  }
});

function writeTailscaleInstallFixtureCommands(
  fakeBinDir,
  logPath,
  { rootFilesystem = "ext4", cliInstalled = false, enabled = false, enablement = null, active = false, ready = false } = {}
) {
  mkdirSync(fakeBinDir, { recursive: true });
  const bashLogPath = toBashPathValue(logPath);
  const bashFakeBinDir = toBashPathValue(fakeBinDir);
  const hasCli = cliInstalled || ready;
  const enablementState = ready ? "enabled" : (enablement ?? (enabled ? "enabled" : "disabled"));
  const isActive = active || ready;

  writeFileSync(
    path.join(fakeBinDir, "apt-get"),
    [
      "#!/bin/bash",
      `printf 'apt-get %s\\n' "$*" >> ${quoteForBash(bashLogPath)}`,
      'if [[ "$*" == "install -y tailscale" ]]; then',
      `  printf '#!/bin/bash\\nexit 0\\n' > ${quoteForBash(`${bashFakeBinDir}/tailscale`)}`,
      `  chmod 755 ${quoteForBash(`${bashFakeBinDir}/tailscale`)}`,
      "fi",
      ""
    ].join("\n")
  );
  writeFileSync(
    path.join(fakeBinDir, "curl"),
    [
      "#!/bin/bash",
      "out=",
      "url=",
      "while [[ $# -gt 0 ]]; do",
      '  case "$1" in',
      '    -o) out="$2"; shift 2 ;;',
      '    -*) shift ;;',
      '    *) url="$1"; shift ;;',
      "  esac",
      "done",
      `printf 'curl %s\\n' "$url" >> ${quoteForBash(bashLogPath)}`,
      'printf "fixture\\n" > "$out"',
      ""
    ].join("\n")
  );
  writeFileSync(
    path.join(fakeBinDir, "install"),
    [
      "#!/bin/bash",
      `printf 'install %s\\n' "$*" >> ${quoteForBash(bashLogPath)}`,
      "exit 0",
      ""
    ].join("\n")
  );
  writeFileSync(path.join(fakeBinDir, "findmnt"), `#!/bin/bash\nprintf '${rootFilesystem}\\n'\n`);
  writeFileSync(
    path.join(fakeBinDir, "systemctl"),
    [
      "#!/bin/bash",
      `enabled_path=${quoteForBash(`${bashFakeBinDir}/tailscaled.enabled`)}`,
      `active_path=${quoteForBash(`${bashFakeBinDir}/tailscaled.active`)}`,
      `printf 'systemctl %s\\n' "$*" >> ${quoteForBash(bashLogPath)}`,
      'case "$1" in',
      '  is-enabled) state="$(cat "$enabled_path" 2>/dev/null || echo disabled)"; echo "$state"; [[ "$state" == "enabled" || "$state" == "enabled-runtime" ]] ;;',
      '  is-active) [[ -f "$active_path" ]] ;;',
      '  enable) echo enabled > "$enabled_path"; touch "$active_path" ;;',
      '  start) touch "$active_path" ;;',
      "  *) exit 1 ;;",
      "esac",
      ""
    ].join("\n")
  );

  for (const command of ["apt-get", "curl", "install", "findmnt", "systemctl"]) {
    markBashExecutable(path.join(fakeBinDir, command));
  }

  if (hasCli) {
    writeFileSync(path.join(fakeBinDir, "tailscale"), "#!/bin/bash\nexit 0\n");
    markBashExecutable(path.join(fakeBinDir, "tailscale"));
  }
  if (enablementState !== "disabled") writeFileSync(path.join(fakeBinDir, "tailscaled.enabled"), `${enablementState}\n`);
  if (isActive) writeFileSync(path.join(fakeBinDir, "tailscaled.active"), "active\n");
}

function runTailscaleInstallFixture(projectDir, fakeBinDir, osReleasePath) {
  const sourcedScript = toBashPathValue(tailscaleInstallScriptPath);
  return spawnSync(
    bashCommand,
    ["-c", `source ${quoteForBash(sourcedScript)}; require_root() { :; }; main`],
    {
      cwd: projectDir,
      env: buildBashEnv({ ...process.env, OS_RELEASE_PATH: osReleasePath }, {
        pathKeys: ["OS_RELEASE_PATH"],
        prependPathDirs: [fakeBinDir]
      }),
      encoding: "utf8"
    }
  );
}

test("Tailscale prerequisite helper installs the official Noble package without enrollment", () => {
  const projectDir = mkdtempSync(path.join(tmpdir(), "solar-tailscale-install-test-"));
  const fakeBinDir = path.join(projectDir, "fake-bin");
  const osReleasePath = path.join(projectDir, "os-release");
  const logPath = path.join(projectDir, "commands.log");

  try {
    writeFileSync(osReleasePath, 'ID=ubuntu\nVERSION_ID="24.04"\nVERSION_CODENAME=noble\n');
    writeTailscaleInstallFixtureCommands(fakeBinDir, logPath);

    const result = runTailscaleInstallFixture(projectDir, fakeBinDir, osReleasePath);
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const commandLog = readFileSync(logPath, "utf8");
    assert.match(commandLog, /noble\.noarmor\.gpg/);
    assert.match(commandLog, /noble\.tailscale-keyring\.list/);
    assert.match(commandLog, /apt-get install -y tailscale/);
    assert.match(commandLog, /systemctl enable --now tailscaled\.service/);
    assert.doesNotMatch(commandLog + result.stdout + result.stderr, /tailscale up|auth.?key/iu);
  } finally {
    removeTempDir(projectDir);
  }
});

test("Tailscale prerequisite helper is offline-idempotent when the daemon is ready", () => {
  const projectDir = mkdtempSync(path.join(tmpdir(), "solar-tailscale-ready-test-"));
  const fakeBinDir = path.join(projectDir, "fake-bin");
  const osReleasePath = path.join(projectDir, "os-release");
  const logPath = path.join(projectDir, "commands.log");

  try {
    writeFileSync(osReleasePath, 'ID=ubuntu\nVERSION_ID="24.04"\nVERSION_CODENAME=noble\n');
    writeTailscaleInstallFixtureCommands(fakeBinDir, logPath, { ready: true });

    const result = runTailscaleInstallFixture(projectDir, fakeBinDir, osReleasePath);
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const commandLog = readFileSync(logPath, "utf8");
    assert.doesNotMatch(commandLog, /apt-get|curl |install |enable --now/);
  } finally {
    removeTempDir(projectDir);
  }
});

test("Tailscale prerequisite helper rejects a transient readonly overlay install", () => {
  const projectDir = mkdtempSync(path.join(tmpdir(), "solar-tailscale-overlay-test-"));
  const fakeBinDir = path.join(projectDir, "fake-bin");
  const osReleasePath = path.join(projectDir, "os-release");
  const logPath = path.join(projectDir, "commands.log");

  try {
    writeFileSync(osReleasePath, 'ID=ubuntu\nVERSION_ID="24.04"\nVERSION_CODENAME=noble\n');
    writeTailscaleInstallFixtureCommands(fakeBinDir, logPath, { rootFilesystem: "overlay" });

    const result = runTailscaleInstallFixture(projectDir, fakeBinDir, osReleasePath);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /disable readonly root.*reboot/iu);
    const commandLog = existsSync(logPath) ? readFileSync(logPath, "utf8") : "";
    assert.doesNotMatch(commandLog, /apt-get|curl |install /);
  } finally {
    removeTempDir(projectDir);
  }
});

test("Tailscale prerequisite helper starts an enabled inactive daemon on readonly overlay", () => {
  const projectDir = mkdtempSync(path.join(tmpdir(), "solar-tailscale-overlay-start-test-"));
  const fakeBinDir = path.join(projectDir, "fake-bin");
  const osReleasePath = path.join(projectDir, "os-release");
  const logPath = path.join(projectDir, "commands.log");

  try {
    writeFileSync(osReleasePath, 'ID=ubuntu\nVERSION_ID="24.04"\nVERSION_CODENAME=noble\n');
    writeTailscaleInstallFixtureCommands(fakeBinDir, logPath, {
      rootFilesystem: "overlay",
      cliInstalled: true,
      enabled: true,
      active: false
    });

    const result = runTailscaleInstallFixture(projectDir, fakeBinDir, osReleasePath);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const commandLog = readFileSync(logPath, "utf8");
    assert.match(commandLog, /systemctl start tailscaled\.service/);
    assert.doesNotMatch(commandLog, /apt-get|curl |install |enable --now/);
  } finally {
    removeTempDir(projectDir);
  }
});

test("Tailscale prerequisite helper rejects runtime-only enablement on readonly overlay", () => {
  const projectDir = mkdtempSync(path.join(tmpdir(), "solar-tailscale-overlay-runtime-enabled-test-"));
  const fakeBinDir = path.join(projectDir, "fake-bin");
  const osReleasePath = path.join(projectDir, "os-release");
  const logPath = path.join(projectDir, "commands.log");

  try {
    writeFileSync(osReleasePath, 'ID=ubuntu\nVERSION_ID="24.04"\nVERSION_CODENAME=noble\n');
    writeTailscaleInstallFixtureCommands(fakeBinDir, logPath, {
      rootFilesystem: "overlay",
      cliInstalled: true,
      enablement: "enabled-runtime",
      active: true
    });

    const result = runTailscaleInstallFixture(projectDir, fakeBinDir, osReleasePath);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /disable readonly root.*reboot/iu);
  } finally {
    removeTempDir(projectDir);
  }
});

test("raspi bootstrap runs the staged Tailscale prerequisite before backup and replacement", () => {
  const source = readFileSync(raspiBootstrapScriptPath, "utf8");
  const helperIdx = source.indexOf("\ninstall_tailscale_prerequisite\n");
  const backupIdx = source.indexOf("\ncreate_verified_runtime_backup\n");
  const copyIdx = source.indexOf("\ncopy_bundle\n");

  assert.ok(helperIdx > 0, "bootstrap must invoke the staged Tailscale helper");
  assert.ok(backupIdx > helperIdx, "Tailscale prerequisite must run before the backup gate");
  assert.ok(copyIdx > backupIdx, "application replacement must remain after the backup gate");
  assert.match(source, /Tailscale prerequisite helper missing/);
});

test("raspi bootstrap prerequisite failure prevents backup and application replacement", () => {
  const projectDir = makeFixtureProject();
  const installDir = path.join(projectDir, "install");
  const bundleDir = path.join(projectDir, "bundle");
  const backupMarker = path.join(projectDir, "backup-called");

  try {
    mkdirSync(path.join(installDir, "apps/server/dist"), { recursive: true });
    writeFileSync(path.join(installDir, "apps/server/dist/server.js"), "old application\n");
    writeFileSync(path.join(installDir, ".env"), "KEEP=1\n");
    mkdirSync(path.join(bundleDir, "apps/server/dist"), { recursive: true });
    mkdirSync(path.join(bundleDir, "deploy"), { recursive: true });
    writeFileSync(path.join(bundleDir, "apps/server/dist/server.js"), "new application\n");
    writeFileSync(path.join(bundleDir, "deploy/install-tailscale.sh"), "#!/bin/bash\necho forced prerequisite failure >&2\nexit 9\n");
    markBashExecutable(path.join(bundleDir, "deploy/install-tailscale.sh"));
    writeFileSync(
      path.join(bundleDir, "deploy/export-runtime-state.sh"),
      `#!/bin/bash\ntouch ${quoteForBash(toBashPathValue(backupMarker))}\nexit 10\n`
    );
    markBashExecutable(path.join(bundleDir, "deploy/export-runtime-state.sh"));
    writeFileSync(path.join(projectDir, "deploy/raspi-bootstrap.sh"), readFileSync(raspiBootstrapScriptPath, "utf8"));
    markBashExecutable(path.join(projectDir, "deploy/raspi-bootstrap.sh"));

    const result = runBashScript("deploy/raspi-bootstrap.sh", [
      "--mode",
      "update",
      "--scope",
      "full",
      "--skip-host-preflight",
      "--skip-disk",
      "--install-dir",
      installDir,
      "--bundle-dir",
      bundleDir,
      "--kiosk-user",
      process.env.USER || "pi"
    ], {
      cwd: projectDir,
      env: process.env,
      encoding: "utf8"
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr + result.stdout, /Tailscale prerequisite failed before application replacement/);
    assert.equal(existsSync(backupMarker), false, "backup must not start after prerequisite failure");
    assert.equal(readFileSync(path.join(installDir, "apps/server/dist/server.js"), "utf8"), "old application\n");
  } finally {
    removeTempDir(projectDir);
  }
});

test("raspi deployment scope defaults update to app and init to full", () => {
  const updateResult = runBashScript(
    raspiDeployScriptPath,
    ["kz@test-pi", "--mode", "update", "--dry-run"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(updateResult.status, 0, updateResult.stderr || updateResult.stdout);
  assert.match(updateResult.stdout, /Scope: app/u);
  assert.match(updateResult.stdout, /would update application files only/u);
  assert.match(updateResult.stdout, /would not run apt, desktop, kiosk, boot, hotspot, readonly, or reboot actions/u);
  assert.doesNotMatch(updateResult.stdout, /install the Tailscale CLI/u);

  const initResult = runBashScript(
    raspiDeployScriptPath,
    ["pi@fresh-pi", "--mode", "init", "--dry-run"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(initResult.status, 0, initResult.stderr || initResult.stdout);
  assert.match(initResult.stdout, /Scope: full/u);
  assert.match(initResult.stdout, /would run full host deployment/u);
});

test("raspi deployment scope forwards explicit scope and rejects host options in app scope", () => {
  const entrypoint = readFileSync(raspiDeployScriptPath, "utf8");
  assert.match(entrypoint, /--scope app\|full/u);
  assert.ok(entrypoint.includes('"--scope" "${DEPLOY_SCOPE}"'));

  const conflictResult = runBashScript(
    raspiDeployScriptPath,
    [
      "kz@test-pi",
      "--mode",
      "update",
      "--scope",
      "app",
      "--hotspot-connection-id",
      "Yishow",
      "--dry-run"
    ],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.notEqual(conflictResult.status, 0);
  assert.match(conflictResult.stderr, /hotspot options require --scope full/u);
  assert.doesNotMatch(conflictResult.stdout, /Building|Uploading bundle/u);
});

test("raspi one-key deploy dry-run reports target and skips destructive stages", () => {
  const result = runBashScript(
    raspiDeployScriptPath,
    [
      "kz@192.168.31.39",
      "--mode",
      "update",
      "--scope",
      "full",
      "--mqtt-host",
      "192.168.31.62",
      "--desktop",
      "xfce-xrdp",
      "--rdp-auth",
      "passwordless",
      "--rdp-password",
      "kz",
      "--hotspot-connection-id",
      "Yishow",
      "--hotspot-scan-ssid",
      "Yishow",
      "--hotspot-priority",
      "100",
      "--dry-run"
    ],
    {
      cwd: repoRoot,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Target: kz@192\.168\.31\.39/);
  assert.match(result.stdout, /Mode: update/);
  assert.match(result.stdout, /Install dir: \/data\/solar-display/);
  assert.match(result.stdout, /MQTT host: 192\.168\.31\.62/);
  assert.match(result.stdout, /Desktop: xfce-xrdp/);
  assert.match(result.stdout, /RDP auth: passwordless/);
  assert.match(result.stdout, /Kiosk user: kz/);
  assert.match(result.stdout, /Readonly root: dry-run/);
  assert.match(result.stdout, /Hotspot connection: Yishow/);
  assert.match(result.stdout, /Hotspot scan SSID: Yishow/);
  assert.match(result.stdout, /Hotspot priority: 100/);
  assert.match(result.stdout, /would configure the preferred hotspot policy without switching the active Wi-Fi connection/);
  assert.match(result.stdout, /verified runtime backup before replacing application files/);
  assert.match(result.stdout, /backup verification failure would stop the update/);
  assert.match(result.stdout, /recovery command/);
  assert.match(result.stdout, /install the Tailscale CLI and enable\/start tailscaled\.service before application replacement/);
  assert.match(result.stdout, /does not upload a bundle, create a backup/);
  assert.doesNotMatch(result.stdout, /tailscale up|auth.?key/iu);
  assert.doesNotMatch(result.stdout, /\b(parted|mkfs|resize2fs|sfdisk)\b/);
});

test("raspi one-key deploy forwards hotspot policy and bootstrap orders it before verification", () => {
  const entrypoint = readFileSync(raspiDeployScriptPath, "utf8");
  const bootstrap = readFileSync(raspiBootstrapScriptPath, "utf8");
  const bundleBuilder = readFileSync(deployScriptPath, "utf8");

  assert.match(entrypoint, /--hotspot-connection-id/u);
  assert.match(entrypoint, /--hotspot-scan-ssid/u);
  assert.match(entrypoint, /--hotspot-priority/u);
  assert.ok(entrypoint.includes('remote_args+=("--hotspot-connection-id" "${HOTSPOT_CONNECTION_ID}")'));
  assert.ok(entrypoint.includes('remote_args+=("--hotspot-scan-ssid" "${HOTSPOT_SCAN_SSID}")'));
  assert.ok(entrypoint.includes('remote_args+=("--hotspot-priority" "${HOTSPOT_PRIORITY}")'));

  const kioskInstallIndex = bootstrap.indexOf('"${INSTALL_DIR}/deploy/install-kiosk.sh"');
  const hotspotPolicyIndex = bootstrap.indexOf('"${INSTALL_DIR}/deploy/configure-hotspot-priority.sh"');
  const kioskVerifyIndex = bootstrap.indexOf('"${INSTALL_DIR}/deploy/verify-kiosk-install.sh"');
  assert.ok(kioskInstallIndex >= 0, "bootstrap must install the kiosk");
  assert.ok(hotspotPolicyIndex > kioskInstallIndex, "hotspot policy must run after application and kiosk installation");
  assert.ok(kioskVerifyIndex > hotspotPolicyIndex, "hotspot policy must run before final kiosk verification");
  assert.doesNotMatch(bootstrap, /systemctl (?:start|restart) tailscale-hotspot-trigger\.timer/u);

  assert.match(bundleBuilder, /deploy\/configure-hotspot-priority\.sh/u);
  assert.match(bundleBuilder, /"\$\{target_root\}\/deploy\/configure-hotspot-priority\.sh"/u);
});

test("raspi one-key deploy supports non-interactive sudo and data creation confirmation", () => {
  const source = readFileSync(raspiDeployScriptPath, "utf8");

  assert.match(source, /SUDO_PASSWORD="\$\{SUDO_PASSWORD:-\$\{SSH_PASSWORD:-\}\}"/);
  assert.match(source, /--sudo-password/);
  assert.match(source, /DATA_SIZE_GB="10"/);
  assert.match(source, /DATA_SIZE_GB_EXPLICIT=0/);
  assert.match(source, /MQTT_HOST_EXPLICIT=0/);
  assert.match(source, /\/boot\/firmware\/solar-deploy\.env/);
  assert.match(source, /Loaded first-boot deploy env/);
  assert.match(source, /--data-size-gb/);
  assert.match(source, /sudo -S env CONFIRM_CREATE_DATA=CREATE-DATA/);
});

test("windows rdp helper stores TERMSRV credentials before launching mstsc", () => {
  const source = readFileSync(connectRdpPs1Path, "utf8");

  assert.match(source, /\[string\]\$HostName = "192\.168\.31\.40"/);
  assert.match(source, /\[string\]\$User = "kz"/);
  assert.match(source, /cmdkey\.exe/);
  assert.match(source, /TERMSRV\/\$HostName/);
  assert.match(source, /mstsc\.exe/);
  assert.match(source, /prompt for credentials:i:0/);
  assert.doesNotMatch(source, /sudo/);
});

test("raspi user-data shell helper interactive defaults to pi user", () => {
  const bootDir = mkdtempSync(path.join(tmpdir(), "solar-display-system-boot-"));

  try {
    writeFileSync(path.join(bootDir, "user-data"), "#cloud-config\nhostname: old\n");

    const result = runBashScript(prepareUserDataScriptPath, ["--interactive", "--boot-path", bootDir], {
      cwd: repoRoot,
      encoding: "utf8",
      input: [
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "YES",
        "YES",
        ""
      ].join("\n")
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /Solar Player Raspberry Pi user-data setup/);
    assert.match(result.stdout, /User pi will have sudo/);

    const userData = readFileSync(path.join(bootDir, "user-data"), "utf8");
    assert.match(userData, /^hostname: raspberry5$/m);
    assert.match(userData, /^growpart:$/m);
    assert.match(userData, /^  mode: off$/m);
    assert.match(userData, /^resize_rootfs: false$/m);
    assert.match(userData, /^  - name: pi$/m);
    assert.match(userData, /- \{name: pi, password: "pi", type: text\}/);
    assert.match(userData, /- \{name: root, password: "kzroot", type: text\}/);
    assert.match(userData, /^package_upgrade: false$/m);
    assert.match(userData, /^  - openssh-server$/m);
    assert.match(userData, /\/etc\/growroot-disabled/);
    assert.match(userData, /PermitRootLogin no/);

    const deployEnv = readFileSync(path.join(bootDir, "solar-deploy.env"), "utf8");
    assert.match(deployEnv, /^DATA_SIZE_GB=10$/m);
    assert.match(deployEnv, /^KIOSK_USER=pi$/m);
    assert.match(deployEnv, /^MQTT_HOST=192\.168\.31\.62$/m);

    const firstLoginTools = path.join(bootDir, "solar-first-login-tools.sh");
    assert.equal(existsSync(firstLoginTools), true);
    assert.equal(isExecutable(firstLoginTools), true);
    const firstLoginToolsSource = readFileSync(firstLoginTools, "utf8");
    assert.match(firstLoginToolsSource, /apt-get install -y/);
    assert.match(firstLoginToolsSource, /language-pack-zh-hant/);
    assert.match(firstLoginToolsSource, /language-pack-gnome-zh-hant/);
    assert.match(firstLoginToolsSource, /fonts-noto-cjk/);
    assert.match(firstLoginToolsSource, /im-config/);
    assert.match(firstLoginToolsSource, /net-tools/);
    assert.match(firstLoginToolsSource, /fcitx5/);
    assert.match(firstLoginToolsSource, /fcitx5-chewing/);
    assert.match(firstLoginToolsSource, /fcitx5-table-boshiamy/);
    assert.match(firstLoginToolsSource, /locale-gen zh_TW\.UTF-8/);
    assert.match(firstLoginToolsSource, /update-locale LANG=zh_TW\.UTF-8 LANGUAGE=zh_TW:zh/);
    assert.match(firstLoginToolsSource, /mosquitto-clients/);
    assert.match(firstLoginToolsSource, /nvm-sh\/nvm/);
  } finally {
    removeTempDir(bootDir);
  }
});

test("raspi user-data shell helper writes ssh sudo root su cloud-init config", () => {
  const bootDir = mkdtempSync(path.join(tmpdir(), "solar-display-system-boot-"));

  try {
    writeFileSync(path.join(bootDir, "user-data"), "#cloud-config\nhostname: old\n");

    const result = runBashScript(
      prepareUserDataScriptPath,
      [
        "--boot-path",
        bootDir,
        "--hostname",
        "raspberry5",
        "--user",
        "kz",
        "--password",
        "kz",
        "--root-password",
        "kzroot",
        "--data-size-gb",
        "12",
        "--mqtt-host",
        "mqtt.local"
      ],
      {
        cwd: repoRoot,
        encoding: "utf8"
      }
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(existsSync(path.join(bootDir, "user-data.before-solar-player")), true);

    const userData = readFileSync(path.join(bootDir, "user-data"), "utf8");
    assert.match(userData, /^#cloud-config$/m);
    assert.match(userData, /^hostname: raspberry5$/m);
    assert.match(userData, /^ssh_pwauth: true$/m);
    assert.match(userData, /^growpart:$/m);
    assert.match(userData, /^  mode: off$/m);
    assert.match(userData, /^resize_rootfs: false$/m);
    assert.match(userData, /groups: \[adm, cdrom, dip, lxd, sudo\]/);
    assert.match(userData, /sudo: \["ALL=\(ALL\) ALL"\]/);
    assert.match(userData, /- \{name: kz, password: "kz", type: text\}/);
    assert.match(userData, /- \{name: root, password: "kzroot", type: text\}/);
    assert.match(userData, /^  - openssh-server$/m);
    assert.match(userData, /^  - sudo$/m);
    assert.match(userData, /\/etc\/growroot-disabled/);
    assert.match(userData, /systemctl enable --now ssh/);
    assert.doesNotMatch(userData, /PermitRootLogin yes/);

    const deployEnv = readFileSync(path.join(bootDir, "solar-deploy.env"), "utf8");
    assert.match(deployEnv, /^DATA_SIZE_GB=12$/m);
    assert.match(deployEnv, /^KIOSK_USER=kz$/m);
    assert.match(deployEnv, /^MQTT_HOST=mqtt\.local$/m);

    const firstLoginTools = readFileSync(path.join(bootDir, "solar-first-login-tools.sh"), "utf8");
    assert.match(firstLoginTools, /^KIOSK_USER="\$\{KIOSK_USER:-kz\}"$/m);
    assert.match(firstLoginTools, /language-pack-zh-hant/);
    assert.match(firstLoginTools, /language-pack-gnome-zh-hant/);
    assert.match(firstLoginTools, /fonts-noto-cjk/);
    assert.match(firstLoginTools, /im-config/);
    assert.match(firstLoginTools, /fcitx5/);
    assert.match(firstLoginTools, /fcitx5-chewing/);
    assert.match(firstLoginTools, /fcitx5-table-boshiamy/);
    assert.match(firstLoginTools, /update-locale LANG=zh_TW\.UTF-8 LANGUAGE=zh_TW:zh/);
    assert.match(firstLoginTools, /curl -fsSL https:\/\/raw\.githubusercontent\.com\/nvm-sh\/nvm/);
    assert.doesNotMatch(firstLoginTools, /NOPASSWD/);
  } finally {
    removeTempDir(bootDir);
  }
});

test("raspi user-data powershell helper contains matching cloud-init contract", () => {
  const source = readFileSync(prepareUserDataPs1Path, "utf8");

  assert.doesNotMatch(source, /@"/);
  assert.doesNotMatch(source, /@'/);
  assert.match(source, /\[string\]\$User = "pi"/);
  assert.match(source, /\[string\]\$Password = "pi"/);
  assert.match(source, /system-boot/);
  assert.match(source, /#cloud-config/);
  assert.match(source, /ssh_pwauth: true/);
  assert.match(source, /growpart:/);
  assert.match(source, /mode: off/);
  assert.match(source, /resize_rootfs: false/);
  assert.match(source, /openssh-server/);
  assert.match(source, /language-pack-zh-hant/);
  assert.match(source, /fonts-noto-cjk/);
  assert.match(source, /im-config/);
  assert.match(source, /fcitx5-chewing/);
  assert.match(source, /fcitx5-table-boshiamy/);
  assert.match(source, /\/etc\/growroot-disabled/);
  assert.match(source, /chpasswd:/);
  assert.match(source, /root:/);
  assert.match(source, /systemctl enable --now ssh/);
  assert.match(source, /\[string\]\$DataSizeGb = "10"/);
  assert.match(source, /\[string\]\$MqttHost = "192\.168\.31\.62"/);
  assert.match(source, /solar-deploy\.env/);
  assert.match(source, /DATA_SIZE_GB=\$DataSizeGb/);
  assert.match(source, /solar-first-login-tools\.sh/);
  assert.match(source, /net-tools/);
  assert.match(source, /mosquitto-clients/);
  assert.match(source, /nvm-sh\/nvm/);
  assert.doesNotMatch(source, /PermitRootLogin yes/);
});

test("raspi bootstrap dry-run rejects root-full layout without data mount", () => {
  const result = runBashScript(
    raspiBootstrapScriptPath,
    [
      "--mode",
      "init",
      "--dry-run",
      "--disk-fixture",
      "root-full-no-data"
    ],
    {
      cwd: repoRoot,
      encoding: "utf8"
    }
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /online root shrink is not supported/);
  assert.doesNotMatch(result.stdout + result.stderr, /\bresize2fs\b.*\b-M\b/);
});

test("raspi bootstrap dry-run can reuse existing writable data mount", () => {
  const result = runBashScript(
    raspiBootstrapScriptPath,
    [
      "--mode",
      "init",
      "--dry-run",
      "--skip-host-preflight",
      "--disk-fixture",
      "writable-data"
    ],
    {
      cwd: repoRoot,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /OK: existing writable \/data mount can be reused/);
  assert.doesNotMatch(result.stdout, /\b(mkfs|parted|sfdisk)\b/);
});

test("raspi bootstrap confirms online root partition resize after explicit data creation opt-in", () => {
  const source = readFileSync(raspiBootstrapScriptPath, "utf8");

  assert.match(source, /CONFIRM_CREATE_DATA/);
  assert.match(source, /DATA_SIZE_GB="10"/);
  assert.match(source, /disk_size_bytes="\$\(blockdev --getsize64 "\$\{disk_dev\}"\)"/);
  assert.match(source, /parted ---pretend-input-tty/);
  assert.match(source, /resizepart "\$\{root_part_num\}" "\$\{root_end\}"/);
  assert.match(source, /root_end_sector="\$\(parted -m "\$\{disk_dev\}" unit s print/);
  assert.match(source, /data_start_sector=\$\(\( \(\(root_end_sector \+ 2048\) \/ 2048\) \* 2048 \)\)/);
  assert.match(source, /mkpart primary ext4 "\$\{data_start_sector\}s" 100%/);
});

test("raspi bootstrap creates mqtt env only when target env is missing", () => {
  const projectDir = makeFixtureProject();
  const installDir = path.join(projectDir, "install");

  try {
    writeFileSync(
      path.join(projectDir, "deploy/raspi-bootstrap.sh"),
      readFileSync(raspiBootstrapScriptPath, "utf8")
    );
    markBashExecutable(path.join(projectDir, "deploy/raspi-bootstrap.sh"));
    mkdirSync(installDir, { recursive: true });
    writeFileSync(path.join(installDir, ".env.example"), "MQTT_BROKER_HOST=localhost\n");

    const createResult = runBashScript("deploy/raspi-bootstrap.sh", [
      "--mode",
      "update",
      "--scope",
      "full",
      "--skip-host-preflight",
      "--skip-disk",
      "--configure-env-only",
      "--install-dir",
      installDir,
      "--mqtt-host",
      "192.168.31.62"
    ], {
      cwd: projectDir,
      encoding: "utf8"
    });

    assert.equal(createResult.status, 0, createResult.stderr || createResult.stdout);
    assert.match(readFileSync(path.join(installDir, ".env"), "utf8"), /^MQTT_BROKER_HOST=192\.168\.31\.62$/m);
    assert.match(createResult.stdout, /Created target \.env/);

    writeFileSync(path.join(installDir, ".env"), "MQTT_BROKER_HOST=existing\n");
    const preserveResult = runBashScript("deploy/raspi-bootstrap.sh", [
      "--mode",
      "update",
      "--scope",
      "full",
      "--skip-host-preflight",
      "--skip-disk",
      "--configure-env-only",
      "--install-dir",
      installDir,
      "--mqtt-host",
      "192.168.31.62"
    ], {
      cwd: projectDir,
      encoding: "utf8"
    });

    assert.equal(preserveResult.status, 0, preserveResult.stderr || preserveResult.stdout);
    assert.equal(readFileSync(path.join(installDir, ".env"), "utf8"), "MQTT_BROKER_HOST=existing\n");
    assert.match(preserveResult.stdout, /MQTT defaults were not overwritten/);
  } finally {
    removeTempDir(projectDir);
  }
});

test("raspi bootstrap cp fallback preserves runtime env and mutable directories", () => {
  const source = readFileSync(raspiBootstrapScriptPath, "utf8");

  assert.match(source, /--exclude \.env/);
  assert.match(source, /--exclude data/);
  assert.match(source, /--exclude logs/);
  assert.match(source, /--exclude uploads/);
  assert.match(source, /--exclude backups/);
  assert.doesNotMatch(source, /cp -R "\$\{BUNDLE_DIR\}\/\." "\$\{INSTALL_DIR\}\/"/);
  assert.match(source, /! -name "\.env"/);
  assert.match(source, /\.env\|data\|logs\|uploads\|backups/);
});

test("lightweight desktop helper configures xfce lightdm xrdp firefox without weakening ssh or sudo", () => {
  const source = readFileSync(lightweightDesktopScriptPath, "utf8");
  const displaySleepSource = readFileSync(displaySleepScriptPath, "utf8");
  const result = runBashScript(
    lightweightDesktopScriptPath,
    [
      "--user",
      "kz",
      "--desktop",
      "xfce-xrdp",
      "--rdp-auth",
      "passwordless",
      "--rdp-password",
      "kz",
      "--dry-run"
    ],
    {
      cwd: repoRoot,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(source, /xfce4/);
  assert.match(source, /lightdm/);
  assert.match(source, /xrdp/);
  assert.match(source, /xorgxrdp/);
  assert.match(source, /xserver-xorg-input-libinput/);
  assert.match(source, /network-manager-gnome/);
  assert.match(source, /policykit-1-gnome/);
  assert.match(source, /fonts-noto-cjk/);
  assert.match(source, /fonts-noto-core/);
  assert.match(source, /firefox/);
  assert.match(source, /xdg-utils/);
  assert.match(source, /im-config/);
  assert.match(source, /fcitx5/);
  assert.match(source, /fcitx5-chewing/);
  assert.match(source, /fcitx5-table-boshiamy/);
  assert.match(source, /autologin-user=/);
  assert.match(source, /startxfce4/);
  assert.match(source, /\.xprofile/);
  assert.match(source, /GTK_IM_MODULE=fcitx/);
  assert.match(source, /QT_IM_MODULE=fcitx/);
  assert.match(source, /XMODIFIERS=@im=fcitx/);
  assert.match(source, /\/etc\/environment\.d\/90-solar-fcitx\.conf/);
  assert.match(source, /fcitx5 -d/);
  assert.match(source, /disable-display-sleep\.sh/);
  assert.match(displaySleepSource, /light-locker\.desktop/);
  assert.match(displaySleepSource, /xscreensaver\.desktop/);
  assert.match(displaySleepSource, /solar-disable-display-sleep\.desktop/);
  assert.match(displaySleepSource, /solar-disable-display-sleep\.sh/);
  assert.match(displaySleepSource, /xset s off/);
  assert.match(displaySleepSource, /xset s noblank/);
  assert.match(displaySleepSource, /xset -dpms/);
  assert.match(displaySleepSource, /xfce4-power-manager\.xml/);
  assert.match(displaySleepSource, /dpms-enabled/);
  assert.match(displaySleepSource, /blank-on-ac/);
  assert.match(displaySleepSource, /presentation-mode/);
  assert.match(displaySleepSource, /Hidden=true/);
  assert.match(source, /\.xinputrc/);
  assert.match(source, /run_im fcitx5/);
  assert.match(source, /DefaultIM=keyboard-us/);
  assert.match(source, /Name=boshiamy/);
  assert.match(source, /Name=chewing/);
  assert.match(source, /update-locale LANG=zh_TW\.UTF-8 LANGUAGE=zh_TW:zh/);
  assert.match(source, /NotoSansCJK-Regular\.ttc/);
  assert.match(source, /Noto Sans CJK TC 10/);
  assert.match(source, /fc-cache -f/);
  assert.match(source, /\/etc\/NetworkManager\/conf\.d\/10-solar-managed\.conf/);
  assert.match(source, /managed=true/);
  assert.match(source, /\/etc\/netplan\/90-solar-network-manager\.yaml/);
  assert.match(source, /renderer: NetworkManager/);
  assert.match(source, /\/etc\/polkit-1\/rules\.d\/49-solar-networkmanager\.rules/);
  assert.match(source, /org\.freedesktop\.NetworkManager\.network-control/);
  assert.match(source, /org\.freedesktop\.NetworkManager\.settings\.modify\.system/);
  assert.match(source, /org\.freedesktop\.NetworkManager\.enable-disable-wifi/);
  assert.match(source, /\.cache\/sessions/);
  assert.match(source, /\.config\/xfce4-session/);
  assert.match(source, /XDG_CONFIG_DIRS="\/etc\/xdg"/);
  assert.match(source, /dbus-run-session -- startxfce4/);
  assert.match(source, /99-solar-raspi-kms\.conf/);
  assert.match(source, /Option "kmsdev" "\/dev\/dri\/card1"/);
  assert.match(source, /Option "AutoAddGPU" "off"/);
  assert.match(source, /\/etc\/X11\/xrdp\/xorg\.conf\.d/);
  assert.match(source, /param=-configdir/);
  assert.match(source, /param=\/etc\/X11\/xrdp\/xorg\.conf\.d/);
  assert.match(result.stdout, /RDP auth: passwordless/);
  assert.doesNotMatch(source, /NOPASSWD/);
  assert.doesNotMatch(source, /PasswordAuthentication no/);
});

test("desktop helpers explicitly assign every XFCE directory layer to the kiosk user", () => {
  for (const scriptPath of [
    lightweightDesktopScriptPath,
    displaySleepScriptPath,
    displayPopupsScriptPath,
    desktopThemeScriptPath
  ]) {
    const source = readFileSync(scriptPath, "utf8");

    assert.match(source, /"\$\{kiosk_home\}\/\.config\/xfce4"/u, scriptPath);
    assert.match(source, /"\$\{kiosk_home\}\/\.config\/xfce4\/xfconf"/u, scriptPath);
  }

  const desktopSource = readFileSync(lightweightDesktopScriptPath, "utf8");
  assert.match(desktopSource, /"\$\{kiosk_home\}\/\.config\/xfce4\/panel"/u);
  assert.match(desktopSource, /"\$\{kiosk_home\}\/\.local"/u);
  assert.match(desktopSource, /"\$\{kiosk_home\}\/\.local\/share"/u);
  assert.match(desktopSource, /"\$\{kiosk_home\}\/\.local\/share\/fonts"/u);
});

test("repair kiosk system helper persists copymods modules and Firefox snap CJK fonts", () => {
  const source = readFileSync(repairKioskSystemScriptPath, "utf8");

  assert.match(source, /REPAIR_FIREFOX_FONTS/);
  assert.match(source, /REPAIR_COPYMODS_MODULES/);
  assert.match(source, /NotoSansCJK-Regular\.ttc/);
  assert.match(source, /snap run --shell firefox/);
  assert.match(source, /font\.name-list\.sans-serif\.zh-TW/);
  assert.match(source, /if \[\[ -n "\$\{snap_data_dir\}" \]\]/);
  assert.match(source, /findmnt \/usr\/lib\/modules/);
  assert.match(source, /Missing rsync/);
  assert.match(source, /source.*copymods/);
  assert.match(source, /disable readonly root and reboot before repairing copymods modules/);
  assert.match(source, /rsync -a --delete "\/usr\/lib\/modules\/\$\{kernel\}\//);
  assert.match(source, /depmod -b "\$\{mount_dir\}" "\$\{kernel\}"/);
});

test("lightweight desktop helper fails closed for passwordless rdp without a password source", () => {
  const result = runBashScript(
    lightweightDesktopScriptPath,
    [
      "--user",
      "kz",
      "--desktop",
      "xfce-xrdp",
      "--rdp-auth",
      "passwordless",
      "--dry-run"
    ],
    {
      cwd: repoRoot,
      encoding: "utf8"
    }
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /RDP passwordless requires --rdp-password or RDP_PASSWORD/);
});

test("display sleep helper disables system sleep and X blanking without touching RDP auth", () => {
  const source = readFileSync(displaySleepScriptPath, "utf8");

  assert.match(source, /systemctl mask sleep\.target suspend\.target hibernate\.target hybrid-sleep\.target/);
  assert.match(source, /99-solar-no-sleep\.conf/);
  assert.match(source, /IdleAction=ignore/);
  assert.match(source, /x11-xserver-utils/);
  assert.match(source, /xfce4-power-manager/);
  assert.match(source, /solar-disable-display-sleep\.desktop/);
  assert.match(source, /light-locker\.desktop/);
  assert.match(source, /xscreensaver\.desktop/);
  assert.match(source, /xset dpms force on/);
  assert.match(source, /xset s reset/);
  assert.match(source, /xset s off/);
  assert.match(source, /xset s noblank/);
  assert.match(source, /xset -dpms/);
  assert.match(source, /DPMS is Disabled/);
  assert.doesNotMatch(source, /RDP_AUTH/);
  assert.doesNotMatch(source, /passwordless/);
  assert.doesNotMatch(source, /xrdp/);
});

test("lightweight desktop helper delegates display sleep setup to the standalone helper", () => {
  const source = readFileSync(lightweightDesktopScriptPath, "utf8");

  assert.match(source, /SCRIPT_DIR=.*dirname "\$0"/);
  assert.match(source, /\$\{SCRIPT_DIR\}\/disable-display-sleep\.sh"\s+--user "\$\{KIOSK_USER\}"/);
});

test("xfce display popup helper disables hotplug dialogs and identity popups", () => {
  const source = readFileSync(displayPopupsScriptPath, "utf8");

  assert.match(source, /xfconf-query/);
  assert.match(source, /\/Notify/);
  assert.match(source, /\/IdentityPopups/);
  assert.match(source, /\/AutoEnableProfiles/);
  assert.match(source, /dbus-run-session/);
});

test("lightweight desktop helper delegates xfce display popup suppression to the standalone helper", () => {
  const source = readFileSync(lightweightDesktopScriptPath, "utf8");

  assert.match(source, /\$\{SCRIPT_DIR\}\/disable-xfce-display-popups\.sh"\s+--user "\$\{KIOSK_USER\}"/);
});

test("desktop theme helper installs a balanced xfce theme profile without touching auth flows", () => {
  const source = readFileSync(desktopThemeScriptPath, "utf8");
  const result = runBashScript(
    desktopThemeScriptPath,
    [
      "--user",
      "kz",
      "--dry-run"
    ],
    {
      cwd: repoRoot,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Theme profile: balanced-xfce/);
  assert.match(source, /arc-theme/);
  assert.match(source, /papirus-icon-theme/);
  assert.match(source, /dmz-cursor-theme/);
  assert.match(source, /fonts-noto-core/);
  assert.match(source, /fonts-noto-cjk/);
  assert.match(source, /fonts-noto-mono/);
  assert.match(source, /fonts-noto-color-emoji/);
  assert.match(source, /Arc-Darker/);
  assert.match(source, /Papirus-Dark/);
  assert.match(source, /DMZ-White/);
  assert.match(source, /Noto Sans CJK TC 11/);
  assert.match(source, /Noto Sans Mono 11/);
  assert.match(source, /\.config\/gtk-3\.0\/settings\.ini/);
  assert.match(source, /xfce-perchannel-xml\/xsettings\.xml/);
  assert.match(source, /xfce-perchannel-xml\/xfwm4\.xml/);
  assert.doesNotMatch(source, /xrdp/);
  assert.doesNotMatch(source, /NetworkManager/);
  assert.doesNotMatch(source, /polkit/);
});

test("readonly desktop launchers call fixed helpers and require sudo", () => {
  const enableDesktop = readFileSync(path.join(repoRoot, "deploy/enable-readonly-system.desktop"), "utf8");
  const disableDesktop = readFileSync(path.join(repoRoot, "deploy/disable-readonly-system.desktop"), "utf8");
  const enableHelper = readFileSync(readonlyEnableScriptPath, "utf8");
  const disableHelper = readFileSync(readonlyDisableScriptPath, "utf8");

  assert.match(enableDesktop, /Name=Enable Read Only System/);
  assert.match(enableDesktop, /Exec=.*readonly-system-enable\.sh/);
  assert.match(disableDesktop, /Name=Temporarily Disable Read Only System/);
  assert.match(disableDesktop, /Exec=.*readonly-system-disable\.sh/);
  assert.match(enableHelper, /sudo/);
  assert.match(enableHelper, /KIOSK_USER="\$\{KIOSK_USER:-\$\(id -un\)\}"/);
  assert.match(enableHelper, /KIOSK_USER="\$\{KIOSK_USER\}"/);
  assert.match(enableHelper, /enable-readonly-root\.sh/);
  assert.match(disableHelper, /sudo/);
  assert.match(disableHelper, /overlayroot-chroot/);
  assert.doesNotMatch(enableDesktop + disableDesktop, /sh -c/);
});

test("runtime export script archives data uploads and .env from the install root", () => {
  const projectDir = makeFixtureProject();
  const outputDir = path.join(projectDir, "backups");

  try {
    writeFileSync(path.join(projectDir, "deploy/export-runtime-state.sh"), readFileSync(exportScriptPath, "utf8"));
    writeFileSync(path.join(projectDir, "package.json"), JSON.stringify({ name: "solar-display", version: "9.9.9" }, null, 2));

    const result = spawnSync(
      bashCommand,
      [
        "-lc",
        [
          `INSTALL_DIR=${quoteForBash(toBashPathValue(projectDir))}`,
          `EXPORT_OUTPUT_DIR=${quoteForBash(toBashPathValue(outputDir))}`,
          "EXPORT_TIMESTAMP='20260610-030000'",
          "EXPORT_ALLOW_LIVE=1",
          "bash deploy/export-runtime-state.sh"
        ].join(" ")
      ],
      {
        cwd: projectDir,
        encoding: "utf8"
      }
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /BACKUP_DIR=/);

    const backupDir = path.join(outputDir, "20260610-030000");
    const archivePath = path.join(backupDir, "runtime.tar.gz");
    assert.equal(waitForPathExists(archivePath), true);
    assert.equal(existsSync(path.join(backupDir, "manifest.json")), true);
    assert.equal(existsSync(path.join(backupDir, "runtime.tar.gz.sha256")), true);
    assert.equal(existsSync(path.join(backupDir, "prior-application.tar.gz")), true);
    assert.equal(fileMode(backupDir), 0o700);
    assert.equal(fileMode(archivePath), 0o600);
    assert.equal(fileMode(path.join(backupDir, "manifest.json")), 0o600);

    const listing = spawnSync("tar", ["-tzf", archivePath], {
      cwd: projectDir,
      encoding: "utf8"
    });

    assert.equal(listing.status, 0, listing.stderr || listing.stdout);
    assert.match(listing.stdout, /(^|\/)data\/$/m);
    assert.match(listing.stdout, /data\/solar-display\.sqlite/);
    assert.match(listing.stdout, /uploads\/images\/hero\.png/);
    assert.match(listing.stdout, /uploads\/brand\/logo\.png/);
    assert.match(listing.stdout, /(^|\/)\.env$/m);
    assert.match(listing.stdout, /manifest\.json/);

    const manifest = JSON.parse(readFileSync(path.join(backupDir, "manifest.json"), "utf8"));
    assert.equal(manifest.schemaVersion, 1);
    assert.equal(manifest.containsSecrets, true);
    assert.equal(manifest.sourceRelease.name, "solar-display");
    assert.equal(manifest.sourceRelease.version, "9.9.9");
    assert.ok(manifest.entries.includes("data"));
    assert.ok(manifest.entries.includes(".env"));
    assert.ok(manifest.payloads["runtime.tar.gz"].sha256);
    assert.ok(manifest.payloads["prior-application.tar.gz"].sha256);
    assert.deepEqual(manifest.schemaVersions, ["001_init"]);
  } finally {
    removeTempDir(projectDir);
  }
});

test("reset db settings script removes sqlite state without touching uploads", () => {
  const projectDir = makeFixtureProject();

  try {
    writeFileSync(path.join(projectDir, "deploy/reset-db-settings.sh"), readFileSync(resetDbScriptPath, "utf8"));
    writeFileSync(path.join(projectDir, "data/solar-display.sqlite-wal"), "wal\n");
    writeFileSync(path.join(projectDir, "data/solar-display.sqlite-shm"), "shm\n");

    const result = runBashScript("deploy/reset-db-settings.sh", [], {
      cwd: projectDir,
      env: {
        ...process.env,
        INSTALL_DIR: projectDir
      },
      bashPathKeys: ["INSTALL_DIR"],
      encoding: "utf8"
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(existsSync(path.join(projectDir, "data/solar-display.sqlite")), false);
    assert.equal(existsSync(path.join(projectDir, "data/solar-display.sqlite-wal")), false);
    assert.equal(existsSync(path.join(projectDir, "data/solar-display.sqlite-shm")), false);
    assert.equal(existsSync(path.join(projectDir, "uploads/images/hero.png")), true);
    assert.equal(existsSync(path.join(projectDir, "uploads/brand/logo.png")), true);
  } finally {
    removeTempDir(projectDir);
  }
});

test("reset db settings script restarts an active service when sqlite removal fails", () => {
  const projectDir = makeFixtureProject();
  const fakeBinDir = path.join(projectDir, "fake-bin");
  const systemctlLog = path.join(projectDir, "systemctl.log");

  try {
    writeFileSync(path.join(projectDir, "deploy/reset-db-settings.sh"), readFileSync(resetDbScriptPath, "utf8"));
    rmSync(path.join(projectDir, "data/solar-display.sqlite"), { force: true });
    mkdirSync(path.join(projectDir, "data/solar-display.sqlite"));
    mkdirSync(fakeBinDir);

    const systemctlPath = path.join(fakeBinDir, "systemctl");
    writeFileSync(
      systemctlPath,
      [
        "#!/bin/bash",
        "set -euo pipefail",
        `LOG_PATH=${JSON.stringify(toBashPathValue(systemctlLog))}`,
        'case "$1" in',
        "  is-active)",
        "    exit 0",
        "    ;;",
        "  stop|start)",
        '    echo "$1 ${@: -1}" >> "${LOG_PATH}"',
        "    exit 0",
        "    ;;",
        "  *)",
        '    echo "unexpected systemctl call: $*" >&2',
        "    exit 1",
        "    ;;",
        "esac",
        ""
      ].join("\n")
    );
    markBashExecutable(systemctlPath);

    const result = spawnSync(
      bashCommand,
      [
        "-lc",
        [
          `PATH=${quoteForBash(`${toBashPathValue(fakeBinDir)}:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`)}`,
          `INSTALL_DIR=${quoteForBash(toBashPathValue(projectDir))}`,
          "bash deploy/reset-db-settings.sh"
        ].join(" ")
      ],
      {
        cwd: projectDir,
        encoding: "utf8"
      }
    );

    assert.notEqual(result.status, 0);

    assert.equal(waitForPathExists(systemctlLog), true);
    const log = readFileSync(systemctlLog, "utf8");
    assert.match(log, /^stop solar-display$/m);
    assert.match(log, /^start solar-display$/m);
  } finally {
    removeTempDir(projectDir);
  }
});

test("kiosk launcher waits for health and launches Firefox in kiosk mode", () => {
  const source = readFileSync(path.join(repoRoot, "deploy/start-solar-kiosk.sh"), "utf8");

  assert.match(source, /http:\/\/127\.0\.0\.1:3000\/health/);
  assert.match(source, /KIOSK_DISPLAY_OUTPUT="\$\{KIOSK_DISPLAY_OUTPUT:-\}"/);
  assert.match(source, /firefox -kiosk -private-window/);
  assert.match(source, /kiosk-launcher\.log/);
  assert.match(source, /metadata::trusted true/);
  assert.match(source, /KIOSK_START_DELAY:-5/);
  assert.match(source, /resolve_graphical_environment\(\)/);
  assert.match(source, /export XDG_RUNTIME_DIR="\/run\/user\/\$\(id -u\)"/);
  assert.match(source, /export DBUS_SESSION_BUS_ADDRESS="unix:path=\$\{XDG_RUNTIME_DIR\}\/bus"/);
  assert.match(source, /export DISPLAY=":0"/);
  assert.match(source, /export GTK_IM_MODULE="\$\{GTK_IM_MODULE:-fcitx\}"/);
  assert.match(source, /export QT_IM_MODULE="\$\{QT_IM_MODULE:-fcitx\}"/);
  assert.match(source, /lock_fhd_resolution\(\)/);
  assert.match(source, /requested_output="\$\{KIOSK_DISPLAY_OUTPUT:-\}"/);
  assert.match(source, /\$2 == "connected" && \$3 == "primary"/);
  assert.match(source, /xrandr --output "\$\{connected_output\}" --primary/);
  assert.match(source, /xrandr --output "\$\{connected_output\}" --mode 1920x1080 --rate 60/);
  assert.match(source, /locked \$\{connected_output\} to 1920x1080/);
  assert.match(source, /disable_display_sleep\(\)/);
  assert.match(source, /xset s off/);
  assert.match(source, /xset s noblank/);
  assert.match(source, /xset -dpms/);
  assert.match(source, /export XMODIFIERS="\$\{XMODIFIERS:-@im=fcitx\}"/);
  assert.match(source, /SESSION_KEY="\$\{XDG_SESSION_ID:-\$\{WAYLAND_DISPLAY:-\$\{DISPLAY:-default\}\}\}"/);
  assert.match(source, /FIREFOX_PID_FILE="\$\{LOG_DIR\}\/firefox-\$\{SESSION_KEY\}\.pid"/);
  assert.match(source, /firefox already running for this session/);
});

test("deploy bundle includes the db reset helper", () => {
  const source = readFileSync(deployScriptPath, "utf8");

  assert.match(source, /deploy\/reset-db-settings\.sh/);
  assert.match(source, /Reset DB settings only: \.\/deploy\/reset-db-settings\.sh/);
});

test("read-only hardening helper fails closed when runtime path is missing", () => {
  const projectDir = makeFixtureProject();

  try {
    writeFileSync(
      path.join(projectDir, "deploy/enable-readonly-root.sh"),
      readFileSync(path.join(repoRoot, "deploy/enable-readonly-root.sh"), "utf8")
    );
    markBashExecutable(path.join(projectDir, "deploy/enable-readonly-root.sh"));

    const result = runBashScript("deploy/enable-readonly-root.sh", [], {
      cwd: projectDir,
      env: {
        ...process.env,
        INSTALL_DIR: path.join(projectDir, "missing-runtime")
      },
      bashPathKeys: ["INSTALL_DIR"],
      encoding: "utf8"
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Runtime install directory is missing/);
  } finally {
    removeTempDir(projectDir);
  }
});

test("read-only hardening helper applies overlayroot through a local config", () => {
  const source = readFileSync(path.join(repoRoot, "deploy/enable-readonly-root.sh"), "utf8");

  assert.match(source, /OVERLAYROOT_MODE="\$\{OVERLAYROOT_MODE:-tmpfs:recurse=0\}"/);
  assert.match(source, /apt-get install -y overlayroot/);
  assert.match(source, /\/etc\/overlayroot\.local\.conf/);
  assert.match(source, /printf 'overlayroot="%s"\\n'/);
  assert.match(source, /update-initramfs -u/);
});

test("kiosk verification helper fails when the desktop re-entry launcher is missing", () => {
  const projectDir = makeFixtureProject();
  const fakeBinDir = path.join(projectDir, "fake-bin");
  const kioskHome = path.join(projectDir, "home", "kz");
  const installDir = path.join(projectDir, "data-install");

  try {
    writeFileSync(
      path.join(projectDir, "deploy/verify-kiosk-install.sh"),
      readFileSync(path.join(repoRoot, "deploy/verify-kiosk-install.sh"), "utf8")
    );
    markBashExecutable(path.join(projectDir, "deploy/verify-kiosk-install.sh"));
    mkdirSync(path.join(kioskHome, ".config/autostart"), { recursive: true });
    mkdirSync(fakeBinDir);
    for (const runtimePath of [
      "data",
      "logs",
      "uploads/images",
      "uploads/brand"
    ]) {
      mkdirSync(path.join(installDir, runtimePath), { recursive: true });
    }
    writeFileSync(path.join(kioskHome, ".config/autostart/firefox-kiosk.desktop"), "[Desktop Entry]\n");

    for (const command of ["systemctl", "curl"]) {
      const commandPath = path.join(fakeBinDir, command);
      writeFileSync(commandPath, "#!/bin/bash\nexit 0\n");
      markBashExecutable(commandPath);
    }
    const sudoPath = path.join(fakeBinDir, "sudo");
    writeFileSync(
      sudoPath,
      [
        "#!/bin/bash",
        "if [[ \"$1\" == \"-u\" ]]; then",
        "  shift 2",
        "fi",
        "exec \"$@\"",
        ""
      ].join("\n")
    );
    markBashExecutable(sudoPath);

    const result = runBashScript("deploy/verify-kiosk-install.sh", [
      "--install-dir",
      installDir,
      "--kiosk-user",
      "kz",
      "--kiosk-home",
      kioskHome
    ], {
      cwd: projectDir,
      bashPrependPathDirs: [fakeBinDir],
      encoding: "utf8"
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /desktop re-entry launcher exists/);
    assert.match(result.stderr, /Device Status re-entry guidance is not backed/);
  } finally {
    removeTempDir(projectDir);
  }
});

test("kiosk verification helper rejects an XFCE profile that the kiosk user cannot write", () => {
  const projectDir = makeFixtureProject();
  const fakeBinDir = path.join(projectDir, "fake-bin");
  const kioskHome = path.join(projectDir, "home", "kz");
  const installDir = path.join(projectDir, "data-install");

  try {
    writeFileSync(
      path.join(projectDir, "deploy/verify-kiosk-install.sh"),
      readFileSync(path.join(repoRoot, "deploy/verify-kiosk-install.sh"), "utf8")
    );
    markBashExecutable(path.join(projectDir, "deploy/verify-kiosk-install.sh"));
    mkdirSync(path.join(kioskHome, ".config/xfce4/xfconf"), { recursive: true });
    mkdirSync(path.join(kioskHome, ".config/xfce4/panel"), { recursive: true });
    mkdirSync(fakeBinDir);
    for (const runtimePath of ["data", "logs", "uploads/images", "uploads/brand"]) {
      mkdirSync(path.join(installDir, runtimePath), { recursive: true });
    }

    for (const command of ["curl", "systemctl", "xfce4-panel"]) {
      const commandPath = path.join(fakeBinDir, command);
      writeFileSync(commandPath, "#!/bin/bash\nexit 0\n");
      markBashExecutable(commandPath);
    }
    const sudoPath = path.join(fakeBinDir, "sudo");
    writeFileSync(
      sudoPath,
      [
        "#!/bin/bash",
        "if [[ \"$1\" == \"-u\" ]]; then shift 2; fi",
        `if [[ "$1" == "test" && "$2" == "-w" && "$3" == ${JSON.stringify(toBashPathValue(path.join(kioskHome, ".config/xfce4")))}* ]]; then exit 1; fi`,
        "exec \"$@\"",
        ""
      ].join("\n")
    );
    markBashExecutable(sudoPath);

    const result = runBashScript("deploy/verify-kiosk-install.sh", [
      "--install-dir",
      installDir,
      "--kiosk-user",
      "kz",
      "--kiosk-home",
      kioskHome
    ], {
      cwd: projectDir,
      env: process.env,
      bashPrependPathDirs: [fakeBinDir],
      encoding: "utf8"
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /XFCE user config directories are writable by kz/);
  } finally {
    removeTempDir(projectDir);
  }
});

test("kiosk verification helper checks modules Firefox Wi-Fi and Tailscale gates", () => {
  const source = readFileSync(path.join(repoRoot, "deploy/verify-kiosk-install.sh"), "utf8");

  assert.match(source, /modules_not_hidden_by_copymods/);
  assert.match(source, /launcher_exec_line="\$\(grep '\^Exec=' "\$\{DESKTOP_LAUNCHER\}" 2>\/dev\/null \|\| true\)"/);
  assert.match(source, /Exec=env KIOSK_DISPLAY_OUTPUT=/);
  assert.match(source, /Firefox snap resolves Traditional Chinese to Noto Sans CJK TC/);
  assert.match(source, /Wi-Fi is connected when a Wi-Fi device is present/);
  assert.match(source, /Tailscale CLI is installed and tailscaled\.service is enabled and active/);
  assert.match(source, /systemctl is-enabled tailscaled\.service/);
  assert.match(source, /\[\[ "\$\{enablement\}" == "enabled" \]\]/);
  assert.match(source, /systemctl is-active --quiet tailscaled\.service/);
  assert.match(source, /display sleep disable autostart is configured/);
  assert.match(source, /display sleep is disabled when X display is available/);
  assert.match(source, /system sleep targets are masked/);
  assert.match(source, /system_sleep_targets_masked/);
  assert.match(source, /sleep\.target suspend\.target hibernate\.target hybrid-sleep\.target/);
  assert.match(source, /99-solar-no-sleep\.conf/);
  assert.match(source, /Fcitx5 Chewing is installed and present in the kiosk profile/);
  assert.match(source, /fcitx5-chewing/);
  assert.match(source, /Name=chewing/);
  assert.match(source, /solar-disable-display-sleep\.desktop/);
  assert.match(source, /DPMS is Disabled/);
  assert.match(source, /snap run --shell firefox/);
  assert.match(source, /fc-match sans:lang=zh-tw/);
  assert.match(source, /findmnt -no SOURCE \/usr\/lib\/modules/);
  assert.match(source, /nmcli -t -f TYPE,STATE device status/);
});

test("Tailscale verification requires the CLI plus an enabled and active daemon without enrollment", () => {
  const source = readFileSync(path.join(repoRoot, "deploy/verify-kiosk-install.sh"), "utf8");
  const functionSource = source.match(/tailscale_prerequisite_ready\(\) \{[\s\S]*?\n\}/u)?.[0];

  assert.ok(functionSource, "verifier must define tailscale_prerequisite_ready");

  const runFixture = ({ cliInstalled, enablement, active }) => {
    const projectDir = mkdtempSync(path.join(tmpdir(), "solar-tailscale-verify-test-"));
    const fakeBinDir = path.join(projectDir, "fake-bin");
    const invocationLog = path.join(projectDir, "tailscale-invocations.log");
    const verifierPath = path.join(projectDir, "verify-tailscale.sh");

    mkdirSync(fakeBinDir, { recursive: true });
    writeFileSync(path.join(fakeBinDir, "systemctl"), [
      "#!/bin/bash",
      "set -euo pipefail",
      'case "$1" in',
      `  is-enabled) echo ${enablement}; [[ ${quoteForBash(enablement)} == enabled || ${quoteForBash(enablement)} == enabled-runtime ]] ;;`,
      `  is-active) exit ${active ? 0 : 1} ;;`,
      "  *) exit 1 ;;",
      "esac",
      ""
    ].join("\n"));
    markBashExecutable(path.join(fakeBinDir, "systemctl"));

    if (cliInstalled) {
      writeFileSync(path.join(fakeBinDir, "tailscale"), [
        "#!/bin/bash",
        `echo invoked >> ${quoteForBash(toBashPathValue(invocationLog))}`,
        "echo NeedsLogin",
        "exit 99",
        ""
      ].join("\n"));
      markBashExecutable(path.join(fakeBinDir, "tailscale"));
    }

    writeFileSync(verifierPath, `#!/bin/bash\nset -u\n${functionSource}\ntailscale_prerequisite_ready\n`);
    markBashExecutable(verifierPath);

    const result = spawnSync(bashCommand, [verifierPath], {
      cwd: projectDir,
      env: {
        ...process.env,
        PATH: `${fakeBinDir}:/usr/bin:/bin`
      },
      encoding: "utf8"
    });
    const tailscaleInvoked = existsSync(invocationLog);
    removeTempDir(projectDir);
    return { result, tailscaleInvoked };
  };

  assert.notEqual(runFixture({ cliInstalled: false, enablement: "enabled", active: true }).result.status, 0);
  assert.notEqual(runFixture({ cliInstalled: true, enablement: "disabled", active: true }).result.status, 0);
  assert.notEqual(runFixture({ cliInstalled: true, enablement: "enabled", active: false }).result.status, 0);
  assert.notEqual(runFixture({ cliInstalled: true, enablement: "enabled-runtime", active: true }).result.status, 0);

  const ready = runFixture({ cliInstalled: true, enablement: "enabled", active: true });
  assert.equal(ready.result.status, 0, ready.result.stderr || ready.result.stdout);
  assert.equal(ready.tailscaleInvoked, false, "readiness must not require login, backend state, or an assigned IP");
});

test("hotspot policy verification passes configured state, fails drift, and skips unconfigured targets", () => {
  const source = readFileSync(path.join(repoRoot, "deploy/verify-kiosk-install.sh"), "utf8");
  const functionSource = source.match(/verify_hotspot_policy\(\) \{[\s\S]*?\n\}/u)?.[0];

  assert.ok(functionSource, "verifier must define verify_hotspot_policy");
  assert.match(source, /SKIP: preferred hotspot policy is not configured/u);

  const runFixture = ({ configured = true, priority = "100" } = {}) => {
    const fixtureDir = mkdtempSync(path.join(tmpdir(), "solar-hotspot-verify-"));
    const fakeBinDir = path.join(fixtureDir, "bin");
    const envPath = path.join(fixtureDir, "hotspot.env");
    const triggerPath = path.join(fixtureDir, "tailscale-hotspot-trigger.sh");
    const servicePath = path.join(fixtureDir, "tailscale-hotspot-trigger.service");
    const timerPath = path.join(fixtureDir, "tailscale-hotspot-trigger.timer");
    mkdirSync(fakeBinDir, { recursive: true });

    if (configured) {
      writeFileSync(envPath, [
        "HOTSPOT_CONNECTION_ID=Yishow",
        "HOTSPOT_SCAN_SSID=Yishow",
        "HOTSPOT_PRIORITY=100",
        ""
      ].join("\n"));
      writeFileSync(triggerPath, "#!/bin/bash\n");
      writeFileSync(servicePath, "[Service]\n");
      writeFileSync(timerPath, "[Timer]\n");
      markBashExecutable(triggerPath);
    }

    writeFileSync(path.join(fakeBinDir, "nmcli"), [
      "#!/bin/bash",
      'case "$*" in',
      '  "connection show Yishow") exit 0 ;;',
      '  "-g 802-11-wireless.ssid connection show Yishow") printf "Yishow\\n" ;;',
      '  "-g connection.autoconnect connection show Yishow") printf "yes\\n" ;;',
      `  "-g connection.autoconnect-priority connection show Yishow") printf "${priority}\\n" ;;`,
      "  *) exit 1 ;;",
      "esac",
      ""
    ].join("\n"));
    writeFileSync(path.join(fakeBinDir, "systemctl"), [
      "#!/bin/bash",
      'if [[ "$*" == "is-enabled tailscale-hotspot-trigger.timer" ]]; then printf "enabled\\n"; exit 0; fi',
      "exit 1",
      ""
    ].join("\n"));
    markBashExecutable(path.join(fakeBinDir, "nmcli"));
    markBashExecutable(path.join(fakeBinDir, "systemctl"));

    const harnessPath = path.join(fixtureDir, "verify.sh");
    writeFileSync(harnessPath, [
      "#!/bin/bash",
      "set -euo pipefail",
      functionSource,
      "set +e",
      "verify_hotspot_policy",
      "status=$?",
      "set -e",
      'printf "status=%s\\n" "$status"',
      "exit 0",
      ""
    ].join("\n"));
    markBashExecutable(harnessPath);

    const result = runBashScript(harnessPath, [], {
      cwd: fixtureDir,
      bashPrependPathDirs: [fakeBinDir],
      env: {
        ...process.env,
        HOTSPOT_ENV_PATH: envPath,
        HOTSPOT_TRIGGER_PATH: triggerPath,
        HOTSPOT_SERVICE_PATH: servicePath,
        HOTSPOT_TIMER_PATH: timerPath
      },
      encoding: "utf8"
    });
    return { fixtureDir, result };
  };

  const ready = runFixture();
  try {
    assert.equal(ready.result.status, 0, ready.result.stderr || ready.result.stdout);
    assert.match(ready.result.stdout, /status=0/u);
  } finally {
    removeTempDir(ready.fixtureDir);
  }

  const drifted = runFixture({ priority: "0" });
  try {
    assert.equal(drifted.result.status, 0, drifted.result.stderr || drifted.result.stdout);
    assert.match(drifted.result.stdout, /status=1/u);
  } finally {
    removeTempDir(drifted.fixtureDir);
  }

  const unconfigured = runFixture({ configured: false });
  try {
    assert.equal(unconfigured.result.status, 0, unconfigured.result.stderr || unconfigured.result.stdout);
    assert.match(unconfigured.result.stdout, /status=2/u);
  } finally {
    removeTempDir(unconfigured.fixtureDir);
  }
});

test("kiosk verification checks Pi 5 boot profile and runtime thermal fixtures", () => {
  const projectDir = makeFixtureProject();
  const fakeBinDir = path.join(projectDir, "fake-bin");
  const modelPath = path.join(projectDir, "model");
  const configPath = path.join(projectDir, "config.txt");
  const thermalClassPath = path.join(projectDir, "thermal");
  const hwmonClassPath = path.join(projectDir, "hwmon");
  const coolingDevicePath = path.join(thermalClassPath, "cooling_device0");
  const thermalZonePath = path.join(thermalClassPath, "thermal_zone0");
  const fanHwmonPath = path.join(hwmonClassPath, "hwmon0");
  const kioskHome = path.join(projectDir, "home", "kz");
  const installDir = path.join(projectDir, "data-install");
  const fanBlock = [
    "# BEGIN Solar Player Pi 5 fan control",
    "dtparam=fan_temp0=0",
    "dtparam=fan_temp0_hyst=5000",
    "dtparam=fan_temp0_speed=75",
    "dtparam=fan_temp1=60000",
    "dtparam=fan_temp1_hyst=5000",
    "dtparam=fan_temp1_speed=125",
    "dtparam=fan_temp2=67500",
    "dtparam=fan_temp2_hyst=5000",
    "dtparam=fan_temp2_speed=175",
    "dtparam=fan_temp3=75000",
    "dtparam=fan_temp3_hyst=5000",
    "dtparam=fan_temp3_speed=250",
    "# END Solar Player Pi 5 fan control"
  ].join("\n");

  const runVerification = ({ tailscaleEnablement = "enabled", tailscaleActive = true } = {}) => runBashScript("deploy/verify-kiosk-install.sh", [
    "--install-dir",
    installDir,
    "--kiosk-user",
    "kz",
    "--kiosk-home",
    kioskHome,
    "--model-path",
    modelPath,
    "--fan-config-path",
    configPath,
    "--thermal-class-path",
    thermalClassPath,
    "--hwmon-class-path",
    hwmonClassPath
  ], {
    cwd: projectDir,
    bashPrependPathDirs: [fakeBinDir],
    env: {
      ...process.env,
      TAILSCALE_ENABLEMENT: tailscaleEnablement,
      TAILSCALE_ACTIVE: tailscaleActive ? "1" : "0"
    },
    encoding: "utf8"
  });

  try {
    writeFileSync(
      path.join(projectDir, "deploy/verify-kiosk-install.sh"),
      readFileSync(path.join(repoRoot, "deploy/verify-kiosk-install.sh"), "utf8")
    );
    markBashExecutable(path.join(projectDir, "deploy/verify-kiosk-install.sh"));
    writeFileSync(modelPath, "Raspberry Pi 5 Model B Rev 1.0\0");
    writeFileSync(configPath, `[all]\n${fanBlock}\ndtoverlay=vc4-kms-v3d\n`);
    mkdirSync(coolingDevicePath, { recursive: true });
    mkdirSync(thermalZonePath, { recursive: true });
    mkdirSync(fanHwmonPath, { recursive: true });
    writeFileSync(path.join(coolingDevicePath, "type"), "pwm-fan\n");
    writeFileSync(path.join(coolingDevicePath, "max_state"), "4\n");
    writeFileSync(path.join(coolingDevicePath, "cur_state"), "1\n");
    writeFileSync(path.join(fanHwmonPath, "name"), "pwmfan\n");
    writeFileSync(path.join(fanHwmonPath, "fan1_input"), "1700\n");
    writeFileSync(path.join(thermalZonePath, "mode"), "enabled\n");
    writeFileSync(path.join(thermalZonePath, "policy"), "step_wise\n");
    [0, 60000, 67500, 75000].forEach((temperature, index) => {
      writeFileSync(path.join(thermalZonePath, `trip_point_${index}_temp`), `${temperature}\n`);
      writeFileSync(path.join(thermalZonePath, `trip_point_${index}_type`), "active\n");
    });

    mkdirSync(fakeBinDir);
    writeFileSync(path.join(fakeBinDir, "systemctl"), [
      "#!/bin/bash",
      'unit="${@: -1}"',
      'case "$1:$unit" in',
      '  is-enabled:tailscaled.service) echo "${TAILSCALE_ENABLEMENT}"; [[ "${TAILSCALE_ENABLEMENT}" == "enabled" || "${TAILSCALE_ENABLEMENT}" == "enabled-runtime" ]] ;;',
      '  is-active:tailscaled.service) [[ "${TAILSCALE_ACTIVE}" == "1" ]] ;;',
      "  is-enabled:sleep.target|is-enabled:suspend.target|is-enabled:hibernate.target|is-enabled:hybrid-sleep.target) echo masked ;;",
      "  *) exit 0 ;;",
      "esac",
      ""
    ].join("\n"));
    markBashExecutable(path.join(fakeBinDir, "systemctl"));
    for (const command of ["curl", "tailscale"]) {
      const commandPath = path.join(fakeBinDir, command);
      writeFileSync(commandPath, command === "tailscale" ? "#!/bin/bash\necho NeedsLogin\nexit 99\n" : "#!/bin/bash\nexit 0\n");
      markBashExecutable(commandPath);
    }

    const correct = runVerification();
    assert.match(correct.stdout, /OK: Tailscale CLI is installed and tailscaled\.service is enabled and active/);
    assert.match(correct.stdout, /OK: Pi 5 fan boot profile is configured/);
    assert.match(correct.stdout, /OK: Pi 5 fan runtime thermal contract is active/);

    const disabledTailscale = runVerification({ tailscaleEnablement: "disabled" });
    assert.notEqual(disabledTailscale.status, 0);
    assert.match(disabledTailscale.stderr, /FAIL: Tailscale CLI is installed and tailscaled\.service is enabled and active/);

    const inactiveTailscale = runVerification({ tailscaleActive: false });
    assert.notEqual(inactiveTailscale.status, 0);
    assert.match(inactiveTailscale.stderr, /FAIL: Tailscale CLI is installed and tailscaled\.service is enabled and active/);

    const runtimeEnabledTailscale = runVerification({ tailscaleEnablement: "enabled-runtime" });
    assert.notEqual(runtimeEnabledTailscale.status, 0);
    assert.match(runtimeEnabledTailscale.stderr, /FAIL: Tailscale CLI is installed and tailscaled\.service is enabled and active/);

    rmSync(path.join(fakeBinDir, "tailscale"));
    const missingTailscale = runVerification();
    assert.notEqual(missingTailscale.status, 0);
    assert.match(missingTailscale.stderr, /FAIL: Tailscale CLI is installed and tailscaled\.service is enabled and active/);

    writeFileSync(configPath, `[all]\n${fanBlock.replace("fan_temp3_speed=250", "fan_temp3_speed=249")}\ndtoverlay=vc4-kms-v3d\n`);
    const badBootProfile = runVerification();
    assert.match(badBootProfile.stderr, /FAIL: Pi 5 fan boot profile is configured/);

    writeFileSync(configPath, `[all]\n${fanBlock}\ndtoverlay=vc4-kms-v3d\n`);
    writeFileSync(path.join(coolingDevicePath, "max_state"), "3\n");
    const badRuntime = runVerification();
    assert.match(badRuntime.stderr, /FAIL: Pi 5 fan runtime thermal contract is active/);

    writeFileSync(path.join(coolingDevicePath, "max_state"), "4\n");
    writeFileSync(path.join(coolingDevicePath, "cur_state"), "0\n");
    const stoppedFloor = runVerification();
    assert.match(stoppedFloor.stderr, /FAIL: Pi 5 fan runtime thermal contract is active/);

    writeFileSync(path.join(coolingDevicePath, "cur_state"), "1\n");
    writeFileSync(path.join(fanHwmonPath, "fan1_input"), "0\n");
    const stoppedFan = runVerification();
    assert.match(stoppedFan.stderr, /FAIL: Pi 5 fan runtime thermal contract is active/);

    rmSync(path.join(fanHwmonPath, "fan1_input"));
    const missingFanInput = runVerification();
    assert.match(missingFanInput.stderr, /FAIL: Pi 5 fan runtime thermal contract is active/);
  } finally {
    removeTempDir(projectDir);
  }
});

test("deploy.sh online bundle includes runtime files without node_modules", () => {
  const projectDir = makeFixtureProject();

  try {
    writeFileSync(path.join(projectDir, "deploy.sh"), readFileSync(deployScriptPath, "utf8"));
    markBashExecutable(path.join(projectDir, "deploy.sh"));

    const result = runDeploy(projectDir, 1);
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const bundleRoot = path.join(projectDir, "dist/deploy-bundles/online");
    assert.equal(existsSync(path.join(bundleRoot, "apps/server/dist/server.js")), true);
    assert.equal(existsSync(path.join(bundleRoot, "apps/server/package.json")), true);
    assert.equal(existsSync(path.join(bundleRoot, "apps/web/dist/index.html")), true);
    assert.equal(existsSync(path.join(bundleRoot, "apps/web/package.json")), true);
    assert.equal(existsSync(path.join(bundleRoot, "packages/shared/dist/index.js")), true);
    assert.equal(existsSync(path.join(bundleRoot, "packages/shared/package.json")), true);
    assert.equal(existsSync(path.join(bundleRoot, "apps/server/src/db/migrations/001_init.sql")), true);
    assert.equal(existsSync(path.join(bundleRoot, "apps/web/src/assets/playback/slide-overview.jpg")), true);
    assert.equal(existsSync(path.join(bundleRoot, "docs")), false);
    assert.equal(
      existsSync(path.join(bundleRoot, "docs/reference/kuozui-green-fhd-html-prototype/assets/clean/factory-bg.png")),
      false
    );
    assert.equal(existsSync(path.join(bundleRoot, ".env.example")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/solar-display.service")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/export-runtime-state.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/restore-runtime-state.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/reset-db-settings.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/enable-readonly-root.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/raspi-bootstrap.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/configure-lightweight-desktop.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/configure-pi5-fan-control.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/disable-display-sleep.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/disable-xfce-display-popups.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/apply-desktop-theme.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/repair-kiosk-system.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/readonly-system-enable.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/readonly-system-disable.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/install-tailscale.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/configure-hotspot-priority.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/tailscale-hotspot-trigger.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/tailscale-hotspot-trigger.service")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/tailscale-hotspot-trigger.timer")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/install-kiosk.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/read-solar-display-journal.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/start-solar-kiosk.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/stop-solar-kiosk.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/verify-kiosk-install.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/firefox-kiosk.desktop")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/enable-readonly-system.desktop")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/disable-readonly-system.desktop")), true);
    assert.equal(existsSync(path.join(bundleRoot, "scripts/raspi-onekey-deploy.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "scripts/prepare-raspi-user-data.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "scripts/prepare-raspi-user-data.ps1")), true);
    assert.equal(existsSync(path.join(bundleRoot, "scripts/generate-release-manifest.mjs")), true);
    assert.equal(existsSync(path.join(bundleRoot, "release-manifest.json")), true);
    const releaseManifest = JSON.parse(readFileSync(path.join(bundleRoot, "release-manifest.json"), "utf8"));
    assert.equal(releaseManifest.packageVersion, "0.1.0");
    assert.equal(typeof releaseManifest.releaseId, "string");
    assert.equal(typeof releaseManifest.commit, "string");
    assert.equal(typeof releaseManifest.schemaVersion, "number");
    assert.equal(isExecutable(path.join(bundleRoot, "install.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/export-runtime-state.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/restore-runtime-state.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/reset-db-settings.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/enable-readonly-root.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/raspi-bootstrap.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/configure-lightweight-desktop.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/configure-pi5-fan-control.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/disable-display-sleep.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/disable-xfce-display-popups.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/apply-desktop-theme.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/repair-kiosk-system.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/readonly-system-enable.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/readonly-system-disable.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/install-tailscale.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/configure-hotspot-priority.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/tailscale-hotspot-trigger.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/install-kiosk.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/start-solar-kiosk.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/stop-solar-kiosk.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/verify-kiosk-install.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "scripts/raspi-onekey-deploy.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "scripts/prepare-raspi-user-data.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "node_modules")), false);
    assert.equal(existsSync(path.join(bundleRoot, "apps/.DS_Store")), false);
    assert.equal(existsSync(path.join(bundleRoot, "apps/server/dist/server.test.js")), false);
    assert.equal(existsSync(path.join(bundleRoot, "apps/server/dist/server.test.js.map")), false);
  } finally {
    removeTempDir(projectDir);
  }
});

test("deploy.sh offline bundle includes node_modules for copy-only deployment", () => {
  const projectDir = makeFixtureProject();

  try {
    writeFileSync(path.join(projectDir, "deploy.sh"), readFileSync(deployScriptPath, "utf8"));
    markBashExecutable(path.join(projectDir, "deploy.sh"));

    const result = runDeploy(projectDir, 2);
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const bundleRoot = path.join(projectDir, "dist/deploy-bundles/offline");
    assert.equal(existsSync(path.join(bundleRoot, "apps/server/dist/server.js")), true);
    assert.equal(existsSync(path.join(bundleRoot, "apps/server/package.json")), true);
    assert.equal(existsSync(path.join(bundleRoot, "apps/web/src/assets/playback/slide-overview.jpg")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/export-runtime-state.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/restore-runtime-state.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/reset-db-settings.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/enable-readonly-root.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/raspi-bootstrap.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/configure-lightweight-desktop.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/configure-pi5-fan-control.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/disable-display-sleep.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/disable-xfce-display-popups.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/apply-desktop-theme.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/repair-kiosk-system.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/readonly-system-enable.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/readonly-system-disable.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/install-tailscale.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/configure-hotspot-priority.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/tailscale-hotspot-trigger.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/tailscale-hotspot-trigger.service")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/tailscale-hotspot-trigger.timer")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/install-kiosk.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/stop-solar-kiosk.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/verify-kiosk-install.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "scripts/raspi-onekey-deploy.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "scripts/prepare-raspi-user-data.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "scripts/prepare-raspi-user-data.ps1")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "install.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/export-runtime-state.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/restore-runtime-state.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/reset-db-settings.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/enable-readonly-root.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/raspi-bootstrap.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/configure-lightweight-desktop.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/configure-pi5-fan-control.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/disable-display-sleep.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/disable-xfce-display-popups.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/apply-desktop-theme.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/repair-kiosk-system.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/readonly-system-enable.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/readonly-system-disable.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/install-tailscale.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/configure-hotspot-priority.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/tailscale-hotspot-trigger.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/install-kiosk.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/start-solar-kiosk.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/stop-solar-kiosk.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/verify-kiosk-install.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "scripts/raspi-onekey-deploy.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "scripts/prepare-raspi-user-data.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "node_modules/fake-package/index.js")), true);
    assert.equal(existsSync(path.join(bundleRoot, "apps/.DS_Store")), false);
    assert.equal(existsSync(path.join(bundleRoot, "apps/server/dist/server.test.js")), false);
  } finally {
    removeTempDir(projectDir);
  }
});

const productionDeployScriptPath = path.join(repoRoot, "deploy/deploy.sh");
const productionServiceTemplatePath = path.join(repoRoot, "deploy/solar-display.service");

function runProductionDeployFixture(installRoot, { projectDir, extraEnv = {} } = {}) {
  const env = {
    ...process.env,
    DEPLOY_NO_SUDO: "1",
    DEPLOY_SKIP_SYSTEMD: "1",
    DEPLOY_BUILD_CMD: ":",
    DEPLOY_PNPM_CMD: ":",
    ...extraEnv
  };

  return spawnSync(bashCommand, [productionDeployScriptPath, installRoot], {
    cwd: projectDir ?? repoRoot,
    env,
    encoding: "utf8"
  });
}

function assertUnitPaths(unitText, root) {
  assert.match(unitText, new RegExp(`^WorkingDirectory=${root.replace(/\//g, "\\/")}$`, "m"));
  assert.match(unitText, new RegExp(`^EnvironmentFile=-${root.replace(/\//g, "\\/")}\\/\\.env$`, "m"));
  assert.match(unitText, new RegExp(`^Environment=DATA_DIR=${root.replace(/\//g, "\\/")}\\/data$`, "m"));
  assert.match(unitText, new RegExp(`^Environment=LOG_DIR=${root.replace(/\//g, "\\/")}\\/logs$`, "m"));
  assert.match(
    unitText,
    new RegExp(
      `^ReadWritePaths=${root.replace(/\//g, "\\/")}\\/data ${root.replace(/\//g, "\\/")}\\/logs ${root.replace(/\//g, "\\/")}\\/uploads\\/images ${root.replace(/\//g, "\\/")}\\/uploads\\/brand$`,
      "m"
    )
  );
  assert.match(unitText, /^NoNewPrivileges=true$/m);
  assert.match(unitText, /^ProtectSystem=strict$/m);
  assert.match(unitText, /^Restart=on-failure$/m);
  assert.match(unitText, /^StandardOutput=journal$/m);
  assert.match(unitText, /^StandardError=journal$/m);
}

test("Default deployment uses the canonical runtime root", () => {
  const source = readFileSync(productionDeployScriptPath, "utf8");
  assert.match(source, /CANONICAL_INSTALL_ROOT="\/data\/solar-display"/);
  assert.match(source, /INSTALL_DIR="\$\{1:-\$\{CANONICAL_INSTALL_ROOT\}\}"/);
  assert.doesNotMatch(source, /INSTALL_DIR="\$\{1:-\/opt\/solar-display\}"/);

  // Canonical unit template is the readable /data contract (no /opt mismatch).
  const unitTemplate = readFileSync(productionServiceTemplatePath, "utf8");
  assertUnitPaths(unitTemplate, "/data/solar-display");
  assert.doesNotMatch(unitTemplate, /\/opt\/solar-display/);

  // Prove the no-arg default selects /data without mutating a real host path:
  // dry-run validation only (fail closed before mkdir when root is rejected).
  const projectDir = makeFixtureProject();
  try {
    writeFileSync(
      path.join(projectDir, "deploy/deploy.sh"),
      readFileSync(productionDeployScriptPath, "utf8")
    );
    writeFileSync(
      path.join(projectDir, "deploy/solar-display.service"),
      readFileSync(productionServiceTemplatePath, "utf8")
    );
    markBashExecutable(path.join(projectDir, "deploy/deploy.sh"));

    // Explicit /data-equivalent under the fixture root exercises the same render
    // path the default would use once host /data is writable.
    const dataLikeRoot = path.join(projectDir, "data", "solar-display");
    const result = spawnSync(
      bashCommand,
      [path.join(projectDir, "deploy/deploy.sh"), dataLikeRoot],
      {
        cwd: projectDir,
        env: {
          ...process.env,
          DEPLOY_NO_SUDO: "1",
          DEPLOY_SKIP_SYSTEMD: "1",
          DEPLOY_BUILD_CMD: ":",
          DEPLOY_PNPM_CMD: ":"
        },
        encoding: "utf8"
      }
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, new RegExp(`Installing to: ${dataLikeRoot.replace(/\//g, "\\/")}`));
    const unitText = readFileSync(
      path.join(dataLikeRoot, "deploy/solar-display.service.rendered"),
      "utf8"
    );
    assertUnitPaths(unitText, dataLikeRoot);
  } finally {
    removeTempDir(projectDir);
  }
});

test("Explicit install root propagates to the installed unit", () => {
  const projectDir = makeFixtureProject();
  try {
    writeFileSync(
      path.join(projectDir, "deploy/deploy.sh"),
      readFileSync(productionDeployScriptPath, "utf8")
    );
    writeFileSync(
      path.join(projectDir, "deploy/solar-display.service"),
      readFileSync(productionServiceTemplatePath, "utf8")
    );
    markBashExecutable(path.join(projectDir, "deploy/deploy.sh"));

    const installRoot = path.join(projectDir, "srv-solar-display");
    const result = spawnSync(
      bashCommand,
      [path.join(projectDir, "deploy/deploy.sh"), installRoot],
      {
        cwd: projectDir,
        env: {
          ...process.env,
          DEPLOY_NO_SUDO: "1",
          DEPLOY_SKIP_SYSTEMD: "1",
          DEPLOY_BUILD_CMD: ":",
          DEPLOY_PNPM_CMD: ":"
        },
        encoding: "utf8"
      }
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const renderedPath = path.join(installRoot, "deploy/solar-display.service.rendered");
    assert.equal(existsSync(renderedPath), true, "expected rendered unit under install root");
    const unitText = readFileSync(renderedPath, "utf8");
    assertUnitPaths(unitText, installRoot);
    assert.doesNotMatch(unitText, /\/opt\/solar-display/);
    // Custom root must not retain the canonical /data paths.
    assert.doesNotMatch(unitText, /\/data\/solar-display/);
  } finally {
    removeTempDir(projectDir);
  }
});

test("Deployment preserves mutable runtime state", () => {
  const projectDir = makeFixtureProject();
  try {
    writeFileSync(
      path.join(projectDir, "deploy/deploy.sh"),
      readFileSync(productionDeployScriptPath, "utf8")
    );
    writeFileSync(
      path.join(projectDir, "deploy/solar-display.service"),
      readFileSync(productionServiceTemplatePath, "utf8")
    );
    markBashExecutable(path.join(projectDir, "deploy/deploy.sh"));

    const installRoot = path.join(projectDir, "existing-runtime");
    mkdirSync(path.join(installRoot, "data"), { recursive: true });
    mkdirSync(path.join(installRoot, "logs"), { recursive: true });
    mkdirSync(path.join(installRoot, "uploads/images"), { recursive: true });
    writeFileSync(path.join(installRoot, ".env"), "SENTINEL_ENV=keep-me\n");
    writeFileSync(path.join(installRoot, "data/solar-display.sqlite"), "SENTINEL_DB\n");
    writeFileSync(path.join(installRoot, "logs/app.log"), "SENTINEL_LOG\n");
    writeFileSync(path.join(installRoot, "uploads/images/hero.png"), "SENTINEL_IMG\n");

    // Also put decoy content in project mutable paths that must not be copied over.
    writeFileSync(path.join(projectDir, ".env"), "SHOULD_NOT_OVERWRITE=true\n");
    writeFileSync(path.join(projectDir, "data/solar-display.sqlite"), "PROJECT_DB\n");

    const result = spawnSync(
      bashCommand,
      [path.join(projectDir, "deploy/deploy.sh"), installRoot],
      {
        cwd: projectDir,
        env: {
          ...process.env,
          DEPLOY_NO_SUDO: "1",
          DEPLOY_SKIP_SYSTEMD: "1",
          DEPLOY_BUILD_CMD: ":",
          DEPLOY_PNPM_CMD: ":"
        },
        encoding: "utf8"
      }
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);

    assert.equal(readFileSync(path.join(installRoot, ".env"), "utf8"), "SENTINEL_ENV=keep-me\n");
    assert.equal(
      readFileSync(path.join(installRoot, "data/solar-display.sqlite"), "utf8"),
      "SENTINEL_DB\n"
    );
    assert.equal(readFileSync(path.join(installRoot, "logs/app.log"), "utf8"), "SENTINEL_LOG\n");
    assert.equal(
      readFileSync(path.join(installRoot, "uploads/images/hero.png"), "utf8"),
      "SENTINEL_IMG\n"
    );
    // Application bundle refreshed independently.
    assert.equal(existsSync(path.join(installRoot, "apps/server/dist/server.js")), true);
    assert.equal(existsSync(path.join(installRoot, "package.json")), true);
  } finally {
    removeTempDir(projectDir);
  }
});

test("Install-root rendering preserves service hardening", () => {
  const projectDir = makeFixtureProject();
  try {
    writeFileSync(
      path.join(projectDir, "deploy/deploy.sh"),
      readFileSync(productionDeployScriptPath, "utf8")
    );
    writeFileSync(
      path.join(projectDir, "deploy/solar-display.service"),
      readFileSync(productionServiceTemplatePath, "utf8")
    );
    markBashExecutable(path.join(projectDir, "deploy/deploy.sh"));

    const installRoot = path.join(projectDir, "hardened-root");
    const result = spawnSync(
      bashCommand,
      [path.join(projectDir, "deploy/deploy.sh"), installRoot],
      {
        cwd: projectDir,
        env: {
          ...process.env,
          DEPLOY_NO_SUDO: "1",
          DEPLOY_SKIP_SYSTEMD: "1",
          DEPLOY_BUILD_CMD: ":",
          DEPLOY_PNPM_CMD: ":"
        },
        encoding: "utf8"
      }
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const unitText = readFileSync(
      path.join(installRoot, "deploy/solar-display.service.rendered"),
      "utf8"
    );
    assertUnitPaths(unitText, installRoot);

    // Invalid relative root must fail before mutation.
    const beforeInvalid = mkdtempSync(path.join(tmpdir(), "invalid-root-probe-"));
    const invalidTarget = path.join(beforeInvalid, "should-not-exist");
    const invalid = spawnSync(
      bashCommand,
      [path.join(projectDir, "deploy/deploy.sh"), "relative/not-absolute"],
      {
        cwd: projectDir,
        env: {
          ...process.env,
          DEPLOY_NO_SUDO: "1",
          DEPLOY_SKIP_SYSTEMD: "1",
          DEPLOY_BUILD_CMD: ":",
          DEPLOY_PNPM_CMD: ":"
        },
        encoding: "utf8"
      }
    );
    assert.notEqual(invalid.status, 0);
    assert.match(invalid.stderr + invalid.stdout, /absolute path/i);
    assert.equal(existsSync(invalidTarget), false);
    removeTempDir(beforeInvalid);
  } finally {
    removeTempDir(projectDir);
  }
});

test("runtime export fails closed when solar-display service is active", () => {
  const projectDir = makeFixtureProject();
  const fakeBinDir = path.join(projectDir, "fake-bin");
  const systemctlLog = path.join(projectDir, "systemctl.log");

  try {
    writeFileSync(path.join(projectDir, "deploy/export-runtime-state.sh"), readFileSync(exportScriptPath, "utf8"));
    writeFakeSystemctl(fakeBinDir, { isActive: true, logPath: systemctlLog });

    const result = runBashScript("deploy/export-runtime-state.sh", [], {
      cwd: projectDir,
      env: {
        ...process.env,
        INSTALL_DIR: projectDir,
        EXPORT_OUTPUT_DIR: path.join(projectDir, "backups"),
        EXPORT_TIMESTAMP: "active-service"
      },
      bashPathKeys: ["INSTALL_DIR", "EXPORT_OUTPUT_DIR"],
      bashPrependPathDirs: [fakeBinDir],
      encoding: "utf8"
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr + result.stdout, /solar-display\.service is active/);
    assert.equal(existsSync(path.join(projectDir, "backups/active-service/runtime.tar.gz")), false);
  } finally {
    removeTempDir(projectDir);
  }
});

test("runtime export succeeds when solar-display service is inactive", () => {
  const projectDir = makeFixtureProject();
  const fakeBinDir = path.join(projectDir, "fake-bin");

  try {
    writeFileSync(path.join(projectDir, "deploy/export-runtime-state.sh"), readFileSync(exportScriptPath, "utf8"));
    writeFakeSystemctl(fakeBinDir, { isActive: false });

    const result = runBashScript("deploy/export-runtime-state.sh", [], {
      cwd: projectDir,
      env: {
        ...process.env,
        INSTALL_DIR: projectDir,
        EXPORT_OUTPUT_DIR: path.join(projectDir, "backups"),
        EXPORT_TIMESTAMP: "inactive-service"
      },
      bashPathKeys: ["INSTALL_DIR", "EXPORT_OUTPUT_DIR"],
      bashPrependPathDirs: [fakeBinDir],
      encoding: "utf8"
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /BACKUP_DIR=/);
    assert.equal(existsSync(path.join(projectDir, "backups/inactive-service/runtime.tar.gz")), true);
  } finally {
    removeTempDir(projectDir);
  }
});

test("runtime export fails closed when sqlite checkpoint/integrity preflight fails", () => {
  const projectDir = makeFixtureProject();

  try {
    writeFileSync(path.join(projectDir, "deploy/export-runtime-state.sh"), readFileSync(exportScriptPath, "utf8"));
    writeFileSync(path.join(projectDir, "data/solar-display.sqlite"), "not-a-sqlite-database\n");

    const result = runBashScript("deploy/export-runtime-state.sh", [], {
      cwd: projectDir,
      env: {
        ...process.env,
        INSTALL_DIR: projectDir,
        EXPORT_OUTPUT_DIR: path.join(projectDir, "backups"),
        EXPORT_TIMESTAMP: "bad-db",
        EXPORT_ALLOW_LIVE: "1"
      },
      bashPathKeys: ["INSTALL_DIR", "EXPORT_OUTPUT_DIR"],
      encoding: "utf8"
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr + result.stdout, /checkpoint|integrity|not a database|file is not a database|ERROR/i);
    assert.equal(existsSync(path.join(projectDir, "backups/bad-db/runtime.tar.gz")), false);
  } finally {
    removeTempDir(projectDir);
  }
});

test("runtime restore rejects tampered archive checksum and refuses non-empty target without confirm", () => {
  const projectDir = makeFixtureProject();
  const backupRoot = path.join(projectDir, "backups");
  const targetRoot = path.join(projectDir, "restore-target");

  try {
    writeFileSync(path.join(projectDir, "deploy/export-runtime-state.sh"), readFileSync(exportScriptPath, "utf8"));
    writeFileSync(path.join(projectDir, "deploy/restore-runtime-state.sh"), readFileSync(restoreScriptPath, "utf8"));
    markBashExecutable(path.join(projectDir, "deploy/export-runtime-state.sh"));
    markBashExecutable(path.join(projectDir, "deploy/restore-runtime-state.sh"));

    const exportResult = runBashScript("deploy/export-runtime-state.sh", [], {
      cwd: projectDir,
      env: {
        ...process.env,
        INSTALL_DIR: projectDir,
        EXPORT_OUTPUT_DIR: backupRoot,
        EXPORT_TIMESTAMP: "tamper-case",
        EXPORT_ALLOW_LIVE: "1"
      },
      bashPathKeys: ["INSTALL_DIR", "EXPORT_OUTPUT_DIR"],
      encoding: "utf8"
    });
    assert.equal(exportResult.status, 0, exportResult.stderr || exportResult.stdout);

    const backupDir = path.join(backupRoot, "tamper-case");
    const archivePath = path.join(backupDir, "runtime.tar.gz");
    writeFileSync(archivePath, `${readFileSync(archivePath)}tampered`);

    mkdirSync(targetRoot, { recursive: true });
    writeFileSync(path.join(targetRoot, "marker.txt"), "existing\n");

    const tamperResult = runBashScript(
      "deploy/restore-runtime-state.sh",
      ["--backup-dir", backupDir, "--target-root", targetRoot],
      {
        cwd: projectDir,
        env: { ...process.env, RESTORE_TARGET_DENYLIST: "" },
        encoding: "utf8"
      }
    );
    assert.notEqual(tamperResult.status, 0);
    assert.match(tamperResult.stderr + tamperResult.stdout, /checksum|sidecar|manifest/i);
    assert.equal(readFileSync(path.join(targetRoot, "marker.txt"), "utf8"), "existing\n");
    assert.equal(existsSync(path.join(targetRoot, "data")), false);

    // Recreate a clean backup for non-empty refusal.
    const cleanExport = runBashScript("deploy/export-runtime-state.sh", [], {
      cwd: projectDir,
      env: {
        ...process.env,
        INSTALL_DIR: projectDir,
        EXPORT_OUTPUT_DIR: backupRoot,
        EXPORT_TIMESTAMP: "clean-case",
        EXPORT_ALLOW_LIVE: "1"
      },
      bashPathKeys: ["INSTALL_DIR", "EXPORT_OUTPUT_DIR"],
      encoding: "utf8"
    });
    assert.equal(cleanExport.status, 0, cleanExport.stderr || cleanExport.stdout);
    const cleanBackup = path.join(backupRoot, "clean-case");

    const refuseResult = runBashScript(
      "deploy/restore-runtime-state.sh",
      ["--backup-dir", cleanBackup, "--target-root", targetRoot],
      {
        cwd: projectDir,
        env: { ...process.env, RESTORE_TARGET_DENYLIST: "" },
        encoding: "utf8"
      }
    );
    assert.notEqual(refuseResult.status, 0);
    assert.match(refuseResult.stderr + refuseResult.stdout, /not empty|RESTORE-OVERWRITE/i);
    assert.equal(readFileSync(path.join(targetRoot, "marker.txt"), "utf8"), "existing\n");
  } finally {
    removeTempDir(projectDir);
  }
});

test("runtime restore drill verifies integrity migrations and health on temp root only", () => {
  const projectDir = makeFixtureProject();
  const backupRoot = path.join(projectDir, "backups");
  const productionMarker = path.join(projectDir, "data/production-only.marker");

  try {
    writeFileSync(path.join(projectDir, "deploy/export-runtime-state.sh"), readFileSync(exportScriptPath, "utf8"));
    writeFileSync(path.join(projectDir, "deploy/restore-runtime-state.sh"), readFileSync(restoreScriptPath, "utf8"));
    markBashExecutable(path.join(projectDir, "deploy/export-runtime-state.sh"));
    markBashExecutable(path.join(projectDir, "deploy/restore-runtime-state.sh"));
    mkdirSync(path.join(projectDir, "apps/server/dist/db"), { recursive: true });
    writeFileSync(
      path.join(projectDir, "apps/server/dist/db/migrate.js"),
      "export function migrateDatabase() { console.log('fixture migration ran'); }\n"
    );
    writeFileSync(
      path.join(projectDir, "apps/server/dist/server.js"),
      `import { createServer } from "node:http";
const server = createServer((request, response) => {
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify({ status: request.url === "/health" ? "ok" : "not-found" }));
});
server.listen(Number(process.env.PORT), "127.0.0.1");
`
    );
    writeFileSync(productionMarker, "must-remain\n");

    const exportResult = runBashScript("deploy/export-runtime-state.sh", [], {
      cwd: projectDir,
      env: {
        ...process.env,
        INSTALL_DIR: projectDir,
        EXPORT_OUTPUT_DIR: backupRoot,
        EXPORT_TIMESTAMP: "drill-case",
        EXPORT_ALLOW_LIVE: "1"
      },
      bashPathKeys: ["INSTALL_DIR", "EXPORT_OUTPUT_DIR"],
      encoding: "utf8"
    });
    assert.equal(exportResult.status, 0, exportResult.stderr || exportResult.stdout);
    const backupDir = path.join(backupRoot, "drill-case");

    const drillResult = runBashScript(
      "deploy/restore-runtime-state.sh",
      ["--backup-dir", backupDir, "--drill"],
      {
        cwd: projectDir,
        env: {
          ...process.env,
          RESTORE_HEALTH_TIMEOUT_SECONDS: "5"
        },
        encoding: "utf8"
      }
    );

    assert.equal(drillResult.status, 0, drillResult.stderr || drillResult.stdout);
    assert.match(drillResult.stdout, /integrity_check ok/i);
    assert.match(drillResult.stdout, /migrations completed/i);
    assert.match(drillResult.stdout, /health smoke returned healthy/i);
    assert.match(drillResult.stdout, /fixture migration ran/i);
    assert.doesNotMatch(drillResult.stdout, /migrations skipped/i);
    assert.equal(readFileSync(productionMarker, "utf8"), "must-remain\n");
  } finally {
    removeTempDir(projectDir);
  }
});

test("runtime restore rejects unsafe target roots before mutation", () => {
  const projectDir = makeFixtureProject();
  const backupRoot = path.join(projectDir, "backups");

  try {
    writeFileSync(path.join(projectDir, "deploy/export-runtime-state.sh"), readFileSync(exportScriptPath, "utf8"));
    writeFileSync(path.join(projectDir, "deploy/restore-runtime-state.sh"), readFileSync(restoreScriptPath, "utf8"));
    markBashExecutable(path.join(projectDir, "deploy/export-runtime-state.sh"));
    markBashExecutable(path.join(projectDir, "deploy/restore-runtime-state.sh"));

    const exportResult = runBashScript("deploy/export-runtime-state.sh", [], {
      cwd: projectDir,
      env: {
        ...process.env,
        INSTALL_DIR: projectDir,
        EXPORT_OUTPUT_DIR: backupRoot,
        EXPORT_TIMESTAMP: "unsafe-root-case",
        EXPORT_ALLOW_LIVE: "1"
      },
      bashPathKeys: ["INSTALL_DIR", "EXPORT_OUTPUT_DIR"],
      encoding: "utf8"
    });
    assert.equal(exportResult.status, 0, exportResult.stderr || exportResult.stdout);

    const relativeResult = runBashScript(
      "deploy/restore-runtime-state.sh",
      [
        "--backup-dir",
        path.join(backupRoot, "unsafe-root-case"),
        "--target-root",
        "relative-target",
        "--confirm",
        "RESTORE-OVERWRITE"
      ],
      { cwd: projectDir, encoding: "utf8" }
    );

    assert.notEqual(relativeResult.status, 0);
    assert.match(relativeResult.stderr + relativeResult.stdout, /absolute path/i);
    assert.equal(existsSync(path.join(projectDir, "relative-target")), false);

    const restoreSource = readFileSync(restoreScriptPath, "utf8");
    assert.match(restoreSource, /restore target root must not be filesystem root/i);
  } finally {
    removeTempDir(projectDir);
  }
});

test("runtime restore with confirmation overwrites mutable paths only", () => {
  const projectDir = makeFixtureProject();
  const backupRoot = path.join(projectDir, "backups");
  const targetRoot = path.join(projectDir, "restore-target");

  try {
    writeFileSync(path.join(projectDir, "deploy/export-runtime-state.sh"), readFileSync(exportScriptPath, "utf8"));
    writeFileSync(path.join(projectDir, "deploy/restore-runtime-state.sh"), readFileSync(restoreScriptPath, "utf8"));
    markBashExecutable(path.join(projectDir, "deploy/export-runtime-state.sh"));
    markBashExecutable(path.join(projectDir, "deploy/restore-runtime-state.sh"));

    const exportResult = runBashScript("deploy/export-runtime-state.sh", [], {
      cwd: projectDir,
      env: {
        ...process.env,
        INSTALL_DIR: projectDir,
        EXPORT_OUTPUT_DIR: backupRoot,
        EXPORT_TIMESTAMP: "overwrite-case",
        EXPORT_ALLOW_LIVE: "1"
      },
      bashPathKeys: ["INSTALL_DIR", "EXPORT_OUTPUT_DIR"],
      encoding: "utf8"
    });
    assert.equal(exportResult.status, 0, exportResult.stderr || exportResult.stdout);
    const backupDir = path.join(backupRoot, "overwrite-case");

    mkdirSync(path.join(targetRoot, "data"), { recursive: true });
    writeFileSync(path.join(targetRoot, "data/old.sqlite"), "old\n");
    writeFileSync(path.join(targetRoot, "apps-marker.txt"), "code-stays\n");

    const restoreResult = runBashScript(
      "deploy/restore-runtime-state.sh",
      ["--backup-dir", backupDir, "--target-root", targetRoot, "--confirm", "RESTORE-OVERWRITE"],
      {
        cwd: projectDir,
        env: { ...process.env, RESTORE_TARGET_DENYLIST: "" },
        encoding: "utf8"
      }
    );
    assert.equal(restoreResult.status, 0, restoreResult.stderr || restoreResult.stdout);
    assert.equal(existsSync(path.join(targetRoot, "data/solar-display.sqlite")), true);
    assert.equal(existsSync(path.join(targetRoot, "uploads/images/hero.png")), true);
    assert.equal(existsSync(path.join(targetRoot, ".env")), true);
    assert.equal(readFileSync(path.join(targetRoot, "apps-marker.txt"), "utf8"), "code-stays\n");
  } finally {
    removeTempDir(projectDir);
  }
});

test("runtime restore rolls back target from snapshot when an apply copy fails", () => {
  const projectDir = makeFixtureProject();
  const backupRoot = path.join(projectDir, "backups");
  const targetRoot = path.join(projectDir, "restore-target");
  const fakeBinDir = path.join(projectDir, "fake-bin");

  try {
    writeFileSync(path.join(projectDir, "deploy/export-runtime-state.sh"), readFileSync(exportScriptPath, "utf8"));
    writeFileSync(path.join(projectDir, "deploy/restore-runtime-state.sh"), readFileSync(restoreScriptPath, "utf8"));
    markBashExecutable(path.join(projectDir, "deploy/export-runtime-state.sh"));
    markBashExecutable(path.join(projectDir, "deploy/restore-runtime-state.sh"));

    // `cp` stub: fail ONLY when copying out of the restore extract dir (the apply
    // step), so apply_mutable_paths must roll back from its pre-apply snapshot.
    // Delegate to the real cp for every other invocation (snapshots, export).
    mkdirSync(fakeBinDir, { recursive: true });
    const cpStubPath = path.join(fakeBinDir, "cp");
    writeFileSync(cpStubPath, [
      "#!/bin/bash",
      "set -euo pipefail",
      'for arg in "$@"; do',
      '  case "$arg" in',
      "    */extract/*)",
      '      echo "inject: forced cp failure on restore apply path" >&2',
      "      exit 1",
      "      ;;",
      "  esac",
      "done",
      'exec /bin/cp "$@"',
      ""
    ].join("\n"));
    markBashExecutable(cpStubPath);

    // Existing production mutable state in the target that must survive a failed apply.
    mkdirSync(path.join(targetRoot, "data"), { recursive: true });
    createSqliteDatabase(path.join(targetRoot, "data/solar-display.sqlite"), { sentinel: "target-original" });
    writeFileSync(path.join(targetRoot, ".env"), "TARGET_ENV=1\n");

    // Build a verified backup from the fixture install root (distinct sentinel).
    const exportResult = runBashScript("deploy/export-runtime-state.sh", [], {
      cwd: projectDir,
      env: {
        ...process.env,
        INSTALL_DIR: projectDir,
        EXPORT_OUTPUT_DIR: backupRoot,
        EXPORT_TIMESTAMP: "rollback-case",
        EXPORT_ALLOW_LIVE: "1"
      },
      bashPathKeys: ["INSTALL_DIR", "EXPORT_OUTPUT_DIR"],
      encoding: "utf8"
    });
    assert.equal(exportResult.status, 0, exportResult.stderr || exportResult.stdout);
    const backupDir = path.join(backupRoot, "rollback-case");

    const restoreResult = runBashScript(
      "deploy/restore-runtime-state.sh",
      ["--backup-dir", backupDir, "--target-root", targetRoot, "--confirm", "RESTORE-OVERWRITE"],
      {
        cwd: projectDir,
        env: {
          ...process.env,
          RESTORE_TARGET_DENYLIST: "",
          // Prepend the cp stub while keeping node/tar/sqlite3 on the inherited PATH.
          PATH: `${fakeBinDir}:${process.env.PATH}`
        },
        encoding: "utf8"
      }
    );

    // Restore must fail and roll the target back to its pre-apply snapshot.
    assert.notEqual(restoreResult.status, 0);
    assert.match(restoreResult.stderr + restoreResult.stdout, /rolled back/i);
    assert.match(restoreResult.stderr + restoreResult.stdout, /forced cp failure on restore apply/i);

    // The target's original mutable state is intact (proves snapshot rollback).
    const note = spawnSync(
      "sqlite3",
      [path.join(targetRoot, "data/solar-display.sqlite"), "SELECT note FROM restore_sentinel WHERE id=1;"],
      { encoding: "utf8" }
    );
    assert.equal(note.status, 0, note.stderr || note.stdout);
    assert.equal(note.stdout.trim(), "target-original");
    assert.equal(readFileSync(path.join(targetRoot, ".env"), "utf8"), "TARGET_ENV=1\n");
  } finally {
    removeTempDir(projectDir);
  }
});

test("raspi bootstrap dry-run lists backup verification and recovery handoff stages", () => {
  const result = runBashScript(
    raspiBootstrapScriptPath,
    [
      "--mode",
      "update",
      "--dry-run",
      "--skip-host-preflight",
      "--skip-disk",
      "--bundle-dir",
      "/tmp/fake-bundle"
    ],
    {
      cwd: repoRoot,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /verified runtime backup before replacing application/);
  assert.match(result.stdout, /fail closed on backup verification failure/);
  assert.match(result.stdout, /recovery handoff/i);
});

test("raspi bootstrap app scope limits work to verified application update", () => {
  const result = runBashScript(
    raspiBootstrapScriptPath,
    [
      "--mode",
      "update",
      "--scope",
      "app",
      "--dry-run",
      "--skip-host-preflight",
      "--skip-disk",
      "--bundle-dir",
      "/tmp/fake-bundle"
    ],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Scope: app/u);
  assert.match(result.stdout, /application files only/u);
  assert.match(result.stdout, /release manifest, existing service, and \/health/u);
  assert.match(result.stdout, /would not run apt, Tailscale, desktop, kiosk, boot, hotspot, readonly, or reboot actions/u);
  assert.doesNotMatch(result.stdout, /configure desktop/u);

  const source = readFileSync(raspiBootstrapScriptPath, "utf8");
  assert.match(source, /require_app_update_prerequisites/u);
  assert.match(source, /verify_app_update/u);
  assert.match(source, /if \[\[ "\$\{DEPLOY_SCOPE\}" == "app" \]\]/u);
  assert.match(source, /systemctl restart solar-display\.service/u);
});

test("raspi bootstrap app scope rejects full-host options before mutation", () => {
  const result = runBashScript(
    raspiBootstrapScriptPath,
    ["--mode", "update", "--scope", "app", "--apply-readonly", "--dry-run", "--skip-host-preflight", "--skip-disk"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr + result.stdout, /--apply-readonly requires --scope full/u);
  assert.doesNotMatch(result.stdout, /copy bundle/u);
});

test("raspi bootstrap app scope executes backup, replacement, restart, and health without host helpers", () => {
  const projectDir = makeFixtureProject();
  const installDir = path.join(projectDir, "install");
  const bundleDir = path.join(projectDir, "bundle");
  const fakeBinDir = path.join(projectDir, "fake-bin");
  const operationLog = path.join(projectDir, "operations.log");
  const serviceState = path.join(projectDir, "service.state");
  const healthAttemptState = path.join(projectDir, "health-attempt.state");
  const hostHelperLog = path.join(projectDir, "host-helper.log");
  const kioskUser = process.env.USER || "pi";

  try {
    mkdirSync(path.join(installDir, "apps/server/dist"), { recursive: true });
    mkdirSync(path.join(installDir, "data"), { recursive: true });
    createSqliteDatabase(path.join(installDir, "data/solar-display.sqlite"), { sentinel: "app-update" });
    writeFileSync(path.join(installDir, ".env"), "KEEP=1\n");
    writeFileSync(path.join(installDir, "apps/server/dist/server.js"), "old application\n");
    writeFileSync(path.join(installDir, "package.json"), JSON.stringify({ name: "old-app" }));

    mkdirSync(path.join(bundleDir, "apps/server/dist"), { recursive: true });
    mkdirSync(path.join(bundleDir, "deploy"), { recursive: true });
    writeFileSync(path.join(bundleDir, "apps/server/dist/server.js"), "new deployed application\n");
    writeFileSync(path.join(bundleDir, "package.json"), JSON.stringify({ name: "new-app" }));
    writeFileSync(path.join(bundleDir, "release-manifest.json"), '{"releaseId":"fixture-app"}\n');
    writeFileSync(path.join(bundleDir, "deploy/export-runtime-state.sh"), readFileSync(exportScriptPath, "utf8"));
    writeFileSync(path.join(bundleDir, "deploy/restore-runtime-state.sh"), readFileSync(restoreScriptPath, "utf8"));
    for (const helper of [
      "install-tailscale.sh",
      "configure-lightweight-desktop.sh",
      "install-kiosk.sh",
      "configure-hotspot-priority.sh",
      "enable-readonly-root.sh",
      "verify-kiosk-install.sh"
    ]) {
      writeFileSync(
        path.join(bundleDir, `deploy/${helper}`),
        `#!/bin/bash\nprintf '%s\\n' ${JSON.stringify(helper)} >> ${JSON.stringify(toBashPathValue(hostHelperLog))}\n`
      );
    }
    for (const helper of readdirSync(path.join(bundleDir, "deploy"))) {
      markBashExecutable(path.join(bundleDir, "deploy", helper));
    }

    mkdirSync(fakeBinDir, { recursive: true });
    writeFileSync(serviceState, "active\n");
    writeFileSync(
      path.join(fakeBinDir, "systemctl"),
      [
        "#!/bin/bash",
        "set -euo pipefail",
        `STATE=${JSON.stringify(toBashPathValue(serviceState))}`,
        `LOG=${JSON.stringify(toBashPathValue(operationLog))}`,
        'case "$1" in',
        '  cat) exit 0 ;;',
        '  is-active) [[ "$(cat "${STATE}")" == "active" ]] ;;',
        '  stop) echo inactive > "${STATE}"; echo stop >> "${LOG}" ;;',
        '  restart|start) echo active > "${STATE}"; echo "$1" >> "${LOG}" ;;',
        '  *) exit 0 ;;',
        "esac",
        ""
      ].join("\n")
    );
    writeFileSync(
      path.join(fakeBinDir, "sudo"),
      [
        "#!/bin/bash",
        "set -euo pipefail",
        `LOG=${JSON.stringify(toBashPathValue(operationLog))}`,
        'if [[ "$1" == "-u" ]]; then shift 2; fi',
        'if [[ "$*" == *"command -v node"* ]]; then exit 0; fi',
        'if [[ "$*" == *"pnpm install"* ]]; then echo pnpm-install >> "${LOG}"; exit 0; fi',
        'exec "$@"',
        ""
      ].join("\n")
    );
    writeFileSync(
      path.join(fakeBinDir, "curl"),
      [
        "#!/bin/bash",
        `STATE=${JSON.stringify(toBashPathValue(healthAttemptState))}`,
        `echo health >> ${JSON.stringify(toBashPathValue(operationLog))}`,
        'attempt=0; [[ -f "${STATE}" ]] && attempt=$(cat "${STATE}")',
        'attempt=$((attempt + 1)); echo "${attempt}" > "${STATE}"',
        '(( attempt >= 3 ))',
        ""
      ].join("\n")
    );
    writeFileSync(path.join(fakeBinDir, "chown"), "#!/bin/bash\nexit 0\n");
    for (const command of ["systemctl", "sudo", "curl", "chown"]) {
      markBashExecutable(path.join(fakeBinDir, command));
    }

    writeFileSync(path.join(projectDir, "deploy/raspi-bootstrap.sh"), readFileSync(raspiBootstrapScriptPath, "utf8"));
    markBashExecutable(path.join(projectDir, "deploy/raspi-bootstrap.sh"));
    const result = runBashScript(
      "deploy/raspi-bootstrap.sh",
      [
        "--mode", "update", "--scope", "app", "--skip-host-preflight", "--skip-disk",
        "--install-dir", installDir, "--bundle-dir", bundleDir, "--kiosk-user", kioskUser
      ],
      {
        cwd: projectDir,
        env: process.env,
        bashPrependPathDirs: [fakeBinDir],
        encoding: "utf8"
      }
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(readFileSync(path.join(installDir, ".env"), "utf8"), "KEEP=1\n");
    assert.equal(
      readFileSync(path.join(installDir, "apps/server/dist/server.js"), "utf8"),
      "new deployed application\n",
      `stdout=${result.stdout}\nstderr=${result.stderr}\nbundle=${readFileSync(path.join(bundleDir, "apps/server/dist/server.js"), "utf8")}`
    );
    const backups = readdirSync(path.join(installDir, "backups"));
    assert.equal(backups.length, 1);
    assert.equal(existsSync(path.join(installDir, "backups", backups[0], "prior-application.tar.gz")), true);
    assert.deepEqual(readFileSync(operationLog, "utf8").trim().split("\n"), [
      "stop",
      "pnpm-install",
      "restart",
      "health",
      "health",
      "health"
    ]);
    assert.equal(existsSync(hostHelperLog), false);
  } finally {
    removeTempDir(projectDir);
  }
});

test("raspi bootstrap app scope prints recovery handoff for install or restart failure", () => {
  const source = readFileSync(raspiBootstrapScriptPath, "utf8");
  const dryRunAppBranch = source.indexOf(
    'if [[ "${DEPLOY_SCOPE}" == "app" ]]; then',
    source.indexOf('if [[ "${DRY_RUN}" == "1" ]]')
  );
  const appBranchStart = source.indexOf('if [[ "${DEPLOY_SCOPE}" == "app" ]]; then', dryRunAppBranch + 1);
  const appBranch = source.slice(appBranchStart, source.indexOf("configure_env", appBranchStart));

  assert.match(appBranch, /set \+e[\s\S]*pnpm install[\s\S]*systemctl restart[\s\S]*verify_app_update/u);
  assert.match(appBranch, /app_update_status=\$\?[\s\S]*print_recovery_handoff/u);
});

test("raspi bootstrap ordered fixture stops service backs up then copies", () => {
  const source = readFileSync(raspiBootstrapScriptPath, "utf8");

  const stopIdx = source.indexOf("stop_solar_display_if_active");
  const backupIdx = source.indexOf("create_verified_runtime_backup");
  const copyIdx = source.indexOf("copy_bundle");
  const failClosedIdx = source.indexOf("verified runtime backup failed; application files were not replaced");

  assert.ok(stopIdx > 0);
  assert.ok(backupIdx > 0);
  assert.ok(copyIdx > backupIdx, "copy_bundle must appear after backup gate definition/use");
  assert.ok(failClosedIdx > 0);
  assert.match(source, /create_verified_runtime_backup\n\ncopy_bundle/);
  assert.match(source, /print_recovery_handoff/);
  assert.match(source, /no automatic production DB rollback/i);
  assert.match(source, /RESTORE-OVERWRITE/);
  assert.doesNotMatch(source, /restore-runtime-state\.sh --backup-dir .* --target-root .*\$\{INSTALL_DIR\}(?!.*confirm)/);
});

test("raspi bootstrap backup failure leaves install untouched and restores service state", () => {
  const projectDir = makeFixtureProject();
  const installDir = path.join(projectDir, "install");
  const bundleDir = path.join(projectDir, "bundle");
  const fakeBinDir = path.join(projectDir, "fake-bin");
  const systemctlLog = path.join(projectDir, "systemctl.log");

  try {
    mkdirSync(path.join(installDir, "data"), { recursive: true });
    mkdirSync(path.join(installDir, "apps/server/dist"), { recursive: true });
    createSqliteDatabase(path.join(installDir, "data/solar-display.sqlite"), { sentinel: "pre-update" });
    writeFileSync(path.join(installDir, ".env"), "KEEP=1\n");
    writeFileSync(path.join(installDir, "apps/server/dist/server.js"), "console.log('old');\n");
    writeFileSync(path.join(installDir, "package.json"), JSON.stringify({ name: "solar-display", version: "1.0.0" }));

    mkdirSync(path.join(bundleDir, "deploy"), { recursive: true });
    // Export helper that always fails after being invoked.
    writeFileSync(
      path.join(bundleDir, "deploy/export-runtime-state.sh"),
      "#!/bin/bash\necho 'forced export failure' >&2\nexit 9\n"
    );
    markBashExecutable(path.join(bundleDir, "deploy/export-runtime-state.sh"));
    writeFileSync(path.join(bundleDir, "deploy/restore-runtime-state.sh"), readFileSync(restoreScriptPath, "utf8"));
    markBashExecutable(path.join(bundleDir, "deploy/restore-runtime-state.sh"));
    writeFileSync(path.join(bundleDir, "deploy/install-tailscale.sh"), "#!/bin/bash\nexit 0\n");
    markBashExecutable(path.join(bundleDir, "deploy/install-tailscale.sh"));

    writeFileSync(path.join(projectDir, "deploy/raspi-bootstrap.sh"), readFileSync(raspiBootstrapScriptPath, "utf8"));
    markBashExecutable(path.join(projectDir, "deploy/raspi-bootstrap.sh"));
    writeFakeSystemctl(fakeBinDir, { isActive: true, logPath: systemctlLog });

    const result = runBashScript(
      "deploy/raspi-bootstrap.sh",
      [
        "--mode",
        "update",
        "--scope",
        "full",
        "--skip-host-preflight",
        "--skip-disk",
        "--install-dir",
        installDir,
        "--bundle-dir",
        bundleDir,
        "--kiosk-user",
        process.env.USER || "pi"
      ],
      {
        cwd: projectDir,
        env: {
          ...process.env
        },
        bashPrependPathDirs: [fakeBinDir],
        encoding: "utf8"
      }
    );

    assert.notEqual(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stderr + result.stdout, /verified runtime backup failed|application files were not replaced/i);
    assert.equal(readFileSync(path.join(installDir, "apps/server/dist/server.js"), "utf8"), "console.log('old');\n");
    assert.equal(readFileSync(path.join(installDir, ".env"), "utf8"), "KEEP=1\n");
    assert.equal(existsSync(systemctlLog), true, `systemctl log missing; stdout=${result.stdout}\nstderr=${result.stderr}`);
    const systemctlOps = readFileSync(systemctlLog, "utf8");
    assert.match(systemctlOps, /stop solar-display/);
    assert.match(systemctlOps, /start solar-display/);
  } finally {
    removeTempDir(projectDir);
  }
});

test("Failed update preserves rollback material without destructive database rollback", () => {
  const source = readFileSync(raspiBootstrapScriptPath, "utf8");

  assert.match(source, /Prior application archive/);
  assert.match(source, /Runtime archive/);
  assert.match(source, /Temp restore drill/);
  assert.match(source, /Production DB is NOT automatically restored/);
  assert.match(source, /verify-kiosk-install\.sh/);
  assert.match(source, /print_recovery_handoff/);
  // Must not auto-invoke restore overwrite of install dir on health failure.
  assert.doesNotMatch(
    source,
    /verify_status[\s\S]*restore-runtime-state\.sh[\s\S]*--confirm RESTORE-OVERWRITE/
  );

  // Fixture: drive a real raspi-bootstrap update whose post-update verification
  // step is forced to fail, then assert the production DB is byte-for-byte
  // unchanged and no destructive restore-runtime-state.sh --confirm was invoked.
  // (This assertion would FAIL if someone added an automatic destructive rollback
  //  into the verify-failure handoff path.)
  const projectDir = makeFixtureProject();
  try {
    const installDir = path.join(projectDir, "install");
    const bundleDir = path.join(projectDir, "bundle");
    const fakeBinDir = path.join(projectDir, "fake-bin");
    const systemctlLog = path.join(projectDir, "systemctl.log");
    const restoreStubLog = path.join(projectDir, "restore-stub.log");
    const kioskUser = process.env.USER || "pi";

    // Existing production runtime state that must survive a failed update.
    mkdirSync(path.join(installDir, "data"), { recursive: true });
    mkdirSync(path.join(installDir, "apps/server/dist"), { recursive: true });
    createSqliteDatabase(path.join(installDir, "data/solar-display.sqlite"), { sentinel: "prod-sentinel" });
    writeFileSync(path.join(installDir, ".env"), "KEEP=1\n");
    writeFileSync(path.join(installDir, "apps/server/dist/server.js"), "console.log('old');\n");
    writeFileSync(path.join(installDir, "package.json"), JSON.stringify({ name: "solar-display", version: "1.0.0" }));

    const dbPath = path.join(installDir, "data/solar-display.sqlite");
    const dbHashBefore = createHash("sha256").update(readFileSync(dbPath)).digest("hex");

    // Bundle: real export helper + stubbed later stages + a restore stub that
    // records any invocation (a destructive auto-rollback would call it).
    mkdirSync(path.join(bundleDir, "deploy"), { recursive: true });
    mkdirSync(path.join(bundleDir, "apps/server/dist"), { recursive: true });
    writeFileSync(path.join(bundleDir, "deploy/export-runtime-state.sh"), readFileSync(exportScriptPath, "utf8"));
    writeFileSync(
      path.join(bundleDir, "deploy/restore-runtime-state.sh"),
      [
        "#!/bin/bash",
        "# Test stub: a destructive auto-rollback would invoke this; record any call.",
        'if [[ -n "${SOLAR_RESTORE_STUB_LOG:-}" ]]; then',
        '  printf "%s invoked: %s\\n" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >> "${SOLAR_RESTORE_STUB_LOG}" 2>/dev/null || true',
        "fi",
        "exit 0",
        ""
      ].join("\n")
    );
    for (const stub of ["configure-lightweight-desktop.sh", "install-kiosk.sh"]) {
      writeFileSync(path.join(bundleDir, `deploy/${stub}`), "#!/bin/bash\nexit 0\n");
    }
    writeFileSync(path.join(bundleDir, "deploy/install-tailscale.sh"), "#!/bin/bash\nexit 0\n");
    // Force the post-update verification step to fail so the recovery-handoff
    // (no destructive rollback) path is actually exercised.
    writeFileSync(path.join(bundleDir, "deploy/verify-kiosk-install.sh"), "#!/bin/bash\nexit 1\n");
    writeFileSync(path.join(bundleDir, "apps/server/dist/server.js"), "console.log('new');\n");
    writeFileSync(path.join(bundleDir, "package.json"), JSON.stringify({ name: "solar-display", version: "2.0.0" }));
    writeFileSync(path.join(bundleDir, ".env.example"), "PORT=3000\n");
    for (const scriptPath of [
      "deploy/export-runtime-state.sh",
      "deploy/restore-runtime-state.sh",
      "deploy/install-tailscale.sh",
      "deploy/configure-lightweight-desktop.sh",
      "deploy/install-kiosk.sh",
      "deploy/verify-kiosk-install.sh"
    ]) {
      markBashExecutable(path.join(bundleDir, scriptPath));
    }

    writeFakeSystemctl(fakeBinDir, { isActive: false, logPath: systemctlLog });
    // Pass-through sudo so `sudo -u <kiosk-user> bash -lc ...` runs unprivileged.
    const sudoPath = path.join(fakeBinDir, "sudo");
    writeFileSync(sudoPath, ["#!/bin/bash", 'if [[ "$1" == "-u" ]]; then shift 2; fi', 'exec "$@"', ""].join("\n"));
    markBashExecutable(sudoPath);
    // chown stub: copy_bundle runs `chown -R user:user` directly (not via sudo);
    // on macOS that user:group pair is invalid, so shadow it so the flow can
    // progress past copy_bundle to the verify step under test.
    writeFileSync(path.join(fakeBinDir, "chown"), "#!/bin/bash\nexit 0\n");
    markBashExecutable(path.join(fakeBinDir, "chown"));

    // makeFixtureProject seeds an empty `deploy/raspi-bootstrap.sh` stub; copy the
    // real script over it so the relative-path invocation runs the actual update.
    writeFileSync(path.join(projectDir, "deploy/raspi-bootstrap.sh"), readFileSync(raspiBootstrapScriptPath, "utf8"));
    markBashExecutable(path.join(projectDir, "deploy/raspi-bootstrap.sh"));

    const result = runBashScript(
      "deploy/raspi-bootstrap.sh",
      [
        "--mode",
        "update",
        "--scope",
        "full",
        "--skip-host-preflight",
        "--skip-disk",
        "--install-dir",
        installDir,
        "--bundle-dir",
        bundleDir,
        "--kiosk-user",
        kioskUser
      ],
      {
        cwd: projectDir,
        env: {
          ...process.env,
          SOLAR_RESTORE_STUB_LOG: restoreStubLog,
          // Keep real node/pnpm/tar/sqlite3/shasum/df/rsync reachable while the
          // systemctl+sudo stubs shadow the front of PATH.
          PATH: `${fakeBinDir}:${process.env.PATH}`
        },
        encoding: "utf8"
      }
    );

    // The forced verify failure must surface the recovery handoff.
    assert.notEqual(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stderr + result.stdout, /recovery handoff/i);
    assert.match(result.stderr + result.stdout, /Production DB is NOT automatically restored/i);

    // (a) Production DB bytes are unchanged after the failed update.
    const dbHashAfter = createHash("sha256").update(readFileSync(dbPath)).digest("hex");
    assert.equal(dbHashAfter, dbHashBefore, "production DB changed during failed update");
    const note = spawnSync(
      "sqlite3",
      [dbPath, "SELECT note FROM restore_sentinel WHERE id=1;"],
      { encoding: "utf8" }
    );
    assert.equal(note.status, 0, note.stderr || note.stdout);
    assert.equal(note.stdout.trim(), "prod-sentinel");

    // (b) No destructive restore-runtime-state.sh invocation occurred.
    const restoreCalls = existsSync(restoreStubLog) ? readFileSync(restoreStubLog, "utf8") : "";
    assert.equal(restoreCalls, "", `unexpected destructive restore invocation: ${restoreCalls}`);
  } finally {
    removeTempDir(projectDir);
  }
});

const journalHelperPath = path.join(repoRoot, "deploy/read-solar-display-journal.sh");
const generateReleaseManifestPath = path.join(repoRoot, "scripts/generate-release-manifest.mjs");

test("solar-display journal helper accepts only fixed unit recent/export modes and clamps limit", () => {
  const source = readFileSync(journalHelperPath, "utf8");

  assert.match(source, /UNIT="solar-display"/);
  assert.match(source, /recent\|export/);
  assert.match(source, /MAX_LIMIT=500/);
  assert.match(source, /MIN_LIMIT=1/);
  assert.match(source, /journalctl -u "\$\{UNIT\}" -b --no-pager -n "\$\{LIMIT\}" -o json/);
  assert.match(source, /journalctl -u "\$\{UNIT\}" -b --no-pager -n "\$\{LIMIT\}" -o short-iso/);
  assert.doesNotMatch(source, /eval /);
  // Caller cannot inject unit/path flags — only fixed UNIT constant is used.
  assert.doesNotMatch(source, /--unit=/);
  assert.doesNotMatch(source, /\$1.*journalctl|journalctl.*\$3/);

  const rejectUnit = spawnSync(bashCommand, [journalHelperPath, "recent", "20", "--unit", "other"], {
    encoding: "utf8"
  });
  assert.notEqual(rejectUnit.status, 0);

  const rejectMode = spawnSync(bashCommand, [journalHelperPath, "all", "20"], {
    encoding: "utf8"
  });
  assert.notEqual(rejectMode.status, 0);

  const rejectLimit = spawnSync(bashCommand, [journalHelperPath, "recent", "abc"], {
    encoding: "utf8"
  });
  assert.notEqual(rejectLimit.status, 0);

  // Without journalctl on macOS/dev hosts the helper should fail closed with a bounded reason.
  const recent = spawnSync(bashCommand, [journalHelperPath, "recent", "0"], {
    encoding: "utf8"
  });
  // limit 0 clamps to 1 then either runs journalctl or reports missing journalctl.
  assert.notEqual(recent.status, 0);
  assert.match(`${recent.stderr}${recent.stdout}`, /journalctl|Usage|limit|error/i);
});

test("kiosk installer installs journal helper with visudo-checked sudoers drop-in", () => {
  const source = readFileSync(path.join(repoRoot, "deploy/install-kiosk.sh"), "utf8");

  assert.match(source, /read-solar-display-journal\.sh/);
  assert.match(source, /\/usr\/local\/sbin\/read-solar-display-journal\.sh/);
  assert.match(source, /\/etc\/sudoers\.d\/solar-display-journal/);
  assert.match(source, /visudo -cf/);
  assert.match(source, /NOPASSWD:.*recent \[0-9\]\*.*export \[0-9\]\*/);
  assert.match(source, /syntax check failed/);
  assert.match(source, /install -m 440/);
  assert.match(source, /install -m 755 -o root -g root/);
});

test("generate-release-manifest writes commit package schema and dirty state", async () => {
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), "release-manifest-fixture-"));
  try {
    mkdirSync(path.join(fixtureRoot, "apps/server/src/db/migrations"), { recursive: true });
    writeFileSync(
      path.join(fixtureRoot, "apps/server/package.json"),
      JSON.stringify({ name: "@solar-display/server", version: "1.2.3" }, null, 2)
    );
    writeFileSync(path.join(fixtureRoot, "apps/server/src/db/migrations/001_init.sql"), "-- init\n");
    writeFileSync(path.join(fixtureRoot, "apps/server/src/db/migrations/009_later.sql"), "-- later\n");
    writeFileSync(path.join(fixtureRoot, "apps/server/src/db/migrations/readme.txt"), "ignore\n");

    const gitInit = spawnSync("git", ["init"], { cwd: fixtureRoot, encoding: "utf8" });
    assert.equal(gitInit.status, 0, gitInit.stderr);
    spawnSync("git", ["config", "user.email", "test@example.com"], { cwd: fixtureRoot, encoding: "utf8" });
    spawnSync("git", ["config", "user.name", "Test"], { cwd: fixtureRoot, encoding: "utf8" });
    spawnSync("git", ["add", "."], { cwd: fixtureRoot, encoding: "utf8" });
    const commit = spawnSync("git", ["commit", "-m", "fixture"], { cwd: fixtureRoot, encoding: "utf8" });
    assert.equal(commit.status, 0, commit.stderr);

    const outPath = path.join(fixtureRoot, "release-manifest.json");
    const clean = spawnSync(
      process.execPath,
      [generateReleaseManifestPath, "--project-root", fixtureRoot, "--out", outPath],
      { encoding: "utf8" }
    );
    assert.equal(clean.status, 0, clean.stderr || clean.stdout);
    const cleanManifest = JSON.parse(readFileSync(outPath, "utf8"));
    assert.equal(cleanManifest.packageVersion, "1.2.3");
    assert.equal(cleanManifest.schemaVersion, 9);
    assert.equal(cleanManifest.sourceDirty, false);
    assert.equal(typeof cleanManifest.commit, "string");
    assert.equal(cleanManifest.commit.length >= 7, true);
    assert.equal(typeof cleanManifest.builtAt, "string");
    assert.match(cleanManifest.releaseId, /^1\.2\.3\+/);
    assert.equal(cleanManifest.releaseId.includes("dirty"), false);

    writeFileSync(path.join(fixtureRoot, "dirty.txt"), "x\n");
    const dirtyOut = path.join(fixtureRoot, "release-manifest-dirty.json");
    const dirty = spawnSync(
      process.execPath,
      [generateReleaseManifestPath, "--project-root", fixtureRoot, "--out", dirtyOut],
      { encoding: "utf8" }
    );
    assert.equal(dirty.status, 0, dirty.stderr || dirty.stdout);
    const dirtyManifest = JSON.parse(readFileSync(dirtyOut, "utf8"));
    assert.equal(dirtyManifest.sourceDirty, true);
    assert.match(dirtyManifest.releaseId, /-dirty$/);
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("deploy.sh includes journal helper and generates release manifest into bundles", () => {
  const source = readFileSync(deployScriptPath, "utf8");
  assert.match(source, /read-solar-display-journal\.sh/);
  assert.match(source, /generate-release-manifest\.mjs/);
  assert.match(source, /release-manifest\.json/);
});

test("direct deploy copies or generates release-manifest.json", () => {
  const source = readFileSync(path.join(repoRoot, "deploy/deploy.sh"), "utf8");
  assert.match(source, /run_priv node[\s\S]*generate-release-manifest\.mjs/);
  assert.match(source, /release-manifest\.json/);
});

test("browser smoke pins server dotenv to an isolated temp file", () => {
  const source = readFileSync(browserSmokeRunnerPath, "utf8");

  assert.match(source, /browser-smoke\.env/u);
  assert.match(source, /SOLAR_DISPLAY_ENV_FILE:\s*envFilePath/u);
});
