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
const raspiDeployScriptPath = path.join(repoRoot, "scripts/raspi-onekey-deploy.sh");
const prepareUserDataScriptPath = path.join(repoRoot, "scripts/prepare-raspi-user-data.sh");
const prepareUserDataPs1Path = path.join(repoRoot, "scripts/prepare-raspi-user-data.ps1");
const connectRdpPs1Path = path.join(repoRoot, "scripts/connect-raspi-rdp.ps1");
const raspiBootstrapScriptPath = path.join(repoRoot, "deploy/raspi-bootstrap.sh");
const lightweightDesktopScriptPath = path.join(repoRoot, "deploy/configure-lightweight-desktop.sh");
const desktopThemeScriptPath = path.join(repoRoot, "deploy/apply-desktop-theme.sh");
const repairKioskSystemScriptPath = path.join(repoRoot, "deploy/repair-kiosk-system.sh");
const readonlyEnableScriptPath = path.join(repoRoot, "deploy/readonly-system-enable.sh");
const readonlyDisableScriptPath = path.join(repoRoot, "deploy/readonly-system-disable.sh");

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
  writeFileSync(path.join(projectDir, "deploy/raspi-bootstrap.sh"), "#!/bin/bash\n");
  writeFileSync(path.join(projectDir, "deploy/configure-lightweight-desktop.sh"), "#!/bin/bash\n");
  writeFileSync(path.join(projectDir, "deploy/apply-desktop-theme.sh"), "#!/bin/bash\n");
  writeFileSync(path.join(projectDir, "deploy/repair-kiosk-system.sh"), "#!/bin/bash\n");
  writeFileSync(path.join(projectDir, "deploy/readonly-system-enable.sh"), "#!/bin/bash\n");
  writeFileSync(path.join(projectDir, "deploy/readonly-system-disable.sh"), "#!/bin/bash\n");
  writeFileSync(path.join(projectDir, "deploy/install-kiosk.sh"), "#!/bin/bash\n");
  writeFileSync(path.join(projectDir, "deploy/start-solar-kiosk.sh"), "#!/bin/bash\n");
  writeFileSync(path.join(projectDir, "deploy/stop-solar-kiosk.sh"), "#!/bin/bash\n");
  writeFileSync(path.join(projectDir, "deploy/verify-kiosk-install.sh"), "#!/bin/bash\n");
  writeFileSync(path.join(projectDir, "deploy/firefox-kiosk.desktop"), "[Desktop Entry]\n");
  writeFileSync(path.join(projectDir, "deploy/enable-readonly-system.desktop"), "[Desktop Entry]\n");
  writeFileSync(path.join(projectDir, "deploy/disable-readonly-system.desktop"), "[Desktop Entry]\n");
  writeFileSync(path.join(projectDir, "scripts/raspi-onekey-deploy.sh"), "#!/bin/bash\n");
  writeFileSync(path.join(projectDir, "scripts/prepare-raspi-user-data.sh"), "#!/bin/bash\n");
  writeFileSync(path.join(projectDir, "scripts/prepare-raspi-user-data.ps1"), "Write-Host 'prepare'\n");
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

test("raspi one-key deploy dry-run reports target and skips destructive stages", () => {
  const result = spawnSync("bash", [
    raspiDeployScriptPath,
    "kz@192.168.31.39",
    "--mode",
    "update",
    "--mqtt-host",
    "192.168.31.62",
    "--desktop",
    "xfce-xrdp",
    "--rdp-auth",
    "passwordless",
    "--rdp-password",
    "kz",
    "--dry-run"
  ], {
    cwd: repoRoot,
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Target: kz@192\.168\.31\.39/);
  assert.match(result.stdout, /Mode: update/);
  assert.match(result.stdout, /Install dir: \/data\/solar-display/);
  assert.match(result.stdout, /MQTT host: 192\.168\.31\.62/);
  assert.match(result.stdout, /Desktop: xfce-xrdp/);
  assert.match(result.stdout, /RDP auth: passwordless/);
  assert.match(result.stdout, /Kiosk user: kz/);
  assert.match(result.stdout, /Readonly root: dry-run/);
  assert.doesNotMatch(result.stdout, /\b(parted|mkfs|resize2fs|sfdisk)\b/);
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

    const result = spawnSync("bash", [prepareUserDataScriptPath], {
      cwd: repoRoot,
      encoding: "utf8",
      input: [
        bootDir,
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
    rmSync(bootDir, { recursive: true, force: true });
  }
});

test("raspi user-data shell helper writes ssh sudo root su cloud-init config", () => {
  const bootDir = mkdtempSync(path.join(tmpdir(), "solar-display-system-boot-"));

  try {
    writeFileSync(path.join(bootDir, "user-data"), "#cloud-config\nhostname: old\n");

    const result = spawnSync("bash", [
      prepareUserDataScriptPath,
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
    ], {
      cwd: repoRoot,
      encoding: "utf8"
    });

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
    rmSync(bootDir, { recursive: true, force: true });
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
  const result = spawnSync("bash", [
    raspiBootstrapScriptPath,
    "--mode",
    "init",
    "--dry-run",
    "--disk-fixture",
    "root-full-no-data"
  ], {
    cwd: repoRoot,
    encoding: "utf8"
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /online root shrink is not supported/);
  assert.doesNotMatch(result.stdout + result.stderr, /\bresize2fs\b.*\b-M\b/);
});

test("raspi bootstrap dry-run can reuse existing writable data mount", () => {
  const result = spawnSync("bash", [
    raspiBootstrapScriptPath,
    "--mode",
    "init",
    "--dry-run",
    "--skip-host-preflight",
    "--disk-fixture",
    "writable-data"
  ], {
    cwd: repoRoot,
    encoding: "utf8"
  });

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
    chmodSync(path.join(projectDir, "deploy/raspi-bootstrap.sh"), 0o755);
    mkdirSync(installDir, { recursive: true });
    writeFileSync(path.join(installDir, ".env.example"), "MQTT_BROKER_HOST=localhost\n");

    const createResult = spawnSync("bash", [
      "deploy/raspi-bootstrap.sh",
      "--mode",
      "update",
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
    const preserveResult = spawnSync("bash", [
      "deploy/raspi-bootstrap.sh",
      "--mode",
      "update",
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
    rmSync(projectDir, { recursive: true, force: true });
  }
});

test("lightweight desktop helper configures xfce lightdm xrdp firefox without weakening ssh or sudo", () => {
  const source = readFileSync(lightweightDesktopScriptPath, "utf8");
  const result = spawnSync("bash", [
    lightweightDesktopScriptPath,
    "--user",
    "kz",
    "--desktop",
    "xfce-xrdp",
    "--rdp-auth",
    "passwordless",
    "--rdp-password",
    "kz",
    "--dry-run"
  ], {
    cwd: repoRoot,
    encoding: "utf8"
  });

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
  assert.match(source, /light-locker\.desktop/);
  assert.match(source, /xscreensaver\.desktop/);
  assert.match(source, /solar-disable-display-sleep\.desktop/);
  assert.match(source, /solar-disable-display-sleep\.sh/);
  assert.match(source, /xset s off/);
  assert.match(source, /xset s noblank/);
  assert.match(source, /xset -dpms/);
  assert.match(source, /xfce4-power-manager\.xml/);
  assert.match(source, /dpms-enabled/);
  assert.match(source, /blank-on-ac/);
  assert.match(source, /presentation-mode/);
  assert.match(source, /Hidden=true/);
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
  const result = spawnSync("bash", [
    lightweightDesktopScriptPath,
    "--user",
    "kz",
    "--desktop",
    "xfce-xrdp",
    "--rdp-auth",
    "passwordless",
    "--dry-run"
  ], {
    cwd: repoRoot,
    encoding: "utf8"
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /RDP passwordless requires --rdp-password or RDP_PASSWORD/);
});

test("desktop theme helper installs a balanced xfce theme profile without touching auth flows", () => {
  const source = readFileSync(desktopThemeScriptPath, "utf8");
  const result = spawnSync("bash", [
    desktopThemeScriptPath,
    "--user",
    "kz",
    "--dry-run"
  ], {
    cwd: repoRoot,
    encoding: "utf8"
  });

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
  assert.match(source, /export GTK_IM_MODULE="\$\{GTK_IM_MODULE:-fcitx\}"/);
  assert.match(source, /export QT_IM_MODULE="\$\{QT_IM_MODULE:-fcitx\}"/);
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

    const result = spawnSync("bash", [
      "deploy/verify-kiosk-install.sh",
      "--install-dir",
      installDir,
      "--kiosk-user",
      "kz",
      "--kiosk-home",
      kioskHome
    ], {
      cwd: projectDir,
      env: {
        ...process.env,
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

test("kiosk verification helper checks modules Firefox Wi-Fi and Tailscale gates", () => {
  const source = readFileSync(path.join(repoRoot, "deploy/verify-kiosk-install.sh"), "utf8");

  assert.match(source, /modules_not_hidden_by_copymods/);
  assert.match(source, /Firefox snap resolves Traditional Chinese to Noto Sans CJK TC/);
  assert.match(source, /Wi-Fi is connected when a Wi-Fi device is present/);
  assert.match(source, /tailscaled is active when Tailscale is installed/);
  assert.match(source, /display sleep disable autostart is configured/);
  assert.match(source, /display sleep is disabled when X display is available/);
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
    assert.equal(existsSync(path.join(bundleRoot, "deploy/raspi-bootstrap.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/configure-lightweight-desktop.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/apply-desktop-theme.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/repair-kiosk-system.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/readonly-system-enable.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/readonly-system-disable.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/install-kiosk.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/start-solar-kiosk.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/stop-solar-kiosk.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/verify-kiosk-install.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/firefox-kiosk.desktop")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/enable-readonly-system.desktop")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/disable-readonly-system.desktop")), true);
    assert.equal(existsSync(path.join(bundleRoot, "scripts/raspi-onekey-deploy.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "scripts/prepare-raspi-user-data.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "scripts/prepare-raspi-user-data.ps1")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "install.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/export-runtime-state.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/reset-db-settings.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/enable-readonly-root.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/raspi-bootstrap.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/configure-lightweight-desktop.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/apply-desktop-theme.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/repair-kiosk-system.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/readonly-system-enable.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/readonly-system-disable.sh")), true);
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
    assert.equal(existsSync(path.join(bundleRoot, "deploy/raspi-bootstrap.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/configure-lightweight-desktop.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/apply-desktop-theme.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/repair-kiosk-system.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/readonly-system-enable.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/readonly-system-disable.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/install-kiosk.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/stop-solar-kiosk.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "deploy/verify-kiosk-install.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "scripts/raspi-onekey-deploy.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "scripts/prepare-raspi-user-data.sh")), true);
    assert.equal(existsSync(path.join(bundleRoot, "scripts/prepare-raspi-user-data.ps1")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "install.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/export-runtime-state.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/reset-db-settings.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/enable-readonly-root.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/raspi-bootstrap.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/configure-lightweight-desktop.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/apply-desktop-theme.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/repair-kiosk-system.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/readonly-system-enable.sh")), true);
    assert.equal(isExecutable(path.join(bundleRoot, "deploy/readonly-system-disable.sh")), true);
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
    rmSync(projectDir, { recursive: true, force: true });
  }
});
