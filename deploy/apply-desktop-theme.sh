#!/bin/bash
set -euo pipefail

KIOSK_USER="${KIOSK_USER:-pi}"
DRY_RUN=0

THEME_NAME="Arc-Darker"
ICON_THEME="Papirus-Dark"
CURSOR_THEME="DMZ-White"
UI_FONT="Noto Sans CJK TC 11"
MONO_FONT="Noto Sans Mono 11"
TITLE_FONT="Noto Sans CJK TC Bold 10"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --user) KIOSK_USER="${2:-}"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    *) fail "Unknown option: $1" ;;
  esac
done

echo "Theme profile: balanced-xfce"
echo "Packages: arc-theme papirus-icon-theme dmz-cursor-theme fonts-noto-core fonts-noto-cjk fonts-noto-mono fonts-noto-color-emoji"
echo "User: ${KIOSK_USER}"

if [[ "${DRY_RUN}" == "1" ]]; then
  echo "Dry run only; no theme packages or desktop settings changed"
  exit 0
fi

[[ "${EUID}" -eq 0 ]] || fail "Please run as root"
id "${KIOSK_USER}" >/dev/null 2>&1 || fail "User not found: ${KIOSK_USER}"

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y arc-theme papirus-icon-theme dmz-cursor-theme fonts-noto-core fonts-noto-cjk fonts-noto-mono fonts-noto-color-emoji

kiosk_home="$(getent passwd "${KIOSK_USER}" | cut -d: -f6)"
install -d -m 755 -o "${KIOSK_USER}" -g "${KIOSK_USER}" \
  "${kiosk_home}/.config" \
  "${kiosk_home}/.config/gtk-3.0" \
  "${kiosk_home}/.config/xfce4/xfconf/xfce-perchannel-xml"

cat > "${kiosk_home}/.config/gtk-3.0/settings.ini" <<EOF
[Settings]
gtk-theme-name=${THEME_NAME}
gtk-icon-theme-name=${ICON_THEME}
gtk-cursor-theme-name=${CURSOR_THEME}
gtk-cursor-theme-size=24
gtk-font-name=${UI_FONT}
gtk-application-prefer-dark-theme=1
EOF

cat > "${kiosk_home}/.gtkrc-2.0" <<EOF
gtk-theme-name="${THEME_NAME}"
gtk-icon-theme-name="${ICON_THEME}"
gtk-cursor-theme-name="${CURSOR_THEME}"
gtk-cursor-theme-size=24
gtk-font-name="${UI_FONT}"
EOF

cat > "${kiosk_home}/.config/xfce4/xfconf/xfce-perchannel-xml/xsettings.xml" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<channel name="xsettings" version="1.0">
  <property name="Net" type="empty">
    <property name="ThemeName" type="string" value="${THEME_NAME}"/>
    <property name="IconThemeName" type="string" value="${ICON_THEME}"/>
  </property>
  <property name="Gtk" type="empty">
    <property name="CursorThemeName" type="string" value="${CURSOR_THEME}"/>
    <property name="CursorThemeSize" type="int" value="24"/>
    <property name="FontName" type="string" value="${UI_FONT}"/>
    <property name="MonospaceFontName" type="string" value="${MONO_FONT}"/>
    <property name="ButtonImages" type="bool" value="true"/>
    <property name="MenuImages" type="bool" value="true"/>
    <property name="ToolbarStyle" type="string" value="icons"/>
  </property>
  <property name="Xft" type="empty">
    <property name="Antialias" type="int" value="1"/>
    <property name="Hinting" type="int" value="1"/>
    <property name="HintStyle" type="string" value="hintslight"/>
    <property name="RGBA" type="string" value="rgb"/>
  </property>
</channel>
EOF

cat > "${kiosk_home}/.config/xfce4/xfconf/xfce-perchannel-xml/xfwm4.xml" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<channel name="xfwm4" version="1.0">
  <property name="general" type="empty">
    <property name="theme" type="string" value="${THEME_NAME}"/>
    <property name="title_font" type="string" value="${TITLE_FONT}"/>
    <property name="button_layout" type="string" value="O|HMC"/>
  </property>
</channel>
EOF

chown "${KIOSK_USER}:${KIOSK_USER}" \
  "${kiosk_home}/.config/gtk-3.0/settings.ini" \
  "${kiosk_home}/.gtkrc-2.0" \
  "${kiosk_home}/.config/xfce4/xfconf/xfce-perchannel-xml/xsettings.xml" \
  "${kiosk_home}/.config/xfce4/xfconf/xfce-perchannel-xml/xfwm4.xml"

echo "Applied balanced XFCE theme profile for ${KIOSK_USER}"
echo "Re-login or reboot if the current desktop session does not refresh immediately"
