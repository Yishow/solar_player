#!/bin/bash
set +x
set -euo pipefail
LC_ALL=C

RDP_PASSWORD_ENV="${RDP_PASSWORD-}"
export -n RDP_PASSWORD 2>/dev/null || true
unset RDP_PASSWORD
RDP_PASSWORD="${RDP_PASSWORD_ENV}"
unset RDP_PASSWORD_ENV
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
KIOSK_USER="${KIOSK_USER:-pi}"
DESKTOP="xfce-xrdp"
RDP_AUTH="passwordless"
RDP_PASSWORD_FILE=""
SOLAR_SECRET_ALLOWED_ROOTS="${SOLAR_SECRET_ALLOWED_ROOTS:-/run/solar-display-deploy-secrets:/run/solar-display-bootstrap-secrets}"
DRY_RUN=0

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

# BEGIN SOLAR RDP PASSWORD FILE READER
stat_field() {
  local format="$1"
  local bsd_format="${format}"
  [[ "${format}" != "%a" ]] || bsd_format="%Lp"
  stat -c "${format}" "$2" 2>/dev/null || stat -f "${bsd_format}" "$2" 2>/dev/null
}

validate_rdp_password_file() {
  local file_path="$1"
  local parent marker owner parent_owner marker_uid marker_magic marker_owner marker_file marker_extra marker_fd
  local allowed_root allowed=0
  [[ "${file_path}" == /* && -f "${file_path}" && ! -L "${file_path}" ]] || return 1
  parent="${file_path%/*}"
  [[ "${file_path}" == "${parent}/rdp-password" ]] || return 1
  [[ "${parent##*/}" == .solar-deploy-* || "${parent##*/}" == .solar-bootstrap-* ]] || return 1
  while IFS= read -r -d ':' allowed_root || [[ -n "${allowed_root}" ]]; do
    if [[ "${parent}" == "${allowed_root%/}/"* && "${parent#"${allowed_root%/}/"}" != */* ]]; then
      allowed=1
      break
    fi
  done <<< "${SOLAR_SECRET_ALLOWED_ROOTS}:"
  [[ "${allowed}" == "1" ]] || return 1
  [[ -d "${parent}" && ! -L "${parent}" ]] || return 1
  [[ "$(stat_field '%a' "${parent}")" == "700" && "$(stat_field '%a' "${file_path}")" == "600" ]] || return 1
  owner="$(stat_field '%u' "${file_path}")" || return 1
  [[ "${owner}" == "0" || "${owner}" == "${EUID}" || "${owner}" == "${SUDO_UID:-}" ]] || return 1
  parent_owner="$(stat_field '%u' "${parent}")" || return 1
  [[ "${parent_owner}" == "${owner}" || "${parent_owner}" == "0" ]] || return 1
  marker="${parent}/.solar-deploy-secret-marker"
  [[ -f "${marker}" && ! -L "${marker}" && "$(stat_field '%a' "${marker}")" == "600" ]] || return 1
  marker_uid="$(stat_field '%u' "${marker}")" || return 1
  [[ "${marker_uid}" == "${owner}" || "${marker_uid}" == "0" ]] || return 1
  exec {marker_fd}<"${marker}" || return 1
  IFS= read -r marker_magic <&"${marker_fd}" || { exec {marker_fd}<&-; return 1; }
  IFS= read -r marker_owner <&"${marker_fd}" || { exec {marker_fd}<&-; return 1; }
  IFS= read -r marker_file <&"${marker_fd}" || { exec {marker_fd}<&-; return 1; }
  marker_extra=""
  IFS= read -r marker_extra <&"${marker_fd}" && { exec {marker_fd}<&-; return 1; }
  exec {marker_fd}<&-
  [[ "${marker_magic}" == "SOLAR-DEPLOY-SECRET-MARKER/1" ]] || return 1
  [[ "${marker_owner}" == "owner=${owner}" && "${marker_file}" == "file=rdp-password" && -z "${marker_extra}" ]]
}

read_rdp_password_file_once() {
  local password_fd read_status
  validate_rdp_password_file "${RDP_PASSWORD_FILE}" \
    || fail "--rdp-password-file failed owner, marker, type, mode, or containment validation"
  RDP_PASSWORD=""
  exec {password_fd}<"${RDP_PASSWORD_FILE}" || fail "cannot open --rdp-password-file"
  if IFS= read -r -d '' -n 4097 RDP_PASSWORD <&"${password_fd}"; then
    read_status=0
  else
    read_status=$?
  fi
  exec {password_fd}<&- || fail "cannot close --rdp-password-file"
  (( read_status != 0 )) || fail "--rdp-password-file contains NUL or exceeds 4096 bytes"
  (( ${#RDP_PASSWORD} <= 4096 )) || fail "--rdp-password-file exceeds 4096 bytes"
  [[ "${RDP_PASSWORD}" != *$'\r'* && "${RDP_PASSWORD}" != *$'\n'* ]] \
    || fail "--rdp-password-file contains a forbidden byte"
}
# END SOLAR RDP PASSWORD FILE READER

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --user) KIOSK_USER="${2:-}"; shift 2 ;;
    --desktop) DESKTOP="${2:-}"; shift 2 ;;
    --rdp-auth) RDP_AUTH="${2:-}"; shift 2 ;;
    --rdp-password) RDP_PASSWORD="${2:-}"; echo "WARNING: --rdp-password is deprecated; use --rdp-password-file" >&2; shift 2 ;;
    --rdp-password-file) RDP_PASSWORD_FILE="${2:-}"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    *) fail "Unknown option: $1" ;;
  esac
done

[[ "${DESKTOP}" == "xfce-xrdp" || "${DESKTOP}" == "none" ]] || fail "--desktop must be xfce-xrdp or none"
[[ "${RDP_AUTH}" == "passwordless" || "${RDP_AUTH}" == "system-password" ]] || fail "--rdp-auth must be passwordless or system-password"

if [[ "${DESKTOP}" == "none" ]]; then
  echo "Desktop setup skipped"
  exit 0
fi

if [[ "${RDP_AUTH}" == "passwordless" && -z "${RDP_PASSWORD}" && -z "${RDP_PASSWORD_FILE}" ]]; then
  fail "RDP passwordless requires --rdp-password-file, --rdp-password, or RDP_PASSWORD; SSH and sudo remain password-protected"
fi

echo "Desktop: xfce-xrdp"
echo "Packages: xfce4 lightdm xrdp xorgxrdp xserver-xorg-input-libinput x11-xserver-utils xfce4-power-manager dbus-x11 firefox xdg-utils xfce4-terminal network-manager-gnome policykit-1-gnome fonts-noto-cjk fonts-noto-core im-config fcitx5 fcitx5-chewing fcitx5-table-boshiamy"
echo "RDP auth: ${RDP_AUTH}"
echo "Security: SSH password authentication and sudo password prompts are not disabled"

if [[ "${DRY_RUN}" == "1" ]]; then
  echo "Dry run only; no desktop packages or xrdp config changed"
  exit 0
fi

if [[ -n "${RDP_PASSWORD_FILE}" ]]; then
  read_rdp_password_file_once
elif [[ -n "${RDP_PASSWORD}" ]]; then
  (( ${#RDP_PASSWORD} <= 4096 )) || fail "legacy RDP password exceeds 4096 bytes"
  [[ "${RDP_PASSWORD}" != *$'\r'* && "${RDP_PASSWORD}" != *$'\n'* ]] \
    || fail "legacy RDP password contains a forbidden byte"
fi
if [[ "${RDP_AUTH}" == "passwordless" && -z "${RDP_PASSWORD}" ]]; then
  fail "RDP passwordless requires a non-empty password source; SSH and sudo remain password-protected"
fi

[[ "${EUID}" -eq 0 ]] || fail "Please run as root"
id "${KIOSK_USER}" >/dev/null 2>&1 || fail "User not found: ${KIOSK_USER}"

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y xfce4 lightdm xrdp xorgxrdp xserver-xorg-input-libinput x11-xserver-utils xfce4-power-manager dbus-x11 firefox xdg-utils xfce4-terminal network-manager-gnome policykit-1-gnome fonts-noto-cjk fonts-noto-core im-config fcitx5 fcitx5-chewing fcitx5-table-boshiamy

kiosk_home="$(getent passwd "${KIOSK_USER}" | cut -d: -f6)"
install -d -m 755 -o "${KIOSK_USER}" -g "${KIOSK_USER}" "${kiosk_home}"
rm -rf "${kiosk_home}/.cache/sessions" "${kiosk_home}/.config/xfce4-session"
install -d -m 755 -o "${KIOSK_USER}" -g "${KIOSK_USER}" \
  "${kiosk_home}/.cache" \
  "${kiosk_home}/.config" \
  "${kiosk_home}/.config/fcitx5" \
  "${kiosk_home}/.config/autostart" \
  "${kiosk_home}/.config/xfce4" \
  "${kiosk_home}/.config/xfce4/xfconf" \
  "${kiosk_home}/.config/xfce4/xfconf/xfce-perchannel-xml" \
  "${kiosk_home}/.config/xfce4/panel" \
  "${kiosk_home}/.local" \
  "${kiosk_home}/.local/bin" \
  "${kiosk_home}/.local/share" \
  "${kiosk_home}/.local/share/fonts" \
  "${kiosk_home}/.local/share/fonts/noto-cjk"
cat > "${kiosk_home}/.xsession" <<'EOF'
#!/bin/sh
export XDG_CONFIG_DIRS="/etc/xdg"
export XDG_DATA_DIRS="/usr/local/share:/usr/share:/var/lib/snapd/desktop"
unset DBUS_SESSION_BUS_ADDRESS
exec dbus-run-session -- startxfce4
EOF
cat > "${kiosk_home}/.xprofile" <<'EOF'
export GTK_IM_MODULE=fcitx
export QT_IM_MODULE=fcitx
export XMODIFIERS=@im=fcitx
EOF
cat > "${kiosk_home}/.xinputrc" <<'EOF'
# im-config(8) generated by Solar Player deploy
run_im fcitx5
EOF
cat > "${kiosk_home}/.config/autostart/fcitx5.desktop" <<'EOF'
[Desktop Entry]
Type=Application
Name=Fcitx 5
Exec=fcitx5 -d
OnlyShowIn=XFCE;
X-GNOME-Autostart-enabled=true
EOF
"${SCRIPT_DIR}/disable-display-sleep.sh" --user "${KIOSK_USER}"
"${SCRIPT_DIR}/disable-xfce-display-popups.sh" --user "${KIOSK_USER}"
cat > "${kiosk_home}/.config/fcitx5/profile" <<'EOF'
[Groups/0]
Name=Default
Default Layout=us
DefaultIM=keyboard-us

[Groups/0/Items/0]
Name=keyboard-us
Layout=

[Groups/0/Items/1]
Name=boshiamy
Layout=

[Groups/0/Items/2]
Name=chewing
Layout=

[GroupOrder]
0=Default
EOF
cat > "${kiosk_home}/.config/fcitx5/config" <<'EOF'
[Behavior/DisabledAddons]
0=kimpanel
1=quickphrase
2=spell
EOF
cat > "${kiosk_home}/.dmrc" <<'EOF'
[Desktop]
Language=zh_TW.UTF-8
Session=xfce
EOF
chown "${KIOSK_USER}:${KIOSK_USER}" "${kiosk_home}/.xsession"
chown "${KIOSK_USER}:${KIOSK_USER}" "${kiosk_home}/.xprofile" "${kiosk_home}/.xinputrc" "${kiosk_home}/.dmrc" "${kiosk_home}/.config/autostart/fcitx5.desktop" "${kiosk_home}/.config/fcitx5/profile" "${kiosk_home}/.config/fcitx5/config"
chmod 755 "${kiosk_home}/.xsession"
grep -q '^zh_TW.UTF-8 UTF-8$' /etc/locale.gen || echo 'zh_TW.UTF-8 UTF-8' >> /etc/locale.gen
locale-gen zh_TW.UTF-8
update-locale LANG=zh_TW.UTF-8 LANGUAGE=zh_TW:zh
sudo -u "${KIOSK_USER}" im-config -n fcitx5 >/dev/null 2>&1 || true
for font in \
  /usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc \
  /usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc \
  /usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc; do
  if [[ -f "${font}" ]]; then
    install -m 0644 -o "${KIOSK_USER}" -g "${KIOSK_USER}" "${font}" "${kiosk_home}/.local/share/fonts/noto-cjk/"
  fi
done
sudo -u "${KIOSK_USER}" fc-cache -f "${kiosk_home}/.local/share/fonts" >/dev/null 2>&1 || true
if command -v xfconf-query >/dev/null 2>&1; then
  sudo -u "${KIOSK_USER}" DISPLAY=:0 XAUTHORITY="${kiosk_home}/.Xauthority" xfconf-query -c xsettings -n -t string -p /Gtk/FontName -s "Noto Sans CJK TC 10" >/dev/null 2>&1 || true
  sudo -u "${KIOSK_USER}" DISPLAY=:0 XAUTHORITY="${kiosk_home}/.Xauthority" xfconf-query -c xsettings -n -t string -p /Gtk/MonospaceFontName -s "Noto Sans Mono CJK TC 10" >/dev/null 2>&1 || true
fi

install -d -m 755 /etc/environment.d
cat > /etc/environment.d/90-solar-fcitx.conf <<'EOF'
GTK_IM_MODULE=fcitx
QT_IM_MODULE=fcitx
XMODIFIERS=@im=fcitx
EOF

install -d -m 755 /etc/NetworkManager/conf.d
cat > /etc/NetworkManager/conf.d/10-solar-managed.conf <<'EOF'
[ifupdown]
managed=true
EOF

install -d -m 755 /etc/polkit-1/rules.d
cat > /etc/polkit-1/rules.d/49-solar-networkmanager.rules <<EOF
polkit.addRule(function(action, subject) {
    if (subject.user === "${KIOSK_USER}" && (
        action.id === "org.freedesktop.NetworkManager.network-control" ||
        action.id === "org.freedesktop.NetworkManager.settings.modify.system" ||
        action.id === "org.freedesktop.NetworkManager.enable-disable-wifi"
    )) {
        return polkit.Result.YES;
    }
});
EOF

cat > /etc/netplan/90-solar-network-manager.yaml <<'EOF'
network:
  version: 2
  renderer: NetworkManager
EOF

install -d -m 755 /etc/X11/xorg.conf.d
cat > /etc/X11/xorg.conf.d/99-solar-raspi-kms.conf <<'EOF'
Section "Device"
    Identifier "Raspberry Pi KMS"
    Driver "modesetting"
    Option "kmsdev" "/dev/dri/card1"
EndSection
EOF

install -d -m 755 /etc/X11/xrdp/xorg.conf.d
if [[ -f /etc/X11/xrdp/xorg.conf ]] && ! grep -q 'Option "AutoAddGPU" "off"' /etc/X11/xrdp/xorg.conf; then
  sed -i '/Option "AutoAddDevices" "off"/a\    Option "AutoAddGPU" "off"' /etc/X11/xrdp/xorg.conf
fi
if [[ -f /etc/xrdp/sesman.ini ]] && ! grep -q '^param=/etc/X11/xrdp/xorg.conf.d$' /etc/xrdp/sesman.ini; then
  tmp_sesman="$(mktemp)"
  awk '
    BEGIN {
      in_xorg = 0
      inserted = 0
    }
    /^\[Xorg\]$/ {
      in_xorg = 1
      print
      next
    }
    /^\[/ {
      if (in_xorg && !inserted) {
        print "param=-configdir"
        print "param=/etc/X11/xrdp/xorg.conf.d"
        inserted = 1
      }
      in_xorg = 0
      print
      next
    }
    {
      if (in_xorg && ($0 == "param=-configdir" || $0 == "param=/etc/X11/xrdp/xorg.conf.d")) {
        next
      }
      print
      if (in_xorg && $0 == "param=xrdp/xorg.conf" && !inserted) {
        print "param=-configdir"
        print "param=/etc/X11/xrdp/xorg.conf.d"
        inserted = 1
      }
    }
    END {
      if (in_xorg && !inserted) {
        print "param=-configdir"
        print "param=/etc/X11/xrdp/xorg.conf.d"
      }
    }
  ' /etc/xrdp/sesman.ini > "${tmp_sesman}"
  cat "${tmp_sesman}" > /etc/xrdp/sesman.ini
  rm -f "${tmp_sesman}"
fi

install -d -m 755 /etc/lightdm/lightdm.conf.d
cat > /etc/lightdm/lightdm.conf.d/50-solar-kiosk-autologin.conf <<EOF
[Seat:*]
autologin-user=${KIOSK_USER}
autologin-user-timeout=0
user-session=xfce
EOF

if [[ "${RDP_AUTH}" == "passwordless" ]]; then
  password_b64="$(printf '%s' "${RDP_PASSWORD}" | base64 | tr -d '\n')"
  if [[ -f /etc/xrdp/xrdp.ini ]]; then
    cp /etc/xrdp/xrdp.ini "/etc/xrdp/xrdp.ini.solar-display-backup-$(date +%Y%m%d%H%M%S)"
    awk '
      BEGIN {
        skip = 0
        in_globals = 0
        autorun_written = 0
      }
      /^\[SolarKiosk\]$/ { skip = 1; next }
      /^\[Globals\]$/ {
        in_globals = 1
        print
        next
      }
      /^\[/ {
        if (in_globals && !autorun_written) {
          print "autorun=SolarKiosk"
          autorun_written = 1
        }
        in_globals = 0
        skip = 0
        print
        next
      }
      skip == 1 { next }
      in_globals && /^autorun=/ {
        if (!autorun_written) {
          print "autorun=SolarKiosk"
          autorun_written = 1
        }
        next
      }
      { print }
      END {
        if (in_globals && !autorun_written) {
          print "autorun=SolarKiosk"
        }
      }
    ' /etc/xrdp/xrdp.ini > /tmp/solar-xrdp.ini
    cat /tmp/solar-xrdp.ini > /etc/xrdp/xrdp.ini
    rm -f /tmp/solar-xrdp.ini
  fi
  cat >> /etc/xrdp/xrdp.ini <<EOF

[SolarKiosk]
name=SolarKiosk
lib=libxup.so
username=${KIOSK_USER}
password={base64}${password_b64}
ip=127.0.0.1
port=-1
code=20
EOF
fi

if id xrdp >/dev/null 2>&1 && getent group ssl-cert >/dev/null 2>&1; then
  adduser xrdp ssl-cert >/dev/null 2>&1 || true
fi

systemctl enable lightdm
systemctl enable --now xrdp
systemctl restart xrdp

echo "Configured XFCE + lightdm + xrdp + firefox for ${KIOSK_USER}"
