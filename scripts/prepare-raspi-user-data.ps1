param(
  [string]$BootPath = "",
  [string]$Hostname = "raspberry5",
  [string]$User = "pi",
  [string]$Password = "pi",
  [string]$RootPassword = "kzroot",
  [string]$Timezone = "Asia/Taipei",
  [string]$DataSizeGb = "10",
  [string]$MqttHost = "192.168.31.62",
  [switch]$Interactive,
  [switch]$PackageUpgrade,
  [switch]$SkipFirstLoginTools,
  [switch]$SkipNvm
)

$ErrorActionPreference = "Stop"

function Find-SystemBoot {
  $volume = Get-Volume -FileSystemLabel "system-boot" -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($null -ne $volume -and $volume.DriveLetter) {
    return "$($volume.DriveLetter):\"
  }

  foreach ($candidate in @("D:\", "E:\", "F:\", "G:\")) {
    if (Test-Path (Join-Path $candidate "user-data")) {
      return $candidate
    }
  }

  throw "Unable to find system-boot. Pass -BootPath <path>."
}

if (-not $PSBoundParameters.ContainsKey("BootPath") -and $PSBoundParameters.Count -eq 0) {
  $Interactive = $true
}

if ([string]::IsNullOrWhiteSpace($BootPath)) {
  try {
    $BootPath = Find-SystemBoot
  } catch {
    $BootPath = "E:\"
  }
}

if ($Interactive) {
  Write-Host "Solar Player Raspberry Pi user-data setup"
  $value = Read-Host "system-boot path [$BootPath]"
  if (-not [string]::IsNullOrWhiteSpace($value)) { $BootPath = $value }
  $value = Read-Host "Hostname [$Hostname]"
  if (-not [string]::IsNullOrWhiteSpace($value)) { $Hostname = $value }
  $value = Read-Host "Linux user [$User]"
  if (-not [string]::IsNullOrWhiteSpace($value)) { $User = $value }
  $value = Read-Host "Linux user password [$Password]"
  if (-not [string]::IsNullOrWhiteSpace($value)) { $Password = $value }
  $value = Read-Host "Root password for local su - [$RootPassword]"
  if (-not [string]::IsNullOrWhiteSpace($value)) { $RootPassword = $value }
  $value = Read-Host "Timezone [$Timezone]"
  if (-not [string]::IsNullOrWhiteSpace($value)) { $Timezone = $value }
  $value = Read-Host "Data partition size in GiB [$DataSizeGb]"
  if (-not [string]::IsNullOrWhiteSpace($value)) { $DataSizeGb = $value }
  $value = Read-Host "MQTT host [$MqttHost]"
  if (-not [string]::IsNullOrWhiteSpace($value)) { $MqttHost = $value }
  $value = Read-Host "Run package upgrade on first boot? This is slower [n]"
  if ($value -match "^(y|Y|yes|YES)$") { $PackageUpgrade = $true }
  $value = Read-Host "Write first-login maintenance tools script? [y]"
  if ($value -match "^(n|N|no|NO)$") { $SkipFirstLoginTools = $true }
  if (-not $SkipFirstLoginTools) {
    $value = Read-Host "Install nvm from first-login tools script? [y]"
    if ($value -match "^(n|N|no|NO)$") { $SkipNvm = $true }
  }

  Write-Host ""
  Write-Host "About to write:"
  Write-Host "  boot path: $BootPath"
  Write-Host "  hostname: $Hostname"
  Write-Host "  user: $User"
  Write-Host "  data_size_gb: $DataSizeGb"
  Write-Host "  mqtt_host: $MqttHost"
  Write-Host "  package_upgrade: $PackageUpgrade"
  Write-Host "  installs: sudo, openssh-server, avahi-daemon"
  Write-Host "  first_login_tools: $(-not $SkipFirstLoginTools)"
  Write-Host "  install_nvm: $(-not $SkipNvm)"
  Write-Host "  root SSH: disabled"
  Write-Host ""
  $confirm = Read-Host "Type YES to write user-data"
  if ($confirm -ne "YES") {
    throw "Cancelled"
  }
}

if (-not (Test-Path $BootPath)) {
  throw "Boot path does not exist: $BootPath"
}

if ($DataSizeGb -notmatch "^[1-9][0-9]*$") {
  throw "DataSizeGb must be a positive integer."
}

$userDataPath = Join-Path $BootPath "user-data"
$backupPath = Join-Path $BootPath "user-data.before-solar-player"

if ((Test-Path $userDataPath) -and -not (Test-Path $backupPath)) {
  Copy-Item $userDataPath $backupPath
}

$upgradeValue = "false"
if ($PackageUpgrade) {
  $upgradeValue = "true"
}

$userDataTemplate = [string[]](
  "#cloud-config",
  "hostname: __HOSTNAME__",
  "manage_etc_hosts: true",
  "timezone: __TIMEZONE__",
  "ssh_pwauth: true",
  "growpart:",
  "  mode: off",
  "resize_rootfs: false",
  "",
  "users:",
  "  - name: __USER__",
  "    groups: [adm, cdrom, dip, lxd, sudo]",
  "    sudo:",
  "      - ALL=(ALL) ALL",
  "    shell: /bin/bash",
  "    lock_passwd: false",
  "",
  "chpasswd:",
  "  expire: false",
  "  users:",
  "    - {name: __USER__, password: '__PASSWORD__', type: text}",
  "    - {name: root, password: '__ROOT_PASSWORD__', type: text}",
  "",
  "package_update: true",
  "package_upgrade: __PACKAGE_UPGRADE__",
  "packages:",
  "  - sudo",
  "  - openssh-server",
  "  - avahi-daemon",
  "",
  "write_files:",
  "  - path: /etc/growroot-disabled",
  "    permissions: '0644'",
  "    owner: root:root",
  "    content: |",
  "      disabled by Solar Player first-boot setup; /data is created by raspi-onekey-deploy.sh",
  "  - path: /etc/ssh/sshd_config.d/99-solar-player.conf",
  "    permissions: '0644'",
  "    owner: root:root",
  "    content: |",
  "      PasswordAuthentication yes",
  "      KbdInteractiveAuthentication yes",
  "      PermitRootLogin no",
  "",
  "runcmd:",
  "  - systemctl enable --now ssh",
  "  - systemctl enable --now avahi-daemon"
)
$userData = ($userDataTemplate -join "`n").
  Replace("__HOSTNAME__", $Hostname).
  Replace("__TIMEZONE__", $Timezone).
  Replace("__USER__", $User).
  Replace("__PASSWORD__", $Password).
  Replace("__ROOT_PASSWORD__", $RootPassword).
  Replace("__PACKAGE_UPGRADE__", $upgradeValue)

Set-Content -Path $userDataPath -Value $userData -Encoding UTF8NoBOM

$deployEnvPath = Join-Path $BootPath "solar-deploy.env"
$deployEnv = @(
  "DATA_SIZE_GB=$DataSizeGb"
  "KIOSK_USER=$User"
  "MQTT_HOST=$MqttHost"
) -join "`n"
Set-Content -Path $deployEnvPath -Value $deployEnv -Encoding UTF8NoBOM

if (-not $SkipFirstLoginTools) {
  $installNvmValue = "true"
  if ($SkipNvm) {
    $installNvmValue = "false"
  }

  $firstLoginToolsPath = Join-Path $BootPath "solar-first-login-tools.sh"
  $firstLoginToolsTemplate = [string[]](
    "#!/bin/bash",
    "set -euo pipefail",
    "",
    "KIOSK_USER=`"${KIOSK_USER:-__KIOSK_USER__}`"",
    "INSTALL_NVM=`"${INSTALL_NVM:-__INSTALL_NVM__}`"",
    "NVM_VERSION=`"${NVM_VERSION:-v0.40.3}`"",
    "",
    "if [[ `"${EUID}`" -ne 0 ]]; then",
    "  echo `"Please run as root: sudo bash /boot/firmware/solar-first-login-tools.sh`" >&2",
    "  exit 1",
    "fi",
    "",
    "id `"${KIOSK_USER}`" >/dev/null 2>&1 || {",
    "  echo `"User not found: ${KIOSK_USER}`" >&2",
    "  exit 1",
    "}",
    "",
    "export DEBIAN_FRONTEND=noninteractive",
    "apt-get update",
    "apt-get install -y \",
    "  locales \",
    "  net-tools \",
    "  curl \",
    "  ca-certificates \",
    "  language-pack-zh-hant \",
    "  language-pack-gnome-zh-hant \",
    "  fonts-noto-cjk \",
    "  im-config \",
    "  fcitx5 \",
    "  fcitx5-table-boshiamy \",
    "  git \",
    "  vim \",
    "  htop \",
    "  tmux \",
    "  rsync \",
    "  parted \",
    "  e2fsprogs \",
    "  ufw \",
    "  avahi-utils \",
    "  mosquitto-clients",
    "",
    "grep -q '^zh_TW.UTF-8 UTF-8$' /etc/locale.gen || echo 'zh_TW.UTF-8 UTF-8' >> /etc/locale.gen",
    "locale-gen zh_TW.UTF-8",
    "update-locale LANG=zh_TW.UTF-8 LANGUAGE=zh_TW:zh",
    "",
    "if [[ `"${INSTALL_NVM}`" == `"true`" ]]; then",
    "  sudo -u `"${KIOSK_USER}`" bash -lc `"",
    "    set -euo pipefail",
    "    export NVM_DIR=\`"`"\${HOME}/.nvm\`"`"",
    "    if [[ ! -s \`"`"\${NVM_DIR}/nvm.sh\`"`" ]]; then",
    "      curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh | bash",
    "    fi",
    "    . \`"`"\${NVM_DIR}/nvm.sh\`"`"",
    "    nvm --version",
    "  `"",
    "fi",
    "",
    "echo `"First-login maintenance tools installed for ${KIOSK_USER}.`"",
    "echo `"SSH password auth and sudo password policy were not changed.`""
  )
  $firstLoginTools = ($firstLoginToolsTemplate -join "`n").Replace("__KIOSK_USER__", $User).Replace("__INSTALL_NVM__", $installNvmValue)
  Set-Content -Path $firstLoginToolsPath -Value $firstLoginTools -Encoding UTF8NoBOM
}

Write-Host "Wrote $userDataPath"
Write-Host "Backup: $backupPath"
Write-Host "Deploy env: $deployEnvPath"
if (-not $SkipFirstLoginTools) {
  Write-Host "First-login tools: $firstLoginToolsPath"
}
Write-Host "User $User will have sudo; openssh-server will be installed on first boot."
Write-Host "Root password is set for local 'su -'; root SSH login remains disabled."
