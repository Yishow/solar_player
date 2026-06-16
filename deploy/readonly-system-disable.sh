#!/bin/bash
set -euo pipefail

echo "Temporarily Disable Read Only System"
echo "This disables overlayroot for the next boot and requires reboot."

sudo bash -c '
set -euo pipefail
write_disabled_config() {
  printf "overlayroot=\"\"\n" > /etc/overlayroot.local.conf
  update-initramfs -u
}

if findmnt -no SOURCE / 2>/dev/null | grep -q "^overlayroot$"; then
  command -v overlayroot-chroot >/dev/null 2>&1 || {
    echo "ERROR: overlayroot-chroot is required to disable active overlayroot" >&2
    exit 1
  }
  overlayroot-chroot /bin/bash -c "printf '\''overlayroot=\"\"\\n'\'' > /etc/overlayroot.local.conf && update-initramfs -u"
else
  write_disabled_config
fi
'

echo ""
echo "Readonly system has been disabled for the next boot. Reboot is required."
read -r -p "Press Enter to close..."
