#!/bin/bash
set -euo pipefail

BOOT_PATH=""
HOSTNAME="raspberry5"
KIOSK_USER="pi"
KIOSK_PASSWORD="pi"
ROOT_PASSWORD="kzroot"
TIMEZONE="Asia/Taipei"
PACKAGE_UPGRADE="false"
DATA_SIZE_GB="10"
MQTT_HOST="192.168.31.62"
FIRST_LOGIN_TOOLS="true"
INSTALL_NVM="true"
INTERACTIVE=0

usage() {
  cat <<EOF
Usage: scripts/prepare-raspi-user-data.sh [options]

Options:
  --boot-path <path>       Mounted system-boot path. Auto-detects common paths when omitted.
  --hostname <name>        Default: raspberry5
  --user <name>            Default: pi
  --password <password>    Default: pi
  --root-password <pass>   Default: kzroot
  --timezone <tz>          Default: Asia/Taipei
  --data-size-gb <gb>      Default: 10
  --mqtt-host <host>       Default: 192.168.31.62
  --package-upgrade        Run package upgrades during first boot.
  --skip-first-login-tools Do not write solar-first-login-tools.sh.
  --skip-nvm               Do not install nvm from solar-first-login-tools.sh.
EOF
}

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

if [[ "$#" -eq 0 ]]; then
  INTERACTIVE=1
fi

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --boot-path) BOOT_PATH="${2:-}"; shift 2 ;;
    --hostname) HOSTNAME="${2:-}"; shift 2 ;;
    --user) KIOSK_USER="${2:-}"; shift 2 ;;
    --password) KIOSK_PASSWORD="${2:-}"; shift 2 ;;
    --root-password) ROOT_PASSWORD="${2:-}"; shift 2 ;;
    --timezone) TIMEZONE="${2:-}"; shift 2 ;;
    --data-size-gb) DATA_SIZE_GB="${2:-}"; shift 2 ;;
    --mqtt-host) MQTT_HOST="${2:-}"; shift 2 ;;
    --package-upgrade) PACKAGE_UPGRADE="true"; shift ;;
    --skip-first-login-tools) FIRST_LOGIN_TOOLS="false"; shift ;;
    --skip-nvm) INSTALL_NVM="false"; shift ;;
    --interactive) INTERACTIVE=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) fail "Unknown option: $1" ;;
  esac
done

detect_boot_path() {
  for candidate in \
    "/Volumes/system-boot" \
    "/media/${USER:-}/system-boot" \
    "/run/media/${USER:-}/system-boot"; do
    if [[ -d "${candidate}" ]]; then
      printf '%s\n' "${candidate}"
      return 0
    fi
  done
  return 1
}

prompt_value() {
  local label="$1"
  local current="$2"
  local value
  printf "%s [%s]: " "${label}" "${current}" >&2
  read -r value
  if [[ -n "${value}" ]]; then
    printf '%s\n' "${value}"
  else
    printf '%s\n' "${current}"
  fi
}

prompt_yes_no() {
  local label="$1"
  local default_value="$2"
  local value
  printf "%s [%s]: " "${label}" "${default_value}" >&2
  read -r value
  value="${value:-${default_value}}"
  [[ "${value}" == "y" || "${value}" == "Y" || "${value}" == "yes" || "${value}" == "YES" ]]
}

if [[ -z "${BOOT_PATH}" ]]; then
  BOOT_PATH="$(detect_boot_path || true)"
fi

if [[ "${INTERACTIVE}" == "1" ]]; then
  echo "Solar Player Raspberry Pi user-data setup"
  BOOT_PATH="$(prompt_value "system-boot path" "${BOOT_PATH:-/Volumes/system-boot}")"
  HOSTNAME="$(prompt_value "Hostname" "${HOSTNAME}")"
  KIOSK_USER="$(prompt_value "Linux user" "${KIOSK_USER}")"
  KIOSK_PASSWORD="$(prompt_value "Linux user password" "${KIOSK_PASSWORD}")"
  ROOT_PASSWORD="$(prompt_value "Root password for local su -" "${ROOT_PASSWORD}")"
  TIMEZONE="$(prompt_value "Timezone" "${TIMEZONE}")"
  DATA_SIZE_GB="$(prompt_value "Data partition size in GiB" "${DATA_SIZE_GB}")"
  MQTT_HOST="$(prompt_value "MQTT host" "${MQTT_HOST}")"
  if prompt_yes_no "Run package upgrade on first boot? This is slower" "n"; then
    PACKAGE_UPGRADE="true"
  else
    PACKAGE_UPGRADE="false"
  fi
  if prompt_yes_no "Write first-login maintenance tools script?" "y"; then
    FIRST_LOGIN_TOOLS="true"
  else
    FIRST_LOGIN_TOOLS="false"
  fi
  if [[ "${FIRST_LOGIN_TOOLS}" == "true" ]] && prompt_yes_no "Install nvm from first-login tools script?" "y"; then
    INSTALL_NVM="true"
  else
    INSTALL_NVM="false"
  fi
fi

[[ -n "${BOOT_PATH}" ]] || fail "Unable to find system-boot. Pass --boot-path <path>."

[[ -d "${BOOT_PATH}" ]] || fail "Boot path does not exist: ${BOOT_PATH}"
[[ -w "${BOOT_PATH}" ]] || fail "Boot path is not writable: ${BOOT_PATH}"
[[ "${DATA_SIZE_GB}" =~ ^[1-9][0-9]*$ ]] || fail "--data-size-gb must be a positive integer"

if [[ "${INTERACTIVE}" == "1" ]]; then
  cat <<EOF

About to write:
  boot path: ${BOOT_PATH}
  hostname: ${HOSTNAME}
  user: ${KIOSK_USER}
  data_size_gb: ${DATA_SIZE_GB}
  mqtt_host: ${MQTT_HOST}
  package_upgrade: ${PACKAGE_UPGRADE}
  installs: sudo, openssh-server, avahi-daemon
  first_login_tools: ${FIRST_LOGIN_TOOLS}
  install_nvm: ${INSTALL_NVM}
  root SSH: disabled

EOF
  printf "Type YES to write user-data: " >&2
  read -r confirmation
  [[ "${confirmation}" == "YES" ]] || fail "Cancelled"
fi

USER_DATA="${BOOT_PATH}/user-data"
if [[ -f "${USER_DATA}" && ! -f "${BOOT_PATH}/user-data.before-solar-player" ]]; then
  cp "${USER_DATA}" "${BOOT_PATH}/user-data.before-solar-player"
fi

cat > "${USER_DATA}" <<EOF
#cloud-config
hostname: ${HOSTNAME}
manage_etc_hosts: true
timezone: ${TIMEZONE}
ssh_pwauth: true
growpart:
  mode: off
resize_rootfs: false

users:
  - name: ${KIOSK_USER}
    groups: [adm, cdrom, dip, lxd, sudo]
    sudo: ["ALL=(ALL) ALL"]
    shell: /bin/bash
    lock_passwd: false

chpasswd:
  expire: false
  users:
    - {name: ${KIOSK_USER}, password: "${KIOSK_PASSWORD}", type: text}
    - {name: root, password: "${ROOT_PASSWORD}", type: text}

package_update: true
package_upgrade: ${PACKAGE_UPGRADE}
packages:
  - sudo
  - openssh-server
  - avahi-daemon

write_files:
  - path: /etc/growroot-disabled
    permissions: "0644"
    owner: root:root
    content: |
      disabled by Solar Player first-boot setup; /data is created by raspi-onekey-deploy.sh
  - path: /etc/ssh/sshd_config.d/99-solar-player.conf
    permissions: "0644"
    owner: root:root
    content: |
      PasswordAuthentication yes
      KbdInteractiveAuthentication yes
      PermitRootLogin no

runcmd:
  - systemctl enable --now ssh
  - systemctl enable --now avahi-daemon
EOF

cat > "${BOOT_PATH}/solar-deploy.env" <<EOF
DATA_SIZE_GB=${DATA_SIZE_GB}
KIOSK_USER=${KIOSK_USER}
MQTT_HOST=${MQTT_HOST}
EOF

if [[ "${FIRST_LOGIN_TOOLS}" == "true" ]]; then
  cat > "${BOOT_PATH}/solar-first-login-tools.sh" <<EOF
#!/bin/bash
set -euo pipefail

KIOSK_USER="\${KIOSK_USER:-${KIOSK_USER}}"
INSTALL_NVM="\${INSTALL_NVM:-${INSTALL_NVM}}"
NVM_VERSION="\${NVM_VERSION:-v0.40.3}"

if [[ "\${EUID}" -ne 0 ]]; then
  echo "Please run as root: sudo bash /boot/firmware/solar-first-login-tools.sh" >&2
  exit 1
fi

id "\${KIOSK_USER}" >/dev/null 2>&1 || {
  echo "User not found: \${KIOSK_USER}" >&2
  exit 1
}

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y \\
  locales \\
  net-tools \\
  curl \\
  ca-certificates \\
  language-pack-zh-hant \\
  language-pack-gnome-zh-hant \\
  fonts-noto-cjk \\
  im-config \\
  fcitx5 \\
  fcitx5-table-boshiamy \\
  git \\
  vim \\
  htop \\
  tmux \\
  rsync \\
  parted \\
  e2fsprogs \\
  ufw \\
  avahi-utils \\
  mosquitto-clients

grep -q '^zh_TW.UTF-8 UTF-8$' /etc/locale.gen || echo 'zh_TW.UTF-8 UTF-8' >> /etc/locale.gen
locale-gen zh_TW.UTF-8
update-locale LANG=zh_TW.UTF-8 LANGUAGE=zh_TW:zh

if [[ "\${INSTALL_NVM}" == "true" ]]; then
  sudo -u "\${KIOSK_USER}" bash -lc "
    set -euo pipefail
    export NVM_DIR=\"\\\${HOME}/.nvm\"
    if [[ ! -s \"\\\${NVM_DIR}/nvm.sh\" ]]; then
      curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/\${NVM_VERSION}/install.sh | bash
    fi
    . \"\\\${NVM_DIR}/nvm.sh\"
    nvm --version
  "
fi

echo "First-login maintenance tools installed for \${KIOSK_USER}."
echo "SSH password auth and sudo password policy were not changed."
EOF
  chmod 755 "${BOOT_PATH}/solar-first-login-tools.sh"
fi

sync
echo "Wrote ${USER_DATA}"
echo "Backup: ${BOOT_PATH}/user-data.before-solar-player"
echo "Deploy env: ${BOOT_PATH}/solar-deploy.env"
if [[ "${FIRST_LOGIN_TOOLS}" == "true" ]]; then
  echo "First-login tools: ${BOOT_PATH}/solar-first-login-tools.sh"
fi
echo "User ${KIOSK_USER} will have sudo; openssh-server will be installed on first boot."
echo "Root password is set for local 'su -'; root SSH login remains disabled."
