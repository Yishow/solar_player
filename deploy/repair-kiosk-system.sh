#!/bin/bash
set -euo pipefail

KIOSK_USER="${KIOSK_USER:-pi}"
KIOSK_HOME="${KIOSK_HOME:-}"
REPAIR_FIREFOX_FONTS="${REPAIR_FIREFOX_FONTS:-1}"
REPAIR_COPYMODS_MODULES="${REPAIR_COPYMODS_MODULES:-1}"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

if [[ "${EUID}" -ne 0 ]]; then
  fail "Please run as root: sudo ./deploy/repair-kiosk-system.sh"
fi

id "${KIOSK_USER}" >/dev/null 2>&1 || fail "User not found: ${KIOSK_USER}"
KIOSK_HOME="${KIOSK_HOME:-$(getent passwd "${KIOSK_USER}" | cut -d: -f6)}"
[[ -n "${KIOSK_HOME}" && -d "${KIOSK_HOME}" ]] || fail "Unable to resolve home for ${KIOSK_USER}"

repair_firefox_fonts() {
  echo "[firefox-fonts] installing Noto CJK into user-visible font paths..."

  local user_font_dir="${KIOSK_HOME}/.local/share/fonts/noto-cjk"
  install -d -m 0755 -o "${KIOSK_USER}" -g "${KIOSK_USER}" "${user_font_dir}"

  local font
  for font in \
    /usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc \
    /usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc \
    /usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc; do
    [[ -f "${font}" ]] || fail "Missing font: ${font}. Install fonts-noto-cjk first."
    install -m 0644 -o "${KIOSK_USER}" -g "${KIOSK_USER}" "${font}" "${user_font_dir}/"
  done

  sudo -u "${KIOSK_USER}" fc-cache -f "${KIOSK_HOME}/.local/share/fonts" >/dev/null 2>&1 || true

  local snap_root="${KIOSK_HOME}/snap/firefox"
  if [[ -d "${snap_root}" ]]; then
    local snap_data_dir=""
    if [[ -L "${snap_root}/current" || -d "${snap_root}/current" ]]; then
      snap_data_dir="$(readlink -f "${snap_root}/current")"
    else
      snap_data_dir="$(find "${snap_root}" -mindepth 1 -maxdepth 1 -type d -regex '.*/[0-9]+' | sort -V | tail -1)"
    fi

    for target in "${snap_data_dir}" "${snap_root}/common"; do
      [[ -n "${target}" && -d "${target}" ]] || continue
      install -d -m 0755 -o "${KIOSK_USER}" -g "${KIOSK_USER}" "${target}/.local/share/fonts/noto-cjk"
      rsync -a --delete "${user_font_dir}/" "${target}/.local/share/fonts/noto-cjk/"
      chown -R "${KIOSK_USER}:${KIOSK_USER}" "${target}/.local"
    done

    rm -rf "${snap_root}/common/.cache/fontconfig" 2>/dev/null || true
    if [[ -n "${snap_data_dir}" ]]; then
      rm -rf "${snap_data_dir}/.cache/fontconfig" 2>/dev/null || true
    fi

    local profile_dir=""
    profile_dir="$(find "${snap_root}/common/.mozilla/firefox" -maxdepth 1 -type d -name "*.default*" 2>/dev/null | head -1 || true)"
    if [[ -n "${profile_dir}" ]]; then
      cat > "${profile_dir}/user.js" <<'EOF'
user_pref("font.name-list.sans-serif.zh-TW", "Noto Sans CJK TC, Noto Sans CJK JP, Noto Sans CJK SC, Droid Sans Fallback");
user_pref("font.name-list.serif.zh-TW", "Noto Serif CJK TC, Noto Serif CJK JP, Noto Serif CJK SC, Droid Serif");
user_pref("font.name-list.monospace.zh-TW", "Noto Sans Mono CJK TC, Noto Sans CJK TC, Droid Sans Mono");
user_pref("font.name.sans-serif.zh-TW", "Noto Sans CJK TC");
user_pref("font.name.serif.zh-TW", "Noto Serif CJK TC");
user_pref("font.name.monospace.zh-TW", "Noto Sans Mono CJK TC");
user_pref("font.default.zh-TW", "sans-serif");
user_pref("intl.accept_languages", "zh-TW, zh, en-US, en");
EOF
      chown "${KIOSK_USER}:${KIOSK_USER}" "${profile_dir}/user.js"
    fi

    local uid
    uid="$(id -u "${KIOSK_USER}")"
    sudo -u "${KIOSK_USER}" XDG_RUNTIME_DIR="/run/user/${uid}" snap run --shell firefox -c 'fc-cache -f; fc-match sans:lang=zh-tw' || true
  fi
}

repair_copymods_modules() {
  local kernel
  kernel="$(uname -r)"

  command -v rsync >/dev/null 2>&1 || fail "Missing rsync; install rsync before repairing copymods modules."

  if [[ ! -d "/usr/lib/modules/${kernel}/kernel" ]]; then
    fail "Missing live kernel modules for ${kernel}. Install linux-modules-${kernel} first."
  fi

  if ! findmnt /usr/lib/modules >/dev/null 2>&1; then
    echo "[copymods] /usr/lib/modules is not a separate mount; no repair needed."
    return 0
  fi

  local source fstype
  source="$(findmnt -no SOURCE /usr/lib/modules)"
  fstype="$(findmnt -no FSTYPE /usr/lib/modules)"
  if [[ "${source}" != "copymods" && "${fstype}" != "tmpfs" ]]; then
    echo "[copymods] /usr/lib/modules is ${source} ${fstype}; no repair needed."
    return 0
  fi

  local root_source
  root_source="$(findmnt -no SOURCE /)"
  [[ -n "${root_source}" ]] || fail "Unable to resolve root source"
  if [[ "${root_source}" != /dev/* ]]; then
    fail "Root source is ${root_source}; disable readonly root and reboot before repairing copymods modules."
  fi

  local mount_dir
  mount_dir="$(mktemp -d)"
  cleanup() {
    mountpoint -q "${mount_dir}" && umount "${mount_dir}" || true
    rmdir "${mount_dir}" 2>/dev/null || true
  }
  trap cleanup RETURN

  mount "${root_source}" "${mount_dir}"
  install -d -m 0755 "${mount_dir}/usr/lib/modules"
  echo "[copymods] syncing /usr/lib/modules/${kernel} to ${root_source}..."
  rsync -a --delete "/usr/lib/modules/${kernel}/" "${mount_dir}/usr/lib/modules/${kernel}/"
  depmod -b "${mount_dir}" "${kernel}"
  sync

  [[ -d "${mount_dir}/usr/lib/modules/${kernel}/kernel" ]] || fail "Kernel modules were not written to underlying root"
}

if [[ "${REPAIR_FIREFOX_FONTS}" == "1" ]]; then
  repair_firefox_fonts
fi

if [[ "${REPAIR_COPYMODS_MODULES}" == "1" ]]; then
  repair_copymods_modules
fi

echo "Kiosk system repair completed for ${KIOSK_USER}."
