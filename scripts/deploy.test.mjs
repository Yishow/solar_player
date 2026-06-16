import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "..");
const deployScriptPath = path.join(repoRoot, "deploy.sh");
const exportScriptPath = path.join(repoRoot, "deploy/export-runtime-state.sh");
const resetDbScriptPath = path.join(repoRoot, "deploy/reset-db-settings.sh");

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
  mkdirSync(path.join(projectDir, "uploads/images"), { recursive: true });
  mkdirSync(path.join(projectDir, "uploads/brand"), { recursive: true });

  writeFileSync(path.join(projectDir, "package.json"), JSON.stringify({ name: "fixture" }, null, 2));
  writeFileSync(path.join(projectDir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
  writeFileSync(path.join(projectDir, "pnpm-workspace.yaml"), "packages:\n  - apps/*\n  - packages/*\n");
  writeFileSync(path.join(projectDir, ".env"), "MQTT_BROKER=broker.local\n");
  writeFileSync(path.join(projectDir, ".env.example"), "PORT=3000\n");
  writeFileSync(path.join(projectDir, "apps/server/package.json"), JSON.stringify({ name: "@solar-display/server", type: "module" }, null, 2));
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
  writeFileSync(path.join(projectDir, "deploy/reset-db-settings.sh"), "#!/bin/bash\n");
  writeFileSync(path.join(projectDir, "deploy/enable-readonly-root.sh"), "#!/bin/bash\n");
  writeFileSync(path.join(projectDir, "deploy/install-kiosk.sh"), "#!/bin/bash\n");
  writeFileSync(path.join(projectDir, "deploy/start-solar-kiosk.sh"), "#!/bin/bash\n");
  writeFileSync(path.join(projectDir, "deploy/stop-solar-kiosk.sh"), "#!/bin/bash\n");
  writeFileSync(path.join(projectDir, "deploy/verify-kiosk-install.sh"), "#!/bin/bash\n");
  writeFileSync(path.join(projectDir, "deploy/firefox-kiosk.desktop"), "[Desktop Entry]\n");
  writeFileSync(path.join(projectDir, "docs/openapi.yaml"), "openapi: 3.0.0\n");
  writeFileSync(path.join(projectDir, "docs/reference/kuozui-green-fhd-html-prototype/assets/clean/factory-bg.png"), "seed-image\n");
  writeFileSync(path.join(projectDir, "node_modules/fake-package/index.js"), "module.exports = {};\n");
  writeFileSync(path.join(projectDir, "data/solar-display.sqlite"), "db\n");
  writeFileSync(path.join(projectDir, "uploads/images/hero.png"), "img\n");
  writeFileSync(path.join(projectDir, "uploads/brand/logo.png"), "brand\n");
  writeFileSync(path.join(projectDir, "apps/.DS_Store"), "junk\n");

  return projectDir;
}

function runDeploy(projectDir, choice) {
  return spawnSync("bash", ["./deploy.sh"], {
    cwd: projectDir,
    env: {
      ...process.env,
      DEPLOY_CHOICE: String(choice),
      DEPLOY_BUILD_CMD: ":"
    },
    encoding: "utf8"
  });
}

function isExecutable(filePath) {
  return (statSync(filePath).mode & 0o111) !== 0;
}

test("deploy.sh shows two deployment menu options", () => {
  const source = readFileSync(deployScriptPath, "utf8");

  assert.match(source, /1\.\s*Build online deploy bundle/i);
  assert.match(source, /2\.\s*Build offline deploy bundle/i);
});

test("deploy service defaults to the Ubuntu kiosk account and exec startup", () => {
  const source = readFileSync(path.join(repoRoot, "deploy/solar-display.service"), "utf8");

  assert.match(source, /^Type=exec$/m);
  assert.match(source, /^User=kz$/m);
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
  assert.match(source, /AutomaticLogin=kz/);
  assert.match(source, /NODE_BIN=/);
  assert.match(source, /\.nvm\/nvm\.sh/);
  assert.match(source, /journalctl -u solar-display/);
  assert.match(source, /kiosk-launcher\.log/);
});

test("kiosk installer installs both autostart and desktop launchers for the kiosk user", () => {
  const source = readFileSync(path.join(repoRoot, "deploy/install-kiosk.sh"), "utf8");

  assert.match(source, /KIOSK_DESKTOP_DIR="\$\{KIOSK_HOME\}\/Desktop"/);
  assert.match(source, /Solar Display Kiosk\.desktop/);
  assert.match(source, /\$\{KIOSK_AUTOSTART_DIR\}\/firefox-kiosk\.desktop/);
  assert.match(source, /\$\{KIOSK_DESKTOP_DIR\}\/Solar Display Kiosk\.desktop/);
  assert.match(source, /chmod \+x "\$\{KIOSK_DESKTOP_DIR\}\/Solar Display Kiosk\.desktop"/);
  assert.match(source, /metadata::trusted true/);
});

test("bundle install script can source nvm before running pnpm install", () => {
  const source = readFileSync(path.join(repoRoot, "deploy.sh"), "utf8");

  assert.match(source, /NVM_DIR/);
  assert.match(source, /source_nvm/);
  assert.match(source, /pnpm install --prod --frozen-lockfile/);
});

test("runtime export script archives data uploads and .env from the install root", () => {
  const projectDir = makeFixtureProject();
  const outputDir = path.join(projectDir, "exports");

  try {
    writeFileSync(path.join(projectDir, "deploy/export-runtime-state.sh"), readFileSync(exportScriptPath, "utf8"));

    const result = spawnSync("bash", ["deploy/export-runtime-state.sh"], {
      cwd: projectDir,
      env: {
        ...process.env,
        INSTALL_DIR: projectDir,
        EXPORT_OUTPUT_DIR: outputDir,
        EXPORT_TIMESTAMP: "20260610-030000"
      },
      encoding: "utf8"
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);

    const archivePath = path.join(outputDir, "solar-display-runtime-20260610-030000.tar.gz");
    assert.equal(existsSync(archivePath), true);

    const listing = spawnSync("tar", ["-tzf", archivePath], {
      cwd: projectDir,
      encoding: "utf8"
    });

    assert.equal(listing.status, 0, listing.stderr || listing.stdout);
    assert.match(listing.stdout, /^data\/$/m);
    assert.match(listing.stdout, /^data\/solar-display\.sqlite$/m);
    assert.match(listing.stdout, /^uploads\/images\/hero\.png$/m);
    assert.match(listing.stdout, /^uploads\/brand\/logo\.png$/m);
    assert.match(listing.stdout, /^\.env$/m);
  } finally {
    rmSync(projectDir, { recursive: true, force: true });
  }
});

test("reset db settings script removes sqlite state without touching uploads", () => {
  const projectDir = makeFixtureProject();

  try {
    writeFileSync(path.join(projectDir, "deploy/reset-db-settings.sh"), readFileSync(resetDbScriptPath, "utf8"));
    writeFileSync(path.join(projectDir, "data/solar-display.sqlite-wal"), "wal\n");
    writeFileSync(path.join(projectDir, "data/solar-display.sqlite-shm"), "shm\n");

    const result = spawnSync("bash", ["deploy/reset-db-settings.sh"], {
      cwd: projectDir,
      env: {
        ...process.env,
        INSTALL_DIR: projectDir
      },
      encoding: "utf8"
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(existsSync(path.join(projectDir, "data/solar-display.sqlite")), false);
    assert.equal(existsSync(path.join(projectDir, "data/solar-display.sqlite-wal")), false);
    assert.equal(existsSync(path.join(projectDir, "data/solar-display.sqlite-shm")), false);
    assert.equal(existsSync(path.join(projectDir, "uploads/images/hero.png")), true);
    assert.equal(existsSync(path.join(projectDir, "uploads/brand/logo.png")), true);
  } finally {
    rmSync(projectDir, { recursive: true, force: true });
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
        `LOG_PATH=${JSON.stringify(systemctlLog)}`,
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
    chmodSync(systemctlPath, 0o755);

    const result = spawnSync("bash", ["deploy/reset-db-settings.sh"], {
      cwd: projectDir,
      env: {
        ...process.env,
        INSTALL_DIR: projectDir,
        PATH: `${fakeBinDir}${path.delimiter}${process.env.PATH}`
      },
      encoding: "utf8"
    });

    assert.notEqual(result.status, 0);

    const log = readFileSync(systemctlLog, "utf8");
    assert.match(log, /^stop solar-display$/m);
    assert.match(log, /^start solar-display$/m);
  } finally {
    rmSync(projectDir, { recursive: true, force: true });
  }
});

test("kiosk launcher waits for health and launches Firefox in kiosk mode", () => {
  const source = readFileSync(path.join(repoRoot, "deploy/start-solar-kiosk.sh"), "utf8");

  assert.match(source, /http:\/\/127\.0\.0\.1:3000\/health/);
  assert.match(source, /firefox -kiosk -private-window/);
  assert.match(source, /kiosk-launcher\.log/);
  assert.match(source, /metadata::trusted true/);
  assert.match(source, /KIOSK_START_DELAY:-5/);
  assert.match(source, /resolve_graphical_environment\(\)/);
  assert.match(source, /export XDG_RUNTIME_DIR="\/run\/user\/\$\(id -u\)"/);
  assert.match(source, /export DBUS_SESSION_BUS_ADDRESS="unix:path=\$\{XDG_RUNTIME_DIR\}\/bus"/);
  assert.match(source, /export DISPLAY=":0"/);
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
    chmodSync(path.join(projectDir, "deploy/enable-readonly-root.sh"), 0o755);

    const result = spawnSync("bash", ["deploy/enable-readonly-root.sh"], {
      cwd: projectDir,
      env: {
        ...process.env,
        INSTALL_DIR: path.join(projectDir, "missing-runtime")
      },
      encoding: "utf8"
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Runtime install directory is missing/);
  } finally {
    rmSync(projectDir, { recursive: true, force: true });
  }
});

test("read-only hardening helper applies overlayroot through a local config", () => {
  const source = readFileSync(path.join(repoRoot, "deploy/enable-readonly-root.sh"), "utf8");

  assert.match(source, /OVERLAYROOT_MODE="\$\{OVERLAYROOT_MODE:-tmpfs:recurse=0\}"/);
  assert.match(source, /overlayroot is not installed/);
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
    chmodSync(path.join(projectDir, "deploy/verify-kiosk-install.sh"), 0o755);
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
      chmodSync(commandPath, 0o755);
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
    chmodSync(sudoPath, 0o755);

    const result = spawnSync("bash", ["deploy/verify-kiosk-install.sh"], {
      cwd: projectDir,
      env: {
        ...process.env,
        INSTALL_DIR: installDir,
        KIOSK_HOME: kioskHome,
        KIOSK_USER: "kz",
        PATH: `${fakeBinDir}${path.delimiter}${process.env.PATH}`
      },
      encoding: "utf8"
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /desktop re-entry launcher exists/);
    assert.match(result.stderr, /Device Status re-entry guidance is not backed/);
  } finally {
    rmSync(projectDir, { recursive: true, force: true });
  }
});

test("deploy.sh online bundle includes runtime files without node_modules", () => {
  const projectDir = makeFixtureProject();

  try {
    writeFileSync(path.join(projectDir, "deploy.sh"), readFileSync(deployScriptPath, "utf8"));

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
    assert.equal(existsSync(path.join(bundleRoot, "docs/openapi.yaml")), true);
    assert.equal(
      existsSync(path.join(bundleRoot, "docs/reference/kuozui-green-fhd-html-prototype/assets/clean/factory-bg.png")),
      true
    );
    assert.equal(existsSync(path.join(bundleRoot, ".env.example")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/solar-display.service")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/export-runtime-state.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/reset-db-settings.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/enable-readonly-root.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/install-kiosk.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/start-solar-kiosk.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/stop-solar-kiosk.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/verify-kiosk-install.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/firefox-kiosk.desktop")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "install.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/export-runtime-state.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/reset-db-settings.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/enable-readonly-root.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/install-kiosk.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/start-solar-kiosk.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/stop-solar-kiosk.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/verify-kiosk-install.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "node_modules")), false);
    assert.equal(existsSync(path.join(bundleRoot, "apps/.DS_Store")), false);
    assert.equal(existsSync(path.join(bundleRoot, "apps/server/dist/server.test.js")), false);
    assert.equal(existsSync(path.join(bundleRoot, "apps/server/dist/server.test.js.map")), false);
  } finally {
    rmSync(projectDir, { recursive: true, force: true });
  }
});

test("deploy.sh offline bundle includes node_modules for copy-only deployment", () => {
  const projectDir = makeFixtureProject();

  try {
    writeFileSync(path.join(projectDir, "deploy.sh"), readFileSync(deployScriptPath, "utf8"));

    const result = runDeploy(projectDir, 2);
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const bundleRoot = path.join(projectDir, "dist/deploy-bundles/offline");
    assert.equal(existsSync(path.join(bundleRoot, "apps/server/dist/server.js")), true);
    assert.equal(existsSync(path.join(bundleRoot, "apps/server/package.json")), true);
    assert.equal(existsSync(path.join(bundleRoot, "apps/web/src/assets/playback/slide-overview.jpg")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/export-runtime-state.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/reset-db-settings.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/enable-readonly-root.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/install-kiosk.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/stop-solar-kiosk.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/verify-kiosk-install.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "install.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/export-runtime-state.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/reset-db-settings.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/enable-readonly-root.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/install-kiosk.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/start-solar-kiosk.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/stop-solar-kiosk.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/verify-kiosk-install.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "node_modules/fake-package/index.js")), true);
    assert.equal(existsSync(path.join(bundleRoot, "apps/.DS_Store")), false);
    assert.equal(existsSync(path.join(bundleRoot, "apps/server/dist/server.test.js")), false);
  } finally {
    rmSync(projectDir, { recursive: true, force: true });
  }
});
